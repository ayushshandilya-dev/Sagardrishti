import { Incident } from "@/lib/types";

/* ─────────────────────────────────────────────────────────────
   Deterministic SAR product renderer.

   Renders the Sentinel-1 C-band scene (sea / land silhouette,
   SAR speckle, bright vessel returns, and the dark oil slick)
   for each processing band. All geometry is deterministic per
   incident, so RAW / VV / VH / VH / FILTERED / SEGMENTATION /
   FINAL MASK line up pixel-for-pixel between canvases.
   ───────────────────────────────────────────────────────────── */

export type SarBand =
  | "RAW"
  | "CALIBRATED"
  | "FILTERED"
  | "VV"
  | "VH"
  | "SEGMENTATION"
  | "FINAL MASK";

export const BANDS: SarBand[] = [
  "RAW",
  "CALIBRATED",
  "FILTERED",
  "VV",
  "VH",
  "SEGMENTATION",
  "FINAL MASK",
];

export function hashSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Organic slick silhouette — shared with the 3D volume. */
export function buildSlickPolygon(
  seed: number,
  W: number,
  H: number,
  orientationDeg: number,
  aspect: number
): [number, number][] {
  const rng = mulberry32(seed);
  const cx = W * (0.52 + rng() * 0.18);
  const cy = H * (0.4 + rng() * 0.16);
  const a = Math.min(W, H) * (0.16 + rng() * 0.05) * Math.max(1, aspect);
  const b = a / (2 + rng() * 0.7);
  const base = Math.PI / 2;
  const pts: [number, number][] = [];
  const N = 44;
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    const rr = 0.82 + rng() * 0.34;
    const wob = 1 + 0.18 * Math.sin(3 * t + rng()) + 0.1 * Math.sin(5 * t);
    const r = Math.min(1, rr) * wob;
    const x = Math.cos(t) * a * r;
    const y = Math.sin(t) * b * r;
    const rot = (orientationDeg * Math.PI) / 180 + base;
    pts.push([
      cx + x * Math.cos(rot) - y * Math.sin(rot),
      cy + x * Math.sin(rot) + y * Math.cos(rot),
    ]);
  }
  return pts;
}

/* Deterministic sea bed texture for bathymetric feel (not exported). */

export interface BandOpts {
  growth?: number; // 0..1 — segmentation growth / slick visibility
  reveal?: number; // 0..1 — radial reveal (telemetry → footprint)
  verified?: boolean; // FINAL MASK hardened after verification
  dpr?: number; // device pixel ratio
}

interface Tone {
  sea: number;
  land: number;
  speckle: number;
  slick: number;
  gain: number;
  dark?: number;
}

const TONE: Record<SarBand, Tone> = {
  RAW: { sea: 46, land: 58, speckle: 34, slick: 30, gain: 1.0 },
  CALIBRATED: { sea: 52, land: 66, speckle: 30, slick: 58, gain: 1.45 },
  FILTERED: { sea: 54, land: 66, speckle: 9, slick: 50, gain: 1.3 },
  VV: { sea: 60, land: 72, speckle: 30, slick: 34, gain: 1.35 },
  VH: { sea: 42, land: 56, speckle: 30, slick: 78, gain: 1.6 },
  SEGMENTATION: { sea: 52, land: 66, speckle: 30, slick: 58, gain: 1.45 },
  "FINAL MASK": { sea: 52, land: 66, speckle: 30, slick: 58, gain: 1.45 },
};

/* Slick silhouette normalised to 0..1 (matches buildSlickPolygon at 1000x700). */
export function slickNorm(incident: Incident): [number, number][] {
  const seed = hashSeed(incident.eventId);
  return buildSlickPolygon(
    seed,
    1000,
    700,
    incident.spillGeometry.skeletonOrientationDeg,
    Math.max(
      1.05,
      incident.spillGeometry.lengthKm / Math.max(1, incident.spillGeometry.widthKm)
    )
  ).map(([x, y]) => [x / 1000, y / 700]);
}

