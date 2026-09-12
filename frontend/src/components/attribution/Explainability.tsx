"use client";

import React from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  PolarRadiusAxis,
} from "recharts";

interface ExplainabilityProps {
  factors: {
    backtrackProximityScore: number;
    trajectoryCollinearityScore: number;
    vesselPriorScore: number;
    kineticAnomalyScore: number;
    temporalPlausibilityScore: number;
  };
  vesselName: string;
}

const AXES = [
  { key: "backtrackProximityScore", label: "Proximity" },
  { key: "trajectoryCollinearityScore", label: "Collinearity" },
  { key: "vesselPriorScore", label: "Vessel prior" },
  { key: "kineticAnomalyScore", label: "Kinetic" },
  { key: "temporalPlausibilityScore", label: "Timing" },
] as const;

const WEIGHT = [
  ["Backtrack proximity", 0.28, "#22D3A7"],
  ["Trajectory collinearity", 0.24, "#38BDF8"],
  ["Vessel prior", 0.18, "#38BDF8"],
  ["Kinetic anomaly", 0.16, "#F59E0B"],
  ["Temporal plausibility", 0.14, "#F59E0B"],
] as const;

export const Explainability: React.FC<ExplainabilityProps> = ({ factors }) => {
  const data = AXES.map((a) => ({ axis: a.label, value: factors[a.key] }));

  return (
    <div className="rounded-panel border border-line bg-bg-1 px-3.5 py-3">
      <div className="mb-2 flex items-center justify-between border-b border-line pb-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-dim">
          Explainability
        </span>
        <span className="font-mono text-[9px] text-ink-faint">weighted factors</span>
      </div>

      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="70%">
            <PolarGrid stroke="#19313D" strokeWidth={1} />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: "#6A7f89", fontSize: 9, fontFamily: "Inter, sans-serif" }}
            />
            <PolarRadiusAxis domain={[0, 1]} tick={false} axisLine={false} />
            <Radar
              dataKey="value"
              stroke="#38BDF8"
              fill="#38BDF8"
              fillOpacity={0.18}
              strokeWidth={1.5}
              isAnimationActive={false}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex flex-col gap-1.5">
        {WEIGHT.map(([label, w, c]) => (
          <div key={label as string} className="flex items-center gap-2">
            <span className="w-32 shrink-0 text-[10px] text-ink-dim">{label}</span>
            <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-bg-0 ring-1 ring-line">
              <div className="h-full rounded-full" style={{ width: `${(w as number) * 100}%`, background: c as string }} />
            </div>
            <span className="w-8 text-right font-mono text-[9px] text-ink-faint tnum">
              {((w as number) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};