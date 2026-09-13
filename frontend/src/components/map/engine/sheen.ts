import * as maplibregl from "maplibre-gl";

/* ─────────────────────────────────────────────────────────────
   OIL SPILL — PROCEDURAL MULTILAYER SHEEN & 3D CONTAMINATION ENGINE
   Implements 6 scientific layers & 4 selectable visualization modes:
     1. 2D SAR Anomaly (radar backscatter damping)
     2. Thickness Heatmap (Maroon → Crimson → Orange → Amber)
     3. 3D Volume Extrusion (volumetric thickness relief with lighting)
     4. Confidence Mesh (triangulated probability isoline lattice)

   Also renders an animated 4-second expanding investigation pulse
   and capillary wave damping. Pure WebGL custom layer.
   ───────────────────────────────────────────────────────────── */

export type ContaminationMode = "sar" | "heatmap" | "volume" | "mesh";

const VERT_SRC = `
precision highp float;
attribute vec2 aPos;      // mercator xy
attribute vec2 aLonLat;   // geographic lon, lat
attribute float aCone;    // normalized distance from centroid (0=core, 1=rim)
attribute float aThick;   // estimated thickness in microns (0..100)

uniform mat4 uMatrix;
uniform float uMode;      // 0: SAR, 1: Heatmap, 2: 3D Volume, 3: Mesh
uniform float uHeightScale;
uniform float uTime;

varying vec2 vLonLat;
varying float vCone;
varying float vThick;
varying float vHeight;
varying vec3 vNormal;

void main() {
  vLonLat = aLonLat;
  vCone = aCone;
  vThick = aThick;

  // In 3D Volume mode, extrude the height upward based on thickness
  float h = 0.0;
  if (uMode > 1.5 && uMode < 2.5) {
    // Volumetric extrusion with soft breathing
    h = (aThick / 100.0) * uHeightScale * (0.95 + 0.05 * sin(uTime * 1.5 + aCone * 6.28));
  }
  vHeight = h;

  // Simple normal for 3D volumetric shading
  vec3 norm = vec3(0.0, 0.0, 1.0);
  if (uMode > 1.5 && uMode < 2.5) {
    norm = normalize(vec3(-sin(aCone * 3.1415), -cos(aCone * 3.1415), 0.8));
  }
  vNormal = norm;

  gl_Position = uMatrix * vec4(aPos, h, 1.0);
}`;

