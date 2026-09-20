"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useCommandStore } from "@/lib/store";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Sparkles,
  X,
  Volume2,
  VolumeX,
  Check,
  Satellite,
  Radar,
  Waves,
  Crosshair,
  Ship,
  ShieldCheck,
  FileText,
  Presentation,
} from "lucide-react";

interface DemoStageConfig {
  step: number;
  title: string;
  category: string;
  route: string;
  durationSec: number;
  icon: React.ElementType;
  caption: string;
}

const DEMO_STAGES: DemoStageConfig[] = [
  {
    step: 1,
    title: "SATELLITE SAR DETECTION EVENT",
    category: "Geospatial COP",
    route: "/operations",
    durationSec: 8,
    icon: Satellite,
    caption: "Sentinel-1A C-Band SAR radar detects a 14.2 km² oil slick anomaly off the Mumbai EEZ coast.",
  },
  {
    step: 2,
    title: "SAR MULTI-BAND PROCESSING",
    category: "Radar Preprocessing",
    route: "/sar-investigation",
    durationSec: 10,
    icon: Radar,
    caption: "Enhanced Lee 7x7 filter suppresses Rayleigh noise (+14.2 dB SNR); SegFormer neural mask reaches 94.2% confidence.",
  },
  {
    step: 3,
    title: "RK4 HYDRODYNAMIC BACKTRACK",
    category: "Reverse Physics",
    route: "/drift",
    durationSec: 12,
    icon: Waves,
    caption: "Lagrangian RK4 4th-order particle integrator steps backward in time (T_0 → T_-12.4h) with INCOIS currents & ECMWF windage.",
  },
  {
    step: 4,
    title: "BAYESIAN VESSEL ATTRIBUTION",
    category: "Attribution Ranking",
    route: "/attribution",
    durationSec: 10,
    icon: Crosshair,
    caption: "Bayesian Attribution Engine evaluates 30 candidate vessels, isolating Primary Suspect #1 (MV OCEAN CROWN - 94.8%).",
  },
  {
    step: 5,
    title: "AIS BLACKOUT & TELEMETRY ANOMALY",
    category: "Vessel Forensics",
    route: "/vessels/9123456",
    durationSec: 10,
    icon: Ship,
    caption: "Identifies 4.2h AIS transponder blackout & 11.1 knot speed drop matching MARPOL illegal slop discharge window.",
  },
  {
    step: 6,
    title: "CRYPTOGRAPHIC EVIDENCE LEDGER",
    category: "Section 65B Proof",
    route: "/evidence",
    durationSec: 10,
    icon: ShieldCheck,
    caption: "Immutably seals satellite rasters, RK4 points, and AIS logs into SHA-256 Merkle tree blocks with Ed25519 digital signature.",
  },
  {
    step: 7,
    title: "UNCLOS LEGAL DOSSIER",
    category: "Court Prosecution",
    route: "/dossier",
    durationSec: 10,
    icon: FileText,
    caption: "Compiles court-admissible legal dossier under UNCLOS Art. 221 & calculates $1.42M MARPOL financial liability fine.",
  },
  {
    step: 8,
    title: "EXPLAINABILITY GALLERY",
    category: "Judge Presentation",
    route: "/explainability",
    durationSec: 12,
    icon: Presentation,
    caption: "Automated 3-minute guided presentation walking SIH judges through all 20 scientific before-vs-after comparisons.",
  },
];

