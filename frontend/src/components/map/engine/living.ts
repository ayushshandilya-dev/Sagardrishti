import * as maplibregl from "maplibre-gl";
import {
  LivingHandle,
  bindAttribs,
  buildProgram,
  makeBuffer,
  merc,
  type LonLat,
} from "./gl";

/* ─────────────────────────────────────────────────────────────
   LIVING MARITIME INTELLIGENCE ENGINE
   GPU-driven MapLibre custom WebGL layers that replace the
   "satellite screenshot with pasted markers" feel:

     • bathymetry()      — procedural seafloor relief + contours
     • particles(kind)   — continuously advected current/wind streaks
     • laneFlow()        — shipping-lane chevrons streaming in flow
     • portLights()      — warm operational beacons at the terminals
     • bloom()           — selective additive bloom on intelligence
     • swathSweep()      — animated Sentinel-1 SAR scan band

   Every layer is pure GPU (one draw call, no per-frame CPU loops)
   so the COP holds 60 FPS. Each degrades to a harmless no-op if
   shader/buffer creation fails.
   ───────────────────────────────────────────────────────────── */

const AOI: [number, number, number, number] = [66.2, 19.8, 71.0, 23.8];

/* The COP hosts a single map; custom layers need to request a repaint
   every frame so their time-driven shaders stay alive ("living").
   Captured once in each layer's onAdd. */
let owningMapRef: maplibregl.Map | null = null;

/* Shared GLSL noise / helpers injected into every fragment shader. */
const GLSL_NOISE = `
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0,0.0)), u.x),
             mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0; float a = 0.55;
  for (int i = 0; i < 4; i++){ v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}`;

const QUAD_VERT = `
precision highp float;
attribute vec2 aPos;      // mercator xy
attribute vec2 aLonLat;   // lon/lat for field evaluation
varying vec2 vLonLat;
uniform mat4 uMatrix;
void main(){
  vLonLat = aLonLat;
  gl_Position = uMatrix * vec4(aPos, 0.0, 1.0);
}`;

function quadBuffers(bbox: [number, number, number, number]) {
  const [w, s, e, n] = bbox;
  const corners: LonLat[] = [
    [w, n],
    [e, n],
    [e, s],
    [w, n],
    [e, s],
    [w, s],
  ];
  const pos = new Float32Array(corners.length * 2);
  const lon = new Float32Array(corners.length * 2);
  corners.forEach((c, i) => {
    const m = merc(c);
    pos[i * 2] = m.x;
    pos[i * 2 + 1] = m.y;
    lon[i * 2] = c[0];
    lon[i * 2 + 1] = c[1];
  });
  return { pos, lon, count: corners.length };
}

/* ═════════════════════════════════════════════════════════════
   1. BATHYMETRY — procedural seafloor relief & depth contours
   ═════════════════════════════════════════════════════════════ */
const BATHY_FRAG = `
precision mediump float;
varying vec2 vLonLat;
uniform float uTime;
uniform float uAlpha;
${GLSL_NOISE}
void main(){
  vec2 ll = vLonLat;
  /* depth increases away from the Kutch coast toward the deep Arabian Sea basin */
  float shelf = 1.0 - clamp((ll.x - 67.0) / 3.6, 0.0, 1.0);      // 1 offshore (west) → 0 coast
  float latitude = clamp((23.8 - ll.y) / 3.4, 0.0, 1.0);        // south deepens
  float depth = clamp(shelf * 0.72 + latitude * 0.5, 0.0, 1.0);
  depth = mix(depth, fbm(ll * 5.3) * 0.18 + depth, 0.35);
  depth *= 0.72 + 0.28 * fbm(ll * 11.0 + uTime * 0.01);

  /* Depth contours and continental shelf break glow only — never wash out land or ocean */
  float rim = 1.0 - smoothstep(0.0, 0.12, abs(shelf - 0.32));
  float c20 = fract(depth * 22.0);
  float line20 = 1.0 - smoothstep(0.0, 0.042, min(c20, 1.0 - c20));

  vec3 col = mix(vec3(0.12, 0.65, 0.85), vec3(0.35, 0.88, 1.0), rim);
  float lineAlpha = line20 * 0.38 + rim * 0.45;

  /* Zero alpha over land (shelf < 0.02) */
  float alpha = uAlpha * lineAlpha * smoothstep(0.02, 0.15, shelf);
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.85));
}`;

export function createBathymetryLayer(id: string): { layer: maplibregl.CustomLayerInterface; handle: LivingHandle } {
  const { pos, lon, count } = quadBuffers(AOI);
  let visible = true;
  let alpha = 1;
  let program: WebGLProgram | null = null;
  let bPos: WebGLBuffer | null = null;
  let bLon: WebGLBuffer | null = null;
  let aPos = -1, aLon = -1;
  let uM: WebGLUniformLocation | null = null;
  let uT: WebGLUniformLocation | null = null;
  let uA: WebGLUniformLocation | null = null;
  let broken = false;

  const handle: LivingHandle = {
    setVisible: (v) => (visible = v),
    setAlpha: (a) => (alpha = a),
    destroy: () => {},
  };

  const layer: maplibregl.CustomLayerInterface = {
    id,
    type: "custom",
    renderingMode: "3d",
    onAdd: (_map, gl) => {
      owningMapRef = _map;
      try {
        program = buildProgram(gl, QUAD_VERT, BATHY_FRAG);
        if (!program) throw new Error("no program");
        bPos = makeBuffer(gl, pos);
        bLon = makeBuffer(gl, lon);
        if (!bPos || !bLon) throw new Error("no buffer");
        aPos = gl.getAttribLocation(program, "aPos");
        aLon = gl.getAttribLocation(program, "aLonLat");
        uM = gl.getUniformLocation(program, "uMatrix");
        uT = gl.getUniformLocation(program, "uTime");
        uA = gl.getUniformLocation(program, "uAlpha");
      } catch (err) {
        console.warn("SD bathymetry layer unavailable.", err);
        broken = true;
      }
    },
    render: (gl, args) => {
      if (broken || !visible || alpha <= 0.002 || !program) return;
      gl.useProgram(program);
      bindAttribs(gl, [
        { loc: aPos, buffer: bPos, size: 2 },
        { loc: aLon, buffer: bLon, size: 2 },
      ]);
      gl.uniformMatrix4fv(uM, false, args.modelViewProjectionMatrix);
      gl.uniform1f(uT, performance.now() / 1000);
      gl.uniform1f(uA, alpha);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.disable(gl.DEPTH_TEST);
      gl.drawArrays(gl.TRIANGLES, 0, count);
      gl.drawArrays(gl.TRIANGLES, 0, count);
      owningMapRef?.triggerRepaint();
    },
    onRemove: (_map, gl) => {
      if (bPos) gl.deleteBuffer(bPos);
      if (bLon) gl.deleteBuffer(bLon);
      if (program) gl.deleteProgram(program);
    },
  };
  return { layer, handle };
}

