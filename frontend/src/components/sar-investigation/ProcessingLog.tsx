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

const LEVEL_ICON: Record<LogLine["level"], string> = {
  info: "·",
  ok: "✓",
  warn: "!",
  err: "✗",
};

const LEVEL_COLOR: Record<LogLine["level"], string> = {
  info: "text-ink-dim",
  ok: "text-teal",
  warn: "text-amber",
  err: "text-red",
};

function hashSeed(s: string): number {
  let h = 2166136261;
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

function fmt(t: number): string {
  return new Date(t).toISOString().slice(11, 19);
}

const PHASE_DELTA: Record<InvestigationState["phase"], number> = {
  footprint: 0,
  anomaly: 1,
  detect: 2,
  segment: 3,
  verify: 4,
  complete: 5,
};

function buildLines(
  incident: Incident,
  inv: InvestigationState,
  live: boolean
): LogLine[] {
  const base = hashSeed(incident.eventId);
  const seed = hashSeed(incident.eventId + "-pl");
  const rng = mulberry32(seed);
  const n = base + ((rng() * 883) | 0);
  const t0 = Date.now() - 60_000;
  const out: LogLine[] = [];
  const push = (level: LogLine["level"], msg: string, off: number) =>
    out.push({
      id: n + (out.length + 1),
      t: fmt(t0 - off * 1000),
      level,
      msg,
    });

  push("info", "uvicorn · RAW SLC ingest · λ 5.55 cm · GRD-IW");
  push("ok", "radiometric calibration σ0 → β0 (VV/VH co-registered)");
  push("info", "multi-look 5×1 · ENL 4.6 · 9.2 m slant");

  const d = PHASE_DELTA[inv.phase] ?? 0;
  if (d >= 1) push("ok", "Lee sigma filter σ=0.9 · speckle −62%");
  if (d >= 2) {
    push("info", `CFAR-2D p_fa 1e-5 · guard 12 px · <strong>candidate 412 px²</strong>`);
    push("warn", "edge fringe — coastal exclusion flagged");
  }
  if (d >= 3) push("ok", "SLIC superpixel graph-cut · 512 clusters");
  if (d >= 4) {
    push("info", "GLCM contrast 0.74 · energy 0.31 (dual-pol)");
    push("ok", `anchor A1 · σ=26.3 dB · p=0.94 · <span class="text-teal">VERIFIED</span>`);
  }
  if (d >= 5) push("ok", "FINAL MASK anchored · evidence sealed");
  if (live) push("ok", "live replay · scrubbing timeline");

  return out;
}

export function ProcessingLog({
  incident,
  inv,
  live = false,
  className,
}: {
  incident: Incident;
  inv: InvestigationState;
  live?: boolean;
  className?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const h = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(h);
  }, []);

  const lines = useMemo(
    () => buildLines(incident, inv, live),
    [incident, inv, live]
  );

  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  return (
    <div
      className={cn(
        "pointer-events-none flex max-w-[260px] select-none flex-col overflow-hidden rounded-lg border border-line bg-bg-2/95 font-mono",
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-line px-2 py-1">
        <span className="tracking-widest text-ink-dim">PROCESSING LOG</span>
        <span className="flex items-center gap-1 text-ink-faint">
          <span className="h-1 w-1 rounded-full bg-teal" />
          LIVE
        </span>
      </div>
      <div ref={boxRef} className="max-h-24 overflow-y-auto px-2 py-1">
        {lines.map((l) => (
          <div key={l.id} className="flex gap-1 py-px">
            <span className="shrink-0 text-ink-faint">{l.t}</span>
            <span className={cn("shrink-0 font-bold", LEVEL_COLOR[l.level])}>
              {LEVEL_ICON[l.level]}
            </span>
            <span className="text-ink/90" dangerouslySetInnerHTML={{ __html: l.msg }} />
          </div>
        ))}
      </div>
    </div>
  );
}
