"use client";

import React, { useState } from "react";
import { useCommandStore } from "@/lib/store";
import { cn } from "@/lib/util";
import { PageHeader } from "@/components/ui/PageHeader";
import { TacticalButton } from "@/components/ui/TacticalButton";
import {
  ScrollText,
  FileSignature,
  Scan,
  Route,
  Ship,
  ShieldCheck,
  MapPin,
  Printer,
} from "lucide-react";

const SectionShell: React.FC<{
  no: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ no, title, icon, children }) => (
  <section className="px-10 py-5">
    <div className="mb-3 flex items-center gap-2 border-b border-line pb-2">
      <span className="flex h-6 w-6 items-center justify-center rounded bg-bg-0 font-mono text-[10px] font-semibold text-aqua ring-1 ring-line">
        {no}
      </span>
      {icon}
      <h2 className="text-[13px] font-semibold tracking-wide text-ink">{title}</h2>
    </div>
    {children}
  </section>
);

const K = ({ k, v, mono = true }: { k: string; v: React.ReactNode; mono?: boolean }) => (
  <div className="flex items-baseline justify-between gap-4 border-b border-dashed border-line/60 py-1 last:border-0">
    <span className="shrink-0 text-[11px] text-ink-faint">{k}</span>
    <span className={cn("text-right text-[12px] text-ink", mono && "font-mono tnum")}>{v}</span>
  </div>
);

const ASSESS =
  "FORENSIC MATERIAL — For official use only. This dossier aggregates satellite, coastal radar and AIS evidence under the Sagar-Drishti surveillance programme and is admissible as evidence under the Merchant Shipping Act, 1958.";

