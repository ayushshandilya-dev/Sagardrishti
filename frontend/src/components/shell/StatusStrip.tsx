"use client";

import React from "react";
import { Satellite, Radio, Lock, Database } from "lucide-react";

export const StatusStrip: React.FC = () => {
  return (
    <div className="flex h-7 shrink-0 select-none items-center justify-between gap-4 border-b border-line bg-bg-1/60 px-3 text-telemetry-sm text-ink-dim font-mono">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="text-ink font-medium">EEZ SURVEILLANCE</span>
          <span className="text-ink-faint">· LEVEL 2 ELEVATED</span>
        </div>

        <span className="text-ink-faint">|</span>

        <div className="hidden md:flex items-center gap-1.5 text-ink-faint">
          <Satellite className="h-3 w-3 text-ink-dim" />
          <span>
            SAR SENSOR: <span className="text-ink">SENTINEL-1A IW</span>
          </span>
        </div>

        <span className="text-ink-faint hidden md:inline">|</span>

        <div className="hidden md:flex items-center gap-1.5 text-ink-faint">
          <Lock className="h-3 w-3 text-ink-dim" />
          <span>
            LEDGER: <span className="text-ink">VERIFIED</span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 text-ink-faint">
        <div className="hidden xl:flex items-center gap-1.5">
          <Radio className="h-3 w-3 text-ink-dim" />
          <span>
            INCOIS + ECMWF: <span className="text-ink">SYNCHRONIZED</span>
          </span>
        </div>

        <span className="hidden text-ink-faint xl:inline">|</span>

        <div className="flex items-center gap-1.5">
          <Database className="h-3 w-3 text-ink-dim" />
          <span>
            INGESTION: <span className="text-ink tnum">42 ms</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span>AIS CLASS A: <span className="text-ink tnum">4,821</span></span>
        </div>
      </div>
    </div>
  );
};