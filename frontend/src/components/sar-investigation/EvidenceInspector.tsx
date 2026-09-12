"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Incident } from "@/lib/types";
import { cn } from "@/lib/util";
import { InvestigationState, InvStatus } from "./useInvestigation";
import {
  ChevronDown,
  Wind,
  Waves,
  Download,
  ShieldCheck,
  Eye,
  Thermometer,
} from "lucide-react";

interface EvidenceInspectorProps {
  incident: Incident;
  inv: InvestigationState;
  status: InvStatus;
}

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b" style={{ borderColor: "rgba(56,189,248,0.12)" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 px-3 py-2 text-left font-mono text-[9px] font-semibold tracking-[0.16em] text-ink-dim transition-colors hover:text-ink"
      >
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
        {title}
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

export const EvidenceInspector: React.FC<EvidenceInspectorProps> = ({ incident, inv, status }) => {
  const conf = Math.round(inv.confidence * 10) / 10 || 0;
  const confFrac = conf / 100;
  const R = 40;
  const C = 2 * Math.PI * R;

  const geom = incident.spillGeometry;
  const compactness = (4 * Math.PI * geom.areaKm2) / Math.pow(geom.perimeterKm, 2);

  const sub: [string, number][] = [
    ["Texture", incident.detectionScores.textureScore],
    ["VV/VH", incident.detectionScores.vvVhAgreement],
    ["Shape", incident.detectionScores.morphologyAgreement],
    ["Wind", 0.78],
    ["Current", 0.71],
    ["Prob.", incident.classification.lookAlikeProbs.mineralOil],
  ];

  const radar = [
    ["Texture", incident.detectionScores.textureScore],
    ["Backscatter", incident.detectionScores.vvVhAgreement],
    ["Morphology", incident.detectionScores.morphologyAgreement],
    ["Meteorology", 0.74],
    ["Temporal", incident.detectionScores.segmentationAgreement],
  ] as const;

  const env = [
    { icon: Wind, k: "WIND", v: "7.2 m/s · 214°" },
    { icon: Waves, k: "CURRENT", v: "0.42 m/s · 262°" },
    { icon: Waves, k: "SEA STATE", v: "3 · 0.8 m" },
    { icon: Thermometer, k: "SST", v: "28.4 °C" },
  ];

  const exportSnapshot = () => {
    const payload = {
      eventId: incident.eventId,
      sar: incident.sarMetadata,
      geometry: incident.spillGeometry,
      classification: incident.classification,
      scores: incident.detectionScores,
      confidencePct: conf,
      status,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${incident.eventId}-evidence.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="flex h-full flex-col overflow-y-auto"
      style={{ background: "#0C1822", borderLeft: "1px solid rgba(56,189,248,0.15)" }}
    >
      {/* summary */}
      <div className="border-b px-4 py-3" style={{ borderColor: "rgba(56,189,248,0.12)" }}>
        <div className="flex items-center justify-between">
          <span className="meta-label">Incident</span>
          <span
            className={cn(
              "rounded px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-[0.12em]",
              status === "VERIFIED MINERAL OIL" ? "text-green" : status === "LIKELY OIL" ? "text-amber" : "text-ink-dim"
            )}
            style={{ background: status === "VERIFIED MINERAL OIL" ? "rgba(34,197,94,0.12)" : "rgba(214,168,79,0.1)" }}
          >
            {status}
          </span>
        </div>
        <div className="mt-1 font-mono text-sm font-semibold text-ink">{incident.eventId}</div>
        <div className="mt-0.5 flex items-center justify-between font-mono text-[9px] text-ink-faint">
          <span>{incident.timestampUtc} UTC</span>
          <span className="text-red">{incident.severity}</span>
        </div>
        <div className="mt-0.5 font-mono text-[9px] text-ink-dim">
          {incident.sarMetadata.sensor} · {incident.sarMetadata.polarization.join("/")}
        </div>
      </div>

      {/* confidence radial */}
      <Section title="AI CONFIDENCE">
        <div className="flex items-center gap-4">
          <div className="relative h-24 w-24">
            <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90">
              <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(56,189,248,0.12)" strokeWidth="7" />
              <motion.circle
                cx="50"
                cy="50"
                r={R}
                fill="none"
                stroke="#D6A84F"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={C}
                initial={{ strokeDashoffset: C }}
                animate={{ strokeDashoffset: C * (1 - confFrac) }}
                transition={{ type: "spring", stiffness: 60, damping: 20 }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-lg font-bold text-ink tnum">{conf.toFixed(1)}%</span>
              <span className="font-mono text-[8px] text-ink-faint">CONFIDENCE</span>
            </div>
          </div>
          <div className="flex-1 space-y-1">
            {sub.map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <span className="w-14 font-mono text-[9px] text-ink-dim">{k}</span>
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-bg-0">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg,#D6A84F,#FACC15)" }}
                    animate={{ width: `${Math.round(v * 100)}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* radar chart */}
      <Section title="EXPLAINABILITY · 5-AXIS">
        <Radar scores={[...radar]} />
      </Section>

      {/* geometry */}
      <Section title="GEOMETRY">
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          <Metric k="AREA" v={`${geom.areaKm2.toFixed(1)} km²`} />
          <Metric k="PERIMETER" v={`${geom.perimeterKm.toFixed(1)} km`} />
          <Metric k="COMPACTNESS" v={compactness.toFixed(2)} />
          <Metric k="MAJOR AXIS" v={`${geom.lengthKm.toFixed(1)} km`} />
          <Metric k="MINOR AXIS" v={`${geom.widthKm.toFixed(1)} km`} />
          <Metric k="ORIENTATION" v={`${geom.skeletonOrientationDeg.toFixed(1)}°`} />
          <Metric k="SAMPLING" v="10 m GRD" />
          <Metric k="CENTROID" v={`${geom.centroid.latitude.toFixed(4)}N · ${geom.centroid.longitude.toFixed(4)}E`} />
        </div>
      </Section>

      {/* polarization */}
      <Section title="POLARIZATION">
        <div className="flex flex-wrap gap-1.5">
          {incident.sarMetadata.polarization.map((p) => (
            <span key={p} className="rounded bg-aqua/10 px-2 py-0.5 font-mono text-[9px] font-bold text-aqua ring-1 ring-aqua/30">
              {p} ✓
            </span>
          ))}
          <span className="rounded bg-bg-0 px-2 py-0.5 font-mono text-[9px] text-ink-dim tnum">
            damping ratio {(incident.detectionScores.vvVhAgreement * 12.4).toFixed(1)} dB
          </span>
        </div>
      </Section>

      {/* environment */}
      <Section title="ENVIRONMENT">
        <div className="space-y-1.5">
          {env.map(({ icon: Ic, k, v }) => (
            <div key={k} className="flex items-center gap-2 font-mono text-[9px]">
              <Ic className="h-3 w-3 text-teal/70" />
              <span className="w-20 text-ink-faint">{k}</span>
              <span className="text-ink-dim tnum">{v}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 font-mono text-[9px]">
            <Eye className="h-3 w-3 text-teal/70" />
            <span className="w-20 text-ink-faint">CLOUD</span>
            <span className="text-ink-dim tnum">0.0 % · RADAR ALL-WEATHER</span>
          </div>
        </div>
      </Section>

      {/* ai explanation */}
      <Section title="AI EXPLANATION">
        <ul className="space-y-1.5 text-[10px] leading-relaxed text-ink-dim">
          {explanationLines(incident).map((l, i) => (
            <li key={i} className="flex gap-1.5">
              <span className="text-teal">▸</span>
              <span>{l}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* actions */}
      <div className="mt-auto space-y-1.5 p-3">
        <div className="flex gap-1.5">
          <button
            onClick={exportSnapshot}
            className="flex flex-1 items-center justify-center gap-1 rounded-md bg-bg-2 px-2 py-1.5 font-mono text-[9px] font-semibold text-ink ring-1 ring-line hover:bg-panel-hover focus-ring"
          >
            <Download className="h-3 w-3" /> EXPORT
          </button>
          <Link
            href="/drift"
            className="flex flex-1 items-center justify-center gap-1 rounded-md bg-teal/10 px-2 py-1.5 font-mono text-[9px] font-semibold text-teal ring-1 ring-teal/30 hover:bg-teal/15 focus-ring"
          >
            <ShieldCheck className="h-3 w-3" /> RK4 DRIFT
          </Link>
        </div>
        <div className="flex items-center justify-between px-0.5 font-mono text-[8px] text-ink-faint">
          <span>EVIDENCE LEDGER · {incident.eventId}</span>
          <Link href="/evidence" className="underline hover:text-aqua">
            VERIFY
          </Link>
        </div>
      </div>
    </div>
  );
};

function Metric({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-md bg-bg-0/60 px-2 py-1">
      <div className="text-[8px] tracking-[0.14em] text-ink-faint">{k}</div>
      <div className="mt-0.5 font-mono text-[10px] text-ink tnum">{v}</div>
    </div>
  );
}

function Radar({ scores }: { scores: readonly (readonly [string, number])[] }) {
  const N = scores.length;
  const center = 60;
  const radius = 42;
  const pt = (i: number, r: number) => {
    const a = (Math.PI * 2 * i) / N - Math.PI / 2;
    return [center + r * Math.cos(a), center + r * Math.sin(a)];
  };
  const poly = scores
    .map((score, i) => {
      const [x, y] = pt(i, radius * Math.max(0.05, score[1]));
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  return (
    <div className="flex items-center gap-1">
      <svg viewBox="0 0 120 120" className="h-28 w-28">
        {Array.from({ length: N }).map((_, i) => {
          const [x, y] = pt(i, radius);
          return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="rgba(56,189,248,0.15)" strokeWidth="1" />;
        })}
        {Array.from({ length: 4 }).map((_, ring) => (
          <polygon
            key={ring}
            points={scores
              .map((_, i) => {
                const [x, y] = pt(i, radius * ((ring + 1) / 4));
                return `${x},${y}`;
              })
              .join(" ")}
            fill="none"
            stroke="rgba(56,189,248,0.12)"
            strokeWidth="1"
          />
        ))}
        <motion.polygon
          points={poly}
          fill="rgba(214,168,79,0.22)"
          stroke="#FACC15"
          strokeWidth="1.5"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ transformOrigin: "60px 60px" }}
        />
        {scores.map(([label], i) => {
          const [x, y] = pt(i, radius + 12);
          const split = label.split(" ");
          return (
            <text key={label} x={x} y={y + (split.length > 1 ? 2 : 0)} textAnchor="middle" dominantBaseline="middle" fill="#6B7F8C" fontSize="5.5" fontFamily="var(--font-jbm)">
              {split[0]}
              {split[1]}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function explanationLines(incident: Incident): string[] {
  return [
    `VV backscatter dips ${(incident.detectionScores.vvVhAgreement * 100).toFixed(0)} relative to open-water reference — radar damping consistent with mineral film.`,
    `Dual-pol VV/VH agreement high (${(incident.detectionScores.vvVhAgreement * 100).toFixed(0)}/100) — biogenic slicks decouple VH.`,
    `Slick morphology ${(incident.detectionScores.morphologyAgreement * 100).toFixed(0)}% matches natural emplacement drift, not a circular ship-wake signature.`,
    `Texture homogeneity ${(incident.detectionScores.textureScore > 0.5 ? "above" : "below")} threshold after speckle filtering (FILTERED pass).`,
    `Lookalike decomposition: mineral oil ${(incident.classification.lookAlikeProbs.mineralOil * 100).toFixed(1)}% vs biogenic ${(incident.classification.lookAlikeProbs.biogenicSlick * 100).toFixed(1)}%.`,
  ];
}