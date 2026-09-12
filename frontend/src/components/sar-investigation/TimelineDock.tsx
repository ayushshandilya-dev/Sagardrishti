"use client";

import React, { useEffect, useRef, useState } from "react";
import { Incident } from "@/lib/types";
import { cn } from "@/lib/util";
import { BANDS, renderBand, SarBand } from "./sarCanvas";
import { InvestigationState, InvStatus, TIMELINE } from "./useInvestigation";
import { Play, Pause, Film, RotateCcw } from "lucide-react";

interface TimelineDockProps {
  incident: Incident;
  inv: InvestigationState;
  status: InvStatus;
  onReplay: () => void;
  onScrub: (index: number) => void;
  onThumb: (band: SarBand) => void;
}

const THUMB_BANDS: (SarBand | "SEGMENTATION")[] = ["RAW", "VV", "VH", "FILTERED", "SEGMENTATION"];

export const TimelineDock: React.FC<TimelineDockProps> = ({
  incident,
  inv,
  status,
  onReplay,
  onScrub,
  onThumb,
}) => {
  const [tick, setTick] = useState(0);
  const thumbsRef = useRef<(HTMLCanvasElement | null)[]>([]);
  const inx = inv.timeIndex;

  /* render the strip once per incident */
  useEffect(() => {
    const t = setTimeout(() => setTick((v) => v + 1), 120);
    thumbsRef.current.forEach((cv, i) => {
      if (!cv) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = 96 * dpr;
      cv.height = 64 * dpr;
      const band = THUMB_BANDS[i];
      renderBand(cv, incident, band, {
        growth: 1,
        verified: band === "SEGMENTATION",
      });
    });
    return () => clearTimeout(t);
  }, [incident, tick]);

  const current = inx >= 0 ? TIMELINE[inx] : null;

  return (
    <div
      className="flex h-full flex-col"
      style={{ background: "rgba(7,14,20,0.98)", borderTop: "1px solid rgba(56,189,248,0.15)" }}
    >
      <div className="flex h-[52px] items-center gap-3 px-3">
        {/* replay */}
        <div className="flex items-center gap-1.5">
          {inv.playing ? (
            <button
              onClick={() => onScrub(inx)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md bg-teal/15 text-teal ring-1 ring-teal/40",
                "animate-[pulse-soft_1.2s_ease-in-out_infinite]"
              )}
              aria-label="Pause replay"
            >
              <Pause className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={onReplay}
              className="flex h-8 w-8 items-center justify-center rounded-md bg-amber/15 text-amber ring-1 ring-amber/40 hover:bg-amber/25"
              aria-label="Replay investigation"
              title="Replay investigation"
            >
              <Play className="h-3.5 w-3.5" />
            </button>
          )}
          <RotateCcw
            className="h-3 w-3 cursor-pointer text-ink-faint transition-colors hover:text-ink"
            onClick={() => onScrub(-1)}
          />
        </div>

        {/* phase narration */}
        <div className="flex min-w-[180px] flex-col">
          <div className="font-mono text-[9px] font-bold tracking-[0.14em] text-ink">
            {inv.phase === "idle" ? "AWAITING ACQUISITION" : current ? `${current.t} · ${current.label.toUpperCase()}` : "EVIDENCE LOADED"}
          </div>
          <div className="mt-0.5 font-mono text-[9px] text-ink-faint">
            {inv.playing ? `PROCESSING @ ${Math.round(inv.prog * 100)}%` : status}
          </div>
        </div>

        {/* timeline slider */}
        <div className="relative flex-1 px-1">
          <div className="flex items-center justify-between font-mono text-[8px] text-ink-faint">
            {TIMELINE.map((ev, i) => (
              <span key={ev.t} className={cn(i <= inx ? "text-teal" : "")}>
                {ev.t}
              </span>
            ))}
          </div>
          <input
            type="range"
            min={-1}
            max={TIMELINE.length - 1}
            step={1}
            value={inx}
            onChange={(e) => onScrub(Number(e.target.value))}
            className="relative z-10 w-full cursor-pointer"
            aria-label="Timeline scrub"
          />
        </div>

        {/* status chips */}
        <div className="flex items-center gap-1.5">
          {inv.phase === "complete" && (
            <span className="rounded bg-green/12 px-2 py-0.5 font-mono text-[9px] font-bold text-green ring-1 ring-green/40">
              RK4 READY
            </span>
          )}
          <span
            className={cn(
              "rounded px-2 py-0.5 font-mono text-[9px] font-bold",
              status === "VERIFIED MINERAL OIL"
                ? "bg-green/12 text-green ring-1 ring-green/40"
                : status === "LIKELY OIL"
                  ? "bg-amber/12 text-amber ring-1 ring-amber/40"
                  : "bg-bg-0 text-ink-dim ring-1 ring-line"
            )}
          >
            {status}
          </span>
        </div>
      </div>

      <div
        className="flex items-center gap-2 border-t px-3 py-1.5"
        style={{ borderColor: "rgba(56,189,248,0.1)" }}
      >
        <Film className="h-3 w-3 text-ink-faint" />
        {THUMB_BANDS.map((b) => {
          const isCur = inv.phase === "complete" && b === "SEGMENTATION";
          return (
            <button
              key={b}
              onClick={() => onThumb(b)}
              className={cn(
                "group relative overflow-hidden rounded ring-1 transition-all",
                isCur ? "ring-amber/70" : "ring-[rgba(56,189,248,0.18)] hover:ring-aqua/50"
              )}
              title={b}
            >
              <canvas
                ref={(el) => {
                  thumbsRef.current[THUMB_BANDS.indexOf(b)] = el;
                }}
                className="h-10 w-[60px] object-cover"
              />
              <span className="absolute bottom-0 left-0 right-0 bg-[#050B11]/80 px-1 py-px text-left font-mono text-[7px] text-ink-dim">
                {b}
              </span>
            </button>
          );
        })}
        <span className="ml-auto font-mono text-[9px] text-ink-faint tnum">
          7 BANDS · GRD-IW · {BANDS.length} PASSES
        </span>
      </div>
    </div>
  );
};