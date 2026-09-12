"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/util";
import { Incident } from "@/lib/types";
import { MapPin, Satellite } from "lucide-react";

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
        return (
          <button
            key={inc.eventId}
            onClick={() => onSelect(inc)}
            className={cn(
              "group w-full rounded-panel border border-line bg-bg-1 px-3 py-3 text-left transition-colors duration-150 focus-ring",
              active
                ? "border-line-active hover:bg-bg-2"
                : "hover:bg-bg-2",
              active && detecting && "border-red/60 ring-1 ring-red/40 animate-pulse"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: inc.severity === "CRITICAL" ? "#EF4444" : "#F59E0B" }}
                />
                <span className="truncate font-mono text-xs font-semibold text-ink">
                  {inc.eventId}
                </span>
              </span>
              <span
                className={cn(
                  "shrink-0 rounded px-1.5 py-px font-mono text-[9px] font-semibold ring-1",
                  inc.severity === "CRITICAL"
                    ? "bg-red/10 text-red ring-red/40"
                    : "bg-orange/10 text-orange ring-orange/40"
                )}
              >
                {inc.severity}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-[10px] text-ink-dim">
              <Satellite className="h-3 w-3 text-aqua" />
              <span className="meta">
                {inc.sarMetadata.mission} · {inc.sarMetadata.productType}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 font-mono text-[10px] text-ink-faint">
              <MapPin className="h-3 w-3" />
              <span className="tnum">
                {inc.spillGeometry.centroid.latitude.toFixed(3)}°N{" "}
                {inc.spillGeometry.centroid.longitude.toFixed(3)}°E
              </span>
              <span className="ml-auto tnum">
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