export const DemoChoreographerBanner: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();

  const {
    isDemoRunning,
    isDemoPaused,
    demoStep,
    isSpeechEnabled,
    setDemoStep,
    togglePauseDemo,
    toggleSpeech,
    resetDemo,
  } = useCommandStore();

  const [progressPct, setProgressPct] = useState<number>(0);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  const currentStage = DEMO_STAGES.find((s) => s.step === demoStep) || DEMO_STAGES[0];

  // Text-To-Speech Narration function
  const speakCaption = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      // Try to find a clear English voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (v) => v.lang.includes("en-IN") || v.lang.includes("en-US") || v.lang.includes("en-GB")
      );
      if (preferredVoice) utterance.voice = preferredVoice;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Audio speech fallback
    }
  }, []);

  // Perform step jumps and route transitions with stage triggers
  const handleStepJump = useCallback(
    (targetStep: number) => {
      if (targetStep < 1 || targetStep > DEMO_STAGES.length) return;
      setDemoStep(targetStep);
      setProgressPct(0);

      const targetStage = DEMO_STAGES.find((s) => s.step === targetStep);
      if (targetStage) {
        // Perform route transition if needed
        if (pathname !== targetStage.route) {
          router.push(targetStage.route);
        }

        // Trigger step-specific store actions
        if (targetStep === 3) {
          useCommandStore.setState((st) => ({
            isDriftPlaying: true,
            layers: { ...st.layers, drift: true },
          }));
        } else if (targetStep === 6) {
          useCommandStore.setState({ hasVerified: true });
        }

        // Trigger TTS voice narration if enabled
        if (isSpeechEnabled) {
          speakCaption(targetStage.caption);
        }
      }
    },
    [setDemoStep, pathname, router, isSpeechEnabled, speakCaption]
  );

  const handleNext = useCallback(() => {
    if (demoStep < DEMO_STAGES.length) {
      handleStepJump(demoStep + 1);
    } else {
      resetDemo();
    }
  }, [demoStep, handleStepJump, resetDemo]);

  const handlePrev = useCallback(() => {
    if (demoStep > 1) {
      handleStepJump(demoStep - 1);
    }
  }, [demoStep, handleStepJump]);

  // Timer Countdown interval effect
  useEffect(() => {
    if (!isDemoRunning || isDemoPaused || demoStep <= 0) return;

    const stageDurationSec = currentStage.durationSec;
    const intervalMs = 100;
    const stepIncrement = (intervalMs / (stageDurationSec * 1000)) * 100;

    const timer = setInterval(() => {
      setProgressPct((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + stepIncrement;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isDemoRunning, isDemoPaused, demoStep, currentStage.durationSec, handleNext]);

  // Handle Speech toggle update
  useEffect(() => {
    if (isSpeechEnabled && isDemoRunning && currentStage) {
      speakCaption(currentStage.caption);
    } else if (!isSpeechEnabled && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, [isSpeechEnabled, isDemoRunning, currentStage, speakCaption]);

  // Keyboard Navigation Shortcuts
  useEffect(() => {
    if (!isDemoRunning) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === "Space") {
        e.preventDefault();
        togglePauseDemo();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.code === "KeyM") {
        e.preventDefault();
        toggleSpeech();
      } else if (e.code === "Escape") {
        e.preventDefault();
        resetDemo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDemoRunning, togglePauseDemo, handleNext, handlePrev, toggleSpeech, resetDemo]);

  if (!isDemoRunning || demoStep <= 0) return null;

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl px-4 select-none animate-fadeIn">
      <div className="relative overflow-hidden rounded-2xl border border-amber/50 bg-bg-1/95 p-3 shadow-2xl backdrop-blur-xl flex flex-col gap-2.5">
        {/* Animated Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-bg-2">
          <div
            className="h-full bg-gradient-to-r from-amber to-aqua transition-all duration-100 ease-linear shadow-[0_0_8px_rgba(214,168,79,0.8)]"
            style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
          />
        </div>

        {/* Top Controls Row */}
        <div className="flex items-center justify-between gap-3 pt-1">
          {/* Stage Info */}
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber/20 border border-amber text-amber font-mono font-bold text-xs shadow-[0_0_12px_rgba(214,168,79,0.4)]">
              {demoStep}
            </span>
            <div className="leading-tight min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-semibold text-amber uppercase tracking-wider">
                  AUTOMATED DEMO WALKTHROUGH · STAGE {demoStep} OF {DEMO_STAGES.length}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-bg-2 border border-line text-[9px] font-mono text-aqua font-semibold">
                  {currentStage.category}
                </span>
              </div>
              <h4 className="text-xs font-bold text-ink font-sans truncate mt-0.5">
                {currentStage.title}
              </h4>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Step Back */}
            <button
              onClick={handlePrev}
              disabled={demoStep <= 1}
              className="p-1.5 rounded-lg border border-line bg-bg-2 text-ink-dim hover:text-ink disabled:opacity-30 transition-colors"
              title="Previous Stage (Left Arrow)"
            >
              <SkipBack className="h-3.5 w-3.5" />
            </button>

            {/* Pause / Resume */}
            <button
              onClick={togglePauseDemo}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-mono font-semibold transition-all ${
                isDemoPaused
                  ? "bg-amber/20 border-amber text-amber shadow-[0_0_10px_rgba(214,168,79,0.3)] animate-pulse"
                  : "bg-bg-2 border-line text-ink hover:border-line-active"
              }`}
              title="Pause / Resume (Spacebar)"
            >
              {isDemoPaused ? (
                <>
                  <Play className="h-3 w-3 fill-current" /> RESUME
                </>
              ) : (
                <>
                  <Pause className="h-3 w-3 fill-current" /> PAUSE
                </>
              )}
            </button>

            {/* Step Forward */}
            <button
              onClick={handleNext}
              disabled={demoStep >= DEMO_STAGES.length}
              className="p-1.5 rounded-lg border border-line bg-bg-2 text-ink-dim hover:text-ink disabled:opacity-30 transition-colors"
              title="Next Stage (Right Arrow)"
            >
              <SkipForward className="h-3.5 w-3.5" />
            </button>

            {/* AI Voice Speech Toggle */}
            <button
              onClick={toggleSpeech}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-mono font-semibold transition-all ${
                isSpeechEnabled
                  ? "bg-teal/20 border-teal text-teal shadow-[0_0_10px_rgba(20,184,166,0.3)]"
                  : "bg-bg-2 border-line text-ink-faint hover:text-ink"
              }`}
              title="Toggle AI Speech Voice Narration (Key: M)"
            >
              {isSpeechEnabled ? (
                <Volume2 className="h-3.5 w-3.5 text-teal animate-pulse" />
              ) : (
                <VolumeX className="h-3.5 w-3.5 text-ink-faint" />
              )}
              <span className="hidden sm:inline">{isSpeechEnabled ? "VOICE ON" : "VOICE OFF"}</span>
            </button>

            {/* Jump to Gallery */}
            <button
              onClick={() => router.push("/explainability")}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-aqua/40 bg-aqua/10 text-xs font-mono font-semibold text-aqua hover:bg-aqua/20 transition-colors"
              title="Jump directly to Explainability Gallery"
            >
              <Sparkles className="h-3 w-3" /> GALLERY
            </button>

            {/* Close / Exit Demo */}
            <button
              onClick={resetDemo}
              className="p-1.5 rounded-lg border border-line bg-bg-2 text-ink-faint hover:text-red hover:border-red/40 transition-colors"
              title="Exit Demo (Esc)"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Stage Scrubber Pills (Steps 1..8) */}
        <div className="grid grid-cols-8 gap-1 pt-0.5">
          {DEMO_STAGES.map((s) => {
            const StageIcon = s.icon;
            const isActive = s.step === demoStep;
            const isCompleted = s.step < demoStep;

            return (
              <button
                key={s.step}
                onClick={() => handleStepJump(s.step)}
                className={`flex items-center justify-center gap-1.5 py-1 px-1.5 rounded-lg border transition-all text-[10px] font-mono font-medium ${
                  isActive
                    ? "bg-amber/20 border-amber text-amber font-bold shadow-[0_0_8px_rgba(214,168,79,0.3)] scale-[1.02]"
                    : isCompleted
                    ? "bg-bg-2 border-teal/40 text-teal hover:border-teal"
                    : "bg-bg-2/50 border-line text-ink-faint hover:text-ink hover:border-line-active"
                }`}
                title={`Stage ${s.step}: ${s.title}`}
              >
                {isCompleted ? (
                  <Check className="h-3 w-3 text-teal shrink-0" />
                ) : (
                  <StageIcon className="h-3 w-3 shrink-0" />
                )}
                <span className="hidden md:inline truncate">{s.step}</span>
              </button>
            );
          })}
        </div>

        {/* SIH Voice Narrator Caption Bar */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-amber/30 bg-amber/5 text-[11px] font-sans text-ink shadow-inner">
          <Volume2 className="h-3.5 w-3.5 text-amber shrink-0 animate-pulse" />
          <span className="font-mono text-amber font-semibold text-[10px] shrink-0 tracking-wider">
            [SIH NARRATOR]:
          </span>
          <span className="truncate text-ink-dim">{currentStage.caption}</span>
        </div>
      </div>
    </div>
  );
};
