import * as maplibregl from "maplibre-gl";

/* ─────────────────────────────────────────────────────────────
   OIL SPILL — PROCEDURAL MULTILAYER SHEEN (WebGL custom layer)
   Renders an iridescent, noisily-displaced oil sheen embedded
   into the satellite raster, plus an internal contamination
   heat gradient and a slow 5 s contamination pulse ring.

   Geometry is triangulated as a fan from the polygon centroid
   in Mercator world units; every frame the fragment shader
   displaces the edge with fbm noise so the patch looks like
   floating oil, not a vector fill.
   ───────────────────────────────────────────────────────────── */

const VERT_SRC = `
precision highp float;
attribute vec2 aPos;
attribute vec2 aLonLat;
attribute float aCone;
uniform mat4 uMatrix;
varying vec2 vLonLat;
varying float vCone;
void main() {
  vLonLat = aLonLat;
  vCone = aCone;
  gl_Position = uMatrix * vec4(aPos, 0.0, 1.0);
}`;

const FRAG_SRC = `
precision mediump float;
varying vec2 vLonLat;
varying float vCone;
uniform float uTime;
uniform float uAspect;
uniform float uAlpha;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.55;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.03;
    a *= 0.5;
  }
  return v;
}
vec3 iri(float t) {
  t = fract(t);
  vec3 a = vec3(0.28, 0.44, 0.84);
  vec3 b = vec3(0.88, 0.56, 0.24);
  vec3 c = vec3(0.58, 0.34, 0.78);
  vec3 d = vec3(0.20, 0.64, 0.40);
  vec3 ab = mix(a, b, smoothstep(0.0, 0.34, t));
  vec3 bc = mix(b, c, smoothstep(0.34, 0.68, t));
  vec3 cd = mix(c, d, smoothstep(0.68, 1.0, t));
  return mix(ab, cd, smoothstep(0.25, 0.75, t));
}
void main() {
  vec2 uv = vLonLat;
  uv.y *= uAspect;
  vec2 nv = uv * vec2(220.0, 130.0);

  float n = fbm(nv + uTime * vec2(0.012, -0.009));
  float n2 = fbm(nv * 1.7 - uTime * vec2(0.017, 0.006));

  /* organic, slowly-breathed edge so the patch never looks rigid */
  float wob = n * 0.55 + n2 * 0.25;
  float edge = smoothstep(0.55, 0.98, vCone - 0.05 + wob * 0.16);
  float inside = smoothstep(0.0, 0.28, vCone);
  float alpha = uAlpha * (0.3 + 0.34 * (1.0 - edge)) * inside;

  float t = n * 1.6 + n2 * 2.2 + 0.18 * sin(vLonLat.y * 140.0 + uTime * 0.05);
  vec3 col = iri(t) * 0.9;

  /* contamination heat — densest near the observed origin */
  float heat = clamp(1.0 - vCone * 0.92, 0.0, 1.0);
  vec3 heatCol = mix(
    vec3(0.92, 0.64, 0.18),
    vec3(0.76, 0.15, 0.10),
    smoothstep(0.5, 0.95, heat)
  );
  col = mix(col, heatCol, clamp(heat * 0.55, 0.0, 1.0));

  /* 5-second contamination pulse — soft expanding amber ring */
  float k = fract(uTime / 5.0);
  float r = 0.12 + k * 0.75;
  float pulse = 1.0 - smoothstep(0.0, 0.16, abs(vCone - r));
  alpha += pulse * (1.0 - k) * 0.32 * uAlpha;

  gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.95));
}`;

function compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn("SD sheen shader failed:", gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

function buildProgram(gl: WebGL2RenderingContext): WebGLProgram | null {
  const vs = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn("SD sheen program link failed:", gl.getProgramInfoLog(prog));
    return null;
  }
  return prog;
}

function compileBuffer(gl: WebGL2RenderingContext, data: Float32Array): WebGLBuffer | null {
  const buf = gl.createBuffer();
  if (!buf) return null;
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return buf;
}

export interface SheenLayerHandle {
  /** turn the whole layer on / off from the toggle system */
  setVisible: (v: boolean) => void;
  /** ramp opacity for the SAR-detection reveal choreography */
  setAlpha: (a: number) => void;
}

