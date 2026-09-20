"use client";

import React, { useEffect } from "react";
import { useCommandStore } from "@/lib/store";
import { cn } from "@/lib/util";
import { Play, Pause, RotateCcw, Activity } from "lucide-react";

const STOPS = [0, 1, 3, 6, 9, 12];

export const TimelineDock: React.FC = () => {
  const {
    currentDriftHour,
    setCurrentDriftHour,
    isDriftPlaying,
    togglePlayDrift,
    playbackSpeed,
    setPlaybackSpeed,
    resetDrift,
    driftResult,
  } = useCommandStore();

  useEffect(() => {
    if (!isDriftPlaying) return;
    const id = setInterval(() => {
      setCurrentDriftHour(
        Math.min(12, currentDriftHour + 1 * playbackSpeed)
      );
    }, 700 / playbackSpeed);
    return () => clearInterval(id);
  }, [isDriftPlaying, currentDriftHour, setCurrentDriftHour, playbackSpeed]);

  const origin = driftResult?.reconstructedOrigin;
  const obs = driftResult?.observedCentroid;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-3 rounded-panel border border-line-active bg-bg-1/95 backdrop-blur-md px-3.5 py-2 shadow-2xl">
        {/* time stops */}
        <div className="flex items-center gap-1">
          {STOPS.map((h) => (
            <button
              key={h}
              onClick={() => setCurrentDriftHour(h)}
              className={cn(
                "rounded px-2 py-1 font-mono text-[10px] transition-colors duration-150 focus-ring",
                currentDriftHour === h
                  ? "bg-aqua/15 font-bold text-aqua ring-1 ring-aqua/40 shadow-sm"
                  : "text-ink-dim hover:bg-bg-2 hover:text-ink"
              )}
            >
              {h === 0 ? "NOW" : `−${h}h`}
            </button>
          ))}
        </div>

        {/* playback controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={togglePlayDrift}
            className={`flex h-7 w-7 items-center justify-center rounded-full ring-1 transition-all duration-150 focus-ring ${
              isDriftPlaying
                ? "bg-aqua text-bg-0 ring-aqua shadow-[0_0_10px_rgba(56,189,248,0.5)]"
                : "bg-bg-2 text-ink ring-line hover:text-aqua"
            }`}
            aria-label={isDriftPlaying ? "Pause" : "Play"}
          >
            {isDriftPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          </button>
          <button
            onClick={resetDrift}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-bg-2 text-ink-dim ring-1 ring-line transition-colors duration-150 hover:text-ink focus-ring"
            aria-label="Reset"
          >
            <RotateCcw className="h-3 w-3" />
          </button>
        </div>

        {/* Speed presets */}
        <div className="flex items-center gap-0.5 rounded bg-bg-2 px-1 ring-1 ring-line">
          {[0.5, 1, 2].map((s) => (
            <button
              key={s}
              onClick={() => setPlaybackSpeed(s)}
              className={cn(
                "rounded px-1.5 py-0.5 font-mono text-[10px] transition-colors duration-150 focus-ring",
                playbackSpeed === s ? "font-semibold text-teal" : "text-ink-dim hover:text-ink"
              )}
            >
              {s}×
            </button>
          ))}
        </div>

        {/* Scrubber with custom accent */}
        <div className="flex flex-col gap-1">
          <input
            type="range"
            min={0}
            max={12}
            step={1}
            value={currentDriftHour}
            onChange={(e) => setCurrentDriftHour(Number(e.target.value))}
            className="h-1.5 w-44 cursor-pointer accent-[#38BDF8] bg-bg-0 rounded-lg"
            aria-label="Drift timeline"
          />
          <div className="flex justify-between text-[8px] font-mono text-ink-faint">
            <span>OBSERVATION</span>
            <span className="text-amber">DISCHARGE ORIGIN</span>
          </div>
        </div>

        {/* Readout */}
        <div className="w-44 border-l border-line pl-3 font-mono text-[9px] leading-tight text-ink-dim">
          <div className="flex items-center gap-1">
            <span className="text-ink-faint">ORIGIN</span>
            <span className="tnum text-amber">
              {origin ? `${origin.latitude.toFixed(3)}°, ${origin.longitude.toFixed(3)}°` : "—"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-ink-faint">OBS</span>
            <span className="tnum">
              {obs ? `${obs.latitude.toFixed(3)}°, ${obs.longitude.toFixed(3)}°` : "—"}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-aqua font-semibold tnum">
            {isDriftPlaying && <Activity className="h-2.5 w-2.5 animate-spin" />}
            <span>T−{String(currentDriftHour).padStart(2, "0")}:00h BACKTRACK</span>
          </div>
        </div>
      </div>
    </div>
  );
};