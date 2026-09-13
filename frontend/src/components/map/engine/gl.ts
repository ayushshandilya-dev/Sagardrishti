import * as maplibregl from "maplibre-gl";

/* ─────────────────────────────────────────────────────────────
   SHARED WEBGL PRIMITIVES FOR LIVING CUSTOM LAYERS
   Small, allocation-free helpers used by every engine layer so
   the geospatial renderer has one place for shader/buffer life
   cycle and graceful degradation (a broken layer never blanks
   the map — it just warns and no-ops).
   ───────────────────────────────────────────────────────────── */

export interface LivingHandle {
  /** toggle the layer from the store layer chips */
  setVisible: (v: boolean) => void;
  /** ramp global opacity for choreography (detection reveal, etc.) */
  setAlpha: (a: number) => void;
  /** release GPU resources early (map teardown also handles it) */
  destroy: () => void;
}

export function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  src: string
): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn("SD living shader failed:", gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

export function buildProgram(
  gl: WebGL2RenderingContext,
  vert: string,
  frag: string
): WebGLProgram | null {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vert);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, frag);
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn("SD living program link failed:", gl.getProgramInfoLog(prog));
    gl.deleteProgram(prog);
    return null;
  }
  return prog;
}

export function makeBuffer(
  gl: WebGL2RenderingContext,
  data: Float32Array,
  usage: number = 0x88e4 /* STATIC_DRAW */
): WebGLBuffer | null {
  const buf = gl.createBuffer();
  if (!buf) return null;
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, data, usage);
  return buf;
}

/** Attribute wiring descriptor consumed by bindAttribs. */
export interface Attrib {
  loc: number;
  buffer: WebGLBuffer | null;
  size: number;
}

export function bindAttribs(gl: WebGL2RenderingContext, attribs: Attrib[]) {
  for (const a of attribs) {
    if (a.loc < 0 || !a.buffer) continue;
    gl.enableVertexAttribArray(a.loc);
    gl.bindBuffer(gl.ARRAY_BUFFER, a.buffer);
    gl.vertexAttribPointer(a.loc, a.size, gl.FLOAT, false, 0, 0);
  }
}

/** Pixels-per-Mercator-unit at a given integer-ish zoom (512px tiles). */
export function mercatorScale(zoom: number): number {
  return 512 * Math.pow(2, zoom);
}

/** Simple 2-colour ramp for shader-free CPU colour choices. */
export function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ar = (pa >> 16) & 255,
    ag = (pa >> 8) & 255,
    ab = pa & 255;
  const br = (pb >> 16) & 255,
    bg = (pb >> 8) & 255,
    bb = pb & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${bl})`;
}

export type LonLat = [number, number];

export function merc(lngLat: LonLat): { x: number; y: number } {
  const c = maplibregl.MercatorCoordinate.fromLngLat(lngLat, 0);
  return { x: c.x, y: c.y };
}