export function createOilSheenLayer(
  id: string,
  ring: [number, number][]
): { layer: maplibregl.CustomLayerInterface; handle: SheenLayerHandle } {
  const n = Math.max(3, ring.length);
  /* polygon centroid (geographic) */
  let cx = 0;
  let cy = 0;
  for (const p of ring) {
    cx += p[0];
    cy += p[1];
  }
  cx /= n;
  cy /= n;

  let maxD = 1e-9;
  const dist = ring.map((p) => {
    const d = Math.hypot(p[0] - cx, p[1] - cy);
    if (d > maxD) maxD = d;
    return d;
  });

  const count = n + 1;
  const pos = new Float32Array(count * 2);
  const lon = new Float32Array(count * 2);
  const cone = new Float32Array(count);

  const cMerc = maplibregl.MercatorCoordinate.fromLngLat([cx, cy], 0);
  pos[0] = cMerc.x;
  pos[1] = cMerc.y;
  lon[0] = cx;
  lon[1] = cy;
  cone[0] = 0;

  for (let i = 0; i < n; i++) {
    const p = ring[i];
    const o = 2 * (i + 1);
    const merc = maplibregl.MercatorCoordinate.fromLngLat([p[0], p[1]], 0);
    pos[o] = merc.x;
    pos[o + 1] = merc.y;
    lon[o] = p[0];
    lon[o + 1] = p[1];
    cone[i + 1] = (dist[i] / maxD) * 0.98 + 0.02;
  }

  let visible = true;
  let alpha = 0.3;
  let program: WebGLProgram | null = null;
  let bufPos: WebGLBuffer | null = null;
  let bufLon: WebGLBuffer | null = null;
  let bufCone: WebGLBuffer | null = null;
  let aPos = -1;
  let aLonLat = -1;
  let aCone = -1;
  let uMatrix: WebGLUniformLocation | null = null;
  let uTime: WebGLUniformLocation | null = null;
  let uAspect: WebGLUniformLocation | null = null;
  let uAlpha: WebGLUniformLocation | null = null;
  let vertexCount = 0;
  let broken = false;

  const handle: SheenLayerHandle = {
    setVisible: (v) => {
      visible = v;
    },
    setAlpha: (a) => {
      alpha = a;
    },
  };

  const layer: maplibregl.CustomLayerInterface = {
    id,
    type: "custom",
    renderingMode: "3d",
    onAdd: (_map: maplibregl.Map, gl: WebGL2RenderingContext) => {
      try {
        const p = buildProgram(gl);
        if (!p) throw new Error("no program");
        const bp = compileBuffer(gl, pos);
        const bl = compileBuffer(gl, lon);
        const bc = compileBuffer(gl, cone);
        if (!bp || !bl || !bc) throw new Error("no buffer");
        program = p;
        bufPos = bp;
        bufLon = bl;
        bufCone = bc;
        aPos = gl.getAttribLocation(p, "aPos");
        aLonLat = gl.getAttribLocation(p, "aLonLat");
        aCone = gl.getAttribLocation(p, "aCone");
        uMatrix = gl.getUniformLocation(p, "uMatrix");
        uTime = gl.getUniformLocation(p, "uTime");
        uAspect = gl.getUniformLocation(p, "uAspect");
        uAlpha = gl.getUniformLocation(p, "uAlpha");
        vertexCount = count;
      } catch (err) {
        console.warn("SD sheen layer init failed — using fallback tints.", err);
        broken = true;
      }
    },
    render: (gl: WebGL2RenderingContext, args: maplibregl.CustomRenderMethodInput) => {
      if (broken || !visible || alpha <= 0.002 || !program) return;
      gl.useProgram(program);
      gl.enableVertexAttribArray(aPos);
      gl.bindBuffer(gl.ARRAY_BUFFER, bufPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      gl.enableVertexAttribArray(aLonLat);
      gl.bindBuffer(gl.ARRAY_BUFFER, bufLon);
      gl.vertexAttribPointer(aLonLat, 2, gl.FLOAT, false, 0, 0);

      gl.enableVertexAttribArray(aCone);
      gl.bindBuffer(gl.ARRAY_BUFFER, bufCone);
      gl.vertexAttribPointer(aCone, 1, gl.FLOAT, false, 0, 0);

      gl.uniformMatrix4fv(uMatrix, false, args.modelViewProjectionMatrix);
      gl.uniform1f(uTime, performance.now() / 1000);
      gl.uniform1f(
        uAspect,
        Math.max(0.1, gl.drawingBufferWidth / Math.max(1, gl.drawingBufferHeight))
      );
      gl.uniform1f(uAlpha, alpha);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.disable(gl.DEPTH_TEST);

      gl.drawArrays(gl.TRIANGLE_FAN, 0, vertexCount);
    },
    onRemove: (_map: maplibregl.Map, gl: WebGL2RenderingContext) => {
      if (bufPos) gl.deleteBuffer(bufPos);
      if (bufLon) gl.deleteBuffer(bufLon);
      if (bufCone) gl.deleteBuffer(bufCone);
      if (program) gl.deleteProgram(program);
    },
  };

  return { layer, handle };
}