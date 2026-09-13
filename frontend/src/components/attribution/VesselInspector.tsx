"use client";

import React from "react";
import Link from "next/link";
import { useCommandStore } from "@/lib/store";
import { cn } from "@/lib/util";
import { Ship, ShieldAlert, ArrowRight, History } from "lucide-react";
import { SourceTag, sourceLabel } from "@/components/attribution/SourceTag";
import { SectionHeader } from "@/components/ui/SectionHeader";

export const VesselInspector: React.FC = () => {
  const { getSelectedVessel, candidateVessels } = useCommandStore();
  const v = getSelectedVessel() ?? candidateVessels[0];
  if (!v) return null;

  return (
    <div className="rounded-panel border border-line bg-bg-1 px-3.5 py-3">
      <div className="mb-2 border-b border-line pb-2">
        <SectionHeader
          title="Vessel attribution"
          icon={Ship}
          tone="info"
          trailing={
            <Link
              href={`/vessels/${v.imo}`}
              className="flex items-center gap-1 font-mono text-[10px] font-semibold text-aqua transition-colors duration-150 hover:text-teal"
            >
              FULL DOSSIER <ArrowRight className="h-3 w-3" />
            </Link>
          }
        />
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-title-sm font-semibold text-ink">{v.vesselName}</span>
        <SourceTag source={sourceLabel(v)} />
        <span className="font-mono text-[10px] text-ink-faint tnum">IMO {v.imo}</span>
      </div>
      <div className="mt-0.5 flex items-center gap-2 text-telemetry-sm text-ink-faint">
        <span>MMSI {v.mmsi}</span>
        <span>·</span>
        <span>{v.flag}</span>
        <span>·</span>
        <span>{v.vesselType}</span>
        <span>·</span>
        <span>{v.dwt ? `${v.dwt} DWT` : "—"}</span>
      </div>

      {/* reasons */}
      <div className="mt-2.5 flex flex-col gap-1">
        {v.reasons.map((r, i) => (
          <div
            key={i}
            className="flex items-start gap-2 rounded bg-bg-0 px-2 py-1.5 ring-1 ring-line"
          >
            <span
              className={cn(
                "mt-1 h-1 w-1 shrink-0 rounded-full",
                v.riskBadge === "PRIMARY" ? "bg-red" : v.riskBadge === "WATCH" ? "bg-amber" : "bg-ink-faint"
              )}
            />
            <span className="text-telemetry-sm leading-snug text-ink-dim">{r}</span>
          </div>
        ))}
      </div>

      {/* enforcement */}
      <div className="mt-2.5 flex items-center gap-2 rounded-panel border border-red/25 bg-red/5 px-2.5 py-2">
        <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-red" />
        <span className="text-telemetry-sm leading-snug text-ink-dim">{v.enforcementAction}</span>
      </div>

      {v.historicalIncidents && v.historicalIncidents.length > 0 && (
        <div className="mt-2.5">
          <div className="mb-1 flex items-center gap-1 text-label-caps text-ink-faint">
            <History className="h-3 w-3 text-amber" />
            Prior incidents
          </div>
          <div className="flex flex-col gap-1">
            {v.historicalIncidents.slice(0, 2).map((h, i) => (
              <div key={i} className="flex items-center justify-between text-telemetry-sm text-ink-dim">
                <span className="tnum">{h.date} · {h.port}</span>
                <span className="text-amber">{h.incidentType}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};