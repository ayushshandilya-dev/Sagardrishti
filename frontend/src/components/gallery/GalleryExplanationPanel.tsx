"use client";

import React, { useState } from "react";
import { ComparisonData, JudgeNote } from "@/types/gallery";
import {
  Brain,
  HelpCircle,
  Zap,
  Award,
  BookOpen,
  Activity,
  Star,
  CheckCircle2,
  FileEdit,
  Clock,
  Check,
} from "lucide-react";

interface GalleryExplanationPanelProps {
  comparison: ComparisonData;
  judgeNote?: JudgeNote;
  onSaveJudgeNote: (note: JudgeNote) => void;
}

export const GalleryExplanationPanel: React.FC<
  GalleryExplanationPanelProps
> = ({ comparison, judgeNote, onSaveJudgeNote }) => {
  const [activeTab, setActiveTab] = useState<"EXPLANATION" | "METRICS" | "JUDGE_NOTES">("EXPLANATION");

  // Local state for judge notes
  const [noteText, setNoteText] = useState<string>(judgeNote?.noteText || "");
  const [rating, setRating] = useState<number>(judgeNote?.rating || 5);
  const [starred, setStarred] = useState<boolean>(judgeNote?.starred || false);
  const [verified, setVerified] = useState<boolean>(judgeNote?.verifiedByJudge || true);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handleSaveNote = () => {
    onSaveJudgeNote({
      comparisonId: comparison.id,
      noteText,
      rating,
      starred,
      verifiedByJudge: verified,
      updatedAt: new Date().toISOString(),
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <aside className="w-80 xl:w-96 shrink-0 h-full min-h-0 border-l border-line bg-bg-1 flex flex-col select-none overflow-hidden">
      {/* Header Info */}
      <div className="p-4 border-b border-line bg-bg-2/50">
        <div className="flex items-center justify-between gap-2">
          <span className="px-2 py-0.5 rounded border border-aqua/40 bg-aqua/10 text-[10px] font-mono text-aqua font-semibold">
            STAGE {comparison.stageNumber.toString().padStart(2, "0")} / 20
          </span>
          <span className="text-xs font-mono text-ink-faint">
            {comparison.timestampUtc}
          </span>
        </div>
        <h2 className="text-sm font-semibold text-ink mt-1 font-sans">
          {comparison.title}
        </h2>
        <p className="text-xs text-ink-dim mt-0.5 leading-relaxed">
          {comparison.subtitle}
        </p>
      </div>

      {/* Tabs Ribbon */}
      <div className="flex border-b border-line bg-bg-1">
        <TabButton
          label="Explanation"
          icon={BookOpen}
          active={activeTab === "EXPLANATION"}
          onClick={() => setActiveTab("EXPLANATION")}
        />
        <TabButton
          label="Metrics"
          icon={Activity}
          active={activeTab === "METRICS"}
          onClick={() => setActiveTab("METRICS")}
        />
        <TabButton
          label="Judge Notes"
          icon={FileEdit}
          active={activeTab === "JUDGE_NOTES"}
          onClick={() => setActiveTab("JUDGE_NOTES")}
        />
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {activeTab === "EXPLANATION" && (
          <div className="space-y-4 text-xs font-sans">
            {/* What Changed */}
            <SectionCard
              title="What Changed?"
              icon={Zap}
              iconColor="text-aqua"
              content={comparison.whatChanged}
            />

            {/* Why It Changed */}
            <SectionCard
              title="Why It Changed?"
              icon={HelpCircle}
              iconColor="text-teal"
              content={comparison.whyItChanged}
            />

            {/* AI Reasoning */}
            <SectionCard
              title="AI Neural Reasoning"
              icon={Brain}
              iconColor="text-amber"
              content={comparison.aiReasoning}
            />

            {/* Scientific Interpretation */}
            <SectionCard
              title="Scientific Hydrodynamic Interpretation"
              icon={Activity}
              iconColor="text-aqua"
              content={comparison.scientificInterpretation}
            />

            {/* Judge Takeaway */}
            <div className="p-3.5 rounded-xl border border-amber/40 bg-amber/10 shadow-panel">
              <div className="flex items-center gap-2 text-amber font-mono font-semibold mb-1">
                <Award className="h-4 w-4" />
                <span>JUDGE TAKEAWAY</span>
              </div>
              <p className="text-ink font-medium leading-relaxed">
                {comparison.judgeTakeaway}
              </p>
            </div>
          </div>
        )}

        {activeTab === "METRICS" && (
          <div className="space-y-4">
            <h3 className="text-xs font-mono font-semibold text-ink-faint uppercase tracking-wider">
              STAGE TELEMETRY METRICS
            </h3>

            <div className="grid grid-cols-2 gap-2">
              {comparison.metrics.map((m, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-line bg-bg-2 flex flex-col justify-between"
                >
                  <span className="text-[10px] font-mono text-ink-faint uppercase">
                    {m.label}
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-lg font-mono font-semibold text-ink tnum">
                      {m.value}
                    </span>
                    {m.unit && (
                      <span className="text-xs font-mono text-aqua">
                        {m.unit}
                      </span>
                    )}
                  </div>
                  {m.subtext && (
                    <span className="text-[10px] font-mono text-ink-faint mt-1">
                      {m.subtext}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Stage Metadata */}
            <div className="p-3 rounded-xl border border-line bg-bg-2/50 space-y-2 text-xs font-mono">
              <div className="flex justify-between border-b border-line pb-1.5">
                <span className="text-ink-faint">Satellite Sensor:</span>
                <span className="text-ink font-semibold">{comparison.satelliteSensor}</span>
              </div>
              <div className="flex justify-between border-b border-line pb-1.5">
                <span className="text-ink-faint">Spatial Resolution:</span>
                <span className="text-ink font-semibold">{comparison.resolution}</span>
              </div>
              {comparison.areaKm2 && (
                <div className="flex justify-between border-b border-line pb-1.5">
                  <span className="text-ink-faint">Contamination Area:</span>
                  <span className="text-amber font-semibold">{comparison.areaKm2} km²</span>
                </div>
              )}
              {comparison.gpuProcessingMs && (
                <div className="flex justify-between">
                  <span className="text-ink-faint">GPU Pipeline Latency:</span>
                  <span className="text-teal font-semibold">{comparison.gpuProcessingMs} ms</span>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "JUDGE_NOTES" && (
          <div className="space-y-4 text-xs font-mono">
            {/* Star Rating */}
            <div>
              <label className="text-ink-faint font-semibold block mb-1">
                EVALUATOR STAGE RATING
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`h-5 w-5 ${
                        star <= rating
                          ? "fill-amber text-amber"
                          : "text-ink-faint"
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 font-mono text-ink text-xs font-semibold">
                  {rating} / 5 STARS
                </span>
              </div>
            </div>

            {/* Verification Checkbox */}
            <div className="flex items-center gap-2 p-2.5 rounded-lg border border-line bg-bg-2">
              <input
                type="checkbox"
                id="verify-check"
                checked={verified}
                onChange={(e) => setVerified(e.target.checked)}
                className="w-4 h-4 accent-green rounded cursor-pointer"
              />
              <label htmlFor="verify-check" className="text-ink cursor-pointer font-sans">
                Mark Stage as Hydrodynamically & Legally Verified
              </label>
            </div>

            {/* Note Text Box */}
            <div>
              <label className="text-ink-faint font-semibold block mb-1">
                JUDGE EVALUATION REMARKS
              </label>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Enter evaluation remarks, legal questions, or observations for SIH jury presentation..."
                rows={5}
                className="w-full p-3 rounded-xl bg-bg-2 border border-line text-xs font-sans text-ink placeholder:text-ink-faint focus:outline-none focus:border-aqua transition-colors resize-none"
              />
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveNote}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-aqua/20 border border-aqua/40 text-aqua font-mono font-semibold hover:bg-aqua/30 transition-colors shadow-panel"
            >
              {savedSuccess ? (
                <>
                  <Check className="h-4 w-4 text-green" />
                  <span>NOTE SAVED!</span>
                </>
              ) : (
                <>
                  <FileEdit className="h-4 w-4" />
                  <span>SAVE JUDGE NOTE</span>
                </>
              )}
            </button>

            {judgeNote?.updatedAt && (
              <div className="flex items-center gap-1 text-[10px] text-ink-faint justify-end">
                <Clock className="h-3 w-3" />
                <span>Last saved: {new Date(judgeNote.updatedAt).toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

// Tab Button Sub-component
function TabButton({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-mono transition-colors border-b-2 ${
        active
          ? "border-aqua text-aqua font-semibold bg-bg-2/30"
          : "border-transparent text-ink-faint hover:text-ink hover:bg-bg-2/10"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </button>
  );
}

// Section Card Sub-component
function SectionCard({
  title,
  icon: Icon,
  iconColor,
  content,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  content: string;
}) {
  return (
    <div className="p-3.5 rounded-xl border border-line bg-bg-2/60 space-y-1">
      <div className="flex items-center gap-2 text-xs font-mono font-semibold text-ink">
        <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
        <span>{title}</span>
      </div>
      <p className="text-ink-dim leading-relaxed text-[11px] pt-1">
        {content}
      </p>
    </div>
  );
}