/* Point-in-polygon ray-cast against the slick silhouette (normalised space). */
export function pointInSlick(incident: Incident, nx: number, ny: number): boolean {
  const poly = slickNorm(incident);
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersect =
      yi > ny !== yj > ny && nx < ((xj - xi) * (ny - yi)) / (yj - yi || 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function renderBand(
  canvas: HTMLCanvasElement,
  incident: Incident,
  mode: SarBand,
  opts: BandOpts = {}
) {
  if (!canvas) return;
  const dpr = Math.min(2, opts.dpr ?? (window.devicePixelRatio || 1));
  const W = canvas.width / dpr;
  const H = canvas.height / dpr;
  const ctx = canvas.getContext("2d");
  if (!ctx || W <= 0 || H <= 0) return;

  const seed = hashSeed(incident.eventId);
  const g = Math.max(0.001, Math.min(1, opts.growth ?? 1));
  const reveal = Math.min(1, opts.reveal ?? 1);
  const verified = opts.verified ?? false;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  const slick = buildSlickPolygon(
    seed,
    W,
    H,
    incident.spillGeometry.skeletonOrientationDeg,
    Math.max(
      1.05,
      incident.spillGeometry.lengthKm / Math.max(1, incident.spillGeometry.widthKm)
    )
  );
  const bb = slick.reduce(
    (acc, [x, y]) => ({
      minX: Math.min(acc.minX, x),
      minY: Math.min(acc.minY, y),
      maxX: Math.max(acc.maxX, x),
      maxY: Math.max(acc.maxY, y),
    }),
    { minX: W, minY: H, maxX: 0, maxY: 0 }
  );

  const T = TONE[mode];

  const rng = mulberry32(seed ^ 0x9e3779b9);
  const rng2 = mulberry32(seed ^ 0x85ebca6b);

  const vessels = [
    { x: bb.minX + (bb.maxX - bb.minX) * 0.9, y: bb.minY + (bb.maxY - bb.minY) * 0.82, r: 9, tilt: -0.4 },
    { x: W * 0.12, y: H * 0.82, r: 6, tilt: 0.2 },
    { x: W * 0.86, y: H * 0.2, r: 5, tilt: -0.1 },
  ];

  const img = ctx.createImageData(W, H);
  const data = img.data;

  const coastY: number[] = [];
  {
    const rln = mulberry32(seed >> 3);
    let c = H * 0.34;
    for (let x = 0; x <= W; x += 4) {
      c += (rln() - 0.5) * 14;
      c = Math.max(H * 0.16, Math.min(H * 0.42, c));
      for (let k = 0; k < 4; k++) coastY[Math.min(W, x + k)] = c;
    }
    coastY[W] = coastY[Math.min(W - 1, W)];
  }

  const tint =
    mode === "VV" ? { r: 42, g: 92, b: 122 } : mode === "VH" ? { r: 72, g: 42, b: 112 } : null;

  for (let y = 0; y < H; y++) {
    const row = y * W;
    const inTorso = y < H * 0.12;
    const haze = 1 - (y / H) * 0.45;
    for (let x = 0; x < W; x++) {
      const isLand = y < (coastY[x] ?? H * 0.34) + (inTorso ? 40 : 0);
      const ix = (row + x) * 4;

      let v = T.sea * haze;
      if (isLand) v = T.land * (0.75 + 0.5 * rng2());

      let inSlick = false;
      if (!isLand) {
        const nx = (x - bb.minX) / (bb.maxX - bb.minX || 1);
        const ny = (y - bb.minY) / (bb.maxY - bb.minY || 1);
        if (nx >= 0 && nx <= 1 && ny >= 0 && ny <= 1) {
          const dx = nx - 0.5;
          const dy = ny - 0.5;
          if ((dx * dx) / 0.28 + (dy * dy) / 0.3 < 1) inSlick = true;
        }
      }
      if (inSlick && mode !== "FINAL MASK") {
        v *= 1 - (T.slick * (0.6 + 0.4 * rng2()) * g) / 100;
      }

      v += (rng() - 0.5) * T.speckle * (isLand ? 0.7 : 1);

      for (const vv of vessels) {
        const dx = x - vv.x;
        const dy = y - vv.y;
        const d2 = (dx * dx) / (vv.r * vv.r * 1.6) + (dy * dy) / (vv.r * vv.r / 1.5);
        if (d2 < 1) v += (1 - d2) * 150;
      }

      const gl = Math.min(255, v * T.gain);

      let r = 10 + gl * 0.12 + 22 * haze;
      let gg = 24 + gl * 0.42 + 30 * haze;
      let b = 46 + gl * 0.9 + 40 * haze;
      if (tint) {
        r += tint.r * (gl / 255);
        gg += tint.g * (gl / 255);
        b += tint.b * (gl / 255);
      }
      if (reveal < 1) {
        const dxx = Math.min(1, 2.4 * Math.hypot(x / W - 0.5, y / H - 0.5));
        const dim = Math.max(0, 1 - (reveal - (1 - dxx)));
        r *= 0.15 + 0.85 * dim;
        gg *= 0.15 + 0.85 * dim;
        b *= 0.15 + 0.85 * dim;
      }

      data[ix] = Math.min(255, r);
      data[ix + 1] = Math.min(255, gg);
      data[ix + 2] = Math.min(255, b);
      data[ix + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  /* Segmentation blobs + outline */
  if (mode === "SEGMENTATION" || mode === "FINAL MASK") {
    if (mode === "FINAL MASK" || verified) {
      ctx.fillStyle = `rgba(4, 9, 14, ${0.26 + 0.16 * g})`;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.save();
    ctx.beginPath();
    slick.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
    if (mode === "FINAL MASK") {
      ctx.clip();
      ctx.fillStyle = "rgba(214, 168, 79, 0.3)";
      ctx.fillRect(0, 0, W, H);
    } else {
      // candidate hotspots inside the masked region
      const blobRng = mulberry32(seed ^ 0xabcdef01);
      const blobs = Math.round(10 + blobRng() * 8);
      for (let i = 0; i < blobs; i++) {
        if (i / blobs > g) break;
        const bx = bb.minX + blobRng() * (bb.maxX - bb.minX);
        const by = bb.minY + blobRng() * (bb.maxY - bb.minY);
        const br = (6 + blobRng() * 26) * g;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(214, 168, 79, ${0.1 + blobRng() * 0.12})`;
        ctx.fill();
      }
    }
    ctx.restore();

    ctx.beginPath();
    slick.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
    ctx.strokeStyle =
      mode === "FINAL MASK" ? "rgba(250, 204, 21, 0.95)" : "rgba(214, 168, 79, 0.85)";
    ctx.lineWidth = 0.8 + 1.4 * g;
    ctx.stroke();
  }
}

/* Read center-weighted pixel value from a rendered band canvas. */
export function readPixel(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number
): { r: number; g: number; b: number } | null {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const px = Math.max(0, Math.min(rect.width - 1, clientX - rect.left));
  const py = Math.max(0, Math.min(rect.height - 1, clientY - rect.top));
  const d = ctx.getImageData(Math.round(px) * dpr, Math.round(py) * dpr, 1, 1).data;
  return { r: d[0], g: d[1], b: d[2] };
}