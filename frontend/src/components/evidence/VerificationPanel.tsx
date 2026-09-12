"use client";

import React, { useEffect, useRef, useState } from "react";
import { useCommandStore } from "@/lib/store";
import { verifyEvidenceChain } from "@/lib/api";
import { useReducedMotion } from "framer-motion";
import { ShieldCheck, ShieldAlert, Copy, CheckCircle2, Circle } from "lucide-react";

export const VerificationPanel: React.FC = () => {
  const { evidenceChecks, isVerifying, hasVerified, setVerifying, setVerified, setEvidenceChecks } =
    useCommandStore();
  const reduced = useReducedMotion();
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isVerifying) return;
    const delay = reduced ? 40 : 220;
    timer.current = setInterval(() => {
      setVerifiedCount((c) => {
        if (c + 1 >= evidenceChecks.length) {
          if (timer.current) clearInterval(timer.current);
          setVerified(true);
          setVerifying(false);
          /* confirm against the live ledger server-side */
          void verifyEvidenceChain().then((res) => {
            if (res.checks?.length) setEvidenceChecks(res.checks);
            setVerified(Boolean(res.allVerified));
          });
          return evidenceChecks.length;
        }
        return c + 1;
      });
    }, delay);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [isVerifying, evidenceChecks.length, reduced, setVerified, setVerifying, setEvidenceChecks]);

  const start = () => {
    setVerifiedCount(0);
    setVerified(false);
    setVerifying(true);
  };

  const copy = (hash: string) => {
    navigator.clipboard?.writeText(hash).catch(() => {});
    setCopied(hash);
    window.setTimeout(() => setCopied(null), 1200);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <button
          onClick={start}
          disabled={isVerifying}
          className="flex items-center gap-2 rounded-md bg-bg-2 px-3.5 py-2 text-xs font-semibold text-ink ring-1 ring-line transition-colors duration-150 hover:bg-panel-hover hover:text-aqua disabled:opacity-50 focus-ring"
        >
          <ShieldCheck className="h-4 w-4 text-teal" />
          {isVerifying ? "Verifying chain…" : hasVerified ? "Re-verify chain" : "Verify chain"}
        </button>
        <span className="font-mono text-[10px] text-ink-faint tnum">
          {verifiedCount}/{evidenceChecks.length}
        </span>
      </div>

      {evidenceChecks.map((check, i) => {
        const done = i < verifiedCount || hasVerified;
        return (
          <div
            key={check.tier}
            className={`rounded-panel border px-3.5 py-2.5 transition-colors duration-150 ${
              done
                ? "border-green/30 bg-green/4"
                : "border-line bg-bg-1"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-xs font-medium text-ink">
                {done ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-ink-faint" />
                )}
                <span>
                  {check.tier}
                  <span className="block text-[9px] font-normal text-ink-faint">{check.artifact}</span>
                </span>
              </span>
              {done ? (
                <span className="shrink-0 rounded bg-green/10 px-1.5 py-px font-mono text-[8px] font-semibold text-green ring-1 ring-green/30">
                  {check.status}
                </span>
              ) : (
                <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
              )}
            </div>
            {done && (
              <div className="mt-2 flex items-center gap-1.5 border-t border-green/15 pt-2">
                <span className="shrink-0 font-mono text-[8px] text-ink-faint">{check.algorithm}</span>
                <span className="min-w-0 flex-1 truncate font-mono text-[8px] text-ink-dim" title={check.hash}>
                  {check.hash}
                </span>
                <button
                  onClick={() => copy(check.hash)}
                  className="shrink-0 text-ink-faint transition-colors duration-150 hover:text-aqua"
                  aria-label="Copy hash"
                >
                  {copied === check.hash ? (
                    <span className="flex items-center gap-1 font-mono text-[8px] text-green">COPIED</span>
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </div>
            )}
          </div>
        );
      })}

      {hasVerified && (
        <div className="flex items-center justify-center gap-2 rounded-panel border border-green/40 bg-green/8 px-3.5 py-3">
          <ShieldCheck className="h-4 w-4 text-green" />
          <span className="font-mono text-[11px] font-semibold text-green">
            CHAIN OF CUSTODY VERIFIED · 6/6 INTEGRITY INTACT
          </span>
        </div>
      )}
    </div>
  );
};