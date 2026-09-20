"use client";

import React, { useState } from "react";
import {
  Play,
  Pause,
  Download,
  Search,
  Sparkles,
  Award,
  FileText,
  Image,
  Globe,
  Check,
  Satellite,
  Waves,
  HelpCircle,
  ChevronDown,
} from "lucide-react";
import { ExportFormat } from "@/types/gallery";

interface GalleryHeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isJudgeMode: boolean;
  onToggleJudgeMode: () => void;
  onExport: (format: ExportFormat) => void;
  activeStageNumber: number;
  onOpenRealSarDemo: () => void;
  onOpenRealSpillAnimation: () => void;
  onOpenJuryFaq?: () => void;
}

export const GalleryHeader: React.FC<GalleryHeaderProps> = ({
  searchQuery,
  onSearchChange,
  isJudgeMode,
  onToggleJudgeMode,
  onExport,
  activeStageNumber,
  onOpenRealSarDemo,
  onOpenRealSpillAnimation,
  onOpenJuryFaq,
}) => {
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const [copiedCaption, setCopiedCaption] = useState<boolean>(false);

  return (
    <header className="h-16 shrink-0 z-40 select-none flex items-center justify-between gap-4 border-b border-line bg-bg-1 px-4">
      {/* Title & Subtitle */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber/40 bg-amber/10 shadow-[0_0_12px_rgba(214,168,79,0.15)]">
          <Sparkles className="h-5 w-5 text-amber animate-pulse" />
        </div>
        <div className="leading-tight">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight text-ink font-sans">
              Explainability Gallery
            </h1>
            <span className="px-2 py-0.5 rounded border border-amber/40 bg-amber/10 text-[10px] font-mono font-semibold text-amber">
              JUDGE PRESENTATION MODE
            </span>
          </div>
          <p className="text-xs text-ink-dim font-sans mt-0.5">
            Visual evidence showing every stage of the maritime investigation.
          </p>
        </div>
      </div>

      {/* Middle Quick Search Bar */}
      <div className="hidden md:flex items-center gap-2 max-w-xs w-full">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-faint" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search 20 stages (e.g. SAR, RK4, AIS)..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-bg-2 border border-line text-xs font-mono text-ink placeholder:text-ink-faint focus:outline-none focus:border-aqua transition-colors"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* REAL SAR DEMO Button */}
        <button
          onClick={onOpenRealSarDemo}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-aqua/40 bg-aqua/10 text-xs font-mono font-semibold text-aqua transition-all hover:bg-aqua/20 hover:border-aqua focus:outline-none shadow-sm"
          title="Open interactive Sentinel-1 C-band SAR processing workstation demo"
        >
          <Satellite className="h-3.5 w-3.5" />
          <span>REAL SAR DEMO</span>
        </button>

        {/* SPILL ANIMATION Button */}
        <button
          onClick={onOpenRealSpillAnimation}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal/40 bg-teal/10 text-xs font-mono font-semibold text-teal transition-all hover:bg-teal/20 hover:border-teal focus:outline-none shadow-sm"
          title="Open 60 FPS hydrodynamic RK4 particle advection simulation"
        >
          <Waves className="h-3.5 w-3.5 animate-pulse" />
          <span>SPILL ANIMATION</span>
        </button>

        {/* JURY FAQ Button */}
        {onOpenJuryFaq && (
          <button
            onClick={onOpenJuryFaq}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber/40 bg-amber/10 text-xs font-mono font-semibold text-amber transition-all hover:bg-amber/20 hover:border-amber focus:outline-none shadow-sm"
            title="Open SIH Jury Interrogation Assistant & FAQ workstation"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span>JURY FAQ</span>
          </button>
        )}

        {/* Export Dropdown Menu */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-line bg-bg-2 text-xs font-mono font-medium text-ink transition-colors hover:bg-bg-1 hover:border-line-active focus:outline-none"
          >
            <Download className="h-3.5 w-3.5 text-teal" />
            <span>EXPORT</span>
            <ChevronDown className="h-3 w-3 text-ink-faint" />
          </button>

          {showExportMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-line bg-bg-1 p-1.5 shadow-float z-50 text-xs font-mono backdrop-blur-md">
              <div className="px-2.5 py-1 text-[10px] text-ink-faint border-b border-line mb-1">
                EXPORT COMPARISON STAGE #{activeStageNumber}
              </div>
              <button
                onClick={() => {
                  onExport("PDF_SLIDE");
                  setShowExportMenu(false);
                }}
                className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-ink hover:bg-bg-2 transition-colors text-left"
              >
                <FileText className="h-3.5 w-3.5 text-amber" />
                <span>PDF Slide Presentation</span>
              </button>
              <button
                onClick={() => {
                  onExport("PNG_SNAPSHOT");
                  setShowExportMenu(false);
                }}
                className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-ink hover:bg-bg-2 transition-colors text-left"
              >
                <Image className="h-3.5 w-3.5 text-aqua" />
                <span>PNG High-Res Snapshot</span>
              </button>
              <button
                onClick={() => {
                  onExport("GEOJSON_OVERLAY");
                  setShowExportMenu(false);
                }}
                className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-ink hover:bg-bg-2 transition-colors text-left"
              >
                <Globe className="h-3.5 w-3.5 text-teal" />
                <span>GeoJSON Vector Bounds</span>
              </button>
              <button
                onClick={() => {
                  onExport("JUDGE_CAPTION");
                  setCopiedCaption(true);
                  setTimeout(() => setCopiedCaption(false), 2000);
                  setShowExportMenu(false);
                }}
                className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-ink hover:bg-bg-2 transition-colors text-left border-t border-line mt-1 pt-1.5"
              >
                {copiedCaption ? (
                  <Check className="h-3.5 w-3.5 text-green" />
                ) : (
                  <Award className="h-3.5 w-3.5 text-green" />
                )}
                <span>Copy Judge Caption</span>
              </button>
            </div>
          )}
        </div>

        {/* Present to Judges Primary Button */}
        <button
          onClick={onToggleJudgeMode}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all duration-200 shadow-panel border ${
            isJudgeMode
              ? "bg-amber border-amber-light text-bg-0 shadow-[0_0_16px_rgba(214,168,79,0.5)] animate-pulse"
              : "bg-gradient-to-r from-amber/20 to-aqua/20 border-amber/40 text-amber hover:border-amber hover:bg-amber/30"
          }`}
        >
          {isJudgeMode ? (
            <>
              <Pause className="h-4 w-4 fill-current" />
              <span>EXIT JUDGE MODE</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4 fill-current" />
              <span>PRESENT TO JUDGES</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