/* ═════════════════════════════════════════════════════════════
   2. PARTICLES — GPU-advected current & wind streaks
   ═════════════════════════════════════════════════════════════ */
const PART_VERT = `
precision highp float;
attribute vec2 aPos;     // base mercator
attribute vec2 aDir;     // unit mercator direction
attribute float aPhase;
attribute float aSpeed;
attribute float aEnd;    // 0 tail, 1 head
attribute float aKind;   // 0 current, 1 wind
attribute float aSeed;
uniform mat4 uMatrix;
uniform float uTime;
uniform float uDrift;    // mercator streak travel
uniform float uStreak;   // head extension fraction
varying float vAlpha;
varying vec3 vColor;
uniform vec3 uColA;
uniform vec3 uColB;
void main(){
  float t = fract(aPhase + uTime * aSpeed);
  vec2 p = aPos + aDir * (t * uDrift) + aDir * (aEnd * uDrift * uStreak);
  vec2 perp = vec2(-aDir.y, aDir.x);
  p += perp * (sin(uTime * 0.5 + aSeed * 6.2831) * 0.000045 * (0.4 + aKind));
  float edge = smoothstep(0.0, 0.14, t) * (1.0 - smoothstep(0.70, 1.0, t));
  vAlpha = edge * mix(0.55, 0.42, aKind);
  vColor = mix(uColA, uColB, clamp(aKind + 0.15 * sin(aSeed * 37.0), 0.0, 1.0));
  gl_Position = uMatrix * vec4(p, 0.0, 1.0);
}`;

const PART_FRAG = `
precision mediump float;
varying float vAlpha;
varying vec3 vColor;
uniform float uAlpha;
void main(){
  gl_FragColor = vec4(vColor, vAlpha * uAlpha);
}`;

