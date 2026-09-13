"use client";

import React from "react";
import { useCommandStore } from "@/lib/store";
import { cn } from "@/lib/util";
import { CandidateVessel, RiskBadge } from "@/lib/types";
import { Trophy, Ship, Timer, Target, Navigation } from "lucide-react";
import { SourceTag, sourceLabel } from "@/components/attribution/SourceTag";
import { StatusBadge } from "@/components/ui/StatusBadge";

const BADGE_TONE: Record<RiskBadge, "crit" | "warn" | "neutral"> = {
  PRIMARY: "crit",
  WATCH: "warn",
  CLEAR: "neutral",
};

export function ScoreBar({ v }: { v: number }) {
  return (
    <div className="h-1 w-14 overflow-hidden rounded-full bg-bg-0 ring-1 ring-line">
      <div className="h-full rounded-full bg-aqua" style={{ width: `${v * 100}%` }} />
    </div>
  );
}

export const AttributionRanking: React.FC<{ vessels: CandidateVessel[] }> = ({ vessels }) => {
  const { selectedVesselImo, setSelectedVesselImo } = useCommandStore();
  const sorted = [...vessels].sort((a, b) => b.attributionScore - a.attributionScore);

  return (
    <div className="flex flex-col gap-1.5">
      {sorted.map((v, i) => {
        const active = v.imo === selectedVesselImo;
        const rank = i + 1;
        return (
          <button
            key={v.imo}
            onClick={() => setSelectedVesselImo(v.imo)}
            className={cn(
              "w-full rounded-panel border px-3 py-2.5 text-left transition-colors duration-150 focus-ring",
              active ? "border-aqua/40 bg-bg-2" : "border-line bg-bg-1 hover:bg-bg-2"
            )}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded font-mono text-[11px] font-bold",
                  rank === 1 ? "bg-red/10 text-red ring-1 ring-red/40" : "bg-bg-0 text-ink-dim ring-1 ring-line"
                )}
              >
                {String(rank).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-title-sm font-semibold text-ink">{v.vesselName}</span>
                  <SourceTag source={sourceLabel(v)} />
                  <StatusBadge label={v.riskBadge} tone={BADGE_TONE[v.riskBadge]} dot={false} />
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-telemetry-sm text-ink-faint">
                  <span className="tnum">IMO {v.imo}</span>
                  <span>·</span>
                  <span>{v.flag}</span>
                  <span>·</span>
                  <span>{v.vesselType}</span>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="font-mono text-sm font-semibold text-ink tnum">
                  {(v.attributionScore * 100).toFixed(1)}
                </span>
                <ScoreBar v={v.attributionScore} />
              </div>
            </div>

            {/* sub-metrics */}
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              <span className="flex items-center gap-1 text-telemetry-sm text-ink-dim">
                <Navigation className="h-3 w-3 text-ink-faint" />
                {(v.closestApproachMeters / 1000).toFixed(1)} km
              </span>
              <span className="flex items-center gap-1 text-telemetry-sm text-ink-dim">
                <Target className="h-3 w-3 text-ink-faint" />
                {v.headingAlignmentDeg}° off
              </span>
              <span className="flex items-center gap-1 text-telemetry-sm text-ink-dim">
                <Timer className="h-3 w-3 text-ink-faint" />
                {v.timeOverlapMinutes} min
              </span>
              <span className={cn(
                "flex items-center gap-1 text-telemetry-sm",
                v.aisAnomaly === "None detected" ? "text-ink-faint" : "text-amber"
              )}>
                <Ship className="h-3 w-3" />
                {v.aisAnomaly === "None detected" ? "AIS clean" : v.aisAnomaly}
              </span>
            </div>
          </button>
        );
      })}
      <div className="flex items-center gap-1.5 px-1 pt-1 text-[9px] text-ink-faint">
        <Trophy className="h-3 w-3 text-amber" />
        Rank-1 flagged for enforcement review
      </div>
    </div>
  );
};