const FRAG_SRC = `
precision mediump float;
varying vec2 vLonLat;
varying float vCone;
varying float vThick;
varying float vHeight;
varying vec3 vNormal;

uniform float uTime;
uniform float uAspect;
uniform float uAlpha;
uniform float uMode; // 0: SAR, 1: Heatmap, 2: 3D Volume, 3: Mesh

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

// Mineral oil iridescence (petroleum blue, amber, violet, silver)
vec3 mineralSheen(float t) {
  t = fract(t);
  vec3 a = vec3(0.24, 0.48, 0.88); // petroleum blue
  vec3 b = vec3(0.92, 0.62, 0.22); // mineral amber
  vec3 c = vec3(0.68, 0.32, 0.82); // iridescent purple
  vec3 d = vec3(0.75, 0.85, 0.90); // silver sheen
  vec3 ab = mix(a, b, smoothstep(0.0, 0.34, t));
  vec3 bc = mix(b, c, smoothstep(0.34, 0.68, t));
  vec3 cd = mix(c, d, smoothstep(0.68, 1.0, t));
  return mix(ab, cd, smoothstep(0.25, 0.75, t));
}

// 4-Tier Thickness Heatmap: Maroon → Red → Orange → Amber
vec3 thicknessHeatmap(float normThick) {
  vec3 maroon = vec3(0.42, 0.04, 0.08); // Heavy emulsion core (>80 µm)
  vec3 red    = vec3(0.88, 0.12, 0.10); // Thick slick (40-80 µm)
  vec3 orange = vec3(0.96, 0.48, 0.12); // Medium slick (15-40 µm)
  vec3 yellow = vec3(0.98, 0.84, 0.22); // Thin sheen (<15 µm)

  if (normThick > 0.75) {
    return mix(red, maroon, (normThick - 0.75) * 4.0);
  } else if (normThick > 0.4) {
    return mix(orange, red, (normThick - 0.4) / 0.35);
  } else {
    return mix(yellow, orange, normThick / 0.4);
  }
}

void main() {
  vec2 uv = vLonLat;
  uv.y *= uAspect;
  vec2 nv = uv * vec2(240.0, 140.0);

  // Fractal organic displacement
  float n1 = fbm(nv + uTime * vec2(0.012, -0.008));
  float n2 = fbm(nv * 1.8 - uTime * vec2(0.015, 0.005));
  float wob = n1 * 0.55 + n2 * 0.25;

  // Natural edge damping
  float edge = smoothstep(0.60, 0.98, vCone - 0.04 + wob * 0.15);
  float inside = smoothstep(0.0, 0.24, vCone);
  float alpha = uAlpha * (0.35 + 0.45 * (1.0 - edge)) * inside;

  vec3 col = vec3(0.0);

  // 1. SAR Anomaly Mode (Dark low-backscatter footprint + subtle metallic edge)
  if (uMode < 0.5) {
    vec3 sarDark = vec3(0.02, 0.06, 0.10); // Deep backscatter suppression
    float radarSheen = fbm(nv * 0.8 + uTime * 0.01) * 0.15;
    col = sarDark + vec3(0.12, 0.32, 0.44) * radarSheen;
    alpha *= 0.85;
  }
  // 2. Heatmap Mode (4-tier thickness)
  else if (uMode < 1.5) {
    float normThick = clamp((1.0 - vCone * 0.95) + (n1 - 0.5) * 0.2, 0.0, 1.0);
    col = thicknessHeatmap(normThick);
    // Add contour lines every 25%
    float iso = fract(normThick * 4.0);
    float line = 1.0 - smoothstep(0.0, 0.06, min(iso, 1.0 - iso));
    col = mix(col, vec3(1.0, 0.95, 0.8), line * 0.4);
    alpha = uAlpha * (0.55 + 0.35 * normThick) * (1.0 - edge);
  }
  // 3. 3D Volume Mode (Translucent Volumetric Lighting & Depth)
  else if (uMode < 2.5) {
    float normThick = clamp((1.0 - vCone * 0.92), 0.0, 1.0);
    vec3 baseCol = thicknessHeatmap(normThick);

    // Volumetric directional light + rim glow
    vec3 lightDir = normalize(vec3(0.4, 0.6, 0.8));
    float diff = max(0.2, dot(vNormal, lightDir));
    float rim = pow(1.0 - max(0.0, vNormal.z), 2.0);

    col = baseCol * (diff * 0.75 + 0.25) + vec3(0.9, 0.8, 0.6) * rim * 0.4;
    alpha = uAlpha * (0.65 + 0.30 * (1.0 - vCone)) * (1.0 - edge);
  }
  // 4. Confidence Mesh Mode (Wireframe lattice & probability isolines)
  else {
    float normThick = clamp(1.0 - vCone, 0.0, 1.0);
    vec3 meshBase = vec3(0.08, 0.24, 0.36);
    float gridX = fract(vLonLat.x * 2200.0);
    float gridY = fract(vLonLat.y * 2200.0);
    float wire = step(0.90, gridX) + step(0.90, gridY);
    wire = clamp(wire, 0.0, 1.0);

    vec3 wireCol = mix(vec3(0.22, 0.85, 0.92), vec3(0.96, 0.62, 0.24), normThick);
    col = mix(meshBase, wireCol, wire);
    alpha = uAlpha * (wire * 0.75 + 0.22);
  }

  // Iridescent mineral dispersion blend for realism across all modes
  float disp = n1 * 1.5 + n2 * 2.0 + 0.15 * sin(vLonLat.y * 160.0 + uTime * 0.06);
  vec3 mineral = mineralSheen(disp);
  col = mix(col, mineral, 0.28 * (1.0 - vCone * 0.6));

  // Layer 5: 4-Second Expanding Radar Investigation Pulse (Scientific Amber Wave)
  float pulseCycle = fract(uTime / 4.0);
  float pulseRadius = 0.08 + pulseCycle * 0.82;
  float pulseDist = abs(vCone - pulseRadius);
  float pulseLine = 1.0 - smoothstep(0.0, 0.14, pulseDist);
  float pulseFade = (1.0 - pulseCycle) * (1.0 - pulseCycle);
  vec3 pulseColor = vec3(0.95, 0.74, 0.26); // Amber investigation wave
  col += pulseColor * pulseLine * pulseFade * 0.65;
  alpha += pulseLine * pulseFade * 0.35 * uAlpha;

  gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.96));
}`;

export interface SheenLayerHandle {
  setVisible: (v: boolean) => void;
  setAlpha: (a: number) => void;
  setMode: (mode: ContaminationMode) => void;
  setHeightScale: (h: number) => void;
}