function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function createParticleLayer(
  id: string,
  kind: "current" | "wind"
): { layer: maplibregl.CustomLayerInterface; handle: LivingHandle } {
  const N = kind === "current" ? 7500 : 3500;
  const rnd = seededRandom(kind === "current" ? 9173 : 4421);
  const [w, s, e, n] = AOI;

  /* realistic bearing → mercator direction (Mercator y grows south) */
  const baseBearing = kind === "current" ? 119 : 59;
  const baseRad = (baseBearing * Math.PI) / 180;

  const V = N * 2;
  const aPos = new Float32Array(V * 2);
  const aDir = new Float32Array(V * 2);
  const aPhase = new Float32Array(V);
  const aSpeed = new Float32Array(V);
  const aEnd = new Float32Array(V);
  const aKind = new Float32Array(V);
  const aSeed = new Float32Array(V);

  for (let i = 0; i < N; i++) {
    const lng = w + rnd() * (e - w);
    const lat = s + rnd() * (n - s);
    const m = merc([lng, lat]);
    const jitter = (rnd() - 0.5) * 0.45;

    // Coastal hydrodynamic deflection around Gulf of Kutch
    let ang = baseRad + jitter;
    if (kind === "current") {
      // Inside the Gulf channel (between lat 22.3 and 23.0, east of 69.0)
      if (lng > 68.9 && lng < 70.3 && lat > 22.3 && lat < 23.05) {
        // Strong tidal ingress channelling into Kandla & Mundra
        const factor = Math.min(1.0, (lng - 68.9) / 0.8);
        const channelRad = (108 * Math.PI) / 180;
        ang = ang * (1.0 - factor) + (channelRad + jitter * 0.3) * factor;
      } else if (lat < 22.35 && lng < 69.3) {
        // Southern exit stream past Okha into the Arabian Sea
        ang = (138 * Math.PI) / 180 + jitter * 0.35;
      } else if (lat > 23.1) {
        // Northern shallows near Kori Creek
        ang = (124 * Math.PI) / 180 + jitter * 0.25;
      }
    }

    let dx = Math.sin(ang);
    let dy = Math.cos(ang);
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    const phase = rnd();
    const speed = (kind === "current" ? 0.095 : 0.12) * (0.65 + rnd() * 0.85);
    const seed = rnd();
    for (let v = 0; v < 2; v++) {
      const o = i * 2 + v;
      aPos[o * 2] = m.x;
      aPos[o * 2 + 1] = m.y;
      aDir[o * 2] = dx;
      aDir[o * 2 + 1] = dy;
      aPhase[o] = phase;
      aSpeed[o] = speed;
      aEnd[o] = v;
      aKind[o] = kind === "current" ? 0 : 1;
      aSeed[o] = seed;
    }
  }

  let visible = true;
  let alpha = kind === "current" ? 0.9 : 0.55;
  let program: WebGLProgram | null = null;
  const bufs: (WebGLBuffer | null)[] = [];
  const locs: number[] = [];
  let uM: WebGLUniformLocation | null = null;
  let uT: WebGLUniformLocation | null = null;
  let uA: WebGLUniformLocation | null = null;
  let uDrift: WebGLUniformLocation | null = null;
  let uStreak: WebGLUniformLocation | null = null;
  let uColA: WebGLUniformLocation | null = null;
  let uColB: WebGLUniformLocation | null = null;
  let broken = false;

  const handle: LivingHandle = {
    setVisible: (v) => (visible = v),
    setAlpha: (a) => (alpha = baseHandleAlpha(kind) * a),
    destroy: () => {},
  };

  const layer: maplibregl.CustomLayerInterface = {
    id,
    type: "custom",
    renderingMode: "3d",
    onAdd: (_map, gl) => {
      owningMapRef = _map;
      try {
        program = buildProgram(gl, PART_VERT, PART_FRAG);
        if (!program) throw new Error("no program");
        bufs.push(makeBuffer(gl, aPos));
        bufs.push(makeBuffer(gl, aDir));
        bufs.push(makeBuffer(gl, aPhase));
        bufs.push(makeBuffer(gl, aSpeed));
        bufs.push(makeBuffer(gl, aEnd));
        bufs.push(makeBuffer(gl, aKind));
        bufs.push(makeBuffer(gl, aSeed));
        if (bufs.some((b) => !b)) throw new Error("no buffer");
        ["aPos", "aDir", "aPhase", "aSpeed", "aEnd", "aKind", "aSeed"].forEach((name) =>
          locs.push(gl.getAttribLocation(program!, name))
        );
        uM = gl.getUniformLocation(program, "uMatrix");
        uT = gl.getUniformLocation(program, "uTime");
        uA = gl.getUniformLocation(program, "uAlpha");
        uDrift = gl.getUniformLocation(program, "uDrift");
        uStreak = gl.getUniformLocation(program, "uStreak");
        uColA = gl.getUniformLocation(program, "uColA");
        uColB = gl.getUniformLocation(program, "uColB");
      } catch (err) {
        console.warn(`SD ${kind} particle layer unavailable.`, err);
        broken = true;
      }
    },
    render: (gl, args) => {
      if (broken || !visible || alpha <= 0.002 || !program) return;
      gl.useProgram(program);
      const sizes = [2, 2, 1, 1, 1, 1, 1];
      bindAttribs(
        gl,
        locs.map((loc, i) => ({ loc, buffer: bufs[i], size: sizes[i] }))
      );
      gl.uniformMatrix4fv(uM, false, args.modelViewProjectionMatrix);
      gl.uniform1f(uT, performance.now() / 1000);
      gl.uniform1f(uA, alpha);
      gl.uniform1f(uDrift, kind === "current" ? 0.0018 : 0.0031);
      gl.uniform1f(uStreak, 0.28);
      if (kind === "current") {
        gl.uniform3f(uColA, 0.17, 0.66, 0.92);
        gl.uniform3f(uColB, 0.13, 0.83, 0.72);
      } else {
        gl.uniform3f(uColA, 0.55, 0.78, 0.86);
        gl.uniform3f(uColB, 0.35, 0.62, 0.78);
      }
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.disable(gl.DEPTH_TEST);
      gl.drawArrays(gl.LINES, 0, V);
      gl.drawArrays(gl.LINES, 0, V);
      owningMapRef?.triggerRepaint();
    },
    onRemove: (_map, gl) => {
      bufs.forEach((b) => b && gl.deleteBuffer(b));
      if (program) gl.deleteProgram(program);
    },
  };
  return { layer, handle };
}

function baseHandleAlpha(kind: "current" | "wind") {
  return kind === "current" ? 0.9 : 0.55;
}

/* ═════════════════════════════════════════════════════════════
   3. LANE FLOW — GPU chevrons streaming along shipping lanes
   ═════════════════════════════════════════════════════════════ */
const CHEVRON_VERT = `
precision highp float;
attribute vec2 aBase;    // chevron anchor mercator
attribute vec2 aDir;     // unit mercator direction
attribute vec2 aCorner;  // local corner offsets (along, perp)
attribute float aPhase;
attribute float aSpeed;
attribute float aSeed;
uniform mat4 uMatrix;
uniform float uTime;
uniform float uTravel;   // mercator distance to stream before wrap
uniform float uSize;     // mercator chevron scale
varying float vAlpha;
varying float vSeed;
void main(){
  float t = fract(aPhase + uTime * aSpeed);
  vec2 center = aBase + aDir * (t * uTravel);
  vec2 perp = vec2(-aDir.y, aDir.x);
  vec2 local = aCorner.x * aDir + aCorner.y * perp;
  vec2 p = center + local * uSize;
  float edge = smoothstep(0.0, 0.12, t) * (1.0 - smoothstep(0.68, 1.0, t));
  vAlpha = edge;
  vSeed = aSeed;
  gl_Position = uMatrix * vec4(p, 0.0, 1.0);
}`;

const CHEVRON_FRAG = `
precision mediump float;
varying float vAlpha;
varying float vSeed;
uniform float uAlpha;
uniform vec3 uColor;
void main(){
  float pulse = 0.75 + 0.25 * sin(vSeed * 12.0 + vAlpha * 6.0);
  gl_FragColor = vec4(uColor, vAlpha * uAlpha * pulse);
}`;

const CHEVRON_CORNERS: [number, number][] = [
  [0.55, 0.0],
  [-0.32, 0.42],
  [-0.08, 0.0],
  [0.55, 0.0],
  [-0.08, 0.0],
  [-0.32, -0.42],
];

