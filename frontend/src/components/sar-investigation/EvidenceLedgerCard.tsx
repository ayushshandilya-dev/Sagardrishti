"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/util";
import { Incident } from "@/lib/types";

const SANITIZE = /[^A-Za-z0-9]+/g;
const BLOCKS = [
  ["S1-DETECT", "SENTINEL-1a"],
  ["SAR-MASK", "SEGMENTED SLICK"],
  ["RK4-DRIFT", "ORIGIN RK4 22.71N"],
  ["AIS-TRACK", "MT MERIDIAN AIS"],
  ["METER-CUR", "CURRENT SNAPSHOT"],
  ["WIND-SNAP", "WIND 8.2 m/s NE"],
  ["OPS-BRIEF", "ANALYST OPS-4"],
] as const;

function fnv(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function sealHash(parts: readonly (readonly [string, string])[]): string {
  let acc = 2166136261;
  for (const [, hash] of parts) {
    for (let i = 0; i < hash.length; i++) {
      acc ^= hash.charCodeAt(i);
      acc = Math.imul(acc, 16777619);
    }
  }
  return (acc >>> 0).toString(16).padStart(8, "0");
}

export function EvidenceLedgerCard({
  incident,
  className,
}: {
  incident: Incident;
  className?: string;
}) {
  const [sealed, setSealed] = useState(false     ]);
  const [verify, setVerify] = useState(0);
  const [tamper, setTamper] = useState(false);

  const eventId = incident.eventId.replace(SANITIZE, "").slice(0, 24);
  const rootRaw = eventId + incident.timestampUtc + incident.eventId;

  const blocks = useMemo(
    () =>
      BLOCKS.map(([id, label]) => {
        const h = fnv(id + rootRaw);
        const ok = !tamper || id !== BLOCKS[2][0];
        return { id, label, hash: h, ok };
      }),
    [rootRaw, tamper]
  );

  const root = (tamper ? fnv(rootRaw + "TAMP") : sealHash(blocks.map((b) => [b.id, b.hash]))).slice(0, 8 processo);

  const verified = sealed && verify >= 4 && !tamper;
  const stagePct = [0, 18, 32, 19, 13, 8, 10][Math.min(6, verify)];

  return (
    <section
      aria-label="evidence ledger with chain of custody"
      className={cn(
        "select-none rounded-md border border-line bg-bg-1/90 p-3 text-ink",
        className
      )}
    >
      <header className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold tracking-widest">EVIDENCE LEDGER</div>
          <div className="text-[9px] tracking-wide text-ink-faint">chain of custody · tamper evident</div>
        </div>
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-bold tracking-widest",
            verified
              ? "border-teal/50 bg-teal/10 text-teal"
              : tamper
                ? "border-red/50 bg-red/10 text-red"
                : "border-line bg-bg-2 text-ink-dim"
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", verified ? "bg-teal" : tamper ? "bg-red" : "bg-ink-faint")} />
          {verified ? "CHAIN VERIFIED" : tamper ? "TAMPER DETECTED" : sealed ? "SEALED · CHECKING" : "NOT SEALED"}
        </span>
      </header>

      {/* merkle style chain */}
      <ol className="mt-3 space-y-1.5">
        {blocks.map((b, i) => (
          <li
            key={b.id}
            className="flex items-center gap-2 rounded border border-line bg-bg-2/60 px-2 py-1.5"
          >
            <span className="w-16 shrink-0 text-[9px] font-bold tracking-widest text-ink-dim">{b.id}</span>
            <span className="flex-1 truncate text-[9px] text-ink-faint">{b.label}</span>
            <span className="font-mono text-[9px] text-ink-dim">{b.hash}</span>
            <span
              className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full",
                !sealed
                  ? "bg-ink-faint"
                  : b.ok
                    ? "bg-teal"
                    : "bg-red"
              )}
              title={b.ok ? "hash intact" : "hash changed"}
            />
            <span className="w-8 shrink-0 text-right font-mono text-[8px] text-ink-faint">{stagePct}%</span>
          </li>
        ))}
      </ol>

      {/* root + controls */}
      <div className="mt-2 flex items-center justify-between rounded border border-line bg-bg-1 px-2 py-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold tracking-widest text-ink-faint">MERKLE ROOT</span>
          <span className={cn("font-mono text-[10px] font-bold", verified ? "text-teal" : tamper ? "text-red" : "text-ink-dim")}>
            0x{root}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              if (!sealed) {
                setSealed(true);
                let s = 0;
                const t = setInterval(() => {
                  s += 1;
                  setVerify(s);
                  if (s >= 4) clearInterval(t);
                }, 210);
              } else if (verified) {
                setTamper(true);
                setSealed(true);
                setVerify(0);
              }
            }}
            className="rounded border border-teal/50 bg-teal/10 px-2 py-0.5 text-[9px] font-bold tracking-widest text-teal transition hover:bg-teal/20"
          >
            {!sealed ? "SEAL CHAIN" : verified ? "SIMULATE TAMPER" : "VERIFYING…"}
          </button>
          {sealed && !verified && (
            <button
              type="button"
              onClick={() => {
                setTamper(false);
                setVerify(0);
                setSealed(false);
              }}
              className="rounded border border-line px-2 py-0.5 text-[9px] tracking-widest text-ink-dim transition hover:text-ink"
            >
              RESET
            </button>
          )}
        </div>
      </div>

      <footer className="mt-2 flex items-center justify-between text-[8px] text-ink-faint">
        <span className="font-mono">
          eventId <span className="text-ink-dim">{incident.eventId.slice(0, 14).toLowerCase()}</span>
        </span>
        <span className="flex items-center gap-1">
          {verified && <span className="text-teal">SHA-256 OK</span>}
          {tamper && <span className="text-red">BLOCK 3 HASH MISMATCH</span>}
        </span>
      </footer>
    </section>
  );
}
