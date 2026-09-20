"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { cn } from "@/lib/util";
import { useCommandStore } from "@/lib/store";
import { SarBand } from "@/components/sar-investigation/sarCanvas";
import { useInvestigation, TIMELINE } from "@/components/sar-investigation/useInvestigation";
import { SentinelMap } from "@/components/sar-investigation/SentinelMap";
import { ProductChip } from "@/components/sar-investigation/ProductChip";
import { EvidenceInspector } from "@/components/sar-investigation/EvidenceInspector";
import { TimelineDock } from "@/components/sar-investigation/TimelineDock";
import { ProcessingLog } from "@/components/sar-investigation/ProcessingLog";import {
  ArrowLeft,
  ShieldCheck,
  Layers3,
  Satellite,
} from "lucide-react";
import { RealSarDemoModal } from "@/components/gallery/RealSarDemoModal";

const VolumeScene = dynamic(
  () =>
    import("@/components/sar-investigation/VolumeScene").then((m) => m.VolumeScene),
  { ssr: false }
);

export default function SarInvestigationPage() {
  const { incidents, demoStep } = useCommandStore();
  const incident = incidents[0]; // demo streamlines to one
  const inv = useInvestigation();
  const [volumeMode, setVolumeMode] = useState(false);
  const [showSarDemoModal, setShowSarDemoModal] = useState(false);
  const [thumbSeq, setThumbSeq] = useState(0);
  const [thumbBand, setThumbBand] = useState<SarBand>("FINAL MASK");
  const didRun = useRef(false);

  const reduced = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  /* auto-play investigation on first mount (once) */
  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;
    if (!reduced) {
      const t = window.setTimeout(() => inv.run(), 400);
      return () => window.clearTimeout(t);
    }
  }, [inv, reduced]);

  const onThumb = useCallback((b: SarBand) => {
    setThumbBand(b);
    setThumbSeq((s) => s + 1);
  }, []);

  const scrub = useCallback(
    (index: number) => {
      inv.scrub(index);
    },
    [inv]
  );

  return (
    <div
      data-inv-page
      className="flex h-full flex-col overflow-hidden"
      style={{ background: "#050B11" }}
    >
      {/* header */}
      <header
        className="flex h-[56px] shrink-0 items-center gap-3 px-3"
        style={{ borderBottom: "1px solid rgba(56,189,248,0.15)" }}
      >
        <Link
          href="/sar/SD-2026-00421"
          className="flex items-center gap-1 rounded px-2 py-1 font-mono text-[10px] text-ink-dim ring-1 ring-line transition-colors hover:bg-bg-2 hover:text-ink focus-ring"
        >
          <ArrowLeft className="h-3 w-3" />
          SAR
        </Link>
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-ink">{incident.eventId}</span>
            <span
              className={cn(
                "rounded px-1.5 py-0.5 font-mono text-[9px] font-bold",
                inv.state.phase === "complete" || inv.state.phase === "verify"
                  ? "bg-green/12 text-green ring-1 ring-green/40"
                  : "bg-amber/12 text-amber ring-1 ring-amber/40"
              )}
            >
              {inv.state.confidence > 0 ? `${inv.state.confidence.toFixed(1)}%` : "â€”"} CONFIDENCE
            </span>
            <span className="font-mono text-[9px] text-ink-faint">
              SENTINEL-1A Â· ORBIT {incident.sarMetadata.relativeOrbit} Â· {incident.spillGeometry.areaKm2} kmÂ²
            </span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {TIMELINE.map((ev, i) => (
            <span
              key={ev.t}
              className={cn(
                "rounded px-1.5 py-0.5 font-mono text-[9px] transition-colors",
                inv.state.timeIndex >= i ? "bg-aqua/10 text-aqua" : "text-ink-faint"
              )}
            >
              {ev.t}
            </span>
          ))}
          <span
            className={cn(
              "ml-1 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold",
              inv.status === "VERIFIED MINERAL OIL" ? "bg-green/12 text-green" : "bg-bg-0 text-ink-dim ring-1 ring-line"
            )}
          >
            {inv.status}
          </span>
        </div>

        <button
          onClick={() => setShowSarDemoModal(true)}
          className="ml-2 flex items-center gap-1.5 rounded-md bg-aqua/10 px-2 py-1.5 font-mono text-[9px] font-semibold text-aqua ring-1 ring-aqua/30 transition-colors hover:bg-aqua/15 focus-ring"
          title="Open interactive Sentinel-1 C-band SAR processing workstation demo"
        >
          <Satellite className="h-3 w-3" />
          REAL SAR DEMO
        </button>

        <Link
          href="/drift"
          className="flex items-center gap-1.5 rounded-md bg-teal/10 px-2 py-1.5 font-mono text-[9px] font-semibold text-teal ring-1 ring-teal/30 transition-colors hover:bg-teal/15 focus-ring"
        >
          <ShieldCheck className="h-3 w-3" />
          RK4 DRIFT
        </Link>
        <Link
          href="/operations"
          className="flex items-center gap-1.5 rounded-md bg-bg-2 px-2 py-1.5 font-mono text-[9px] font-semibold text-ink ring-1 ring-line transition-colors hover:bg-panel-hover focus-ring"
        >
          <Layers3 className="h-3 w-3" />
          OPS
        </Link>
      </header>

      {/* body: viewer + inspector */}
      <div className="flex min-h-0 flex-1 gap-0">
        {/* viewer */}
        <div className="relative min-h-0 min-w-0 flex-1">
          {volumeMode ? (
            <VolumeScene incident={incident} inv={inv.state} />
          ) : (
            <SentinelMap
              incident={incident}
              inv={inv.state}
              volumeMode={volumeMode}
              onToggleVolume={() => setVolumeMode((v) => !v)}
            />
          )}

          {/* SAR product chip overlay */}
          <ProductChip
            incident={incident}
            inv={inv.state}
            reqBand={{ band: thumbBand, seq: thumbSeq }}
            className="absolute right-3 top-12 bottom-24 z-20"
          />

          {/* streaming processing log overlay (console-safe, deterministic) */}
          <ProcessingLog
            incident={incident}
            inv={inv.state}
            live={inv.state.playing}

            className="absolute bottom-3 left-3 z-20"
          />

          {/* floating controls bar â€” handled by SentinelMap/VolumeScene internally */}
        </div>

        {/* evidence inspector */}
        <div className="flex h-full w-[420px] shrink-0 flex-col overflow-hidden">
          <EvidenceInspector incident={incident} inv={inv.state} status={inv.status} />
        </div>
      </div>

      {/* bottom dock */}
      <div className="h-[104px] shrink-0">
        <TimelineDock
          incident={incident}
          inv={inv.state}
          status={inv.status}
          onReplay={inv.run}
          onScrub={scrub}
          onThumb={onThumb}
        />
      </div>
      {/* Real SAR Processing Demo Workstation Modal */}
      {showSarDemoModal && (
        <RealSarDemoModal onClose={() => setShowSarDemoModal(false)} />
      )}
    </div>
  );
}
