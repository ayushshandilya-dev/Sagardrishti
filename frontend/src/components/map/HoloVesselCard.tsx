"use client";

import React from "react";
import { CandidateVessel } from "@/lib/types";
import {
  ShieldAlert,
  Radio,
  Zap,
  Clock,
  Compass,
  FileCheck,
  Crosshair,
  AlertTriangle,
  Layers,
  ArrowDownRight,
  TrendingDown,
} from "lucide-react";

interface HoloVesselCardProps {
  vessel: CandidateVessel;
  onClose?: () => void;
  onNavigateForensics?: () => void;
  style?: React.CSSProperties;
}

export const HoloVesselCard: React.FC<HoloVesselCardProps> = ({
  vessel,
  onClose,
  onNavigateForensics,
  style,
}) => {
  const isSuspect = vessel.attributionRank === 1;

  return (
    <div
      style={style}
      className="pointer-events-auto select-none w-72 rounded-xl border border-line bg-bg-1/95 p-3.5 font-mono shadow-float backdrop-blur-md transition-all duration-200"
    >
      {/* Header Bar */}
      <div className="relative mb-2.5 flex items-center justify-between border-b border-line pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-red/30 bg-red/10">
            <ShieldAlert className="h-4 w-4 text-red" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider text-ink flex items-center gap-1.5">
              <span>TARGET VESSEL</span>
              <span className="rounded bg-red/15 px-1.5 py-0.5 text-[8px] font-bold text-red border border-red/20">
                #1 SUSPECT
              </span>
            </div>
            <div className="text-[9px] font-normal text-ink-dim">
              AIS CORRELATION MATCH
            </div>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="rounded p-1 text-ink-dim hover:bg-bg-2 hover:text-ink transition-colors"
            title="Dismiss HUD"
          >
            ✕
          </button>
        )}
      </div>

      {/* Primary Vessel Identifiers */}
      <div className="rounded-lg border border-line bg-bg-2 p-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-ink tracking-wide">
            {vessel.vesselName}
          </span>
          <span className="text-[9px] font-semibold text-amber bg-amber/10 px-1.5 py-0.5 rounded border border-amber/20">
            {vessel.vesselType.replace("_", " ")}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[9px] text-ink-dim">
          <span>IMO {vessel.imo}</span>
          <span>MMSI {vessel.mmsi}</span>
          <span className="text-ink font-medium">{vessel.flag.toUpperCase()}</span>
        </div>
      </div>

      {/* Forensic Telemetry Matrix */}
      <div className="mt-2.5 space-y-1.5 text-[9px]">
        {/* Attribution Match Probability */}
        <div className="flex items-center justify-between rounded-md border border-red/20 bg-red/5 px-2 py-1">
          <span className="text-red font-medium flex items-center gap-1.5">
            <Crosshair className="h-3 w-3 text-red" />
            ATTRIBUTION CONFIDENCE
          </span>
          <span className="font-bold text-red text-[10px]">
            {((vessel.attributionScore ?? 0.946) * 100).toFixed(1)}% MATCH
          </span>
        </div>

        {/* Speed Anomaly Profile */}
        <div className="flex items-center justify-between rounded-md border border-line bg-bg-2 px-2 py-1">
          <span className="text-ink-dim flex items-center gap-1.5">
            <TrendingDown className="h-3 w-3 text-amber" />
            SPEED DROP ANOMALY
          </span>
          <span className="font-semibold text-ink">
            14.8 → {vessel.speedOverGround.toFixed(1)} KN
          </span>
        </div>

        {/* AIS Dark Gap Duration */}
        <div className="flex items-center justify-between rounded-md border border-line bg-bg-2 px-2 py-1">
          <span className="text-ink-dim flex items-center gap-1.5">
            <Radio className="h-3 w-3 text-aqua" />
            TRANSPONDER GAP
          </span>
          <span className="font-semibold text-ink">58 MIN UNTRACKED</span>
        </div>

        {/* Course & Heading Deflection */}
        <div className="flex items-center justify-between rounded-md border border-line bg-bg-2 px-2 py-1">
          <span className="text-ink-dim flex items-center gap-1.5">
            <Compass className="h-3 w-3 text-ink-faint" />
            COURSE / HEADING
          </span>
          <span className="font-semibold text-ink">
            {vessel.courseOverGround.toFixed(0)}° / {vessel.heading.toFixed(0)}°
          </span>
        </div>

        {/* Tank Wash Dumping Signature */}
        <div className="flex items-center justify-between rounded-md border border-line bg-bg-2 px-2 py-1">
          <span className="text-ink-dim flex items-center gap-1.5">
            <Zap className="h-3 w-3 text-teal" />
            DISCHARGE SIGNATURE
          </span>
          <span className="font-semibold text-teal">SLOP TANK WASH</span>
        </div>
      </div>

      {/* Merkle Ledger & Legal Status */}
      <div className="mt-2.5 flex items-center justify-between border-t border-line pt-2 text-[8px] text-ink-dim">
        <div className="flex items-center gap-1 text-green">
          <FileCheck className="h-3 w-3" />
          <span className="font-medium">SECTION 65B EVIDENCE SEALED</span>
        </div>
        <span className="font-semibold text-ink-faint">SHA-256</span>
      </div>

      {/* Interactive Action Button */}
      {onNavigateForensics && (
        <button
          onClick={onNavigateForensics}
          className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-bg-2 hover:bg-panel-hover py-1.5 text-[10px] font-semibold text-ink transition-colors shadow-sm"
        >
          <span>VIEW FULL FORENSIC DOSSIER</span>
          <ArrowDownRight className="h-3.5 w-3.5 text-aqua" />
        </button>
      )}
    </div>
  );
};
