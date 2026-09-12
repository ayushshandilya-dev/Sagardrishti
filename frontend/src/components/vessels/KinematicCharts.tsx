"use client";

import React from "react";
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";

interface KinematicChartsProps {
  vesselName: string;
  telemetry: { time: string; sog: number; cog: number; heading: number; status: string }[];
  timeline: { time: string; kind: "FIX" | "GAP" | "MANEUVER" | "ANOMALY"; note: string }[];
}

const KIND_COLOR: Record<string, string> = {
  FIX: "#38BDF8",
  GAP: "#EF4444",
  MANEUVER: "#D6A84F",
  ANOMALY: "#EF4444",
};

export const KinematicCharts: React.FC<KinematicChartsProps> = ({ vesselName, telemetry, timeline }) => {
  const sogMin = Math.min(...telemetry.map((p) => p.sog));
  const axis = { fontSize: 9, fill: "#5B707B", fontFamily: "JetBrains Mono, monospace" } as const;
  const grid = "#0F1D26";

  return (
    <div className="flex flex-col gap-1.5">
      {/* SOG */}
      <div className="rounded-panel border border-line bg-bg-1 px-3.5 py-3">
        <div className="mb-2 flex items-center justify-between border-b border-line pb-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-dim">Speed over ground</span>
          <span className="font-mono text-[9px] text-ink-faint">{vesselName}</span>
        </div>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={telemetry} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="sogGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#38BDF8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={axis} axisLine={{ stroke: grid }} tickLine={false} interval={4} />
              <YAxis domain={[0, "dataMax + 2"]} tick={axis} axisLine={false} tickLine={false} />
              <CartesianGrid stroke={grid} vertical={false} strokeDasharray="2 3" />
              <Tooltip
                contentStyle={{
                  background: "#0D1A23",
                  border: "1px solid #19313D",
                  borderRadius: 6,
                  fontSize: 10,
                  fontFamily: "JetBrains Mono, monospace",
                  color: "#DCE6EA",
                }}
                labelStyle={{ color: "#8CA3AE" }}
              />
              <ReferenceLine
                y={sogMin + 0.2}
                stroke="#D6A84F"
                strokeDasharray="3 3"
                label={{ value: "DIP", fill: "#D6A84F", fontSize: 8, fontFamily: "JetBrains Mono, monospace", position: "insideTopRight" }}
              />
              <Area type="monotone" dataKey="sog" stroke="#38BDF8" strokeWidth={1.5} fill="url(#sogGrad)" isAnimationActive={false} name="SOG (kn)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* COG / Heading */}
      <div className="rounded-panel border border-line bg-bg-1 px-3.5 py-3">
        <div className="mb-2 flex items-center justify-between border-b border-line pb-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-dim">Course & heading</span>
          <span className="flex items-center gap-2 font-mono text-[9px] text-ink-faint">
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-aqua" />COG</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-teal" />HDG</span>
          </span>
        </div>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={telemetry} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
              <XAxis dataKey="time" tick={axis} axisLine={{ stroke: grid }} tickLine={false} interval={4} />
              <YAxis domain={[0, 360]} tick={axis} axisLine={false} tickLine={false} />
              <CartesianGrid stroke={grid} vertical={false} strokeDasharray="2 3" />
              <Tooltip
                contentStyle={{
                  background: "#0D1A23",
                  border: "1px solid #19313D",
                  borderRadius: 6,
                  fontSize: 10,
                  fontFamily: "JetBrains Mono, monospace",
                  color: "#DCE6EA",
                }}
                labelStyle={{ color: "#8CA3AE" }}
              />
              <Line type="monotone" dataKey="cog" stroke="#38BDF8" strokeWidth={1.5} dot={false} isAnimationActive={false} name="COG" />
              <Line type="monotone" dataKey="heading" stroke="#22D3A7" strokeWidth={1.5} dot={false} isAnimationActive={false} name="HDG" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AIS transmission timeline */}
      <div className="rounded-panel border border-line bg-bg-1 px-3.5 py-3">
        <div className="mb-2 flex items-center justify-between border-b border-line pb-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-dim">AIS transmission timeline</span>
          <span className="font-mono text-[9px] text-ink-faint">{timeline.length} events · 02:00–14:00 UTC</span>
        </div>
        <div className="flex flex-col gap-1">
          {timeline.map((e, i) => (
            <div key={i} className="flex items-center gap-2" style={{ paddingLeft: `${Math.min(i, timeline.length - 1) * 0}px` }}>
              <span className="w-12 shrink-0 font-mono text-[9px] text-ink-faint tnum">{e.time}</span>
              <span
                className="shrink-0 rounded px-1.5 py-px font-mono text-[8px] font-semibold"
                style={{ color: KIND_COLOR[e.kind], boxShadow: `inset 0 0 0 1px ${KIND_COLOR[e.kind]}55`, background: "rgba(13,26,35,0.5)" }}
              >
                {e.kind}
              </span>
              <span className="truncate text-[10px] text-ink-dim">{e.note}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};