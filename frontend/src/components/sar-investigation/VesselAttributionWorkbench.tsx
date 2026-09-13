"use client";

import { useMemo } from "react";
import { cn } from "@/lib/util";
import { Incident } from "@/lib/types";
import type { InvestigationState } from "./useInvestigation";

export interface CandidateVessel {
  id: string;
  name: string;
  imo: string;
  flag: string;
  cargo: string;
  risk: number;
  confidence: number;
  closestKt: number;
  aisAnomalies: number;
  status: "CRITICAL" | "INVESTIGATING" | "CLEARED";
  reason: string;
}

export interface EvidenceCard {
  id: string;
  kind: string;
  title: string;
  detail: string;
  verified: boolean;
  step: number;
}

const SEED = 0x9e3779b9;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CANDIDATE_NAMES = [
  "MT OCEAN MERIDIAN",
  "MT GULF PRINCE II",
  "MT SAKAR POLARIS",
  "MT ANDHARI DAWN",
  "MT RANN EXPLORER",
];

const FLAGS = ["PANAMA", "MARSHALL IS", "LIBERIA", "INDIA", "SINGAPORE"];
const CARGO = ["CRUDE OIL", "DIESEL", "CHEMICAL", "BALLAST", "CRUDE OIL"];

const FEATURES = [
  "Closest Approach",
  "AIS Blackout",
  "Speed Anomaly",
  "Heading Deviation",
  "Cargo Type",
  "Drift Correlation",
  "Meteorology Match",
  "Historical Behavior",
] as const;

const EVIDENCE: { kind: string; title: string; detail: string; step: number }[] = [
  { kind: "SAR", title: "Sentinel-1 DETECTION", detail: "VV/VH dual-pol backscatter · 412 px² slick", step: 1 },
  { kind: "AIS", title: "AIS TRACK", detail: "6 h decoded · 14 slots · MSC region", step: 2 },
  { kind: "RK4", title: "RK4 RECONSTRUCTION", detail: "drift origin 22.71 N · 69.14 E ±1.8 km", step: 3 },
  { kind: "MET", title: "WIND SNAPSHOT", detail: "NE 8.2 m/s · 3 h sustained", step: 4 },
  { kind: "CUR", title: "CURRENT SNAPSHOT", detail: "SW 0.6 kt · seasonal Gulf of Kutch", step: 5 },
  { kind: "RAD", title: "RADAR SIGNATURE", detail: "narrowband NUC · mineral spectrum match", step: 6 },
] as const;

const FINAL = 91.4;

function grad(i: number) {
  const points = [0, 35, 24, 0, -8, 18, 12, 12, -1.6];
  return points[i] ?? 0;
}

const RING_R = 9.5;
const RING_C = 12;