export function createLaneFlowLayer(
  id: string,
  lanes: { coords: LonLat[] }[]
): { layer: maplibregl.CustomLayerInterface; handle: LivingHandle } {
  type Vert = {
    base: { x: number; y: number };
    dir: { x: number; y: number };
    corner: [number, number];
    phase: number;
    speed: number;
    seed: number;
  };
  const verts: Vert[] = [];
  const rnd = seededRandom(2711);

  lanes.forEach((lane, li) => {
    const pts = lane.coords;
    if (pts.length < 2) return;
    const spacing = 0.085; // degrees between chevrons
    let chevIndex = 0;
    let chevTotal = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const segLen = Math.hypot(b[0] - a[0], b[1] - a[1]);
      chevTotal += Math.max(1, Math.round(segLen / spacing));
    }
    chevTotal = Math.max(1, chevTotal);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const segLen = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const count = Math.max(1, Math.round(segLen / spacing));
      const ma = merc(a as LonLat);
      const mb = merc(b as LonLat);
      const mdx = mb.x - ma.x;
      const mdy = mb.y - ma.y;
      const mlen = Math.hypot(mdx, mdy) || 1;
      const dir = { x: mdx / mlen, y: mdy / mlen };
      for (let c = 0; c < count; c++, chevIndex++) {
        const f = (c + 0.5) / count;
        const base = { x: ma.x + mdx * f, y: ma.y + mdy * f };
        const phase = chevIndex / chevTotal;
        const speed = 0.05 + rnd() * 0.02 + li * 0.004;
        const seed = rnd();
        for (const corner of CHEVRON_CORNERS) {
          verts.push({ base, dir, corner, phase, speed, seed });
        }
      }
    }
  });

  const V = verts.length;
  const aBase = new Float32Array(V * 2);
  const aDir = new Float32Array(V * 2);
  const aCorner = new Float32Array(V * 2);
  const aPhase = new Float32Array(V);
  const aSpeed = new Float32Array(V);
  const aSeed = new Float32Array(V);
  verts.forEach((v, i) => {
    aBase[i * 2] = v.base.x;
    aBase[i * 2 + 1] = v.base.y;
    aDir[i * 2] = v.dir.x;
    aDir[i * 2 + 1] = v.dir.y;
    aCorner[i * 2] = v.corner[0];
    aCorner[i * 2 + 1] = v.corner[1];
    aPhase[i] = v.phase;
    aSpeed[i] = v.speed;
    aSeed[i] = v.seed;
  });

  let visible = true;
  let alpha = 0.85;
  let program: WebGLProgram | null = null;
  const bufs: (WebGLBuffer | null)[] = [];
  const locs: number[] = [];
  let uM: WebGLUniformLocation | null = null;
  let uT: WebGLUniformLocation | null = null;
  let uA: WebGLUniformLocation | null = null;
  let uTravel: WebGLUniformLocation | null = null;
  let uSize: WebGLUniformLocation | null = null;
  let uColor: WebGLUniformLocation | null = null;
  let broken = false;

  const handle: LivingHandle = {
    setVisible: (v) => (visible = v),
    setAlpha: (a) => (alpha = 0.85 * a),
    destroy: () => {},
  };

  const layer: maplibregl.CustomLayerInterface = {
    id,
    type: "custom",
    renderingMode: "3d",
    onAdd: (_map, gl) => {
      owningMapRef = _map;
      try {
        program = buildProgram(gl, CHEVRON_VERT, CHEVRON_FRAG);
        if (!program) throw new Error("no program");
        bufs.push(makeBuffer(gl, aBase));
        bufs.push(makeBuffer(gl, aDir));
        bufs.push(makeBuffer(gl, aCorner));
        bufs.push(makeBuffer(gl, aPhase));
        bufs.push(makeBuffer(gl, aSpeed));
        bufs.push(makeBuffer(gl, aSeed));
        if (bufs.some((b) => !b)) throw new Error("no buffer");
        ["aBase", "aDir", "aCorner", "aPhase", "aSpeed", "aSeed"].forEach((name) =>
          locs.push(gl.getAttribLocation(program!, name))
        );
        uM = gl.getUniformLocation(program, "uMatrix");
        uT = gl.getUniformLocation(program, "uTime");
        uA = gl.getUniformLocation(program, "uAlpha");
        uTravel = gl.getUniformLocation(program, "uTravel");
        uSize = gl.getUniformLocation(program, "uSize");
        uColor = gl.getUniformLocation(program, "uColor");
      } catch (err) {
        console.warn("SD lane flow layer unavailable.", err);
        broken = true;
      }
    },
    render: (gl, args) => {
      if (broken || !visible || alpha <= 0.002 || !program || V === 0) return;
      gl.useProgram(program);
      const sizes = [2, 2, 2, 1, 1, 1];
      bindAttribs(
        gl,
        locs.map((loc, i) => ({ loc, buffer: bufs[i], size: sizes[i] }))
      );
      gl.uniformMatrix4fv(uM, false, args.modelViewProjectionMatrix);
      gl.uniform1f(uT, performance.now() / 1000);
      gl.uniform1f(uA, alpha);
      gl.uniform1f(uTravel, 0.00028);
      gl.uniform1f(uSize, 0.000105);
      gl.uniform3f(uColor, 0.20, 0.88, 0.70);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.disable(gl.DEPTH_TEST);
      gl.drawArrays(gl.TRIANGLES, 0, V);
      gl.drawArrays(gl.TRIANGLES, 0, V);
      owningMapRef?.triggerRepaint();
    },
    onRemove: (_map, gl) => {
      bufs.forEach((b) => b && gl.deleteBuffer(b));
      if (program) gl.deleteProgram(program);
    },
  };
  return { layer, handle };
}

/* ═════════════════════════════════════════════════════════════
   4. PORT LIGHTS — warm operational beacons
   ═════════════════════════════════════════════════════════════ */
const SPRITE_VERT = `
precision highp float;
attribute vec2 aCenter;   // mercator
attribute vec2 aCorner;   // -1..1 quad corner
attribute float aSeed;
attribute float aSize;    // mercator half-size
uniform mat4 uMatrix;
uniform float uTime;
uniform float uSizeScale;
varying vec2 vLocal;
varying float vSeed;
void main(){
  vLocal = aCorner;
  vSeed = aSeed;
  vec2 p = aCenter + aCorner * aSize * uSizeScale;
  gl_Position = uMatrix * vec4(p, 0.0, 1.0);
}`;

