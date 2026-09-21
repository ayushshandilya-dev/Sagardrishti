"use client";

import React, { useCallback, useState } from "react";
import { useCommandStore } from "@/lib/store";
import { getEvidenceManifest } from "@/lib/api";
import { MOCK_EVIDENCE_LEDGER } from "@/lib/mockData";
import { EvidenceChain } from "@/components/evidence/EvidenceChain";
import { VerificationPanel } from "@/components/evidence/VerificationPanel";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ShieldCheck, Fingerprint, Network, Link2, Download, PackageCheck } from "lucide-react";

export default function EvidenceLedgerPage() {
  const { hasVerified, evidenceLedger } = useCommandStore();
  const ledger = evidenceLedger ?? MOCK_EVIDENCE_LEDGER;
  const [isExporting, setIsExporting] = useState(false);

  const exportEvidencePackage = useCallback(async () => {
    setIsExporting(true);
    try {
      const manifest = await getEvidenceManifest();
      const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${manifest.packageId}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  }, []);

  return (
    <div className="flex h-full flex-col gap-3 p-3 pb-2">
      <PageHeader
        className="px-0.5"
        title="Evidence ledger"
        badge={
          hasVerified
            ? { label: "VERIFIED", tone: "ok" }
            : { label: "UNVERIFIED", tone: "neutral" }
        }
        subtitle={`Forensic chain of custody · node ${ledger.nodeId} · ${ledger.chainLength} blocks · proof-of-work anchored`}
        right={
          <>
            <StatusBadge
              label={ledger.chainValid ? "CHAIN VALID" : "CHAIN INVALID"}
              tone={ledger.chainValid ? "ok" : "crit"}
              icon={<Network className="h-3 w-3" />}
            />
            <StatusBadge
              label="Ed25519 · CERTIFIED"
              tone="ok"
              dot={false}
              icon={<Fingerprint className="h-3 w-3" />}
            />
            <StatusBadge
              label={isExporting ? "EXPORTING…" : "EXPORT PACKAGE"}
              tone="info"
              dot={false}
              icon={isExporting ? <PackageCheck className="h-3 w-3 animate-pulse" /> : <Download className="h-3 w-3" />}
            />
          </>
        }
      />


      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_380px] gap-3 overflow-hidden">
        {/* vertical forensic chain */}
        <Panel
          title="APPEND-ONLY BLOCKCHAIN"
          icon={Link2}
          tone="info"
          className="overflow-hidden"
          bodyClassName="overflow-y-auto px-4 py-3.5"
        >
          <EvidenceChain blocks={ledger.blocks} />
        </Panel>

        {/* verification + integrity panel */}
        <div className="min-h-0 overflow-y-auto pr-0.5">
          <VerificationPanel />

          <Panel
            title="Evidence-preserving pipeline"
            icon={ShieldCheck}
            tone="ok"
            className="mt-3"
            bodyClassName="px-3.5 py-3"
          >
            <ol className="flex list-decimal flex-col gap-1 pl-4 text-body-sm leading-relaxed text-ink-dim">
              <li>SAR scene ingested raw, immutable hash committed</li>
              <li>Calibration + Lee speckle filter logged as provenance ops</li>
              <li>AIS stream Kalman-filtered, de-duplicated, time-anchored</li>
              <li>INCOIS currents + ECMWF ERA5 wind fields validated</li>
              <li>5-factor attribution tensor sealed into Merkle root</li>
              <li>Root signed by ICG surveillance Ed25519 authority</li>
            </ol>
          </Panel>
        </div>
      </div>
    </div>
  );
}