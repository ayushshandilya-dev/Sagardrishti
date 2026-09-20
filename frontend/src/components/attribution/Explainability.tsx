"use client";

import React from "react";
import { motion } from "framer-motion";
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

const FACTOR_DEFS = [
  { key: "backtrackProximityScore", label: "Backtrack proximity", weight: 0.28, color: "#22D3A7" },
  { key: "trajectoryCollinearityScore", label: "Trajectory collinearity", weight: 0.24, color: "#38BDF8" },
  { key: "vesselPriorScore", label: "Vessel prior (IMO history)", weight: 0.18, color: "#38BDF8" },
  { key: "kineticAnomalyScore", label: "Kinetic anomaly (Tank wash)", weight: 0.16, color: "#F59E0B" },
  { key: "temporalPlausibilityScore", label: "Temporal plausibility", weight: 0.14, color: "#F59E0B" },
] as const;

export const Explainability: React.FC<ExplainabilityProps> = ({ factors, vesselName }) => {
  const data = AXES.map((a) => ({ axis: a.label, value: factors[a.key] }));

  return (
    <div className="rounded-panel border border-line bg-bg-1 px-3.5 py-3">
      <div className="mb-2 flex items-center justify-between border-b border-line pb-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-dim">
          Bayesian Explainability · {vesselName}
        </span>
        <span className="font-mono text-[9px] text-teal">5-FACTOR SCORE</span>
      </div>

      {/* Morphing Radar Chart */}
      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="72%">
            <PolarGrid stroke="#19313D" strokeWidth={1} />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: "#6A7F89", fontSize: 9, fontFamily: "Inter, sans-serif" }}
            />
            <PolarRadiusAxis domain={[0, 1]} tick={false} axisLine={false} />
            <Radar
              name="Attribution"
              dataKey="value"
              stroke="#38BDF8"
              fill="#38BDF8"
              fillOpacity={0.25}
              strokeWidth={1.8}
              isAnimationActive={true}
              animationDuration={500}
              animationEasing="ease-out"
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Dynamic Staggered Factor Bars */}
      <div className="mt-2 flex flex-col gap-2">
        {FACTOR_DEFS.map((f, i) => {
          const score = factors[f.key as keyof typeof factors] ?? 0;
          const pct = Math.round(score * 100);

          return (
            <div key={f.key} className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-ink-dim truncate">{f.label}</span>
                <span className="font-mono text-[9px] text-ink-faint tnum">
                  <span className="text-ink font-medium">{pct}%</span>
                  <span className="ml-1 text-ink-faint/70">(wt: {Math.round(f.weight * 100)}%)</span>
                </span>
              </div>
              <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-bg-0 ring-1 ring-line">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.45, delay: i * 0.06, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ background: f.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};