const SPRITE_FRAG = `
precision mediump float;
varying vec2 vLocal;
varying float vSeed;
uniform float uTime;
uniform float uAlpha;
uniform vec3 uColor;
void main(){
  float r = length(vLocal);
  float core = exp(-r * r * 9.0);
  float halo = exp(-r * r * 2.2) * 0.5;
  float flicker = 0.82 + 0.18 * sin(uTime * 2.1 + vSeed * 21.0);
  float a = (core + halo) * uAlpha * flicker;
  gl_FragColor = vec4(uColor, clamp(a, 0.0, 1.0));
}`;

export function createPortLightLayer(
  id: string,
  ports: { name: string; c: LonLat; intensity: number }[]
): { layer: maplibregl.CustomLayerInterface; handle: LivingHandle } {
  const V = ports.length * 6;
  const aCenter = new Float32Array(V * 2);
  const aCorner = new Float32Array(V * 2);
  const aSeed = new Float32Array(V);
  const aSize = new Float32Array(V);
  const corners: [number, number][] = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, -1],
    [1, 1],
    [-1, 1],
  ];
  ports.forEach((p, i) => {
    const m = merc(p.c);
    const size = 0.00055 + p.intensity * 0.00085;
    for (let k = 0; k < 6; k++) {
      const o = i * 6 + k;
      aCenter[o * 2] = m.x;
      aCenter[o * 2 + 1] = m.y;
      aCorner[o * 2] = corners[k][0];
      aCorner[o * 2 + 1] = corners[k][1];
      aSeed[o] = i * 0.37 + k * 0.01;
      aSize[o] = size;
    }
  });

  let visible = true;
  let alpha = 0.55;
  let program: WebGLProgram | null = null;
  const bufs: (WebGLBuffer | null)[] = [];
  const locs: number[] = [];
  let uM: WebGLUniformLocation | null = null;
  let uT: WebGLUniformLocation | null = null;
  let uA: WebGLUniformLocation | null = null;
  let uCol: WebGLUniformLocation | null = null;
  let uScale: WebGLUniformLocation | null = null;
  let broken = false;

  const handle: LivingHandle = {
    setVisible: (v) => (visible = v),
    setAlpha: (a) => (alpha = a),
    destroy: () => {},
  };

  const layer: maplibregl.CustomLayerInterface = {
    id,
    type: "custom",
    renderingMode: "3d",
    onAdd: (_map, gl) => {
      owningMapRef = _map;
      try {
        program = buildProgram(gl, SPRITE_VERT, SPRITE_FRAG);
        if (!program) throw new Error("no program");
        bufs.push(makeBuffer(gl, aCenter));
        bufs.push(makeBuffer(gl, aCorner));
        bufs.push(makeBuffer(gl, aSeed));
        bufs.push(makeBuffer(gl, aSize));
        if (bufs.some((b) => !b)) throw new Error("no buffer");
        ["aCenter", "aCorner", "aSeed", "aSize"].forEach((name) =>
          locs.push(gl.getAttribLocation(program!, name))
        );
        uM = gl.getUniformLocation(program, "uMatrix");
        uT = gl.getUniformLocation(program, "uTime");
        uA = gl.getUniformLocation(program, "uAlpha");
        uCol = gl.getUniformLocation(program, "uColor");
        uScale = gl.getUniformLocation(program, "uSizeScale");
      } catch (err) {
        console.warn("SD port light layer unavailable.", err);
        broken = true;
      }
    },
    render: (gl, args) => {
      if (broken || !visible || alpha <= 0.002 || !program) return;
      gl.useProgram(program);
      const sizes = [2, 2, 1, 1];
      bindAttribs(
        gl,
        locs.map((loc, i) => ({ loc, buffer: bufs[i], size: sizes[i] }))
      );
      gl.uniformMatrix4fv(uM, false, args.modelViewProjectionMatrix);
      gl.uniform1f(uT, performance.now() / 1000);
      gl.uniform1f(uA, alpha);
      gl.uniform1f(uScale, 1);
      gl.uniform3f(uCol, 1.0, 0.62, 0.28); // warm sodium-lamp port glow
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.disable(gl.DEPTH_TEST);
      gl.drawArrays(gl.TRIANGLES, 0, V);
      gl.drawArrays(gl.TRIANGLES, 0, V);
      owningMapRef?.triggerRepaint();
    },
    onRemove: (_map, gl) => {
      bufs.forEach((b) => b && gl.deleteBuffer(b));
      if (program) gl.deleteProgram(program);
    },
  };
  return { layer, handle };
}

/* ═════════════════════════════════════════════════════════════
   5. BLOOM — selective additive bloom on intelligence layers
   ═════════════════════════════════════════════════════════════ */
export interface BloomPoint {
  lngLat: LonLat;
  color: [number, number, number];
  size: number; // mercator half-size
  intensity: number; // 0..1
}

export interface BloomHandle extends LivingHandle {
  setPoints: (points: BloomPoint[]) => void;
}