export function VesselAttributionWorkbench({
  incident,
  iv,
  className,
}: {
  incident: Incident;
  iv: InvestigationState;
  className?: string;
}) {
  const d = useMemo(() => {
    const rng = mulberry32(hash(incident.eventId) | SEED);
    const cands: CandidateVessel[] = CANDIDATE_NAMES.map((name, i) => ({
      id: "v" + (i + 1),
      name,
      imo: "9" + (Math.floor(rng() * 9) + 1) + (Math.floor(rng() * 999999) + 100000),
      flag: FLAGS[i],
      cargo: CARGO[i],
      risk: Math.round((i === 0 ? 91.4 : 62 - i * 12) * 100) / 100,
      confidence: Math.round(78 - i * 16) / 10,
      closestKt: Math.round((i === 0 ? 0.4 : 1.1 + i * ondo) * 10) / 10,
      aisAnomalies: i === 0 ? 4 : 2 - (i % 2),
      status: i === 0 ? "CRITICAL" : i < 4 ? "INVESTIGATING" : "CLEARED",
      reason:
        i === 0
          ? "drift origin intercept at 03:12 UTC · 26 min before spill"
          : "route within 14 nmi · no blackout",
    }));
    const contribs = FEATURES.map((name, i) => ({
      name,
      pct: Math.round(grad(i) * 10) / 10,
    }));
    return { cands, contribs };
  }, [incident.eventId]);

  const c = d.cands[0];

  const wf = useMemo(() => {
    let acc = 0;
    return d.contribs.map((f) => {
      acc = Math.round((acc + f.pct) * 10) / 10;
      return { ...f, acc };
    });
  }, [d.contribs]);

  const steps = useMemo(() => {
    const rng = mulberry32(hash(incident.eventId + "|evidence"));
    return EVIDENCE.map((e, i) => ({
      ...e,
      id: "ev" + (i + 1),
      verified: iv.phase !== "idle" || i < rng() * 0.4,
    }));
  }, [incident.eventId, iv.phase]);

  const flags = useMemo(() => d.cands.filter((x) => x.status !== "CLEARED").length, [d.cands]);

  return (
    <section
      id="attribution-workbench"
      aria-label="SAR intelligence attribution: vessel identification"
      className={cn(
        "select-none border-t border-line bg-bg-2/95 text-ink",
        className
      )}
    >
      <header className="flex items-center justify-between border-b border-line px-3 py-2">
        <div className="text-xs font-semibold tracking-widest text-ink-dim">
          VESSEL ATTRIBUTION · EXPLAINABLE AI
        </div>
        <div className="flex items-center gap-2 text-[10px] text-ink-faint">
          <span className={cn("h-1.5 w-1.5 rounded-full", iv.phase === "complete" ? "bg-teal" : "bg-amber")} />
          {iv.phase === "complete" ? "ATTRIBUTION SEALED" : `PHASE ${iv.phase.toUpperCase()}`}
        </div>
      </header>

      <div className="grid gap-3 p-3 lg:grid-cols-[280px_1fr_260px]">
        {/* risk cards (top suspect) */}
        <div className="space-y-2">
          <CardHead title="SUSPECT RANKING" sub="risk score · reason" />
          {d.cands.map((v, i) => (
            <article
              key={v.id}
              className={cn(
                "rounded-md border p-2 transition-colors",
                i === 0
                  ? "border-red/50 bg-red/5"
                  : v.status === "INVESTIGATING"
                    ? "border-amber/40 bg-bg-1"
                    : "border-line bg-bg-1/60"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-ink">{v.name}</span>
                <Chip status={v.status} />
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-ink-dim">
                <span>IMO {v.imo}</span>
                <span>{v.flag}</span>
                <span>{v.cargo}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded bg-line">
                  <div
                    className={cn("h-full rounded", v.status === "CRITICAL" ? "bg-red" : "bg-amber")}
                    style={{ width: `${v.risk}%` }}
                  />
                </div>
                <span className="text-[11px] font-mono font-bold text-ink">{v.risk}%</span>
              </div>
              <p className="mt-1 text-[10px] leading-snug text-ink-faint">{v.reason}</p>
            </article>
          ))}
        </div>

        {/* waterfall explainability */}
        <div className="rounded-md border border-line p-3">
          <CardHead title="AI ATTRIBUTION · FEATURE WATERFALL" sub="SHAP-style · evidence → 91.4%" />
          <div className="mt-3 space-y-1.5">
            {wf.map((f) => (
              <div key={f.name} className="flex items-center gap-2 text-[10px]">
                <span className="w-32 shrink-0 text-ink-dim">{f.name}</span>
                <div className="relative h-4 flex-1 overflow-hidden rounded-sm bg-line">
                  <div
                    className="absolute inset-y-0 rounded-sm bg-teal/70"
                    style={{ left: "50%", width: `${Math.abs(f.pct) * 0.45}%` }}
                  />
                  <div
                    className="absolute h-4 w-0 border-l border-ink/30"
                    style={{ left: `${Math.min(96, f.acc * 0.5 + 12)}%` }}
                  />
                </div>
                <span className="w-14 shrink-0 text-right font-mono text-ink">
                  {f.pct > 0 ? "+" : ""}
                  {f.pct.toFixed(1)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-2 flex items-center justify-end gap-ame gas from font-mono text-lg text-ink">
            <span className="text-ink-faint">Σ</span>
            <b>{FINAL.toFixed(1)}%</b>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {steps.map((s) => (
              <div key={s.id} className="rounded border border-line px-2 py-1 text-[10px]">
                <div className="flex items-center gap-1 font-semibold text-ink-dim">
                  {s.verified ? <Ok /> : <><Dot /><span className="text-amber">VERIFYING</span></>}
                  {s.kind}
                </div>
                <div className="text-ink">{s.title}</div>
                <div className="text-ink-faint">{s.detail}</div>
              </div>
            ))}
          </div>
        </div>

        {/* probability wheel + readiness */}
        <div className="space-y-3">
          <div className="rounded-md border border-line p-3">
            <CardHead title="CARGO LIKELIHOOD" sub="manifest probability wheel" />
            <div className="mt-3 flex items-center justify-center gap-2">
              <svg viewBox="0 0 24 24" className="h-28 w-28" aria-hidden="true">
                {[
                  ["CRUDE", 38, "text-red"],
                  ["DIESEL", 22, "text-amber"],
                  ["CHEM", 17, "text-teal"],
                  ["OTHER", 14, "text-sky"],
                  ["BALLAST", 9, "text-ink-dim"],
                ].map(([label, pct, cls], i, arr) => {
                  const total = 100;
                  let off = 0;
                  const pieces = arr.map(([l, p]) => (+p / total) * 100);
                  // cumulative sweep
                  let acc = 0;
                  const seg = pieces[i];
                  const a1 = 2 * Math.PI * (acc / 100);
                  const a2 = 2 * Math.PI * ((acc + seg) / 100);
                  const large = a2 - a1 > Math.PI ? 1 : 0;
                  const p1 = [RING_C + RING_R * Math.cos(a1), RING_C + RING_R * Math.sin(a1)];
                  const p2 = [RING_C + RING_R * Math.cos(a2), RING_C + RING_R * Math.sin(a2)];
                  const pMid = [RING_C + RING_R * 0.6 * Math.cos((a1 + a2) / 2), RING_C + RING_R * 0.6 * Math.sin((a1 + a2) / 2)];
                  void off;
                  return (
                    <g key={String(label)}>
                      <path
                        d={`M ${RING_C} ${RING_C} L ${p1[0]} ${p1[1]} A ${RING_R} ${RING_R} 0 ${large} 1 ${p2[0]} ${p2[1]} Z`}
                        className={String(cls)}
                        fill="currentColor"
                        opacity={0.85}
                      />
                      <text
                        x={pMid[0]}
                        y={pMid[1]}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize="1.35"
                        className="fill-bg-1 font-mono"
                      >
                        {label} {pct}%
                      </text>
                    </g>
                  );
                })}
              </svg>
              <p className="max-w-[120px] text-[10px] leading-snug text-ink-faint">
                Mineral-oil spectrum matches <b className="text-ink">crude</b> 38% — wax/tar IR signature blend.
              </p>
            </div>
          </div>

          <div className="rounded-md border border-line p-3">
            <CardHead title="CONFIDENCE BUILD" sub="evidence → verdict" />
            <RenderConfidence phase={iv.phase} />
          </div>

          <div className="rounded-md border border-line bg-bg-1 p-3">
            <CardHead title="LEGAL READINESS" sub="forensic completeness" />
            <ul className="mt-2 space-y-1 text-[10px]">
              {["Evidence completeness", "Geospatial confidence", "AIS integrity", "Satellite integrity", "Environmental consistency"].map((r, i) => {
                const p = 96 - (i % 2) * 4;
                return (
                  <li key={r} className="flex items-center gap-2">
                    <span className="flex-1 text-ink-dim">{r}</span>
                    <div className="h-1 w-14 overflow-hidden rounded bg-line">
                      <div className="h-full bg-teal" style={{ width: `${p}%` }} />
                    </div>
                    <span className="w-8 text-right font-mono text-ink-faint">{p}%</span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-2 flex items-center gap-2 rounded border border-teal/40 bg-teal/10 px-2 py-1.5">
              <Ok />
              <span className="text-[11px] font-bold text-teal">READY FOR PROSECUTION</span>
            </div>
          </div>
        </div>
      </div>

      <footer className="border-t border-line px-3 py-1.5 text-[10px] text-ink-faint">
        <span className="font-semibold text-ink-dim">RK4 62-init correlation</span> · origin → {c.name} · closest
        approach {c.closestKt} kt · {flags} active suspects · AIS blackout {"04:39→05:12 UTC"} · wind NE 8 m/s
      </footer>
    </section>
  );
}

function RenderConfidence({ phase }: { phase: InvestigationState["phase"] }) {
  const steps = ["footprint", "anomaly", "detect", "segment", "verify", "complete"];
  const idx = steps.indexOf(phase);
  const goal = [35, 41, 55, 73, 82, FINAL][Math.max(0, idx)];
  const pts = [0, 35, 41, 55, 73, 82, FINAL];
  const pct = pts[idx];
  void goal;
  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded bg-line">
          <div className="h-full bg-gradient-to-r from-amber to-teal" style={{ width: `${(pct / FINAL) * 105}%` }} />
        </div>
        <span className="text-sm font-mono font-bold text-ink">{pct}%</span>
      </div>
      <div className="mt-1 flex justify-between text-[9px] text-ink-faint">
        <span>35%</span>
        <span>55%</span>
        <span>73%</span>
        <span>82%</span>
        <span>91.4%</span>
      </div>
    </div>
  );
}

function Chip({ status }: { status: CandidateVessel["status"] }) {
  const cls =
    status === "CRITICAL"
      ? "border-red/50 bg-red/15 text-red"
      : status === "INVESTIGATING"
        ? "border-amber/50 bg-amber/15 text-amber"
        : "border-line bg-bg-1 text-ink-faint";
  return (
    <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider", cls)}>
      {status}
    </span>
  );
}

function CardHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <div className="text-[11px] font-bold tracking-wide text-ink">{title}</div>
      <div className="text-[9px] uppercase tracking-widest text-ink-faint">{sub}</div>
    </div>
  );
}

function Dot() {
  return <span className="h-1 w-1 rounded-full bg-amber" />;
}

function Ok() {
  return <span className="text-teal">✓</span>;
}
