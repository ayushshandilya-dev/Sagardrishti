"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* ─────────────────────────────────────────────────────────────
   Investigation choreography — the single source of truth for
   SAR pass → detection → verification, driven by the timeline.
   ───────────────────────────────────────────────────────────── */

export type InvPhase =
  | "idle"
  | "footprint"
  | "anomaly"
  | "detect"
  | "segment"
  | "verify"
  | "complete";

export type InvStatus = "POSSIBLE OIL" | "LIKELY OIL" | "VERIFIED MINERAL OIL";

export interface TimelineEvent {
  t: string;
  label: string;
  phase: Exclude<InvPhase, "idle" | "complete">;
}

export const TIMELINE: TimelineEvent[] = [
  { t: "10:28", label: "SAR Pass", phase: "footprint" },
  { t: "10:29", label: "Backscatter anomaly", phase: "anomaly" },
  { t: "10:30", label: "Detection", phase: "detect" },
  { t: "10:31", label: "Segmentation", phase: "segment" },
  { t: "10:32", label: "Verification", phase: "verify" },
];

export interface InvestigationState {
  phase: InvPhase;
  prog: number; // 0..1 within current phase
  confidence: number; // 0..0.942
  playing: boolean;
  timeIndex: number; // active timeline slot, -1 before start
}

const PHASE_MS: Record<InvPhase, number> = {
  idle: 0,
  footprint: 1200,
  anomaly: 900,
  detect: 1100,
  segment: 1500,
  verify: 1400,
  complete: 0,
};

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function useInvestigation() {
  const [state, setState] = useState<InvestigationState>({
    phase: "idle",
    prog: 0,
    confidence: 0,
    playing: false,
    timeIndex: -1,
  });
  const raf = useRef<number | null>(null);
  const timers = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    if (raf.current !== null) window.cancelAnimationFrame(raf.current);
    raf.current = null;
  }, []);

  const tickPhase = useCallback(
    (phase: InvPhase, done: () => void, speed = 1) => {
      const dur = Math.max(50, PHASE_MS[phase] / speed);
      const t0 = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / dur);
        setState((s) => ({ ...s, phase, prog: p }));
        if (p < 1) raf.current = window.requestAnimationFrame(step);
        else done();
      };
      raf.current = window.requestAnimationFrame(step);
    },
    []
  );

  const pause = useCallback(
    (t: number) =>
      new Promise<void>((res) => {
        timers.current.push(window.setTimeout(res, t));
      }),
    []
  );

  const run = useCallback(async () => {
    clearTimers();
    const reduced = prefersReduced();
    const speed = reduced ? 60 : 1;
    const seq: InvPhase[] = ["footprint", "anomaly", "detect", "segment", "verify"];
    setState((s) => ({ ...s, phase: "idle", prog: 0, confidence: 0, playing: true, timeIndex: -1 }));
    await pause(reduced ? 40 : 350);

    for (let i = 0; i < seq.length; i++) {
      const phase = seq[i];
      const done = new Promise<void>((res) => tickPhase(phase, () => res(), speed));
      done.then(() => setState((s) => ({ ...s, timeIndex: i, prog: 1 }))).catch(() => {});
      await done;
      if (phase === "verify") {
        const c0 = performance.now();
        await new Promise<void>((res) => {
          const step = (now: number) => {
            const p = Math.min(1, (now - c0) / (reduced ? 20 : 1400));
            const conf = Math.round(p * 94.2 * 10) / 10;
            setState((s) => ({ ...s, confidence: conf }));
            if (p < 1) raf.current = window.requestAnimationFrame(step);
            else res();
          };
          raf.current = window.requestAnimationFrame(step);
        });
      }
      if (i < seq.length - 1) await pause(reduced ? 30 : 220);
    }
    setState((s) => ({ ...s, phase: "complete", prog: 1, confidence: 94.2, playing: false }));
  }, [clearTimers, pause, tickPhase]);

  const stop = useCallback(() => {
    clearTimers();
    setState({ phase: "idle", prog: 0, confidence: 0, playing: false, timeIndex: -1 });
  }, [clearTimers]);

  const scrub = useCallback(
    (index: number) => {
      clearTimers();
      if (index < 0) {
        setState({ phase: "idle", prog: 0, confidence: 0, playing: false, timeIndex: -1 });
        return;
      }
      const ev = TIMELINE[index];
      const reduced = prefersReduced();
      setState((s) => ({
        ...s,
        phase: ev.phase,
        prog: 1,
        playing: false,
        timeIndex: index,
        confidence: index >= 4 ? (reduced ? 94.2 : 78.4) : s.confidence,
      }));
    },
    [clearTimers]
  );

  useEffect(() => clearTimers, [clearTimers]);

  const status: InvStatus =
    state.phase === "verify" || state.phase === "complete"
      ? "VERIFIED MINERAL OIL"
      : state.phase === "detect" || state.phase === "segment"
        ? "LIKELY OIL"
        : "POSSIBLE OIL";

  return { state, status, run, stop, scrub };
}