export function createOilSheenLayer(
  id: string,
  ring: [number, number][]
): { layer: maplibregl.CustomLayerInterface; handle: SheenLayerHandle } {
  const n = Math.max(3, ring.length);
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
  const thick = new Float32Array(count);

  const cMerc = maplibregl.MercatorCoordinate.fromLngLat([cx, cy], 0);
  pos[0] = cMerc.x;
  pos[1] = cMerc.y;
  lon[0] = cx;
  lon[1] = cy;
  cone[0] = 0;
  thick[0] = 95.0; // Core thickness in microns

  for (let i = 0; i < n; i++) {
    const p = ring[i];
    const o = 2 * (i + 1);
    const merc = maplibregl.MercatorCoordinate.fromLngLat([p[0], p[1]], 0);
    pos[o] = merc.x;
    pos[o + 1] = merc.y;
    lon[o] = p[0];
    lon[o + 1] = p[1];
    const cVal = (dist[i] / maxD) * 0.98 + 0.02;
    cone[i + 1] = cVal;
    thick[i + 1] = Math.max(2.0, (1.0 - cVal) * 90.0);
  }

  let visible = true;
  let alpha = 0.38;
  let currentMode: ContaminationMode = "heatmap";
  let heightScale = 0.00035;

  let program: WebGLProgram | null = null;
  let bufPos: WebGLBuffer | null = null;
  let bufLon: WebGLBuffer | null = null;
  let bufCone: WebGLBuffer | null = null;
  let bufThick: WebGLBuffer | null = null;

  let aPos = -1;
  let aLonLat = -1;
  let aCone = -1;
  let aThick = -1;

  let uMatrix: WebGLUniformLocation | null = null;
  let uTime: WebGLUniformLocation | null = null;
  let uAspect: WebGLUniformLocation | null = null;
  let uAlpha: WebGLUniformLocation | null = null;
  let uModeLoc: WebGLUniformLocation | null = null;
  let uHeightScaleLoc: WebGLUniformLocation | null = null;
  let broken = false;

  const modeToFloat = (m: ContaminationMode) => {
    switch (m) {
      case "sar": return 0.0;
      case "heatmap": return 1.0;
      case "volume": return 2.0;
      case "mesh": return 3.0;
      default: return 1.0;
    }
  };

  const handle: SheenLayerHandle = {
    setVisible: (v) => (visible = v),
    setAlpha: (a) => (alpha = a),
    setMode: (m) => (currentMode = m),
    setHeightScale: (h) => (heightScale = h),
  };

  const layer: maplibregl.CustomLayerInterface = {
    id,
    type: "custom",
    renderingMode: "3d",
    onAdd: (_map: maplibregl.Map, gl: WebGL2RenderingContext) => {
      try {
        const vs = gl.createShader(gl.VERTEX_SHADER);
        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        if (!vs || !fs) throw new Error("shader create fail");

        gl.shaderSource(vs, VERT_SRC);
        gl.compileShader(vs);
        if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
          console.warn("SD sheen VS:", gl.getShaderInfoLog(vs));
        }

        gl.shaderSource(fs, FRAG_SRC);
        gl.compileShader(fs);
        if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
          console.warn("SD sheen FS:", gl.getShaderInfoLog(fs));
        }

        program = gl.createProgram();
        if (!program) throw new Error("prog create fail");
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);

        bufPos = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, bufPos);
        gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);

        bufLon = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, bufLon);
        gl.bufferData(gl.ARRAY_BUFFER, lon, gl.STATIC_DRAW);

        bufCone = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, bufCone);
        gl.bufferData(gl.ARRAY_BUFFER, cone, gl.STATIC_DRAW);

        bufThick = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, bufThick);
        gl.bufferData(gl.ARRAY_BUFFER, thick, gl.STATIC_DRAW);

        aPos = gl.getAttribLocation(program, "aPos");
        aLonLat = gl.getAttribLocation(program, "aLonLat");
        aCone = gl.getAttribLocation(program, "aCone");
        aThick = gl.getAttribLocation(program, "aThick");

        uMatrix = gl.getUniformLocation(program, "uMatrix");
        uTime = gl.getUniformLocation(program, "uTime");
        uAspect = gl.getUniformLocation(program, "uAspect");
        uAlpha = gl.getUniformLocation(program, "uAlpha");
        uModeLoc = gl.getUniformLocation(program, "uMode");
        uHeightScaleLoc = gl.getUniformLocation(program, "uHeightScale");
      } catch (err) {
        console.warn("SD sheen layer init error:", err);
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

      gl.enableVertexAttribArray(aThick);
      gl.bindBuffer(gl.ARRAY_BUFFER, bufThick);
      gl.vertexAttribPointer(aThick, 1, gl.FLOAT, false, 0, 0);

      gl.uniformMatrix4fv(uMatrix, false, args.modelViewProjectionMatrix);
      gl.uniform1f(uTime, performance.now() / 1000);
      gl.uniform1f(uAspect, Math.max(0.1, gl.drawingBufferWidth / Math.max(1, gl.drawingBufferHeight)));
      gl.uniform1f(uAlpha, alpha);
      gl.uniform1f(uModeLoc, modeToFloat(currentMode));
      gl.uniform1f(uHeightScaleLoc, heightScale);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.disable(gl.DEPTH_TEST);

      gl.drawArrays(gl.TRIANGLE_FAN, 0, count);
    },
    onRemove: (_map: maplibregl.Map, gl: WebGL2RenderingContext) => {
      if (bufPos) gl.deleteBuffer(bufPos);
      if (bufLon) gl.deleteBuffer(bufLon);
      if (bufCone) gl.deleteBuffer(bufCone);
      if (bufThick) gl.deleteBuffer(bufThick);
      if (program) gl.deleteProgram(program);
    },
  };

  return { layer, handle };
}