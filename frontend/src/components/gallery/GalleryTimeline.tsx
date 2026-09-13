"use client";

import React from "react";
import { ComparisonData } from "@/types/gallery";
import { ChevronLeft, ChevronRight, Play, Pause, RotateCcw } from "lucide-react";

interface GalleryTimelineProps {
  comparisons: ComparisonData[];
  activeId: string;
  onSelectComparison: (id: string) => void;
  isJudgeMode: boolean;
  onToggleJudgeMode: () => void;
}

export const GalleryTimeline: React.FC<GalleryTimelineProps> = ({
  comparisons,
  activeId,
  onSelectComparison,
  isJudgeMode,
  onToggleJudgeMode,
}) => {
  const currentIndex = comparisons.findIndex((c) => c.id === activeId);
  const currentStageNumber = currentIndex !== -1 ? comparisons[currentIndex].stageNumber : 1;

  const handlePrev = () => {
    if (currentIndex > 0) {
      onSelectComparison(comparisons[currentIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (currentIndex < comparisons.length - 1) {
      onSelectComparison(comparisons[currentIndex + 1].id);
    }
  };

  return (
    <div className="h-14 shrink-0 border-t border-line bg-bg-1 px-4 flex items-center justify-between select-none z-30">
      {/* Timeline Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleJudgeMode}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-mono font-semibold transition-colors ${
            isJudgeMode
              ? "bg-amber border-amber text-bg-0 shadow-[0_0_10px_#D6A84F]"
              : "bg-bg-2 border-line text-ink hover:border-line-active"
          }`}
          title="Toggle automatic presentation replay"
        >
          {isJudgeMode ? (
            <>
              <Pause className="h-3.5 w-3.5 fill-current" />
              <span>PAUSE REPLAY</span>
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 fill-current text-amber" />
              <span>START REPLAY</span>
            </>
          )}
        </button>

        <div className="flex items-center border border-line rounded-lg bg-bg-2 overflow-hidden">
          <button
            onClick={handlePrev}
            disabled={currentIndex <= 0}
            className="p-1.5 text-ink-dim hover:text-ink disabled:opacity-30 disabled:hover:text-ink-dim border-r border-line transition-colors"
            title="Previous Stage"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-3 text-xs font-mono font-semibold text-aqua">
            STAGE {currentStageNumber.toString().padStart(2, "0")} / 20
          </span>
          <button
            onClick={handleNext}
            disabled={currentIndex >= comparisons.length - 1}
            className="p-1.5 text-ink-dim hover:text-ink disabled:opacity-30 disabled:hover:text-ink-dim border-l border-line transition-colors"
            title="Next Stage"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Synchronized 20-Stage Timeline Scrubber */}
      <div className="flex-1 mx-6 flex items-center gap-1">
        {comparisons.map((c, idx) => {
          const isCurrent = c.id === activeId;
          const isPassed = idx < currentIndex;

          return (
            <button
              key={c.id}
              onClick={() => onSelectComparison(c.id)}
              className="relative flex-1 group py-2 flex flex-col items-center focus:outline-none"
              title={`Stage ${c.stageNumber}: ${c.title}`}
            >
              {/* Tooltip on Hover */}
              <div className="absolute bottom-full mb-1 hidden group-hover:block z-50 whitespace-nowrap rounded-md border border-line-active bg-bg-1 px-2 py-1 text-[10px] font-mono text-ink shadow-float pointer-events-none">
                <span className="text-aqua font-semibold">STAGE {c.stageNumber.toString().padStart(2, "0")}:</span>{" "}
                {c.title}
              </div>

              {/* Step Segment Bar */}
              <div
                className={`h-2 w-full rounded-full transition-all ${
                  isCurrent
                    ? "bg-amber shadow-[0_0_10px_#D6A84F] scale-y-125"
                    : isPassed
                    ? "bg-aqua/60"
                    : "bg-line hover:bg-line-active"
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Timeline Status */}
      <div className="flex items-center gap-2 text-xs font-mono text-ink-faint">
        <span className="hidden lg:inline text-[10px]">MISSION REPLAY TIMELINE:</span>
        <span className="text-aqua font-semibold">
          {comparisons[currentIndex]?.category.toUpperCase() || "DETECTION"}
        </span>
      </div>
    </div>
  );
};
