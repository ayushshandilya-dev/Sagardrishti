"use client";

import React from "react";
import Link from "next/link";
import { useCommandStore } from "@/lib/store";
import { MaritimeMap } from "@/components/map/MaritimeMap";
import { LayerChips } from "@/components/map/LayerChips";
import { AttributionRanking } from "@/components/attribution/AttributionRanking";
import { VesselInspector } from "@/components/attribution/VesselInspector";
import { Explainability } from "@/components/attribution/Explainability";
import { ArrowRight } from "lucide-react";

export default function VesselAttributionPage() {
  const { candidateVessels, getSelectedVessel, selectedIncidentId, incidents } = useCommandStore();
  const selected = getSelectedVessel();
  const incident = incidents.find((i) => i.eventId === selectedIncidentId) ?? incidents[0];

  return (
    <div className="flex h-full flex-col gap-3 p-3 pb-2">
      <div className="flex items-center justify-between px-0.5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold tracking-tight text-ink">Vessel attribution</h1>
            <span className="rounded bg-red/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-red ring-1 ring-red/40">
              RANK-1 PRIMARY
            </span>
          </div>
          <p className="meta mt-0.5">
            Ranking vessels against reconstructed origin · {incident.eventId} · closest approach vs T−{incident.timestampUtc.substring(11, 16)} drop window
          </p>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,2fr)_minmax(330px,380px)] gap-3 overflow-hidden">
        {/* map */}
        <div className="relative min-h-0 overflow-hidden rounded-panel border border-line bg-bg-0">
          <MaritimeMap
            incident={incident}
            candidateVessels={candidateVessels}
            interactive
          />
          <LayerChips />
          <div className="absolute bottom-3 right-3 z-10 rounded-md bg-bg-1 px-2 py-1 font-mono text-[9px] text-ink-faint ring-1 ring-line">
            {candidateVessels.length} candidates in 50 km window
          </div>
        </div>

        {/* right column */}
        <div className="flex flex-col gap-1.5 overflow-y-auto pr-0.5">
          <div className="flex items-center justify-between px-0.5">
            <span className="meta-label">CANDIDATE RANKING</span>
            <Link
              href={`/vessels/${selected?.imo ?? candidateVessels[0]?.imo}`}
              className="flex items-center gap-1 font-mono text-[10px] font-semibold text-aqua transition-colors duration-150 hover:text-teal"
            >
              TOP RANK DOSSIER <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <AttributionRanking vessels={candidateVessels} />
          <VesselInspector />
          {selected && (
            <Explainability
              factors={selected.factorBreakdown}
              vesselName={selected.vesselName}
            />
          )}
        </div>
      </div>
    </div>
  );
}