"use client";

import React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Incident } from "@/lib/types";
import { Crosshair, Wind, ArrowUpRight } from "lucide-react";

interface CopInspectorProps {
  incident: Incident;
  shownAt: { x: number }; // reserved: opens relative to spill click
}

export const CopInspector: React.FC<CopInspectorProps> = ({ incident }) => {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, x: -18 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -18 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="pointer-events-auto w-72 rounded-panel border border-line bg-bg-1 shadow-float"
    >
      <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
        <div>
          <div className="text-xs font-semibold tracking-wide text-ink">
            {incident.eventId}
          </div>
          <div className="meta mt-px">
            {incident.timestampUtc.substring(0, 10)} ·{" "}
            {incident.timestampUtc.substring(11, 16)} UTC
          </div>
        </div>
        <span className="rounded-md bg-amber/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber ring-1 ring-amber/40">
          {(incident.classification.confidence * 100).toFixed(1)}%
        </span>
      </div>

      <div className="flex flex-col gap-3 px-3.5 py-3">
        <div>
          <div className="meta-label mb-1">Classification</div>
          <div className="text-sm font-medium text-amber">Mineral oil sheen</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="meta-label mb-1">Slick area</div>
            <div className="font-mono text-[15px] font-medium text-ink tnum">
              {incident.spillGeometry.areaKm2} km²
            </div>
          </div>
          <div>
            <div className="meta-label mb-1">Detection</div>
            <div className="font-mono text-[15px] font-medium text-ink tnum">
              {incident.timestampUtc.substring(11, 16)}
              <span className="text-ink-faint"> UTC</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-bg-0 px-2.5 py-2 ring-1 ring-line">
          <span className="flex items-center gap-1.5 font-mono text-[10px] text-ink-dim">
            <Crosshair className="h-3 w-3 text-aqua" />
            <span className="tnum">
              {incident.spillGeometry.centroid.latitude.toFixed(4)}°N{" "}
              {incident.spillGeometry.centroid.longitude.toFixed(4)}°E
            </span>
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 border-t border-line px-3.5 py-3">
        <Link
          href={`/sar/${incident.eventId}`}
          className="group flex items-center justify-center gap-1.5 rounded-lg bg-bg-2 px-3 py-2 text-xs font-semibold text-ink ring-1 ring-line transition-colors duration-150 hover:bg-panel-hover hover:text-aqua focus-ring"
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
          Open SAR investigation
        </Link>
        <Link
          href="/drift"
          className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-ink-dim ring-1 ring-line transition-colors duration-150 hover:bg-bg-2 hover:text-teal focus-ring"
        >
          <Wind className="h-3.5 w-3.5" />
          Run reverse drift
        </Link>
      </div>
    </motion.div>
  );
};