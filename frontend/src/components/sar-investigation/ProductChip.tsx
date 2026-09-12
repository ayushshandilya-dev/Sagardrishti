"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Incident } from "@/lib/types";
import { cn } from "@/lib/util";
import { BANDS, SarBand, hashSeed, renderBand, readPixel, pointInSlick } from "./sarCanvas";
import { InvestigationState, InvPhase } from "./useInvestigation";
import { Columns2, Crosshair, ScanLine, Eye } from "lucide-react";

function autoBandFor(phase: InvPhase): SarBand {
  switch (phase) {
    case "footprint":
      return "CALIBRATED";
    case "anomaly":
      return "RAW";
    case "detect":
      return "VV";
    case "segment":
      return "SEGMENTATION";
    case "verify":
    case "complete":
      return "FINAL MASK";
    default:
      return "RAW";
  }
}

interface InspectorSample {
  nx: number;
  ny: number;
  lat: number;
  lng: number;
  vv: number;
  vh: number;
  variance: number;
  probability: number;
}

export interface ProductChipProps {
  incident: Incident;
  inv: InvestigationState;
  reqBand?: { band: SarBand; seq: number } | null;
  className?: string;
}

export const ProductChip: React.FC<ProductChipProps> = ({ incident, inv, reqBand, className }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rawRef = useRef<HTMLCanvasElement>(null);

  const [userBand, setUserBand] = useState<SarBand | null>(null);
  const lastReq = useRef(0);
  useEffect(() => {
    if (reqBand && reqBand.seq !== lastReq.current) {
      lastReq.current = reqBand.seq;
      setUserBand(reqBand.band);
    }
  }, [reqBand]);
  const [compare, setCompare] = useState(false);
  const [divider, setDivider] = useState(0.5);
  const [inspector, setInspector] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [sample, setSample] = useState<InspectorSample | null>(null);
  const [hover, setHover] = useState({ x: 0, y: 0, show: false });

  const sizeKey = useRef("0x0");
  const effBand: SarBand = userBand ?? autoBandFor(inv.phase);

  const ensureSize = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (w <= 0 || h <= 0) return;
    const key = `${w}:${h}`;
    if (sizeKey.current === key) return;
    sizeKey.current = key;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const c of [canvasRef.current, rawRef.current]) {
      if (!c) continue;
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    if (rawRef.current) renderBand(rawRef.current, incident, "RAW", {});
  }, [incident]);

  const redrawBand = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    if (inv.phase === "idle") {
      renderBand(cv, incident, "RAW", { reveal: 0.16 });
      return;
    }
    const growth =
      inv.phase === "segment" || inv.phase === "verify" || inv.phase === "complete"
        ? Math.max(0.02, inv.prog)
        : inv.phase === "detect"
          ? 0.12
          : 1;
    const reveal = inv.phase === "footprint" ? Math.max(0.05, inv.prog) : 1;
    renderBand(cv, incident, effBand, {
      growth,
      reveal,
      verified: inv.phase === "verify" || inv.phase === "complete",
    });
  }, [incident, effBand, inv.phase, inv.prog]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => {
      ensureSize();
      redrawBand();
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [ensureSize, redrawBand]);

  useEffect(() => {
    ensureSize();
    redrawBand();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effBand, inv.phase, inv.prog]);

  const onMove = (e: React.PointerEvent) => {
    const cv = canvasRef.current;
    if (!cv || !inspector) return;
    const rect = cv.getBoundingClientRect();
    if (!rect.width) return;
    const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setHover({ x: e.clientX - rect.left, y: e.clientY - rect.top, show: true });

    const bb = incident.spillGeometry.boundingBox;
    const lat = bb.lowerLeft.latitude + (bb.upperRight.latitude - bb.lowerLeft.latitude) * (1 - ny);
    const lng = bb.lowerLeft.longitude + (bb.upperRight.longitude - bb.lowerLeft.longitude) * nx;

    const seed = hashSeed(incident.eventId);
    const clamp = (v: number) => Math.max(0, Math.min(1, v));
    const noise = (a: number, b: number) =>
      Math.sin(seed * a + b * 37.7 + nx * 911 + ny * 577) * 0.5 + 0.5;
    const inSlick = pointInSlick(incident, nx, ny);
    const vv = Math.round(180 * (0.28 + 0.72 * noise(1, 1) * (inSlick ? 0.24 : 1)));
    const vh = Math.round(90 * (0.22 + 0.78 * noise(2, 3) * (inSlick ? 0.18 : 1)));
    const variance = Math.round(6 + noise(3, 5) * 44);
    const probability = inSlick
      ? clamp(0.62 + noise(4, 7) * 0.36)
      : clamp(Math.max(0, 0.14 - Math.hypot(nx - 0.5, ny - 0.5) * 0.32));
    setSample({ nx, ny, lat, lng, vv, vh, variance, probability });
  };

  const onOut = () => setHover((h) => ({ ...h, show: false }));

  return (
    <div
      ref={wrapRef}
      className={cn(
        "flex flex-col overflow-hidden rounded-panel border transition-[width] duration-200",
        collapsed ? "w-[52px]" : "w-[min(46%,560px)]",
        className
      )}
      style={{ borderColor: "rgba(56,189,248,0.15)", background: "rgba(9,20,29,0.94)" }}
    >
      <div
        className="flex items-center gap-1.5 border-b px-2 py-1.5"
        style={{ borderColor: "rgba(56,189,248,0.12)" }}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-red animate-[pulse-soft_1.6s_ease-in-out_infinite]" />
        <span className="font-mono text-[10px] font-semibold tracking-[0.14em] text-ink">
          SAR PRODUCT
        </span>
        <span className="font-mono text-[9px] text-ink-faint">GRD-IW · σ° VV/VH</span>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setInspector((v) => !v)}
            className={cn(
              "rounded p-1 text-ink-faint transition-colors hover:bg-bg-2 hover:text-ink",
              inspector && "text-aqua"
            )}
            aria-label="Pixel inspector"
            title="Pixel inspector"
          >
            <Crosshair className="h-3 w-3" />
          </button>
          <button
            onClick={() => setCompare((v) => !v)}
            className={cn(
              "rounded p-1 text-ink-faint transition-colors hover:bg-bg-2 hover:text-ink",
              compare && "text-teal"
            )}
            aria-label="Compare with RAW"
            title="Compare vs RAW"
          >
            <Columns2 className="h-3 w-3" />
          </button>
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="rounded p-1 text-ink-faint hover:bg-bg-2 hover:text-ink"
            aria-label="Collapse product"
            title={collapsed ? "Expand" : "Collapse"}
          >
            <Eye className="h-3 w-3" />
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          <div
            className="flex items-center gap-0.5 overflow-x-auto border-b px-1.5 py-1"
            style={{ borderColor: "rgba(56,189,248,0.1)" }}
          >
            {BANDS.map((b) => (
              <button
                key={b}
                onClick={() => setUserBand(b === effBand ? (userBand ? null : b) : b)}
                className={cn(
                  "whitespace-nowrap rounded px-1.5 py-0.5 font-mono text-[9px] font-medium transition-colors",
                  effBand === b
                    ? "bg-aqua/10 text-aqua ring-1 ring-aqua/30"
                    : "text-ink-dim hover:bg-bg-2 hover:text-ink"
                )}
              >
                {b}
              </button>
            ))}
            {userBand && (
              <button
                onClick={() => setUserBand(null)}
                className="ml-auto rounded px-1.5 py-0.5 font-mono text-[9px] text-teal ring-1 ring-teal/30"
                title="Return to processor auto-band"
              >
                AUTO
              </button>
            )}
          </div>

          <div
            ref={stageRef}
            className="relative min-h-0 flex-1 overflow-hidden cursor-crosshair"
            onPointerMove={onMove}
            onPointerLeave={onOut}
          >
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" style={{ display: "block" }} />
            {compare && (
              <canvas
                ref={rawRef}
                className="absolute inset-0 h-full w-full"
                style={{ clipPath: `inset(0 ${100 - divider * 100}% 0 0)` }}
              />
            )}
            {compare && (
              <input
                type="range"
                min={0}
                max={100}
                value={divider * 100}
                onChange={(e) => setDivider(Number(e.target.value) / 100)}
                className="absolute inset-y-0 z-10 h-full w-full cursor-col-resize opacity-0"
                aria-label="Compare divider"
              />
            )}
            {compare && (
              <div
                className="pointer-events-none absolute inset-y-0"
                style={{ left: `${divider * 100}%` }}
              >
                <div className="absolute inset-y-0 left-0 w-px bg-aqua" />
                <div className="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-0.5 rounded bg-bg-1 px-1 py-0.5 ring-1 ring-aqua/50">
                  <ScanLine className="h-3 w-3 rotate-90 text-aqua" />
                  <ScanLine className="h-3 w-3 -rotate-90 text-aqua" />
                </div>
              </div>
            )}

            {/* telemetry scanlines */}
            {(inv.phase === "anomaly" || inv.phase === "detect") && (
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute h-px w-full bg-amber/15"
                    style={{
                      top: `${(i / 6) * 100}%`,
                      transform: `translateY(${((inv.prog * 2 + i * 0.17) % 1) * 46}px)`,
                    }}
                  />
                ))}
              </div>
            )}
            {/* candidate glow */}
            {inv.phase === "detect" && (
              <div className="pointer-events-none absolute inset-0">
                {Array.from({ length: 22 }).map((_, i) => {
                  const t = (i * 0.618) % 1;
                  return (
                    <span
                      key={i}
                      className="absolute h-[3px] w-[3px] rounded-full bg-amber"
                      style={{
                        left: `${(t * 100) % 100}%`,
                        top: `${(t * 137.5 + inv.prog * 30) % 100}%`,
                        opacity: 0.2 + 0.8 * Math.abs(Math.sin(i * 1.7 + inv.prog * 9)),
                      }}
                    />
                  );
                })}
              </div>
            )}
            {/* swath beam */}
            {inv.phase === "footprint" && (
              <div
                className="pointer-events-none absolute inset-y-0 w-[38%]"
                style={{
                  left: `${(inv.prog * 130 - 30) % 100}%`,
                  background:
                    "linear-gradient(90deg, transparent, rgba(56,189,248,0.10), rgba(56,189,248,0.22), rgba(56,189,248,0.10), transparent)",
                }}
              />
            )}

            {/* pixel crosshair */}
            {inspector && hover.show && (
              <>
                <div
                  className="pointer-events-none absolute z-10 h-[34px] w-px -translate-x-1/2 -translate-y-1/2 bg-aqua/70"
                  style={{ left: hover.x, top: hover.y }}
                />
                <div
                  className="pointer-events-none absolute z-10 h-px w-[34px] -translate-x-1/2 -translate-y-1/2 bg-aqua/70"
                  style={{ left: hover.x, top: hover.y }}
                />
              </>
            )}
            {inspector && hover.show && sample && (
              <div
                className="pointer-events-none absolute z-20 w-[190px] rounded-md p-2"
                style={{
                  left: hover.x > 210 ? hover.x - 202 : hover.x + 12,
                  top: Math.max(8, hover.y - 72),
                  background: "rgba(5,11,17,0.94)",
                  border: "1px solid rgba(56,189,248,0.3)",
                }}
              >
                <InspectorCard sample={sample} />
              </div>
            )}

            <div className="pointer-events-none absolute bottom-1.5 left-2 right-2 flex items-center justify-between font-mono text-[9px] text-ink-faint">
              <span>
                {effBand} · σ° [{effBand === "VH" ? 279 : 247}° AZ]
              </span>
              <span className="tnum">
                {inv.phase === "idle"
                  ? "STANDBY"
                  : inv.phase === "complete"
                    ? "VERIFIED"
                    : `${inv.phase.toUpperCase()} · ${Math.round(inv.prog * 100)}%`}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

