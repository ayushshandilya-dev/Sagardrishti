"use client";

import React from "react";
import Link from "next/link";
import { use } from "react";
import { useCommandStore } from "@/lib/store";
import { MaritimeMap } from "@/components/map/MaritimeMap";
import { KinematicCharts } from "@/components/vessels/KinematicCharts";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TelemetryRow } from "@/components/ui/TelemetryRow";
import { ArrowLeft, Anchor, Radio } from "lucide-react";

export default function VesselInvestigationPage({
  params,
}: {
  params: Promise<{ imo: string }>;
}) {
  const { imo } = use(params);
  const imoNum = Number(imo);
  const { candidateVessels, selectedIncidentId, incidents } = useCommandStore();
  const vessel = candidateVessels.find((v) => v.imo === imoNum) ?? candidateVessels[0];
  const incident = incidents.find((i) => i.eventId === selectedIncidentId) ?? incidents[0];

  if (!vessel) return null;

  return (
    <div className="flex h-full flex-col gap-3 p-3 pb-2">
      <PageHeader
        className="px-0.5"
        title={vessel.vesselName}
        badge={{ label: vessel.riskBadge, tone: "crit" }}
        subtitle={`IMO ${vessel.imo} · MMSI ${vessel.mmsi} · ${vessel.flag} · ${vessel.vesselType}`}
        left={
          <Link
            href="/attribution"
            className="mr-1 flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[10px] text-ink-dim ring-1 ring-line transition-colors duration-150 hover:bg-bg-2 hover:text-ink"
          >
            <ArrowLeft className="h-3 w-3" />
            ATTRIBUTION
          </Link>
        }
        right={
          <>
            <StatusBadge
              label={vessel.dwt ? `${vessel.dwt} DWT` : "—"}
              tone="info"
              icon={<Anchor className="h-3 w-3" />}
            />
            <StatusBadge
              label={`AIS ${vessel.speedOverGround.toFixed(1)} kn`}
              tone="ok"
              icon={<Radio className="h-3 w-3" />}
            />
          </>
        }
      />

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(340px,1.15fr)_minmax(0,1fr)] gap-3 overflow-hidden">
        {/* live track + drift overlay */}
        <div className="relative flex min-h-0 flex-col gap-1.5 overflow-hidden">
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-panel border border-line bg-bg-0">
            <MaritimeMap incident={incident} candidateVessels={[vessel]} />
            <div className="absolute bottom-2 right-2 z-10 rounded bg-bg-1 px-2 py-1 text-right font-mono text-[9px] leading-tight text-ink-faint ring-1 ring-line">
              <div>{vessel.latitude.toFixed(4)}°N</div>
              <div>{vessel.longitude.toFixed(4)}°E</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              ["SOG", `${vessel.speedOverGround.toFixed(1)} kn`, "#38BDF8"],
              ["COG", `${vessel.courseOverGround.toFixed(0)}°`, "#22D3A7"],
              ["HDG", `${vessel.heading.toFixed(0)}°`, "#D6A84F"],
            ].map(([label, val, c]) => (
              <div key={label as string} className="relative overflow-hidden rounded-panel border border-line bg-bg-1 px-3 py-2">
                <span className="absolute inset-x-0 top-0 h-0.5" style={{ background: c as string }} />
                <div className="meta-label">{label}</div>
                <div className="mt-0.5 text-telemetry-lg tnum" style={{ color: c as string }}>
                  {val}
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-panel border border-line bg-bg-1 px-3.5 py-2.5">
            <div className="meta-label mb-1">Attribution vs {incident.eventId}</div>
            <TelemetryRow label="Closest approach" value={(vessel.closestApproachMeters / 1000).toFixed(2)} unit="km" />
            <TelemetryRow label="Heading alignment" value={`${vessel.headingAlignmentDeg}°`} />
            <TelemetryRow label="Time overlap" value={vessel.timeOverlapMinutes} unit="min" />
            <div className="flex items-baseline justify-between gap-3 py-[3px]">
              <span className="shrink-0 text-label-caps text-ink-faint">AIS anomaly</span>
              <span className={vessel.aisAnomaly === "None detected" ? "font-mono text-[11px] font-medium tabular-sm text-teal" : "font-mono text-[11px] font-medium tabular-sm text-amber"}>
                {vessel.aisAnomaly}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
              <span className="text-label-caps text-ink-faint">Attribution score</span>
              <span className="font-mono text-sm font-semibold text-aqua tnum">
                {(vessel.attributionScore * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* charts */}
        <div className="min-h-0 overflow-y-auto pr-0.5">
          <KinematicCharts
            vesselName={vessel.vesselName}
            telemetry={vessel.telemetry ?? []}
            timeline={vessel.aisTimeline ?? []}
          />
        </div>
      </div>
    </div>
  );
}