export default function LegalDossierPage() {
  const [envelope, setEnvelope] = useState(false);
  const { selectedIncidentId, incidents, candidateVessels, driftResult, hasVerified, evidenceChecks } =
    useCommandStore();
  const incident = incidents.find((i) => i.eventId === selectedIncidentId) ?? incidents[0];
  const rank1 = [...candidateVessels].sort((a, b) => b.attributionScore - a.attributionScore)[0];

  const o = driftResult?.reconstructedOrigin;
  const m = incident.sarMetadata;
  const g = incident.spillGeometry;

  return (
    <div className="flex h-full flex-col gap-3 p-3 pb-2">
      <PageHeader
        className="px-0.5"
        title="Legal dossier"
        badge={{ label: `CASE ${incident.eventId}`, tone: "neutral" }}
        subtitle="Official case file · s.356 Merchant Shipping Act, 1958 · marine pollution"
        right={
          <TacticalButton
            variant="secondary"
            icon={Printer}
            onClick={() => setEnvelope((v) => !v)}
          >
            {envelope ? "Hide report" : "Open report"}
          </TacticalButton>
        }
      />

      {envelope && (
        <div className="min-h-0 flex-1 overflow-y-auto rounded-panel border border-line bg-bg-1 shadow-float">
          {/* Masthead */}
          <div className="flex items-center justify-between border-b-2 border-line px-10 py-5">
            <div>
              <div className="font-mono text-[9px] tracking-[0.28em] text-aqua">REPUBLIC OF INDIA · INDIAN COAST GUARD</div>
              <div className="mt-1 text-lg font-semibold tracking-tight text-ink">SAGAR-DRISHTI SURVEILLANCE PROGRAMME</div>
              <div className="meta mt-0.5">Marine pollution forensic case file</div>
            </div>
            <div className="flex flex-col items-end gap-1 font-mono text-[9px] text-ink-faint">
              <span>FILE NO. FD/2026/0412</span>
              <span>CLASSIFIED — OFFICIAL USE</span>
              <span>REV 1.0 · SEAL OF AUTHORITY</span>
            </div>
          </div>

          <div className="border-b border-line bg-bg-0/50 px-10 py-3 text-center font-mono text-[9px] tracking-wide text-ink-faint">
            {ASSESS}
          </div>

          {/* 1 — Incident summary */}
          <SectionShell no="01" title="Incident summary" icon={<Scan className="h-4 w-4 text-amber" />}>
            <div className="max-w-2xl flex-col gap-0.5">
              <K k="Event identifier" v={incident.eventId} />
              <K k="Detection (UTC)" v={incident.timestampUtc} />
              <K k="Sensor" v={`${m.mission} · ${m.sensor} · ${m.productType}`} mono={false} />
              <K k="Classification" v={`${incident.classification.classLabel.replace("_", " ")} · ${(incident.classification.confidence * 100).toFixed(1)}%`} />
              <K k="Slick locus" v={`${g.centroid.latitude.toFixed(4)}°N ${g.centroid.longitude.toFixed(4)}°E · ${g.areaKm2} km²`} />
              <p className="mt-3 text-[12px] leading-relaxed text-ink-dim">{incident.radarBrief}</p>
            </div>
          </SectionShell>

          {/* 2 — SAR evidence */}
          <SectionShell no="02" title="SAR evidence" icon={<Scan className="h-4 w-4 text-aqua" />}>
            <div className="grid grid-cols-2 gap-x-8 gap-y-0.5">
              <K k="Polarisation" v={m.polarization.join(" / ")} />
              <K k="Incidence" v={`${m.incidenceAngleDeg}°`} />
              <K k="Pass / orbit" v={`${m.passDirection} · REL ${m.relativeOrbit}`} />
              <K k="Resolution" v={`${m.resolutionMeters} m`} />
              <K k="Physical extent" v={`${g.lengthKm.toFixed(1)} × ${g.widthKm.toFixed(1)} km · ${g.perimeterKm.toFixed(1)} km per.`} />
              <K k="Scene integrity" v={`SHA-256 ${m.rawSceneSha256.slice(0, 20)}…`} />
            </div>
          </SectionShell>

          {/* 3 — Reverse drift */}
          <SectionShell no="03" title="Reverse drift reconstruction" icon={<Route className="h-4 w-4 text-teal" />}>
            {o ? (
              <div className="grid grid-cols-2 gap-x-8 gap-y-0.5">
                <K k="Reconstructed origin" v={`${o.latitude.toFixed(4)}°N ${o.longitude.toFixed(4)}°E`} />
                <K k="Discharge window" v={`${o.timestampUtc} ± ${Math.round(o.uncertaintyRadiusMeters / 1000)} km`} />
                <K k="Backtrack duration" v={`${o.hoursBeforeObservation} h`} />
                <K k="Model" v={`${driftResult?.provenance.driftModel} · σ ${(o.rk4Confidence * 100).toFixed(0)}%`} mono={false} />
              </div>
            ) : (
              <div className="meta">No drift reconstruction on record for this case.</div>
            )}
          </SectionShell>

          {/* 4 — AIS attribution */}
          <SectionShell no="04" title="AIS vessel attribution" icon={<Ship className="h-4 w-4 text-red" />}>
            {rank1 && (
              <div className="grid grid-cols-2 gap-x-8 gap-y-0.5">
                <K k="Designated prime suspect" v={rank1.vesselName} mono={false} />
                <K k="IMO / MMSI / flag" v={`${rank1.imo} / ${rank1.mmsi} / ${rank1.flag}`} />
                <K k="Attribution score" v={`${(rank1.attributionScore * 100).toFixed(1)}%`} />
                <K k="Closest approach" v={`${(rank1.closestApproachMeters / 1000).toFixed(2)} km`} />
                <K k="Heading offset from slick axis" v={`${rank1.headingAlignmentDeg}°`} />
                <K k="AIS anomaly" v={rank1.aisAnomaly} />
                <K k="Risk posture" v={rank1.riskBadge} />
              </div>
            )}
            <ul className="mt-3 flex flex-col gap-1">
              {rank1?.reasons.map((r, i) => (
                <li key={i} className="flex items-center gap-2 text-[11px] text-ink-dim">
                  <span className="font-mono text-aqua">▸</span>
                  {r}
                </li>
              ))}
            </ul>
          </SectionShell>

          {/* 5 — Evidence integrity */}
          <SectionShell no="05" title="Evidence integrity" icon={<ShieldCheck className="h-4 w-4 text-green" />}>
            <div className="grid grid-cols-2 gap-x-8 gap-y-0.5">
              <K k="Ledger status" v={hasVerified ? "CHAIN OF CUSTODY VERIFIED" : "Awaiting verification"} />
              <K k="Verification" v={`${evidenceChecks.filter((c) => c.verified).length}/${evidenceChecks.length} tiers`} />
              <K k="Sealing" v="Merkle root · sequential hash-chained · Ed25519 signed" mono={false} />
              <K k="Authority signature" v="Ed25519 · ICG surveillance key" mono={false} />
            </div>
          </SectionShell>

          {/* 6 — Signature block */}
          <section className="px-10 pb-8 pt-2">
            <div className="grid grid-cols-2 gap-10">
              <div>
                <div className="flex items-center gap-2 border-b border-line pb-1 text-[11px] font-semibold text-ink">
                  <FileSignature className="h-3.5 w-3.5 text-aqua" />
                  Certification
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-ink-dim">
                  I, the undersigned, certify that the evidence, detections and attribution analysis enclosed
                  herewith were produced and preserved in accordance with the Sagar-Drishti chain-of-custody
                  protocol and remain unaltered.
                </p>
                <div className="mt-4 font-mono text-[10px] text-ink-faint">
                  <div>OFFICER IN CHARGE, MARINE SURVEILLANCE</div>
                  <div className="mt-3 inline-flex items-center gap-2 rounded bg-bg-0 px-3 py-2 font-serif text-sm italic text-ink ring-1 ring-line">
                    M. Ashok Rao
                  </div>
                  <div className="mt-1">ICG-OR/0412/2026 · STAMP 0412-A</div>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 border-b border-line pb-1 text-[11px] font-semibold text-ink">
                  <MapPin className="h-3.5 w-3.5 text-amber" />
                  Disposition
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-ink-dim">
                  Enclosure forwarded to the Director General of Shipping and the Gujarat High Court Registry
                  for adjudication under s.356. Craft movement and bunkering restricted pending enquiry.
                </p>
                <div className="mt-4 font-mono text-[10px] text-ink-faint">
                  <div>
                    MARKED TO <span className="text-ink">INS SUKANYA</span> · <span className="text-ink">DGPS + MARITIME BOARD</span>
                  </div>
                  <div className="mt-2">PROPERTY OF THE INDIAN COAST GUARD</div>
                  <div>GANDHINAGAR · UTC 2026-09-11</div>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {!envelope && (
        <div className="flex h-40 flex-1 flex-col items-center justify-center gap-2 rounded-panel border border-dashed border-line bg-bg-0">
          <ScrollText className="h-8 w-8 text-ink-faint" />
          <span className="font-mono text-sm text-ink-dim">Report sealed · {incident.eventId}</span>
          <span className="meta">OPEN REPORT to review the official case file</span>
        </div>
      )}
    </div>
  );
}