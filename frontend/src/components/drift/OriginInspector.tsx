"use client";

import React from "react";
import { useCommandStore } from "@/lib/store";
import { Crosshair, Waves, Wind, Compass, Gauge, Timer } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";

const rows = "flex items-center justify-between gap-2 border-b border-line py-2 last:border-0";
const lbl = "shrink-0 text-label-caps text-ink-faint";
const mono = "font-mono text-[11px] font-medium text-ink tnum";
const monoDim = "font-mono text-[11px] text-ink-dim tnum";

export const OriginInspector: React.FC = () => {
  const { driftResult } = useCommandStore();
  const d = driftResult;
  if (!d) return null;
  const o = d.reconstructedOrigin;
  const obs = d.observedCentroid;
  const originPt = d.trajectory[d.trajectory.length - 1];

  return (
    <div className="w-72 rounded-panel border border-line bg-bg-1 shadow-float">
      <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
        <span className="flex items-center gap-2 text-xs font-semibold tracking-wide text-ink">
          <Crosshair className="h-3.5 w-3.5 text-aqua" />
          Reconstructed origin
        </span>
        <StatusBadge
          label={`RK4 · ${(o.rk4Confidence * 100).toFixed(0)}%`}
          tone="ok"
          title="2nd-order Runge–Kutta backtrack"
        />
      </div>

      <div className="px-3.5">
        <div className={rows}>
          <span className={lbl}>Coordinate</span>
          <span className={mono}>
            {o.latitude.toFixed(4)}°N {o.longitude.toFixed(4)}°E
          </span>
        </div>
        <div className={rows}>
          <span className={lbl}>Discharge window</span>
          <span className={monoDim}>
            {o.timestampUtc} ± {Math.round(o.uncertaintyRadiusMeters / 1000)} km
          </span>
        </div>
        <div className={rows}>
          <span className={lbl}>Recovered path</span>
          <span className={monoDim}>
            {obs.latitude.toFixed(3)}°N, {obs.longitude.toFixed(3)}°E ← {o.latitude.toFixed(3)}°N, {o.longitude.toFixed(3)}°E
          </span>
        </div>
        <div className={rows}>
          <span className={lbl}>Duration</span>
          <span className={mono}>{o.hoursBeforeObservation} h</span>
        </div>

        <div className="flex items-center gap-1 py-2 text-label-caps text-ink-dim">
          <Waves className="h-3 w-3 text-aqua" />
          Forcing at origin
        </div>
        <div className={rows}>
          <span className={lbl}>Current</span>
          <span className="flex items-center gap-1 font-mono text-[11px] text-ink tnum">
            <Compass className="h-3 w-3 text-aqua" />
            {originPt.currentSpeed.toFixed(2)} m/s · {originPt.currentDirectionDeg}°
          </span>
        </div>
        <div className={rows}>
          <span className={lbl}>Wind</span>
          <span className="flex items-center gap-1 font-mono text-[11px] text-ink tnum">
            <Wind className="h-3 w-3 text-teal" />
            {originPt.windSpeed.toFixed(1)} m/s · {originPt.windDirectionDeg}°
          </span>
        </div>
        <div className={rows}>
          <span className={lbl}>Uncertainty</span>
          <span className={mono}>σ {o.uncertaintyRadiusMeters / 1000} km</span>
        </div>

        <div className="border-t border-line py-2">
          <div className="mb-1 text-label-caps text-ink-faint">Model provenance</div>
          <div className="flex flex-col gap-0.5 text-telemetry-sm text-ink-dim">
            <span className="flex items-center gap-1"><Gauge className="h-3 w-3 text-aqua" /> {d.provenance.leewayFactor}</span>
            <span className="flex items-center gap-1"><Timer className="h-3 w-3 text-aqua" /> RK4 step {d.provenance.stepSeconds} s · {d.provenance.currentSource} / {d.provenance.windSource}</span>
          </div>
        </div>
      </div>
    </div>
  );
};