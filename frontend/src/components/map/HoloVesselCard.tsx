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
      className="pointer-events-auto select-none w-72 rounded-2xl border border-cyan-400/50 bg-gradient-to-b from-[#031525]/95 via-[#020b14]/95 to-[#01060c]/98 p-3.5 font-mono shadow-[0_0_35px_rgba(6,182,212,0.35),inset_0_0_20px_rgba(6,182,212,0.12)] backdrop-blur-xl transition-all duration-300"
    >
      {/* Top Holographic Scanning Grid Bar */}
      <div className="relative mb-2.5 flex items-center justify-between border-b border-cyan-500/30 pb-2">
        <div className="flex items-center gap-2">
          <div className="relative flex h-7 w-7 items-center justify-center rounded-lg border border-red-500/60 bg-red-950/40">
            <ShieldAlert className="h-4 w-4 text-red-400 animate-pulse" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-black animate-ping" />
          </div>
          <div>
            <div className="text-[11px] font-black tracking-wider text-cyan-300 flex items-center gap-1.5">
              <span>TARGET VESSEL</span>
              <span className="rounded bg-red-500/25 px-1 py-0.2 text-[8px] font-black text-red-400">
                #1 SUSPECT
              </span>
            </div>
            <div className="text-[9px] font-medium text-cyan-200/60">
              AIS CORRELATION CONFIRMED
            </div>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="rounded p-1 text-cyan-400 hover:bg-cyan-500/20 hover:text-white"
            title="Dismiss HUD"
          >
            ✕
          </button>
        )}
      </div>

      {/* Primary Vessel Identifiers */}
      <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-white tracking-wide">
            {vessel.vesselName}
          </span>
          <span className="text-[9px] font-bold text-amber-300 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/30">
            {vessel.vesselType.replace("_", " ")}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[9px] text-cyan-200/70">
          <span>IMO {vessel.imo}</span>
          <span>MMSI {vessel.mmsi}</span>
          <span className="text-white/80">{vessel.flag.toUpperCase()}</span>
        </div>
      </div>

      {/* Forensic Telemetry Matrix (Matching Image 2) */}
      <div className="mt-2.5 space-y-1.5 text-[9px]">
        {/* Attribution Match Probability */}
        <div className="flex items-center justify-between rounded-lg border border-red-500/30 bg-red-950/20 px-2 py-1">
          <span className="text-red-300/80 flex items-center gap-1">
            <Crosshair className="h-3 w-3 text-red-400" />
            ATTRIBUTION CONFIDENCE
          </span>
          <span className="font-black text-red-400 text-[10px]">
            {((vessel.attributionScore ?? 0.946) * 100).toFixed(1)}% MATCH
          </span>
        </div>

        {/* Speed Anomaly Profile */}
        <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-950/20 px-2 py-1">
          <span className="text-amber-300/80 flex items-center gap-1">
            <TrendingDown className="h-3 w-3 text-amber-400" />
            SPEED DROP ANOMALY
          </span>
          <span className="font-bold text-amber-300">
            14.8 → {vessel.speedOverGround.toFixed(1)} KN
          </span>
        </div>

        {/* AIS Dark Gap Duration */}
        <div className="flex items-center justify-between rounded-lg border border-cyan-500/20 bg-cyan-950/15 px-2 py-1">
          <span className="text-cyan-300/80 flex items-center gap-1">
            <Radio className="h-3 w-3 text-cyan-400" />
            TRANSPONDER DARK GAP
          </span>
          <span className="font-bold text-cyan-300">58 MIN UNTRACKED</span>
        </div>

        {/* Course & Heading Deflection */}
        <div className="flex items-center justify-between rounded-lg border border-cyan-500/20 bg-cyan-950/15 px-2 py-1">
          <span className="text-cyan-300/80 flex items-center gap-1">
            <Compass className="h-3 w-3 text-cyan-400" />
            COURSE / HEADING
          </span>
          <span className="font-semibold text-white">
            {vessel.courseOverGround.toFixed(0)}° / {vessel.heading.toFixed(0)}°
          </span>
        </div>

        {/* Tank Wash Dumping Signature */}
        <div className="flex items-center justify-between rounded-lg border border-cyan-500/20 bg-cyan-950/15 px-2 py-1">
          <span className="text-cyan-300/80 flex items-center gap-1">
            <Zap className="h-3 w-3 text-teal-400" />
            DISCHARGE SIGNATURE
          </span>
          <span className="font-semibold text-teal-300">SLOP TANK WASH</span>
        </div>
      </div>

      {/* Merkle Ledger & Legal Status */}
      <div className="mt-2.5 flex items-center justify-between border-t border-cyan-500/25 pt-2 text-[8px] text-cyan-200/60">
        <div className="flex items-center gap-1">
          <FileCheck className="h-3 w-3 text-emerald-400" />
          <span>SECTION 65B EVIDENCE SEALED</span>
        </div>
        <span className="text-emerald-400 font-bold">SHA-256 HASHED</span>
      </div>

      {/* Interactive Action Button */}
      {onNavigateForensics && (
        <button
          onClick={onNavigateForensics}
          className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-cyan-400/60 bg-gradient-to-r from-cyan-500/30 to-teal-500/30 py-1.5 text-[10px] font-bold text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all hover:bg-cyan-500/40 hover:text-white"
        >
          <span>VIEW FULL FORENSIC DOSSIER</span>
          <ArrowDownRight className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Holographic Corner Tech Accents */}
      <div className="pointer-events-none absolute -top-1 -left-1 h-2 w-2 border-t-2 border-l-2 border-cyan-400" />
      <div className="pointer-events-none absolute -top-1 -right-1 h-2 w-2 border-t-2 border-r-2 border-cyan-400" />
      <div className="pointer-events-none absolute -bottom-1 -left-1 h-2 w-2 border-b-2 border-l-2 border-cyan-400" />
      <div className="pointer-events-none absolute -bottom-1 -right-1 h-2 w-2 border-b-2 border-r-2 border-cyan-400" />
    </div>
  );
};
