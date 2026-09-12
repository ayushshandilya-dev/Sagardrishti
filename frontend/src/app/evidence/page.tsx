"use client";

import React from "react";
import { useCommandStore } from "@/lib/store";
import { MOCK_EVIDENCE_LEDGER } from "@/lib/mockData";
import { EvidenceChain } from "@/components/evidence/EvidenceChain";
import { VerificationPanel } from "@/components/evidence/VerificationPanel";
import { ShieldCheck, Fingerprint, Network } from "lucide-react";

export default function EvidenceLedgerPage() {
  const { hasVerified, evidenceLedger } = useCommandStore();
  const ledger = evidenceLedger ?? MOCK_EVIDENCE_LEDGER;

  return (
    <div className="flex h-full flex-col gap-3 p-3 pb-2">
      <div className="flex items-center justify-between px-0.5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold tracking-tight text-ink">Evidence ledger</h1>
            <span
              className={`flex items-center gap-1.5 rounded px-2 py-0.5 font-mono text-[10px] font-semibold ring-1 ${
                hasVerified ? "bg-green/10 text-green ring-green/30" : "bg-bg-1 text-ink-faint ring-line"
              }`}
            >
              <ShieldCheck className="h-3 w-3" />
              {hasVerified ? "VERIFIED" : "UNVERIFIED"}
            </span>
          </div>
          <p className="meta mt-0.5">
            Forensic chain of custody · node {ledger.nodeId} · {ledger.chainLength} blocks · proof-of-work anchored
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-[9px] text-ink-faint">
          <span className="flex items-center gap-1 rounded bg-bg-1 px-2 py-1 ring-1 ring-line">
            <Network className="h-3 w-3 text-aqua" />
            {ledger.chainValid ? "CHAIN VALID" : "CHAIN INVALID"}
          </span>
          <span className="flex items-center gap-1 rounded bg-bg-1 px-2 py-1 ring-1 ring-line">
            <Fingerprint className="h-3 w-3 text-teal" />
            Ed25519 · CERTIFIED
          </span>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_380px] gap-3 overflow-hidden">
        {/* vertical forensic chain */}
        <div className="min-h-0 overflow-y-auto rounded-panel border border-line bg-bg-1 px-4 py-3.5">
          <div className="meta-label mb-3">APPEND-ONLY BLOCKCHAIN</div>
          <EvidenceChain blocks={ledger.blocks} />
        </div>

        {/* verification + integrity panel */}
        <div className="min-h-0 overflow-y-auto pr-0.5">
          <VerificationPanel />

          <div className="mt-3 rounded-panel border border-dashed border-line px-3.5 py-3">
            <div className="meta-label mb-2">Evidence-preserving pipeline</div>
            <ol className="flex list-decimal flex-col gap-1 pl-4 text-[10px] leading-relaxed text-ink-dim">
              <li>SAR scene ingested raw, immutable hash committed</li>
              <li>Calibration + Lee speckle filter logged as provenance ops</li>
              <li>AIS stream Kalman-filtered, de-duplicated, time-anchored</li>
              <li>INCOIS currents + ECMWF ERA5 wind fields validated</li>
              <li>5-factor attribution tensor sealed into Merkle root</li>
              <li>Root signed by ICG surveillance Ed25519 authority</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}