export function createBloomLayer(id: string): {
  layer: maplibregl.CustomLayerInterface;
  handle: BloomHandle;
} {
  let points: BloomPoint[] = [];
  let V = 0;
  let aCenter: Float32Array = new Float32Array(0);
  let aCorner: Float32Array = new Float32Array(0);
  let aColor: Float32Array = new Float32Array(0);
  let aIntensity: Float32Array = new Float32Array(0);
  let dirty = true;

  const corners: [number, number][] = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, -1],
    [1, 1],
    [-1, 1],
  ];

  const rebuild = () => {
    V = points.length * 6;
    aCenter = new Float32Array(V * 2);
    aCorner = new Float32Array(V * 2);
    aColor = new Float32Array(V * 3);
    aIntensity = new Float32Array(V);
    points.forEach((p, i) => {
      const m = merc(p.lngLat);
      for (let k = 0; k < 6; k++) {
        const o = i * 6 + k;
        aCenter[o * 2] = m.x;
        aCenter[o * 2 + 1] = m.y;
        aCorner[o * 2] = corners[k][0];
        aCorner[o * 2 + 1] = corners[k][1];
        aColor[o * 3] = p.color[0];
        aColor[o * 3 + 1] = p.color[1];
        aColor[o * 3 + 2] = p.color[2];
        aIntensity[o] = p.intensity;
      }
    });
    dirty = true;
  };

  let visible = true;
  let alpha = 1;
  let program: WebGLProgram | null = null;
  const bufs: (WebGLBuffer | null)[] = [];
  const locs: number[] = [];
  let uM: WebGLUniformLocation | null = null;
  let uT: WebGLUniformLocation | null = null;
  let uA: WebGLUniformLocation | null = null;
  let uScale: WebGLUniformLocation | null = null;
  let broken = false;
  let glRef: WebGL2RenderingContext | null = null;

  const handle: BloomHandle = {
    setVisible: (v) => (visible = v),
    setAlpha: (a) => (alpha = a),
    setPoints: (p) => {
      points = p;
      rebuild();
    },
    destroy: () => {},
  };

  const BLOOM_VERT = `
precision highp float;
attribute vec2 aCenter;
attribute vec2 aCorner;
attribute vec3 aColor;
attribute float aIntensity;
uniform mat4 uMatrix;
uniform float uScale;
varying vec2 vLocal;
varying vec3 vColor;
varying float vIntensity;
void main(){
  vLocal = aCorner;
  vColor = aColor;
  vIntensity = aIntensity;
  vec2 p = aCenter + aCorner * (0.00085 + aIntensity * 0.0012) * uScale;
  gl_Position = uMatrix * vec4(p, 0.0, 1.0);
}`;

  const BLOOM_FRAG = `
precision mediump float;
varying vec2 vLocal;
varying vec3 vColor;
varying float vIntensity;
uniform float uTime;
uniform float uAlpha;
void main(){
  float r = length(vLocal);
  float glow = exp(-r * r * 2.6) * (0.35 + 0.65 * vIntensity);
  float ring = smoothstep(0.72, 0.82, r) * (1.0 - smoothstep(0.86, 0.96, r)) * 0.6 * vIntensity;
  float breathe = 0.85 + 0.15 * sin(uTime * 1.6);
  float a = (glow + ring) * uAlpha * breathe;
  gl_FragColor = vec4(vColor, clamp(a, 0.0, 1.0));
}`;

  const layer: maplibregl.CustomLayerInterface = {
    id,
    type: "custom",
    renderingMode: "3d",
    onAdd: (_map, gl) => {
      owningMapRef = _map;
      glRef = gl;
      try {
        program = buildProgram(gl, BLOOM_VERT, BLOOM_FRAG);
        if (!program) throw new Error("no program");
        bufs.push(makeBuffer(gl, aCenter));
        bufs.push(makeBuffer(gl, aCorner));
        bufs.push(makeBuffer(gl, aColor));
        bufs.push(makeBuffer(gl, aIntensity));
        if (bufs.some((b) => !b)) throw new Error("no buffer");
        ["aCenter", "aCorner", "aColor", "aIntensity"].forEach((name) =>
          locs.push(gl.getAttribLocation(program!, name))
        );
        uM = gl.getUniformLocation(program, "uMatrix");
        uT = gl.getUniformLocation(program, "uTime");
        uA = gl.getUniformLocation(program, "uAlpha");
        uScale = gl.getUniformLocation(program, "uScale");
      } catch (err) {
        console.warn("SD bloom layer unavailable.", err);
        broken = true;
      }
    },
    render: (gl, args) => {
      if (broken || !visible || alpha <= 0.002 || !program || V === 0) return;
      if (dirty && glRef) {
        gl.bindBuffer(gl.ARRAY_BUFFER, bufs[0]);
        gl.bufferData(gl.ARRAY_BUFFER, aCenter, gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, bufs[1]);
        gl.bufferData(gl.ARRAY_BUFFER, aCorner, gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, bufs[2]);
        gl.bufferData(gl.ARRAY_BUFFER, aColor, gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, bufs[3]);
        gl.bufferData(gl.ARRAY_BUFFER, aIntensity, gl.DYNAMIC_DRAW);
        dirty = false;
      }
      gl.useProgram(program);
      const sizes = [2, 2, 3, 1];
      bindAttribs(
        gl,
        locs.map((loc, i) => ({ loc, buffer: bufs[i], size: sizes[i] }))
      );
      gl.uniformMatrix4fv(uM, false, args.modelViewProjectionMatrix);
      gl.uniform1f(uT, performance.now() / 1000);
      gl.uniform1f(uA, alpha);
      gl.uniform1f(uScale, 1);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.disable(gl.DEPTH_TEST);
      gl.drawArrays(gl.TRIANGLES, 0, V);
      gl.drawArrays(gl.TRIANGLES, 0, V);
      owningMapRef?.triggerRepaint();
    },
    onRemove: (_map, gl) => {
      bufs.forEach((b) => b && gl.deleteBuffer(b));
      if (program) gl.deleteProgram(program);
    },
  };

  return { layer, handle };
}

/* ═════════════════════════════════════════════════════════════
   6. SWATH SWEEP — animated Sentinel-1 SAR scan band
   ═════════════════════════════════════════════════════════════ */
export interface SwathHandle extends LivingHandle {
  setAxis: (a: LonLat, b: LonLat) => void;
  setActive: (a: boolean) => void;
}

