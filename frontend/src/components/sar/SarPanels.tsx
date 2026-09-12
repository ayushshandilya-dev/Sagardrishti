"use client";

import React from "react";
import { Incident } from "@/lib/types";
import { Scan, MapPinned, Radar, CircleCheck, BadgeCheck } from "lucide-react";

const panelCls =
  "rounded-panel border border-line bg-bg-1 px-3.5 py-3";
const headCls =
  "mb-2.5 flex items-center justify-between border-b border-line pb-2";
const rowCls = "flex items-center justify-between gap-2 py-px";
const labelCls = "meta shrink-0";
const monoValue = "font-mono text-[11px] font-medium text-ink tnum";

/* ── Detection evidence ─────────────────────────────── */
export const DetectionEvidence: React.FC<{ incident: Incident }> = ({ incident }) => {
  const { classification } = incident;
  const probs = classification.lookAlikeProbs;
  return (
    <div className={panelCls}>
      <div className={headCls}>
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-dim">
          <Scan className="h-3.5 w-3.5 text-aqua" />
          Detection evidence
        </span>
        <span className="font-mono text-[10px] font-semibold text-amber">
          {(classification.confidence * 100).toFixed(1)}%
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className={labelCls}>Mineral oil sheen</span>
          <span className="font-mono text-[11px] font-semibold text-amber tnum">
            {(probs.mineralOil * 100).toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className={labelCls}>Biogenic slick</span>
          <span className="font-mono text-[11px] text-ink-dim tnum">
            {(probs.biogenicSlick * 100).toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className={labelCls}>Low-wind area</span>
          <span className="font-mono text-[11px] text-ink-dim tnum">
            {(probs.lowWindArea * 100).toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className={labelCls}>Ship wake</span>
          <span className="font-mono text-[11px] text-ink-dim tnum">
            {(probs.shipWake * 100).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
};

const meter = (v: number, color: string) => (
  <div className="h-1 w-full overflow-hidden rounded-full bg-bg-0 ring-1 ring-line">
    <div className="h-full rounded-full" style={{ width: `${v * 100}%`, background: color }} />
  </div>
);

/* ── Geometry ──────────────────────────────────────── */
export const GeometryPanel: React.FC<{ incident: Incident }> = ({ incident }) => {
  const g = incident.spillGeometry;
  return (
    <div className={panelCls}>
      <div className={headCls}>
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-dim">
          <MapPinned className="h-3.5 w-3.5 text-aqua" />
          Geometry
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <div className={rowCls}><span className={labelCls}>Slick area</span><span className={monoValue}>{g.areaKm2} km²</span></div>
        <div className={rowCls}><span className={labelCls}>Perimeter</span><span className={monoValue}>{g.perimeterKm.toFixed(1)} km</span></div>
        <div className={rowCls}><span className={labelCls}>Length × width</span><span className={monoValue}>{g.lengthKm.toFixed(1)} × {g.widthKm.toFixed(1)} km</span></div>
        <div className={rowCls}><span className={labelCls}>Skeleton bearing</span><span className={monoValue}>{g.skeletonOrientationDeg}°</span></div>
      </div>
    </div>
  );
};

/* ── Metadata ──────────────────────────────────────── */
export const MetadataPanel: React.FC<{ incident: Incident }> = ({ incident }) => {
  const m = incident.sarMetadata;
  return (
    <div className={panelCls}>
      <div className={headCls}>
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-dim">
          <Radar className="h-3.5 w-3.5 text-aqua" />
          Acquisition metadata
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <div className={rowCls}><span className={labelCls}>Mission</span><span className={monoValue}>{m.mission}</span></div>
        <div className={rowCls}><span className={labelCls}>Sensor</span><span className="font-sans text-[11px] text-ink-dim">{m.sensor}</span></div>
        <div className={rowCls}><span className={labelCls}>Product</span><span className={monoValue}>{m.productType}</span></div>
        <div className={rowCls}><span className={labelCls}>Polarization</span><span className={monoValue}>{m.polarization.join(" / ")}</span></div>
        <div className={rowCls}><span className={labelCls}>Incidence</span><span className={monoValue}>{m.incidenceAngleDeg}°</span></div>
        <div className={rowCls}><span className={labelCls}>Resolution</span><span className={monoValue}>{m.resolutionMeters ? `${m.resolutionMeters} m` : "—"}</span></div>
        <div className={rowCls}><span className={labelCls}>Pass</span><span className={monoValue}>{m.passDirection}</span></div>
        <div className={rowCls}><span className={labelCls}>Orbit</span><span className={monoValue}>REL {m.relativeOrbit}</span></div>
        <div className="mt-1.5 border-t border-line pt-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className={labelCls}>Scene SHA-256</span>
            <span className="w-40 truncate text-right font-mono text-[9px] text-ink-faint" title={m.rawSceneSha256}>
              {m.rawSceneSha256.slice(0, 28)}…
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Evidence chips ────────────────────────────────── */
export const EvidenceChips: React.FC<{ incident: Incident }> = ({ incident }) => (
  <div className={panelCls}>
    <div className={headCls}>
      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-dim">
        <BadgeCheck className="h-3.5 w-3.5 text-teal" />
        Evidence status
      </span>
      <span className="flex items-center gap-1 font-mono text-[10px] font-semibold text-green">
        <CircleCheck className="h-3 w-3" /> VERIFIED
      </span>
    </div>
    <div className="flex flex-wrap gap-1.5">
      {incident.evidenceChips.map((chip) => (
        <span
          key={chip}
          className="rounded bg-teal/8 px-2 py-1 font-mono text-[10px] text-teal ring-1 ring-teal/25"
        >
          {chip}
        </span>
      ))}
    </div>
  </div>
);

/* ── Confidence meter (used inline) ────────────────── */
export const DetectorScores: React.FC<{ incident: Incident }> = ({ incident }) => {
  const s = incident.detectionScores;
  return (
    <div className={panelCls}>
      <div className={headCls}>
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-dim">
          Detector consensus
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        {[
          ["Texture (GLCM)", s.textureScore, "#38BDF8"],
          ["VV/VH damping", s.vvVhAgreement, "#22D3A7"],
          ["Morphology", s.morphologyAgreement, "#38BDF8"],
          ["Otsu threshold", s.thresholdScore, "#F59E0B"],
          ["SegFormer IoU", s.segmentationAgreement, "#22D3A7"],
        ].map(([label, v, c]) => {
          const val = v as number;
          const col = c as string;
          return (
            <div key={label as string} className="flex items-center gap-2">
              <span className="w-28 shrink-0 text-[10px] text-ink-dim">{label}</span>
              <div className="min-w-0 flex-1">{meter(val, col)}</div>
              <span className="w-7 text-right font-mono text-[10px] text-ink-dim tnum">{(val * 100).toFixed(0)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};