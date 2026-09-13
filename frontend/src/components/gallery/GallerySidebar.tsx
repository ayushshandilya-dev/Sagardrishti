"use client";

import React from "react";
import { ComparisonData } from "@/types/gallery";
import {
  Satellite,
  Filter,
  Layers,
  CloudSun,
  Eye,
  Activity,
  Wind,
  Waves,
  Ship,
  Compass,
  Zap,
  Lock,
  ShieldCheck,
  Clock,
  FileText,
  ChevronRight,
} from "lucide-react";

interface GallerySidebarProps {
  comparisons: ComparisonData[];
  activeId: string;
  onSelectComparison: (id: string) => void;
  searchQuery: string;
}

// Icon mapping per category / render type
const getCategoryIcon = (renderType: ComparisonData["renderType"]) => {
  switch (renderType) {
    case "sar_seg":
      return Satellite;
    case "speckle":
      return Filter;
    case "polarization":
      return Layers;
    case "rgb_sar":
      return CloudSun;
    case "sheen":
      return Eye;
    case "heatmap":
      return Activity;
    case "rk4":
      return Wind;
    case "currents":
      return Waves;
    case "wind":
      return Wind;
    case "ais_ranking":
      return Ship;
    case "blackout":
      return Ship;
    case "speed_profile":
      return Compass;
    case "heading":
      return Compass;
    case "current_drift":
      return Waves;
    case "confidence_build":
      return Zap;
    case "intelligence_map":
      return Layers;
    case "evidence_proof":
      return Lock;
    case "tamper_sim":
      return ShieldCheck;
    case "timeline_build":
      return Clock;
    case "final_dossier":
      return FileText;
    default:
      return Satellite;
  }
};

export const GallerySidebar: React.FC<GallerySidebarProps> = ({
  comparisons,
  activeId,
  onSelectComparison,
  searchQuery,
}) => {
  const filtered = comparisons.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      `stage ${c.stageNumber}`.includes(q) ||
      c.subtitle.toLowerCase().includes(q)
    );
  });

  return (
    <aside className="w-72 lg:w-80 shrink-0 h-full min-h-0 border-r border-line bg-bg-1 flex flex-col select-none overflow-hidden">
      {/* Sidebar Header Title */}
      <div className="p-3 border-b border-line flex items-center justify-between">
        <span className="text-xs font-mono font-semibold uppercase tracking-wider text-ink-faint">
          20 STAGE INVESTIGATION PIPELINE
        </span>
        <span className="px-2 py-0.5 rounded-full bg-bg-2 border border-line text-[10px] font-mono text-aqua">
          {filtered.length} / 20
        </span>
      </div>

      {/* Categories Scrollable List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
        {filtered.map((item) => {
          const isActive = item.id === activeId;
          const Icon = getCategoryIcon(item.renderType);

          return (
            <button
              key={item.id}
              onClick={() => onSelectComparison(item.id)}
              className={`w-full text-left p-2.5 rounded-xl border transition-all duration-150 relative group ${
                isActive
                  ? "bg-bg-2 border-aqua/50 shadow-panel"
                  : "bg-bg-1/60 border-line hover:bg-bg-2/70 hover:border-line-active"
              }`}
            >
              {/* Left active cyan accent indicator bar */}
              {isActive && (
                <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-aqua shadow-[0_0_8px_#38BDF8]" />
              )}

              <div className="flex items-start justify-between gap-2">
                {/* Stage Badge & Title */}
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs ${
                      isActive
                        ? "border-aqua/40 bg-aqua/10 text-aqua"
                        : "border-line bg-bg-0 text-ink-faint group-hover:text-ink-dim"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 leading-tight">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-semibold text-ink-faint">
                        STAGE {item.stageNumber.toString().padStart(2, "0")}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-bg-0 border border-line text-ink-dim">
                        {item.category}
                      </span>
                    </div>
                    <h3
                      className={`text-xs font-semibold truncate mt-0.5 ${
                        isActive ? "text-ink" : "text-ink-dim group-hover:text-ink"
                      }`}
                    >
                      {item.title}
                    </h3>
                  </div>
                </div>

                {/* Right Arrow / Confidence Badge */}
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-[10px] font-mono font-semibold text-green">
                    {item.confidence}%
                  </span>
                  <ChevronRight
                    className={`h-3.5 w-3.5 mt-1 transition-transform ${
                      isActive ? "text-aqua translate-x-0.5" : "text-ink-faint opacity-0 group-hover:opacity-100"
                    }`}
                  />
                </div>
              </div>
            </button>
          );
        })}

        {filtered.length === 0 && (
          <div className="p-6 text-center text-xs font-mono text-ink-faint">
            No stage matched &quot;{searchQuery}&quot;
          </div>
        )}
      </div>
    </aside>
  );
};
