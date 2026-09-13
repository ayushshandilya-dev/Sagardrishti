"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/util";
import { Incident } from "@/lib/types";
import type { InvestigationState } from "./useInvestigation";

export interface LogLine {
  id: number;
  t: string;
  level: "info" | "ok" | "warn" | "err";
  msg: string;
}

const LEVELS = ["info", "ok", "warn", "err"] as const;

function hash(msg: string): number {
  let h = 2166136261;
  for (let i = 0; i < msg.length; i++) {
    h ^= msg.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function phaseDelta(phase: InvestigationState["phase"]): number {
  switch (phase) {
    case "footprint":
      return 0;
    case "anomaly":
      return 1;
    case "detect":
      return 2;
    case "segment":
      return 3;
    case "verify":
      return 4;
    case "complete":
      return 5;
    default:
      return 0;
  }
}

export function ProcessingLog({
  incident,
  inv,
  className,
}: {
  incident: Incident;
  inv: InvestigationState;
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(h);
  }, []);

  const lines = useMemo(() => {
    const id = incident.eventId;
    const d = phaseDelta(inv.phase);
    const base = hash(id + inv.phase);
    const fmt = (s: number) =>
      new Date(now - s).toISOString().slice(11, 19);
    const seedLines: LogLine[] = [
      { id: base + 1, t: fmt(9800), level: "info", msg: "RAW SLC → σ0 · radiometric calibration (β0 ≈ σ0)" },
      { id: base + 2, t: fmt(8600), level: "ok", msg: "VV / VH co-registered — slant-range 9.2 m, azimuth 14 m" },
      { id: base + 3, t: fmt(7400), level: "info", msg: "multi-look 5×1 · equivalent number of looks 4.6" },
      { id: base + 4, t: fmt(6200), level: "ok", msg: "Lee filter σ=0.9 · speckle reduced 62% (edge preserved)" },
      { id: base + 5, t: fmt(5000), level: "info", msg: "GLCM offset (1,1) · contrast / energy window 7×7" },
      { id: base + 6, t: fmt(3800), level: "info", msg: "CFAR-2D detector · p_fa 1e-5, guard 12px" },
      { id: base + 7, t: fmt(2600), level: "ok", msg: "anomaly boxlocked · 412 px² candidate (σ>{{tonal}})" },
      { id: base + 8, t: fmt(1400), level: "warn", msg: "edge fringe — coastline exclusion mask applied" },
    ];
    const seg: LogLine[] = [
      { id: base + 100, t: fmt(7200), level: "info", msg: "Otsu threshold τ = 0.31 · bimodality 0.89" },
      { id: base + 101, t: fmt(5600), level: "ok", msg: "SLIC superpixels 512 → distance-weighted graph cut" },
      { id: base + 102, t: fmt(3800), level: "info", msg: "morphology close(k=3) · hole fill" },
    ];
    const ver: LogLine[] = [
      { id: base + 1000, t: fmt(9000), level: "ok", msg: "anchor A1 · probability 0.94 · σ = 26.3 dB" },
      { id: base + 1001, t: fmt(7200), level: "info", msg: "anchor A2 · bearing 014° / range 11.2 km" },
      { id: base + 1002, t: fmt(900), level: "err", msg: "Texturà · GLCM discrepancy (0.31) flagged ⚠" },
    ];
    const full: LogLine[] = [...seedLines];
    if (d >= 3) full.push(seg[0], seg[1], seg[2]);
    if (d >= 4) full.push(ver[0], ver[1]);
    if (d >= 5) full.push(ver[2]);
    void confirmLevel; // avoid unused lint noise
    return full;
  }, [incident.eventId, inv.phase, now]);

  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  return (
    <div
      className={cn(
        "pointer-events-none absolute bottom-3 left-3 top-3 w-[250px] select-none overflow-hidden rounded-lg border border-line bg-bg-2/90 font-mono text-[9px] text-ink backdrop-blur-md",
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-line px-2 py-1">
        <span className="text-[9px] font-bold uppercase tracking-widest text-ink-dim">
          Processing Log
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal" />
          <span className="text-[8px] text-ink-faint">LIVE</span>
        </span>
      </div>
      <div ref={boxRef} className="max-h-[calc(100%-30px)] overflow-y-auto px-2 py-1">
        {lines.map((l) => (
          <div key={l.id} className="flex gap-1.5 py-px leading-4">
            <span className="shrink-0 text-ink-faint">{l.t}</span>
            <span
              className={cn(
                "shrink-0 font-bold",
                l.level === "ok"
                  ? "text-teal"
                  : l.level === "warn"
                    ? "text-amber"
                    : l.level === "err"
                      ? "text-red"
                      : "text-ink-dim"
              )}
            >
              {l.level === "err" ? "✗" : l.level === "warn" ? "!" : l.level === "ok" ? "✓" : "·"}
            </span>
            <span className="break-words text-ink/90">{l.msg}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-line px-2 py-1 text-[8px] text-ink-faint">
        T+{(now - lines[0]?.id * 2000 + base_shift(lines[0]?.msg)).toFixed(0)}s
      </div>
    </div>
  );
}