export function createSwathSweepLayer(id: string): {
  layer: maplibregl.CustomLayerInterface;
  handle: SwathHandle;
} {
  let A: LonLat = [68.2, 20.4];
  let B: LonLat = [70.4, 23.2];

  /* quad: aAlong (-1..1) along the axis, aSide (-1..1) across it */
  const aAlong = new Float32Array([-1, -1, 1, 1, -1, 1]);
  const aSide = new Float32Array([-1, 1, -1, 1, -1, 1]);

  let visible = true;
  let active = true;
  let alpha = 0.0;
  let program: WebGLProgram | null = null;
  let bAlong: WebGLBuffer | null = null;
  let bSide: WebGLBuffer | null = null;
  let aAlongLoc = -1, aSideLoc = -1;
  let uM: WebGLUniformLocation | null = null;
  let uA: WebGLUniformLocation | null = null;
  let uStart: WebGLUniformLocation | null = null;
  let uDir: WebGLUniformLocation | null = null;
  let uPerp: WebGLUniformLocation | null = null;
  let uBand: WebGLUniformLocation | null = null;
  let uHalfW: WebGLUniformLocation | null = null;
  let uAxisLen: WebGLUniformLocation | null = null;
  let uSweep: WebGLUniformLocation | null = null;
  let broken = false;

  const handle: SwathHandle = {
    setVisible: (v) => (visible = v),
    setAlpha: (a) => (alpha = a),
    setActive: (a) => (active = a),
    setAxis: (a, b) => {
      A = a;
      B = b;
    },
    destroy: () => {},
  };

  const SWEEP_VERT = `
precision highp float;
attribute float aAlong;
attribute float aSide;
uniform mat4 uMatrix;
uniform vec2 uStart;
uniform vec2 uDir;    // unit axis direction (mercator)
uniform vec2 uPerp;
uniform float uBand;  // mercator half-length along axis
uniform float uHalfW; // mercator half-width
uniform float uAxisLen; // full mercator axis length
uniform float uSweep; // 0..1 scan position
varying float vAlong;
varying float vSide;
void main(){
  vAlong = aAlong;
  vSide = aSide;
  vec2 center = uStart + uDir * (uSweep * uAxisLen);
  vec2 p = center + uDir * (aAlong * uBand) + uPerp * (aSide * uHalfW);
  gl_Position = uMatrix * vec4(p, 0.0, 1.0);
}`;

  const SWEEP_FRAG = `
precision mediump float;
varying float vAlong;
varying float vSide;
uniform float uAlpha;
void main(){
  float lead = smoothstep(0.2, 1.0, vAlong) * (1.0 - smoothstep(0.92, 1.0, vAlong));
  float body = smoothstep(-1.0, 0.8, vAlong) * 0.35;
  float edge = 1.0 - smoothstep(0.6, 1.0, abs(vSide));
  float a = (lead + body) * edge * uAlpha;
  vec3 col = mix(vec3(0.15, 0.55, 0.75), vec3(0.62, 0.90, 1.0), lead);
  gl_FragColor = vec4(col, clamp(a, 0.0, 0.6));
}`;

  const layer: maplibregl.CustomLayerInterface = {
    id,
    type: "custom",
    renderingMode: "3d",
    onAdd: (_map, gl) => {
      owningMapRef = _map;
      try {
        program = buildProgram(gl, SWEEP_VERT, SWEEP_FRAG);
        if (!program) throw new Error("no program");
        bAlong = makeBuffer(gl, aAlong);
        bSide = makeBuffer(gl, aSide);
        if (!bAlong || !bSide) throw new Error("no buffer");
        aAlongLoc = gl.getAttribLocation(program, "aAlong");
        aSideLoc = gl.getAttribLocation(program, "aSide");
        uM = gl.getUniformLocation(program, "uMatrix");
        uA = gl.getUniformLocation(program, "uAlpha");
        uStart = gl.getUniformLocation(program, "uStart");
        uDir = gl.getUniformLocation(program, "uDir");
        uPerp = gl.getUniformLocation(program, "uPerp");
        uBand = gl.getUniformLocation(program, "uBand");
        uHalfW = gl.getUniformLocation(program, "uHalfW");
        uAxisLen = gl.getUniformLocation(program, "uAxisLen");
        uSweep = gl.getUniformLocation(program, "uSweep");
      } catch (err) {
        console.warn("SD swath sweep layer unavailable.", err);
        broken = true;
      }
    },
    render: (gl, args) => {
      if (broken || !visible || !active || alpha <= 0.002 || !program) return;
      const ma = merc(A);
      const mb = merc(B);
      const dx = mb.x - ma.x;
      const dy = mb.y - ma.y;
      const len = Math.hypot(dx, dy) || 1;
      const dirx = dx / len;
      const diry = dy / len;
      const perpx = -diry;
      const perpy = dirx;
      const sweep = (performance.now() / 5200) % 1;

      gl.useProgram(program);
      gl.enableVertexAttribArray(aAlongLoc);
      gl.bindBuffer(gl.ARRAY_BUFFER, bAlong);
      gl.vertexAttribPointer(aAlongLoc, 1, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(aSideLoc);
      gl.bindBuffer(gl.ARRAY_BUFFER, bSide);
      gl.vertexAttribPointer(aSideLoc, 1, gl.FLOAT, false, 0, 0);

      gl.uniformMatrix4fv(uM, false, args.modelViewProjectionMatrix);
      gl.uniform2f(uStart, ma.x, ma.y);
      gl.uniform2f(uDir, dirx, diry);
      gl.uniform2f(uPerp, perpx, perpy);
      gl.uniform1f(uBand, len * 0.16);
      gl.uniform1f(uHalfW, len * 0.5);
      gl.uniform1f(uAxisLen, len);
      gl.uniform1f(uSweep, sweep);
      gl.uniform1f(uA, alpha);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.disable(gl.DEPTH_TEST);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      owningMapRef?.triggerRepaint();
    },
    onRemove: (_map, gl) => {
      if (bAlong) gl.deleteBuffer(bAlong);
      if (bSide) gl.deleteBuffer(bSide);
      if (program) gl.deleteProgram(program);
    },
  };

  return { layer, handle };
}

/* ═════════════════════════════════════════════════════════════
   7. ENVIRONMENTAL HEATMAP — SST, Chlorophyll & Swell Gradients
   ═════════════════════════════════════════════════════════════ */
const ENV_FRAG = `
precision mediump float;
varying vec2 vLonLat;
uniform float uTime;
uniform float uAlpha;
uniform float uKind; // 0: SST (thermal), 1: Chlorophyll (biogenic), 2: Wave Height
${GLSL_NOISE}

void main(){
  vec2 ll = vLonLat;
  // Offshore to coastal gradient
  float coastal = clamp((ll.x - 67.0) / 3.4, 0.0, 1.0);
  float latGrad = clamp((ll.y - 20.0) / 3.2, 0.0, 1.0);

  vec3 col = vec3(0.0);
  float alpha = 0.0;

  // 0: Sea Surface Temperature (SST: 28.2°C to 30.2°C)
  if (uKind < 0.5) {
    float tempNorm = clamp(coastal * 0.65 + latGrad * 0.25 + fbm(ll * 4.0 + uTime * 0.005) * 0.15, 0.0, 1.0);
    vec3 cool = vec3(0.12, 0.42, 0.72); // 28.2°C
    vec3 mid  = vec3(0.92, 0.68, 0.18); // 29.2°C
    vec3 warm = vec3(0.92, 0.22, 0.12); // 30.2°C
    col = mix(cool, mid, smoothstep(0.0, 0.5, tempNorm));
    col = mix(col, warm, smoothstep(0.5, 1.0, tempNorm));
    // Soft thermal isolines
    float iso = fract(tempNorm * 6.0);
    float line = 1.0 - smoothstep(0.0, 0.05, min(iso, 1.0 - iso));
    col = mix(col, vec3(1.0), line * 0.2);
    alpha = uAlpha * 0.42;
  }
  // 1: Chlorophyll-a (biogenic bloom indicator: green/cyan estuarine plumes)
  else if (uKind < 1.5) {
    float inshore = smoothstep(68.8, 70.4, ll.x) * (1.0 - smoothstep(22.3, 23.2, ll.y));
    float bloom = clamp(inshore * 0.75 + fbm(ll * 7.5 + uTime * 0.004) * 0.35, 0.0, 1.0);
    vec3 lowBio  = vec3(0.04, 0.18, 0.28);
    vec3 midBio  = vec3(0.08, 0.55, 0.38);
    vec3 highBio = vec3(0.35, 0.88, 0.42);
    col = mix(lowBio, midBio, smoothstep(0.1, 0.5, bloom));
    col = mix(col, highBio, smoothstep(0.5, 1.0, bloom));
    alpha = uAlpha * (0.15 + bloom * 0.45);
  }
  // 2: Wave Height Swell field
  else {
    float swell = clamp(1.0 - coastal * 0.75 + sin(ll.x * 12.0 + uTime * 0.1) * 0.1, 0.0, 1.0);
    vec3 calm  = vec3(0.05, 0.25, 0.42);
    vec3 heavy = vec3(0.20, 0.72, 0.88);
    col = mix(calm, heavy, swell);
    alpha = uAlpha * (0.2 + swell * 0.3);
  }

  gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.85));
}`;

export function createEnvironmentalHeatmapLayer(
  id: string,
  kind: "sst" | "chlorophyll" | "wave"
): { layer: maplibregl.CustomLayerInterface; handle: LivingHandle } {
  const { pos, lon, count } = quadBuffers(AOI);
  let visible = false;
  let alpha = 0.6;
  let program: WebGLProgram | null = null;
  let bPos: WebGLBuffer | null = null;
  let bLon: WebGLBuffer | null = null;
  let aPos = -1, aLon = -1;
  let uM: WebGLUniformLocation | null = null;
  let uT: WebGLUniformLocation | null = null;
  let uA: WebGLUniformLocation | null = null;
  let uKindLoc: WebGLUniformLocation | null = null;
  let broken = false;

  const kindFloat = kind === "sst" ? 0.0 : kind === "chlorophyll" ? 1.0 : 2.0;

  const handle: LivingHandle = {
    setVisible: (v) => (visible = v),
    setAlpha: (a) => (alpha = a),
    destroy: () => {},
  };

  const layer: maplibregl.CustomLayerInterface = {
    id,
    type: "custom",
    renderingMode: "3d",
    onAdd: (_map, gl) => {
      owningMapRef = _map;
      try {
        program = buildProgram(gl, QUAD_VERT, ENV_FRAG);
        if (!program) throw new Error("no program");
        bPos = makeBuffer(gl, pos);
        bLon = makeBuffer(gl, lon);
        if (!bPos || !bLon) throw new Error("no buffer");
        aPos = gl.getAttribLocation(program, "aPos");
        aLon = gl.getAttribLocation(program, "aLonLat");
        uM = gl.getUniformLocation(program, "uMatrix");
        uT = gl.getUniformLocation(program, "uTime");
        uA = gl.getUniformLocation(program, "uAlpha");
        uKindLoc = gl.getUniformLocation(program, "uKind");
      } catch (err) {
        console.warn(`SD env layer ${kind} unavailable:`, err);
        broken = true;
      }
    },
    render: (gl, args) => {
      if (broken || !visible || alpha <= 0.002 || !program) return;
      gl.useProgram(program);
      bindAttribs(gl, [
        { loc: aPos, buffer: bPos, size: 2 },
        { loc: aLon, buffer: bLon, size: 2 },
      ]);
      gl.uniformMatrix4fv(uM, false, args.modelViewProjectionMatrix);
      gl.uniform1f(uT, performance.now() / 1000);
      gl.uniform1f(uA, alpha);
      gl.uniform1f(uKindLoc, kindFloat);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.disable(gl.DEPTH_TEST);
      gl.drawArrays(gl.TRIANGLES, 0, count);
      owningMapRef?.triggerRepaint();
    },
    onRemove: (_map, gl) => {
      if (bPos) gl.deleteBuffer(bPos);
      if (bLon) gl.deleteBuffer(bLon);
      if (program) gl.deleteProgram(program);
    },
  };

  return { layer, handle };
}

