"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useCommandStore } from "@/lib/store";
import { MaritimeMap } from "@/components/map/MaritimeMap";
import { LayerChips } from "@/components/map/LayerChips";
import { TimelineDock } from "@/components/drift/TimelineDock";
import { OriginInspector } from "@/components/drift/OriginInspector";
import { ArrowRight, MapPin } from "lucide-react";

export default function ReverseDriftPage() {
  const { selectedIncidentId, incidents, currentDriftHour, driftResult } =
    useCommandStore();
  const incident = incidents.find((i) => i.eventId === selectedIncidentId) ?? incidents[0];
  const origin = driftResult?.reconstructedOrigin;

  /* The RK4 layer is off by default — enable it for this workspace */
  useEffect(() => {
    useCommandStore.getState().setLayer("drift", true);
    return () => {
      useCommandStore.getState().setLayer("drift", false);
    };
  }, []);

  return (
    <div className="relative flex h-full flex-col overflow-hidden p-3 pb-2">
      {/* header */}
      <div className="mb-3 flex items-center justify-between px-0.5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold tracking-tight text-ink">Reverse drift reconstruction</h1>
            <span className="rounded bg-teal/12 px-2 py-0.5 font-mono text-[10px] font-semibold text-teal ring-1 ring-teal/30">
              RK4 · BACKTRACK
            </span>
          </div>
          <p className="meta mt-0.5">Trajectory backtrack for {incident.eventId} · observation {incident.timestampUtc} UTC</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded bg-bg-1 px-3 py-1.5 ring-1 ring-line sm:flex">
            <MapPin className="h-3.5 w-3.5 text-amber" />
            <span className="font-mono text-[11px] text-ink tnum">
              {origin ? `${origin.latitude.toFixed(3)}°N ${origin.longitude.toFixed(3)}°E @ T−${currentDriftHour}h` : "—"}
            </span>
          </div>
          <Link
            href="/attribution"
            className="flex items-center gap-1.5 rounded-md bg-bg-2 px-3 py-1.5 text-xs font-semibold text-aqua ring-1 ring-aqua/30 transition-colors duration-150 hover:bg-panel-hover focus-ring"
          >
            Assign to vessels
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* full-bleed map */}
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-panel border border-line bg-bg-0">
        <MaritimeMap incident={incident} showChips />

        {/* origin inspector (floating, top-left) */}
        <div className="absolute left-3 top-3 z-10">
          <OriginInspector />
        </div>

        {/* layer chips (bottom-left) */}
        <LayerChips />

        {/* timeline dock (bottom-center) */}
        <TimelineDock />
      </div>
    </div>
  );
}