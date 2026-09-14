"use client";

import React, { useEffect, useState } from "react";
import { ComparisonData } from "@/types/gallery";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  X,
  Sparkles,
  Volume2,
  Award,
  Clock,
  ShieldCheck,
  CheckCircle,
} from "lucide-react";

interface JudgePresentationModalProps {
  comparisons: ComparisonData[];
  currentIndex: number;
  onSelectIndex: (idx: number) => void;
  onClose: () => void;
}

export const JudgePresentationModal: React.FC<JudgePresentationModalProps> = ({
  comparisons,
  currentIndex,
  onSelectIndex,
  onClose,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(12); // 12 seconds per stage
  const currentComparison = comparisons[currentIndex] || comparisons[0];

  // Auto advance timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            // Advance to next stage
            if (currentIndex < comparisons.length - 1) {
              onSelectIndex(currentIndex + 1);
              return 12;
            } else {
              // Loop back to start or finish presentation
              onSelectIndex(0);
              return 12;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentIndex, comparisons.length, onSelectIndex]);

  // Reset timer on stage change
  useEffect(() => {
    setSecondsRemaining(12);
  }, [currentIndex]);

  const handlePrev = () => {
    if (currentIndex > 0) {
      onSelectIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < comparisons.length - 1) {
      onSelectIndex(currentIndex + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg-0/95 backdrop-blur-xl select-none animate-fadeIn">
      {/* Top Banner Ribbon */}
      <div className="h-16 border-b border-amber/30 bg-bg-1/90 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber/20 border border-amber text-amber shadow-[0_0_15px_rgba(214,168,79,0.4)]">
            <Award className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold tracking-tight text-ink font-sans">
                SMART INDIA HACKATHON — JUDGE BRIEFING MODE
              </h2>
              <span className="px-2 py-0.5 rounded bg-amber/20 border border-amber/40 text-[10px] font-mono text-amber font-semibold">
                3-MINUTE GUIDED PRESENTATION
              </span>
            </div>
            <p className="text-xs text-ink-dim font-sans mt-0.5">
              Automated end-to-end visual walkthrough of SAGAR-DRISHTI multi-sensor AI pipeline.
            </p>
          </div>
        </div>

        {/* Stage & Timer Indicator */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-line bg-bg-2 font-mono text-xs text-ink">
            <Clock className="h-3.5 w-3.5 text-aqua" />
            <span>
              STAGE {currentComparison.stageNumber.toString().padStart(2, "0")} / 20
            </span>
            <span className="text-amber font-semibold ml-2">
              {secondsRemaining}s NEXT
            </span>
          </div>

          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-line bg-bg-2 text-xs font-mono text-ink-dim hover:text-ink hover:border-line-active transition-colors"
          >
            <X className="h-4 w-4" />
            <span>EXIT JUDGE MODE</span>
          </button>
        </div>
      </div>

      {/* Center Cinematic Stage View */}
      <div className="flex-1 relative flex items-center justify-center p-6 overflow-hidden">
        {/* Main Narrated Presentation Card */}
        <div className="w-full max-w-5xl rounded-2xl border border-amber/40 bg-bg-1/90 shadow-2xl p-6 flex flex-col gap-6 backdrop-blur-md">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-line pb-4">
            <div>
              <span className="text-xs font-mono font-semibold text-amber uppercase tracking-wider">
                STAGE {currentComparison.stageNumber.toString().padStart(2, "0")} · {currentComparison.category}
              </span>
              <h1 className="text-xl font-bold text-ink mt-1 font-sans">
                {currentComparison.title}
              </h1>
              <p className="text-xs text-ink-dim mt-1 font-sans">
                {currentComparison.subtitle}
              </p>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs font-mono text-ink-faint">AI CONFIDENCE SCORE</span>
              <span className="text-2xl font-mono font-bold text-green mt-0.5">
                {currentComparison.confidence}%
              </span>
            </div>
          </div>

          {/* Body Narrative Section */}
          <div className="grid grid-cols-3 gap-4">
            {/* What & Why */}
            <div className="p-4 rounded-xl border border-line bg-bg-2/70 space-y-2">
              <span className="text-xs font-mono font-semibold text-aqua uppercase">
                1. Scientific Input & Process
              </span>
              <p className="text-xs text-ink leading-relaxed">
                {currentComparison.whatChanged}
              </p>
              <p className="text-[11px] text-ink-dim leading-relaxed pt-1 border-t border-line">
                {currentComparison.whyItChanged}
              </p>
            </div>

            {/* AI Reasoning */}
            <div className="p-4 rounded-xl border border-line bg-bg-2/70 space-y-2">
              <span className="text-xs font-mono font-semibold text-amber uppercase">
                2. AI Neural Reasoning
              </span>
              <p className="text-xs text-ink leading-relaxed">
                {currentComparison.aiReasoning}
              </p>
              <p className="text-[11px] text-ink-dim leading-relaxed pt-1 border-t border-line">
                {currentComparison.scientificInterpretation}
              </p>
            </div>

            {/* Judge Takeaway */}
            <div className="p-4 rounded-xl border border-amber/40 bg-amber/10 space-y-2">
              <span className="text-xs font-mono font-semibold text-amber uppercase flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" /> 3. Executive Verdict
              </span>
              <p className="text-xs font-medium text-ink leading-relaxed">
                {currentComparison.judgeTakeaway}
              </p>
              <div className="pt-2 border-t border-amber/30 flex items-center justify-between text-[11px] font-mono text-amber">
                <span>SENSOR: {currentComparison.satelliteSensor}</span>
                <span>RES: {currentComparison.resolution}</span>
              </div>
            </div>
          </div>

          {/* Bottom Narrator Voice Subtitle Bar */}
          <div className="p-4 rounded-xl border border-aqua/30 bg-aqua/10 flex items-center gap-3">
            <Volume2 className="h-5 w-5 text-aqua animate-pulse shrink-0" />
            <div className="flex-1 font-sans text-xs text-ink">
              <span className="font-mono text-aqua font-semibold mr-2">
                [NARRATOR VOICE]:
              </span>
              &quot;{currentComparison.judgeTakeaway}&quot;
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Floating Control Bar */}
      <div className="h-20 border-t border-line bg-bg-1/90 px-8 flex items-center justify-between z-30">
        {/* Progress Bar across 20 Stages */}
        <div className="flex-1 max-w-xl flex items-center gap-1.5">
          {comparisons.map((c, idx) => (
            <button
              key={c.id}
              onClick={() => onSelectIndex(idx)}
              className={`h-2 flex-1 rounded-full transition-all ${
                idx === currentIndex
                  ? "bg-amber shadow-[0_0_12px_#D6A84F] scale-y-125"
                  : idx < currentIndex
                  ? "bg-aqua"
                  : "bg-line"
              }`}
            />
          ))}
        </div>

        {/* Play / Pause / Skip Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrev}
            disabled={currentIndex <= 0}
            className="p-2 rounded-xl border border-line bg-bg-2 text-ink-dim hover:text-ink disabled:opacity-40 transition-colors"
          >
            <SkipBack className="h-4 w-4" />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-amber/40 bg-amber/20 text-amber font-mono font-semibold text-xs hover:bg-amber/30 transition-colors shadow-panel"
          >
            {isPlaying ? (
              <>
                <Pause className="h-4 w-4 fill-current" />
                <span>PAUSE BRIEFING</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                <span>RESUME BRIEFING</span>
              </>
            )}
          </button>

          <button
            onClick={handleNext}
            disabled={currentIndex >= comparisons.length - 1}
            className="p-2 rounded-xl border border-line bg-bg-2 text-ink-dim hover:text-ink disabled:opacity-40 transition-colors"
          >
            <SkipForward className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