function InspectorCard({ sample }: { sample: InspectorSample }) {
  const rows: [string, string, boolean][] = [
    ["PIX", `${sample.nx.toFixed(4)} · ${sample.ny.toFixed(4)}`, false],
    ["LAT", `${sample.lat.toFixed(5)}°`, false],
    ["LON", `${sample.lng.toFixed(5)}°`, false],
    ["σ° VV", `${sample.vv.toFixed(1)} dB`, false],
    ["σ° VH", `${sample.vh.toFixed(1)} dB`, false],
    ["TEX VAR", `${sample.variance.toFixed(1)}`, false],
    ["OIL PROB", `${(sample.probability * 100).toFixed(1)} %`, true],
    ["CLASS", sample.probability > 0.5 ? "MINERAL OIL" : "SEA SURFACE", true],
  ];
  return (
    <div className="space-y-0.5 font-mono">
      <div className="mb-1 text-[8px] tracking-[0.18em] text-ink-faint">PIXEL INSPECTOR</div>
      {rows.map(([k, v, hl]) => (
        <div key={k} className="flex items-baseline justify-between gap-2 text-[9px]">
          <span className="text-ink-faint">{k}</span>
          <span className={cn("tnum", hl ? "font-semibold text-amber" : "text-ink-dim")}>{v}</span>
        </div>
      ))}
    </div>
  );
}

/* keep readPixel reference for tree-shaking safety */
void readPixel;