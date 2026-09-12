"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Incident } from "@/lib/types";
import { cn } from "@/lib/util";
import { Columns2, Maximize2, Play, ZoomIn, ZoomOut } from "lucide-react";

type SarMode =
  | "RAW"
  | "CALIBRATED"
  | "FILTERED"
  | "VV"
  | "VH"
  | "SEGMENTATION"
  | "FINAL MASK";

const MODES: SarMode[] = [
  "RAW",
  "CALIBRATED",
  "FILTERED",
  "VV",
  "VH",
  "SEGMENTATION",
  "FINAL MASK",
];

/* ── deterministic RNG seed ─────────────────────────────── */
function hashSeed(s: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── organic slick silhouette (deterministic per event) ── */
function buildSlickPolygon(
  seed: number,
  W: number,
  H: number,
  orientationDeg: number,
  aspect: number
): [number, number][] {
  const rng = mulberry32(seed);
  const cx = W * (0.52 + rng() * 0.2);
  const cy = H * (0.4 + rng() * 0.2);
  const a = Math.min(W, H) * (0.16 + rng() * 0.06) * Math.max(1, aspect);
  const b = a / (2 + rng() * 0.8);
  const base = Math.PI / 2;
  const pts: [number, number][] = [];
  const N = 44;
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    const rr = 0.84 + rng() * 0.3;
    const wob = 1 + 0.18 * Math.sin(3 * t + rng()) + 0.1 * Math.sin(5 * t);
    const r = Math.min(1, rr) * wob;
    const x = Math.cos(t) * a * r;
    const y = Math.sin(t) * b * r;
    const rot = (orientationDeg * Math.PI) / 180 + base;
    pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  return pts;
}

type RenderMode = "scene" | "mask";

function renderScene(
  cv: HTMLCanvasElement,
  incident: Incident,
  mode: SarMode,
  apex: RenderMode
) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = cv.width / dpr;
  const H = cv.height / dpr;
  const seed = hashSeed(incident.eventId);
  const ctx = cv.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  const slick = buildSlickPolygon(
    seed,
    W,
    H,
    incident.spillGeometry.skeletonOrientationDeg,
    Math.max(1, incident.spillGeometry.lengthKm / Math.max(1, incident.spillGeometry.widthKm))
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

  /* mode tone params */
  const T = {
    RAW: { sea: 46, land: 58, speckle: 34, slick: 30, gain: 1.0 },
    CALIBRATED: { sea: 52, land: 66, speckle: 30, slick: 58, gain: 1.45 },
    FILTERED: { sea: 54, land: 66, speckle: 9, slick: 50, gain: 1.3 },
    VV: { sea: 60, land: 72, speckle: 30, slick: 34, gain: 1.35 },
    VH: { sea: 42, land: 56, speckle: 30, slick: 78, gain: 1.6 },
    SEGMENTATION: { sea: 52, land: 66, speckle: 30, slick: 58, gain: 1.45 },
    "FINAL MASK": { sea: 52, land: 66, speckle: 30, slick: 58, gain: 1.45 },
  }[mode];

  const rng = mulberry32(seed ^ 0x9e3779b9);
  const rng2 = mulberry32(seed ^ 0x85ebca6b);

  /* vessels: 3 bright targets, one moored at slick edge */
  const vessels = [
    { x: bb.minX + (bb.maxX - bb.minX) * 0.9, y: bb.minY + (bb.maxY - bb.minY) * 0.82, r: 9, tilt: -0.4 },
    { x: W * 0.12, y: H * 0.82, r: 6, tilt: 0.2 },
    { x: W * 0.86, y: H * 0.2, r: 5, tilt: -0.1 },
  ];

  const img = ctx.createImageData(W, H);
  const data = img.data;

  /* precompute land silhouette per row (coast along north) */
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

  const tint = mode === "VV" ? { r: 40, g: 90, b: 120 } : mode === "VH" ? { r: 70, g: 40, b: 110 } : null;

  for (let y = 0; y < H; y++) {
    const row = y * W;
    const inTorso = y < H * 0.12; // far-field
    const haze = 1 - (y / H) * 0.45;
    for (let x = 0; x < W; x++) {
      const isLand = y < (coastY[x] ?? H * 0.34) + (inTorso ? 40 : 0);
      const ix = (row + x) * 4;

      let v = T.sea * haze;
      if (isLand) v = T.land * (0.75 + 0.5 * rng2());

      // slick darkening
      let inSlick = false;
      if (!isLand) {
        const px = x - bb.minX;
        const py = y - bb.minY;
        const w = bb.maxX - bb.minX || 1;
        const h = bb.maxY - bb.minY || 1;
        const nx = px / w;
        const ny = py / h;
        if (nx >= 0 && nx <= 1 && ny >= 0 && ny <= 1) {
          // rough radius check with aspect correction
          const dx = nx - 0.5;
          const dy = ny - 0.5;
          const d = (dx * dx) / 0.28 + (dy * dy) / 0.3;
          inSlick = d < 1;
        }
      }
      if (inSlick && mode !== "FINAL MASK") {
        v *= 1 - (T.slick * (0.6 + 0.4 * rng2())) / 100;
      }

      // SAR speckle
      v += (rng() - 0.5) * T.speckle * (isLand ? 0.7 : 1);

      // vessel bright returns
      for (const vv of vessels) {
        const dx = x - vv.x;
        const dy = y - vv.y;
        const d2 = (dx * dx) / ((vv.r * vv.r) * 1.6) + (dy * dy) / ((vv.r * vv.r) / 1.5);
        if (d2 < 1) v += (1 - d2) * 150;
      }

      const g = Math.min(255, v * T.gain);

      let r = (10 + g * 0.12 + 22 * haze);
      let gg = (24 + g * 0.42 + 30 * haze);
      let b = (46 + g * 0.9 + 40 * haze);
      if (tint) {
        r += tint.r * (g / 255);
        gg += tint.g * (g / 255);
        b += tint.b * (g / 255);
      }
      data[ix] = Math.min(255, r);
      data[ix + 1] = Math.min(255, gg);
      data[ix + 2] = Math.min(255, b);
      data[ix + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  /* SEGMENTATION / FINAL MASK overlays */
  if (mode === "SEGMENTATION" || mode === "FINAL MASK") {
    if (mode === "FINAL MASK") {
      ctx.fillStyle = "rgba(4, 9, 14, 0.42)";
      ctx.fillRect(0, 0, W, H);
    }
    const type = mode === "FINAL MASK" ? "mask" : "canvas";
    ctx.beginPath();
    slick.forEach(([x, y], i) => {
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    if (type === "canvas") {
      ctx.fillStyle = "rgba(214, 168, 79, 0.16)";
      ctx.fill();
      ctx.strokeStyle = "rgba(214, 168, 79, 0.85)";
    } else {
      ctx.fillStyle = "rgba(214, 168, 79, 0.32)";
      ctx.fill();
      ctx.strokeStyle = "rgba(250, 204, 21, 0.95)";
    }
    ctx.lineWidth = 1.5;
    ctx.stroke();
    void apex;
  }
}

interface SarViewerProps {
  incident: Incident;
  className?: string;
}

export const SarViewer: React.FC<SarViewerProps> = ({ incident, className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rawCanvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<SarMode>("CALIBRATED");
  const [compare, setCompare] = useState(false);
  const [divider, setDivider] = useState(0.5);
  const [zoomLbl, setZoomLbl] = useState("100%");

  const viewRef = useRef({ zoom: 1, ox: 0, oy: 0, dragging: false, lx: 0, ly: 0 });

  const redraw = useCallback(() => {
    const cv = canvasRef.current;
    const raw = rawCanvasRef.current;
    const view = viewRef.current;
    if (!cv || !raw) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = cv.width / dpr;
    const H = cv.height / dpr;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    // re-render current-mode scene only when mode/output size changed
    const curTarget = `${mode}:${W}:${H}`;
    if (cv.dataset.scene !== curTarget) {
      renderScene(cv, incident, mode, "scene");
      cv.dataset.scene = curTarget;
    }
    const rawKey = `RAW:${W}:${H}`;
    if (raw.dataset.scene !== rawKey) {
      renderScene(raw, incident, "RAW", "scene");
      raw.dataset.scene = rawKey;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.translate(view.ox, view.oy);
    ctx.scale(view.zoom, view.zoom);

    if (compare) {
      const dx = (divider * W - view.ox) / view.zoom;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, dx, H / view.zoom);
      ctx.clip();
      ctx.drawImage(raw, 0, 0, W, H);
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.rect(dx, 0, W, H);
      ctx.clip();
      ctx.drawImage(cv, 0, 0, W, H);
      ctx.restore();
    } else {
      ctx.drawImage(cv, 0, 0, W, H);
    }
    ctx.restore();

    // HUD (screen space)
    if (compare) {
      ctx.strokeStyle = "rgba(56, 189, 248, 0.9)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(divider * W, 0);
      ctx.lineTo(divider * W, H);
      ctx.stroke();
      const grip = document.getElementById("sar-grip");
      if (grip) {
        const gy = H / 2 - 16;
        grip.style.left = `${divider * W - 40}px`;
        grip.style.top = `${gy}px`;
        grip.style.opacity = "1";
      }
    } else {
      const grip = document.getElementById("sar-grip");
      if (grip) grip.style.opacity = "0";
    }
  }, [incident, mode, compare, divider]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => redraw());
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [redraw]);

  useEffect(() => {
    redraw();
    setZoomLbl(`${Math.round(viewRef.current.zoom * 100)}%`);
  }, [redraw, mode, compare]);

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const view = viewRef.current;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const factor = Math.exp(-e.deltaY * 0.0012);
    const zoom = Math.min(6, Math.max(0.5, view.zoom * factor));
    view.ox = px - ((px - view.ox) / view.zoom) * zoom;
    view.oy = py - ((py - view.oy) / view.zoom) * zoom;
    view.zoom = zoom;
    setZoomLbl(`${Math.round(zoom * 100)}%`);
    redraw();
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const view = viewRef.current;
    view.dragging = true;
    view.lx = e.clientX;
    view.ly = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const view = viewRef.current;
    if (!view.dragging) return;
    view.ox += e.clientX - view.lx;
    view.oy += e.clientY - view.ly;
    view.lx = e.clientX;
    view.ly = e.clientY;
    redraw();
  };
  const onPointerUp = () => {
    viewRef.current.dragging = false;
  };

  const stepZoom = (d: number) => {
    const view = viewRef.current;
    view.zoom = Math.min(6, Math.max(0.5, view.zoom * (d > 0 ? 1.25 : 0.8)));
    setZoomLbl(`${Math.round(view.zoom * 100)}%`);
    redraw();
  };

  return (
    <div
      ref={wrapRef}
      className={cn(
        "relative flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-panel border border-line bg-bg-0",
        className
      )}
    >
      {/* tab rail */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-line bg-bg-1 px-2 py-1.5">
        {MODES.map((t) => (
          <button
            key={t}
            onClick={() => setMode(t)}
            className={cn(
              "whitespace-nowrap rounded px-2 py-1 font-mono text-[10px] font-medium transition-colors duration-150 focus-ring",
              mode === t ? "bg-aqua/10 text-aqua ring-1 ring-aqua/30" : "text-ink-dim hover:bg-bg-2 hover:text-ink"
            )}
          >
            {t}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setCompare((v) => !v)}
            className={cn(
              "flex items-center gap-1 rounded px-2 py-1 font-mono text-[10px] ring-1 transition-colors duration-150 focus-ring",
              compare
                ? "bg-teal/10 text-teal ring-teal/40"
                : "text-ink-dim ring-line hover:text-ink"
            )}
          >
            <Columns2 className="h-3 w-3" />
            vs RAW
          </button>
          <button onClick={() => stepZoom(1)} className="rounded p-1 text-ink-dim hover:bg-bg-2 hover:text-ink focus-ring" aria-label="Zoom in">
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => stepZoom(-1)} className="rounded p-1 text-ink-dim hover:bg-bg-2 hover:text-ink focus-ring" aria-label="Zoom out">
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              viewRef.current = { zoom: 1, ox: 0, oy: 0, dragging: false, lx: 0, ly: 0 };
              setZoomLbl("100%");
              redraw();
            }}
            className="rounded p-1 text-ink-dim hover:bg-bg-2 hover:text-ink focus-ring"
            aria-label="Reset view"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ display: "block" }}
        />
        <canvas ref={rawCanvasRef} className="hidden" />

        {/* compare grip */}
        <div
          id="sar-grip"
          className="pointer-events-none absolute flex h-8 w-20 items-center justify-center rounded-md bg-bg-1 opacity-0 ring-1 ring-aqua/50 transition-opacity duration-150"
        >
          <Play className="h-3.5 w-3.5 -rotate-90 text-aqua" />
          <span className="mx-0.5 h-px w-3 bg-aqua" />
          <Play className="h-3.5 w-3.5 rotate-90 text-aqua" />
        </div>

        {/* bottom HUD */}
        <div className="pointer-events-none absolute bottom-2 right-2 flex items-center gap-1.5 font-mono text-[10px] text-ink-faint">
          <span className="rounded bg-bg-1 px-2 py-0.5 ring-1 ring-line">SAR {incident.sarMetadata.productType}</span>
          <span className="rounded bg-bg-1 px-2 py-0.5 ring-1 ring-line tnum">{zoomLbl}</span>
        </div>
      </div>

      {/* compare slider */}
      {compare && (
        <input
          type="range"
          min={0}
          max={100}
          value={divider * 100}
          onChange={(e) => setDivider(Number(e.target.value) / 100)}
          className="absolute inset-y-0 right-0 z-10 h-full w-1 cursor-col-resize opacity-0"
          style={{ left: 0 }}
          aria-label="Compare divider"
        />
      )}
    </div>
  );
};