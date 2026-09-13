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
const now0 = Date.now();

function hash(msg: string): number {
  let h = 2166136261;
  for (let i = 0; i < msg.length; i++) {
    h ^= msg.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function fmt(offset: number): string {
  return new Date(now0 - offset).toISOString().slice(11, 19);
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
  const boxRef = useRef<HTMLDivElement>(null);

  const lines = useMemo(() => {
    const base = hash(incident.eventId) & 0xffff;
    const d = phaseDelta(inv.phase);
    const idN = (n: number) => base + n;
    const log: LogLine[] = [
      { id: idN(1), t: fmt(9800), level: "info", msg: "RAW SLC → sigma0 · radiometric calibration" },
      { id: idN(2), t: fmt(8600), level: "ok", msg: "VV / VH co-registered · slant-range 9.2 m" },
      { id: idN(3), t: fmt(7400), level: "info", msg: "multi-look 5x1 · ENL 4.6" },
      { id: idN(4), t: fmt(6200), level: "ok", msg: "Lee filter σ=0.9 · speckle 62% reduced" },
      { id: idN(5), t: fmt(5000), level: "info", msg: "GLCM offset (1,1) · 7x7 window" },
      { id: idN(6), t: fmt(3800), level: "warn", msg: "CFAR-2D · p_fa 1e-5 · guard 12 px" },
    ];
    if (d >= 1) {
      log.push({ id: idN(7), t: fmt(3000), level: "ok", msg: "anomaly boxlocked · candidate 412 px²" });
    }
    if (d >= 2) {
      log.push({ id: idN(8), t: fmt(2400), level: "info", msg: "Otsu τ=0.31 · bimodality 0.89" });
    }
    if (d >= 3) {
      log.push({ id: idN(9), t: fmt(1800), level: "ok", msg: "SLIC superpixel graph cut · 512 clusters" });
      log.push({ id: idN(10), t: fmt(1200), level: "info", msg: "morphology close(k=3) · hole fill" });
    }
    if (d >= 4) {
      log.push({ id: idN(11), t: fmt(900), level: "ok", msg: "anchor A1 · probe 0.94 · σ 26.3 dB" });
      log.push({ id: idN(12), t: fmt(700), level: "info", msg: "anchor A2 · bearing 014° · 11.2 km" });
      log.push({ id: idN(13), t: fmt(500), level: "warn", msg: "GLCM discrepancy 0.31 flagged" });
    }
    if (d >= 5) {
      log.push({ id: idN(14), t: fmt(400), level: "ok", msg: "FINAL MASK verified · evidence anchored" });
    }
    return log;
  }, [incident.eventId, inv.phase]);

  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  return (
    <div
      className={cn(
        "pointer-events-none absolute bottom-3 left-3 top-3 w-[260px] select-none overflow-hidden rounded-lg border border-line bg-bg-2/90 font-mono text-[9px] text-ink backdrop-blur-md",
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-line px-2 py-1">
        <span className="text-[9px] font-bold uppercase tracking-widest text-ink-dim">
          Processing Log
        </span>
        <span className="flex items-center gap-1 py-0.5">
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
        T+{((now0 - fmt_offset(lines)) / 1000).toFixed(0)} s
      </div>
    </div>
  );
}

function fmt_offset(lines: { id: number }[]): number {
  return lines.length ? (lines[0]?.id & 0xffff) * 20 : 0;
}
</content>
