"use client";

import React, { useState } from "react";
import { GALLERY_COMPARISONS } from "@/lib/galleryData";
import { ComparisonViewingMode, ExportFormat, JudgeNote } from "@/types/gallery";
import { GalleryHeader } from "@/components/gallery/GalleryHeader";
import { GallerySidebar } from "@/components/gallery/GallerySidebar";
import { GalleryViewer } from "@/components/gallery/GalleryViewer";
import { GalleryExplanationPanel } from "@/components/gallery/GalleryExplanationPanel";
import { GalleryTimeline } from "@/components/gallery/GalleryTimeline";
import { JudgePresentationModal } from "@/components/gallery/JudgePresentationModal";
import { ExportModal } from "@/components/gallery/ExportModal";
import { RealSarDemoModal } from "@/components/gallery/RealSarDemoModal";
import { RealSpillAnimationModal } from "@/components/gallery/RealSpillAnimationModal";
import { JuryFaqModal } from "@/components/gallery/JuryFaqModal";

export default function ExplainabilityGalleryPage() {
  // Currently active comparison stage ID
  const [activeComparisonId, setActiveComparisonId] = useState<string>("comp-01");

  // Filter Search query
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Viewing mode (SLIDER, FADE, SWIPE, SPLIT_ZOOM, REPLAY)
  const [viewingMode, setViewingMode] = useState<ComparisonViewingMode>("SLIDER");

  // Toggles for Annotations and Pixel Inspector
  const [showAnnotations, setShowAnnotations] = useState<boolean>(true);
  const [showPixelInspector, setShowPixelInspector] = useState<boolean>(false);

  // Judge Presentation Mode toggle
  const [isJudgeMode, setIsJudgeMode] = useState<boolean>(false);

  // Real Demo Modals state
  const [showRealSarDemo, setShowRealSarDemo] = useState<boolean>(false);
  const [showRealSpillAnimation, setShowRealSpillAnimation] = useState<boolean>(false);
  const [showJuryFaq, setShowJuryFaq] = useState<boolean>(false);

  // Active Export Modal state
  const [exportFormat, setExportFormat] = useState<ExportFormat | null>(null);

  // Saved judge notes state map
  const [judgeNotes, setJudgeNotes] = useState<Record<string, JudgeNote>>({});

  // Active comparison object
  const activeComparison =
    GALLERY_COMPARISONS.find((c) => c.id === activeComparisonId) ||
    GALLERY_COMPARISONS[0];

  const activeIndex = GALLERY_COMPARISONS.findIndex(
    (c) => c.id === activeComparisonId
  );

  const handleSaveJudgeNote = (note: JudgeNote) => {
    setJudgeNotes((prev) => ({
      ...prev,
      [note.comparisonId]: note,
    }));
  };

  return (
    <div className="flex flex-col h-full w-full min-h-0 min-w-0 overflow-hidden bg-bg-0 text-ink select-none font-sans">
      {/* Top Header */}
      <GalleryHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isJudgeMode={isJudgeMode}
        onToggleJudgeMode={() => setIsJudgeMode(!isJudgeMode)}
        onExport={(fmt) => setExportFormat(fmt)}
        activeStageNumber={activeComparison.stageNumber}
        onOpenRealSarDemo={() => setShowRealSarDemo(true)}
        onOpenRealSpillAnimation={() => setShowRealSpillAnimation(true)}
        onOpenJuryFaq={() => setShowJuryFaq(true)}
      />

      {/* Main Center Layout Grid */}
      <div className="flex-1 flex min-h-0 min-w-0 overflow-hidden relative">
        {/* Left Sidebar (20 Categories) */}
        <GallerySidebar
          comparisons={GALLERY_COMPARISONS}
          activeId={activeComparisonId}
          onSelectComparison={(id) => setActiveComparisonId(id)}
          searchQuery={searchQuery}
        />

        {/* Center Stage Viewer */}
        <GalleryViewer
          comparison={activeComparison}
          viewingMode={viewingMode}
          onViewingModeChange={setViewingMode}
          showAnnotations={showAnnotations}
          onToggleAnnotations={() => setShowAnnotations(!showAnnotations)}
          showPixelInspector={showPixelInspector}
          onTogglePixelInspector={() =>
            setShowPixelInspector(!showPixelInspector)
          }
          isJudgeMode={isJudgeMode}
        />

        {/* Right Sidebar Explanation Panel */}
        <GalleryExplanationPanel
          comparison={activeComparison}
          judgeNote={judgeNotes[activeComparisonId]}
          onSaveJudgeNote={handleSaveJudgeNote}
        />
      </div>

      {/* Bottom Timeline Dock */}
      <GalleryTimeline
        comparisons={GALLERY_COMPARISONS}
        activeId={activeComparisonId}
        onSelectComparison={(id) => setActiveComparisonId(id)}
        isJudgeMode={isJudgeMode}
        onToggleJudgeMode={() => setIsJudgeMode(!isJudgeMode)}
      />

      {/* Judge Presentation Overlay Modal */}
      {isJudgeMode && (
        <JudgePresentationModal
          comparisons={GALLERY_COMPARISONS}
          currentIndex={activeIndex !== -1 ? activeIndex : 0}
          onSelectIndex={(idx) =>
            setActiveComparisonId(GALLERY_COMPARISONS[idx].id)
          }
          onClose={() => setIsJudgeMode(false)}
        />
      )}

      {/* Real Sentinel-1 SAR Demo Workstation Modal */}
      {showRealSarDemo && (
        <RealSarDemoModal onClose={() => setShowRealSarDemo(false)} />
      )}

      {/* Real Oil Spill Hydrodynamic Simulation Modal */}
      {showRealSpillAnimation && (
        <RealSpillAnimationModal onClose={() => setShowRealSpillAnimation(false)} />
      )}

      {/* SIH Jury Interrogation Assistant & FAQ Modal */}
      {showJuryFaq && (
        <JuryFaqModal onClose={() => setShowJuryFaq(false)} />
      )}

      {/* Export Modal */}
      {exportFormat && (
        <ExportModal
          comparison={activeComparison}
          format={exportFormat}
          onClose={() => setExportFormat(null)}
        />
      )}
    </div>
  );
}
