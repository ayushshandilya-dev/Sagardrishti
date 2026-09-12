"use client";

import React from "react";
import Link from "next/link";
import { use } from "react";
import { useCommandStore } from "@/lib/store";
import { SarViewer } from "@/components/sar/SarViewer";
import {
  DetectionEvidence,
  GeometryPanel,
  MetadataPanel,
  EvidenceChips,
  DetectorScores,
} from "@/components/sar/SarPanels";
import { Wind, FileDown, ArrowLeft, ScanLine } from "lucide-react";

export default function SarInvestigationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { incidents } = useCommandStore();
  const incident = incidents.find((i) => i.eventId === id) ?? incidents[0];

  return (
    <div className="flex h-full flex-col gap-3 p-3 pb-2">
      {/* header */}
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-3">
          <Link
            href="/operations"
            className="flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[10px] text-ink-dim ring-1 ring-line transition-colors duration-150 hover:bg-bg-2 hover:text-ink"
          >
            <ArrowLeft className="h-3 w-3" />
            OPERATIONS
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-base font-semibold text-ink">{incident.eventId}</h1>
              <span className="rounded bg-amber/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber ring-1 ring-amber/40">
                {incident.classification.classLabel === "MINERAL_OIL" ? "MINERAL OIL" : incident.classification.classLabel}
              </span>
            </div>
            <p className="meta mt-0.5">
              {incident.sarMetadata.mission} · {incident.sarMetadata.productType} ·{" "}
              {incident.timestampUtc} UTC · {(incident.classification.confidence * 100).toFixed(1)} % confidence
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 rounded-md bg-bg-2 px-3 py-1.5 text-xs font-medium text-ink ring-1 ring-line transition-colors duration-150 hover:text-teal focus-ring">
            <FileDown className="h-3.5 w-3.5" />
            Generate evidence snapshot
          </button>
          <Link
            href="/sar-investigation"
            className="flex items-center gap-1.5 rounded-md bg-amber/10 px-3 py-1.5 text-xs font-semibold text-amber ring-1 ring-amber/30 transition-colors duration-150 hover:bg-amber/15 focus-ring"
          >
            <ScanLine className="h-3.5 w-3.5" />
            Open SAR investigation
          </Link>
          <Link
            href="/drift"
            className="flex items-center gap-1.5 rounded-md bg-bg-2 px-3 py-1.5 text-xs font-semibold text-aqua ring-1 ring-aqua/30 transition-colors duration-150 hover:bg-panel-hover focus-ring"
          >
            <Wind className="h-3.5 w-3.5" />
            Open drift reconstruction
          </Link>
        </div>
      </div>

      {/* 70 / 30 split */}
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(320px,420px)] gap-3">
        <div className="flex min-h-0 flex-col overflow-hidden rounded-panel border border-line bg-bg-1">
          <SarViewer incident={incident} className="flex-1 rounded-none border-0" />
          <div className="flex items-center justify-between border-t border-line bg-bg-1 px-3.5 py-2">
            <span className="meta">
              <span className="mr-3 text-ink-faint">DARKSIDE — C-BAND VV/VH</span>
              RAW · CALIBRATED · FILTERED · VV · VH · SEGMENTATION · FINAL MASK
            </span>
            <span className="font-mono text-[10px] text-ink-faint tnum">
              scene {incident.sarMetadata.relativeOrbit} · {incident.spillGeometry.areaKm2} km²
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 overflow-y-auto pr-0.5">
          <DetectionEvidence incident={incident} />
          <GeometryPanel incident={incident} />
          <MetadataPanel incident={incident} />
          <DetectorScores incident={incident} />
          <EvidenceChips incident={incident} />
          <div className="rounded-panel border border-dashed border-line px-3.5 py-2.5">
            <p className="text-[10px] leading-relaxed text-ink-dim">{incident.radarBrief}</p>
          </div>
        </div>
      </div>
    </div>
  );
}