"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/util";
import { Incident } from "@/lib/types";
import { MapPin, Satellite } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface IncidentDrawerProps {
  incidents: Incident[];
  selectedId: string | null;
  onSelect: (incident: Incident) => void;
  className?: string;
  detecting?: boolean;
}

export const IncidentDrawer: React.FC<IncidentDrawerProps> = ({
  incidents,
  selectedId,
  onSelect,
  className,
  detecting = false,
}) => {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {incidents.map((inc) => {
        const active = inc.eventId === selectedId;
        const sevColor = inc.severity === "CRITICAL" ? "#EF4444" : "#F59E0B";
        return (
          <button
            key={inc.eventId}
            onClick={() => onSelect(inc)}
            className={cn(
              "group w-full rounded-panel border border-line bg-bg-1 px-3 py-3 text-left transition-colors duration-150 focus-ring",
              active ? "bg-bg-2" : "hover:bg-bg-2",
              active && detecting && "ring-1 ring-red/50 animate-pulse"
            )}
            style={{ borderLeft: `3px solid ${sevColor}` }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate text-telemetry-md font-semibold text-ink">
                  {inc.eventId}
                </span>
              </span>
              <StatusBadge
                label={inc.severity}
                tone={inc.severity === "CRITICAL" ? "crit" : "warn"}
                dot={false}
              />
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <Satellite className="h-3 w-3 shrink-0 text-aqua" />
              <span className="truncate text-telemetry-sm text-ink-dim">
                {inc.sarMetadata.mission} · {inc.sarMetadata.productType}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-telemetry-sm text-ink-faint">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="min-w-0 truncate tnum">
                {inc.spillGeometry.centroid.latitude.toFixed(3)}°N{" "}
                {inc.spillGeometry.centroid.longitude.toFixed(3)}°E
              </span>
              <span className="ml-auto shrink-0 tnum">
                {inc.timestampUtc.substring(11, 16)} UTC
              </span>
            </div>
            {active && (
              <div className="mt-2 border-t border-line pt-2">
                <Link
                  href={`/sar/${inc.eventId}`}
                  className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-aqua transition-colors duration-150 hover:text-teal"
                >
                  Open SAR investigation →
                </Link>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};