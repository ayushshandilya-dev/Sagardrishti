"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useCommandStore } from "@/lib/store";
import { DEMO_STAGES, DemoStageInfo } from "@/lib/demoStages";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldCheck,
  Compass,
  Satellite,
  Waves,
  Eye,
  FileCheck2,
  Ship,
  Radio,
} from "lucide-react";

const STAGE_ICONS: Record<number, React.ReactNode> = {
  1: <Satellite className="h-3 w-3" />,
  2: <Radio className="h-3 w-3" />,
  3: <Eye className="h-3 w-3" />,
  4: <Waves className="h-3 w-3" />,
  5: <Compass className="h-3 w-3" />,
  6: <Ship className="h-3 w-3" />,
  7: <ShieldCheck className="h-3 w-3" />,
  8: <FileCheck2 className="h-3 w-3" />,
};

export const DemoDirectorBar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();

  const {
    isDemoRunning,
    demoStep,
    isDemoPaused,
    setDemoStep,
    toggleDemoPause,
    resetDemo,
  } = useCommandStore();

  const [elapsedSec, setElapsedSec] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [toastAlert, setToastAlert] = useState<string | null>(null);

  const currentStage = DEMO_STAGES.find((s) => s.step === demoStep) ?? DEMO_STAGES[0];
  const prevStepRef = useRef(demoStep);

  /* Navigate to target stage and execute any specific store mutations */
  const goToStage = useCallback(
    (step: number) => {
      const target = DEMO_STAGES.find((s) => s.step === step);
      if (!target) return;

      setElapsedSec(0);
      setDemoStep(step);

      // Toast alert on transition
      setToastAlert(target.alert);
      setTimeout(() => setToastAlert(null), 3500);

      // Stage-specific store state
      if (step === 2) {
        useCommandStore.setState({ detectionMs: 0 });
      } else if (step === 4) {
        useCommandStore.setState((st) => ({
          isDriftPlaying: true,
          layers: { ...st.layers, drift: true, currents: true },
        }));
      } else if (step === 5) {
        useCommandStore.setState((st) => ({
          currentDriftHour: 12,
          isDriftPlaying: false,
          layers: { ...st.layers, drift: true },
        }));
      } else if (step === 6) {
        useCommandStore.setState({ selectedVesselImo: 9720134 });
      } else if (step === 7 || step === 8) {
        useCommandStore.setState({ hasVerified: true });
      }

      // Navigate to route if different from current path
      if (pathname !== target.route) {
        router.push(target.route);
      }
    },
    [pathname, router, setDemoStep]
  );

  /* Flash alert when demoStep changes externally */
  useEffect(() => {
    if (demoStep !== prevStepRef.current && isDemoRunning) {
      prevStepRef.current = demoStep;
      setElapsedSec(0);
      const stage = DEMO_STAGES.find((s) => s.step === demoStep);
      if (stage) {
        setToastAlert(stage.alert);
        const timer = setTimeout(() => setToastAlert(null), 3500);
        return () => clearTimeout(timer);
      }
    }
  }, [demoStep, isDemoRunning]);

  /* Autopilot timer countdown */
  useEffect(() => {
    if (!isDemoRunning || isDemoPaused || !currentStage) return;

    const interval = setInterval(() => {
      setElapsedSec((prev) => {
        const next = prev + 0.25;
        if (next >= currentStage.dwellSeconds) {
          if (currentStage.step < 8) {
            goToStage(currentStage.step + 1);
          } else {
            // Completed all 8 stages
            useCommandStore.setState({ isDemoPaused: true });
          }
          return 0;
        }
        return next;
      });
    }, 250);

    return () => clearInterval(interval);
  }, [isDemoRunning, isDemoPaused, currentStage, goToStage]);

  if (!isDemoRunning) return null;

  const progressPercent = Math.min(
    100,
    (elapsedSec / Math.max(1, currentStage?.dwellSeconds ?? 8)) * 100
  );

  return (
    <>
      {/* ── STAGE TRANSITION MILITARY TOAST ── */}
      {toastAlert && (
        <div className="pointer-events-none fixed top-16 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2.5 rounded-xl border border-teal/40 bg-bg-1/95 px-5 py-2.5 font-mono text-xs font-bold text-teal shadow-[0_10px_35px_rgba(0,0,0,0.7)] backdrop-blur-xl ring-1 ring-teal/30">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal"></span>
            </span>
            <span>{toastAlert}</span>
          </div>
        </div>
      )}

      {/* ── GLOBAL FLOATING MISSION DIRECTOR HUD (Bottom Center) ── */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[90] w-[95%] max-w-[940px] select-none transition-all duration-300">
        <div className="overflow-hidden rounded-2xl border border-teal/30 bg-bg-1/95 shadow-[0_15px_40px_rgba(0,0,0,0.8),0_0_25px_rgba(34,211,167,0.12)] backdrop-blur-2xl ring-1 ring-teal/20">
          {/* Top Status Header */}
          <div className="flex items-center justify-between border-b border-line/60 bg-bg-2/70 px-4 py-2 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isDemoPaused ? "bg-amber" : "bg-teal"} opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isDemoPaused ? "bg-amber" : "bg-teal"}`}></span>
              </span>

              <span className="font-mono text-[10px] font-black tracking-widest text-ink">
                MISSION DIRECTOR
              </span>

              <span className="rounded bg-teal/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-teal ring-1 ring-teal/30">
                STAGE {demoStep}/8 · {currentStage?.badge}
              </span>

              {isDemoPaused ? (
                <span className="rounded bg-amber/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber ring-1 ring-amber/30">
                  PAUSED · PITCH MODE
                </span>
              ) : (
                <span className="hidden sm:inline font-mono text-[9px] text-ink-dim">
                  Auto-advancing in {Math.max(0, Math.ceil((currentStage?.dwellSeconds ?? 8) - elapsedSec))}s
                </span>
              )}
            </div>

            {/* Playback Controls & Minimize */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => goToStage(Math.max(1, demoStep - 1))}
                disabled={demoStep <= 1}
                className="rounded-md p-1 text-ink-dim transition-colors hover:bg-bg-3 hover:text-ink disabled:opacity-30"
                title="Previous Stage"
              >
                <SkipBack className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={toggleDemoPause}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 font-mono text-[10px] font-bold transition-all shadow-sm ${
                  isDemoPaused
                    ? "bg-teal text-bg-0 hover:bg-teal/90 shadow-[0_0_10px_rgba(34,211,167,0.3)]"
                    : "bg-amber/20 text-amber hover:bg-amber/30 ring-1 ring-amber/40"
                }`}
                title={isDemoPaused ? "Resume Auto-Tour" : "Pause to explain to judges"}
              >
                {isDemoPaused ? (
                  <>
                    <Play className="h-3 w-3 fill-current" />
                    <span>RESUME</span>
                  </>
                ) : (
                  <>
                    <Pause className="h-3 w-3 fill-current" />
                    <span>PAUSE</span>
                  </>
                )}
              </button>

              <button
                onClick={() => goToStage(Math.min(8, demoStep + 1))}
                disabled={demoStep >= 8}
                className="rounded-md p-1 text-ink-dim transition-colors hover:bg-bg-3 hover:text-ink disabled:opacity-30"
                title="Next Stage"
              >
                <SkipForward className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={() => goToStage(1)}
                className="rounded-md p-1 text-ink-dim transition-colors hover:bg-bg-3 hover:text-ink"
                title="Restart from Stage 1"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={() => setCollapsed(!collapsed)}
                className="rounded-md p-1 text-ink-dim transition-colors hover:bg-bg-3 hover:text-ink"
                title={collapsed ? "Expand timeline" : "Collapse"}
              >
                {collapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>

              <button
                onClick={resetDemo}
                className="rounded-md p-1 text-ink-dim transition-colors hover:bg-red/20 hover:text-red"
                title="Exit Demo Mode"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Dwell Progress Bar */}
          <div className="h-1 w-full bg-bg-3/60">
            <div
              className={`h-full transition-all duration-300 ${
                isDemoPaused ? "bg-amber" : "bg-gradient-to-r from-teal via-aqua to-blue"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Expandable Body */}
          {!collapsed && (
            <div className="p-3">
              {/* 8 Interactive Stage Buttons */}
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
                {DEMO_STAGES.map((st) => {
                  const isDone = demoStep > st.step;
                  const isCurrent = demoStep === st.step;
                  return (
                    <button
                      key={st.step}
                      onClick={() => goToStage(st.step)}
                      className={`group relative flex flex-col items-center rounded-lg p-1.5 transition-all text-left ${
                        isCurrent
                          ? "bg-teal/20 ring-1 ring-teal text-teal shadow-[0_0_12px_rgba(34,211,167,0.25)]"
                          : isDone
                            ? "bg-bg-2/80 text-ink-dim hover:bg-bg-3 hover:text-ink"
                            : "bg-bg-2/30 text-ink-faint hover:bg-bg-2 hover:text-ink-dim"
                      }`}
                      title={`${st.label}: ${st.focusHint}`}
                    >
                      <div className="flex items-center gap-1 font-mono text-[9px] font-bold">
                        <span>{STAGE_ICONS[st.step]}</span>
                        <span>0{st.step}</span>
                        {isDone && <span className="text-teal font-black">✓</span>}
                        {isCurrent && <span className="text-amber font-black animate-pulse">▶</span>}
                      </div>
                      <span className="mt-0.5 truncate text-[9px] font-mono tracking-tighter">
                        {st.shortLabel}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Live Intelligence Narrative Ticker */}
              <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-line/60 bg-bg-2/60 px-3 py-1.5">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal animate-pulse" />
                <div className="flex-1 font-mono text-[11px] leading-relaxed text-ink">
                  <span className="font-bold text-teal uppercase mr-1.5">
                    {currentStage?.label}:
                  </span>
                  <span className="text-ink-dim">{currentStage?.analystLine}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
