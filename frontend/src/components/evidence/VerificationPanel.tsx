"use client";

import React, { useEffect, useRef, useState } from "react";
import { useCommandStore } from "@/lib/store";
import { verifyEvidenceChain } from "@/lib/api";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ShieldCheck,
  ShieldAlert,
  Copy,
  CheckCircle2,
  Circle,
  AlertOctagon,
  RefreshCw,
  Fingerprint,
} from "lucide-react";

export const VerificationPanel: React.FC = () => {
  const { evidenceChecks, isVerifying, hasVerified, setVerifying, setVerified, setEvidenceChecks } =
    useCommandStore();
  const reduced = useReducedMotion();

  const [verifiedCount, setVerifiedCount] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);
  const [isTampered, setIsTampered] = useState(false);
  const [tamperFailed, setTamperFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Normal or tampered check run
  useEffect(() => {
    if (!isVerifying) return;
    const delay = reduced ? 40 : 260;

    timer.current = setInterval(() => {
      setVerifiedCount((c) => {
        // If tampered mode is on, fail at index 2 (Tier 3: MetOcean / AIS Kalman)
        if (isTampered && c === 2) {
          if (timer.current) clearInterval(timer.current);
          setTamperFailed(true);
          setVerifying(false);
          setVerified(false);
          return 2;
        }

        if (c + 1 >= evidenceChecks.length) {
          if (timer.current) clearInterval(timer.current);
          setVerified(true);
          setVerifying(false);
          setTamperFailed(false);
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
  }, [isVerifying, evidenceChecks.length, isTampered, reduced, setVerified, setVerifying, setEvidenceChecks]);

  const startVerification = (tamper = isTampered) => {
    setVerifiedCount(0);
    setVerified(false);
    setTamperFailed(false);
    setIsTampered(tamper);
    setVerifying(true);
  };

  const toggleTamper = () => {
    const nextTamper = !isTampered;
    setIsTampered(nextTamper);
    startVerification(nextTamper);
  };

  const copy = (hash: string) => {
    navigator.clipboard?.writeText(hash).catch(() => {});
    setCopied(hash);
    window.setTimeout(() => setCopied(null), 1200);
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Action Header */}
      <div className="flex flex-col gap-2 rounded-panel border border-line bg-bg-1 p-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => startVerification(false)}
            disabled={isVerifying}
            className="flex items-center gap-2 rounded-md bg-bg-2 px-3 py-1.5 text-xs font-semibold text-ink ring-1 ring-line transition-colors duration-150 hover:bg-panel-hover hover:text-aqua disabled:opacity-50 focus-ring"
          >
            {isVerifying ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-aqua" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5 text-teal" />
            )}
            {isVerifying ? "Verifying Merkle chain…" : hasVerified ? "Re-verify ledger" : "Verify chain"}
          </button>

          <span className="font-mono text-[10px] text-ink-faint tnum">
            {verifiedCount}/{evidenceChecks.length} TIERS
          </span>
        </div>

        {/* Tamper Simulation Toggle for Court / Hackathon Demo */}
        <div className="flex items-center justify-between border-t border-line/60 pt-2 text-[10px]">
          <div className="flex items-center gap-1.5 text-ink-dim">
            <AlertOctagon className={`h-3.5 w-3.5 ${isTampered ? "text-red animate-pulse" : "text-ink-faint"}`} />
            <span>Simulate byte corruption</span>
          </div>
          <button
            onClick={toggleTamper}
            disabled={isVerifying}
            className={`rounded px-2 py-0.5 font-mono text-[9px] font-semibold transition-all focus-ring ${
              isTampered
                ? "bg-red/15 text-red ring-1 ring-red/40 hover:bg-red/25"
                : "bg-bg-2 text-ink-faint ring-1 ring-line hover:text-ink hover:bg-bg-0"
            }`}
          >
            {isTampered ? "TAMPER ACTIVE · FLIP BACK" : "INJECT BIT-FLIP"}
          </button>
        </div>
      </div>

      {/* Tamper Alert Banner */}
      <AnimatePresence>
        {tamperFailed && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="rounded-panel border border-red/40 bg-red/10 p-3 shadow-panel"
          >
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="h-5 w-5 shrink-0 text-red" />
              <div className="min-w-0">
                <h4 className="font-mono text-xs font-bold text-red">
                  CRYPTOGRAPHIC BREACH DETECTED
                </h4>
                <p className="mt-1 text-[11px] leading-relaxed text-ink">
                  Bit-flip detected at <strong>Tier 3 (AIS Telemetry / MetOcean)</strong>. Hash does not match immutable Merkle leaf.
                </p>
                <div className="mt-2 rounded bg-bg-0/60 p-2 font-mono text-[9px] text-ink-faint">
                  Status: <strong>SECTION 65B EVIDENCE VOIDED</strong> · Chain halted.
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Verification Tiers List */}
      <div className="flex flex-col gap-1.5">
        {evidenceChecks.map((check, i) => {
          const isCurrent = isVerifying && verifiedCount === i;
          const isDone = i < verifiedCount || (hasVerified && !tamperFailed);
          const isFailed = tamperFailed && i === 2;
          const isInvalidated = tamperFailed && i > 2;

          return (
            <motion.div
              key={check.tier}
              layout
              transition={{ duration: 0.2 }}
              className={`relative overflow-hidden rounded-panel border px-3.5 py-2.5 transition-all duration-200 ${
                isFailed
                  ? "border-red/50 bg-red/8 shadow-[0_0_12px_rgba(239,68,68,0.15)]"
                  : isDone
                  ? "border-green/35 bg-green/4"
                  : isCurrent
                  ? "border-aqua/50 bg-aqua/5 ring-1 ring-aqua/30"
                  : "border-line bg-bg-1 opacity-70"
              }`}
            >
              {/* Cascade beam scanline */}
              {isCurrent && (
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: "200%" }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                  className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-aqua/20 to-transparent pointer-events-none"
                />
              )}

              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-xs font-medium text-ink">
                  {isFailed ? (
                    <ShieldAlert className="h-4 w-4 shrink-0 text-red animate-pulse" />
                  ) : isDone ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green" />
                  ) : isCurrent ? (
                    <RefreshCw className="h-4 w-4 shrink-0 animate-spin text-aqua" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-ink-faint" />
                  )}
                  <span>
                    <span className={isFailed ? "text-red font-bold" : ""}>{check.tier}</span>
                    <span className="block text-[9px] font-normal text-ink-faint">{check.artifact}</span>
                  </span>
                </span>

                {isFailed ? (
                  <span className="shrink-0 rounded bg-red/15 px-1.5 py-px font-mono text-[8px] font-bold text-red ring-1 ring-red/40">
                    CORRUPTED
                  </span>
                ) : isInvalidated ? (
                  <span className="shrink-0 rounded bg-bg-0 px-1.5 py-px font-mono text-[8px] font-semibold text-ink-faint ring-1 ring-line">
                    CHAIN BROKEN
                  </span>
                ) : isDone ? (
                  <span className="shrink-0 rounded bg-green/10 px-1.5 py-px font-mono text-[8px] font-semibold text-green ring-1 ring-green/30">
                    {check.status}
                  </span>
                ) : (
                  <span className="font-mono text-[8px] text-ink-faint">PENDING</span>
                )}
              </div>

              {(isDone || isFailed) && (
                <div className="mt-2 flex items-center gap-1.5 border-t border-line/60 pt-2">
                  <span className="shrink-0 font-mono text-[8px] text-ink-faint">{check.algorithm}</span>
                  <span
                    className={`min-w-0 flex-1 truncate font-mono text-[8px] ${
                      isFailed ? "text-red font-bold" : "text-ink-dim"
                    }`}
                    title={isFailed ? "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855[TAMPERED]" : check.hash}
                  >
                    {isFailed ? "e3b0c44298fc1c...[MODIFIED_BYTE_AT_OFFSET_0x3E]" : check.hash}
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
            </motion.div>
          );
        })}
      </div>

      {/* Official Ed25519 Seal Stamp on Successful Verification */}
      <AnimatePresence>
        {hasVerified && !tamperFailed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="mt-2 flex flex-col items-center justify-center gap-2 rounded-panel border-2 border-green/50 bg-gradient-to-b from-green/10 via-bg-1 to-bg-0 p-4 text-center shadow-float relative overflow-hidden"
          >
            {/* Background Seal Emblem Watermark */}
            <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
              <Fingerprint className="h-32 w-32 text-green" />
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-green bg-green/15 text-green shadow-[0_0_15px_rgba(34,197,94,0.3)]">
              <ShieldCheck className="h-6 w-6" />
            </div>

            <div className="min-w-0">
              <div className="font-mono text-[9px] font-bold tracking-[0.2em] text-green uppercase">
                ED25519 CRYPTOGRAPHIC AUTHORITY SEAL
              </div>
              <div className="mt-0.5 text-xs font-semibold text-ink">
                CHAIN OF CUSTODY VERIFIED & SEALED
              </div>
              <p className="mt-1 font-mono text-[9px] text-ink-faint leading-relaxed max-w-xs">
                Root: <span className="text-teal">9f86d081884c7d659a2f...</span><br />
                Admissible under Sec. 65B (Indian Evidence Act, 1872) & Sec. 63 (BSA, 2023)
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};