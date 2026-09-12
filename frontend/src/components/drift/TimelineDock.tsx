"use client";

import React, { useEffect } from "react";
import { useCommandStore } from "@/lib/store";
import { cn } from "@/lib/util";
import { Play, Pause, RotateCcw } from "lucide-react";

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
      <div className="pointer-events-auto flex items-center gap-3 rounded-panel border border-line bg-bg-1 px-3 py-2 shadow-float">
        {/* time stops */}
        <div className="flex items-center gap-1">
          {STOPS.map((h) => (
            <button
              key={h}
              onClick={() => setCurrentDriftHour(h)}
              className={cn(
                "rounded px-2 py-1 font-mono text-[10px] transition-colors duration-150 focus-ring",
                currentDriftHour === h
                  ? "bg-aqua/10 font-semibold text-aqua ring-1 ring-aqua/30"
                  : "text-ink-dim hover:bg-bg-2 hover:text-ink"
              )}
            >
              {h === 0 ? "NOW" : `−${h}h`}
            </button>
          ))}
        </div>

        {/* playback */}
        <button
          onClick={togglePlayDrift}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-bg-2 text-ink ring-1 ring-line transition-colors duration-150 hover:text-aqua focus-ring"
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

        {/* scrubber */}
        <input
          type="range"
          min={0}
          max={12}
          step={1}
          value={currentDriftHour}
          onChange={(e) => setCurrentDriftHour(Number(e.target.value))}
          className="h-1 w-40 cursor-pointer accent-[#38BDF8]"
          aria-label="Drift timeline"
        />

        {/* readout */}
        <div className="w-40 border-l border-line pl-3 font-mono text-[9px] leading-tight text-ink-dim">
          <div className="flex items-center gap-1">
            <span className="text-ink-faint">ORIGIN</span>
            <span className="tnum">
              {origin ? `${origin.latitude.toFixed(3)}, ${origin.longitude.toFixed(3)}` : "—"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-ink-faint">OBS</span>
            <span className="tnum">
              {obs ? `${obs.latitude.toFixed(3)}, ${obs.longitude.toFixed(3)}` : "—"}
            </span>
          </div>
          <div className="mt-0.5 text-amber tnum">T−{currentDriftHour}h estimate</div>
        </div>
      </div>
    </div>
  );
};