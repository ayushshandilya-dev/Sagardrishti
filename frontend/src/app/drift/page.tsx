"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useCommandStore } from "@/lib/store";
import { MaritimeMap } from "@/components/map/MaritimeMap";
import { LayerChips } from "@/components/map/LayerChips";
import { TimelineDock } from "@/components/drift/TimelineDock";
import { OriginInspector } from "@/components/drift/OriginInspector";
import { PageHeader } from "@/components/ui/PageHeader";
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
      <PageHeader
        className="mb-3 px-0.5"
        title="Reverse drift reconstruction"
        badge={{ label: "RK4 · BACKTRACK", tone: "ok" }}
        subtitle={`Trajectory backtrack for ${incident.eventId} · observation ${incident.timestampUtc} UTC`}
        right={
          <>
            <div className="hidden items-center gap-2 rounded-md bg-bg-1 px-3 py-1.5 ring-1 ring-line sm:flex">
              <MapPin className="h-3.5 w-3.5 text-amber" />
              <span className="text-telemetry-md text-ink tnum">
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
          </>
        }
      />

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