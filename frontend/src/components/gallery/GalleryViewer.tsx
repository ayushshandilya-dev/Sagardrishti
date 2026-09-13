"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  ComparisonData,
  ComparisonViewingMode,
  PixelTelemetry,
} from "@/types/gallery";
import {
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  Sliders,
  Play,
  Pause,
  Layers,
  Crosshair,
  Compass,
  Zap,
} from "lucide-react";

interface GalleryViewerProps {
  comparison: ComparisonData;
  viewingMode: ComparisonViewingMode;
  onViewingModeChange: (mode: ComparisonViewingMode) => void;
  showAnnotations: boolean;
  onToggleAnnotations: () => void;
  showPixelInspector: boolean;
  onTogglePixelInspector: () => void;
  isJudgeMode: boolean;
}

export const GalleryViewer: React.FC<GalleryViewerProps> = ({
  comparison,
  viewingMode,
  onViewingModeChange,
  showAnnotations,
  onToggleAnnotations,
  showPixelInspector,
  onTogglePixelInspector,
  isJudgeMode,
}) => {
  // Slider position: 0 to 100
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Fade mode opacity: 0 (before) to 1 (after)
  const [fadeOpacity, setFadeOpacity] = useState<number>(0.5);

  // Replay playback state
  const [isPlayingReplay, setIsPlayingReplay] = useState<boolean>(false);
  const [replayProgress, setReplayProgress] = useState<number>(0);

  // Synchronized Zoom & Pan state
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Hover Pixel Inspector state
  const [hoverPixel, setHoverPixel] = useState<{
    x: number;
    y: number;
    data: PixelTelemetry;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const beforeCanvasRef = useRef<HTMLCanvasElement>(null);
  const afterCanvasRef = useRef<HTMLCanvasElement>(null);

  // Reset view on comparison change
  useEffect(() => {
    setSliderPos(50);
    setFadeOpacity(0.5);
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    setReplayProgress(0);
    if (isJudgeMode) {
      setIsPlayingReplay(true);
    }
  }, [comparison.id, isJudgeMode]);

  // Replay animation ticker
  useEffect(() => {
    let animationFrame: number;
    if (isPlayingReplay || viewingMode === "REPLAY" || isJudgeMode) {
      let lastTime = performance.now();
      const loop = (currentTime: number) => {
        const delta = (currentTime - lastTime) / 1000;
        lastTime = currentTime;

        setReplayProgress((prev) => {
          const next = prev + delta * 0.25; // 4 seconds per full loop
          return next > 1 ? 0 : next;
        });

        // Also smoothly oscillate slider position during Judge Mode if mode is SLIDER
        if (isJudgeMode && viewingMode === "SLIDER") {
          const timeSec = currentTime / 1000;
          const osc = 50 + Math.sin(timeSec * 1.5) * 35;
          setSliderPos(osc);
        }

        animationFrame = requestAnimationFrame(loop);
      };
      animationFrame = requestAnimationFrame(loop);
    }
    return () => cancelAnimationFrame(animationFrame);
  }, [isPlayingReplay, viewingMode, isJudgeMode]);

  // Handle Dragging Slider
  const handleMouseDownSlider = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Update Slider Position if dragging
      if (isDragging) {
        const pct = Math.max(0, Math.min(100, (mouseX / rect.width) * 100));
        setSliderPos(pct);
      }

      // Update Pan if panning
      if (isPanning) {
        setPanOffset({
          x: mouseX - panStartRef.current.x,
          y: mouseY - panStartRef.current.y,
        });
      }

      // Update Hover Pixel Inspector
      if (showPixelInspector) {
        const normX = mouseX / rect.width;
        const normY = mouseY / rect.height;

        // Calculate synthetic variations based on basePixel & mouse coords
        const distFromCenter = Math.sqrt(
          Math.pow(normX - 0.5, 2) + Math.pow(normY - 0.5, 2)
        );
        const isSlickCore = distFromCenter < 0.25;

        const base = comparison.basePixel;
        const synthData: PixelTelemetry = {
          lat: `${(18.9214 + (0.5 - normY) * 0.05).toFixed(4)}° N`,
          lon: `${(72.8341 + (normX - 0.5) * 0.05).toFixed(4)}° E`,
          vvDb: isSlickCore
            ? base.vvDb
            : Number((base.vvDb + distFromCenter * 15).toFixed(1)),
          vhDb: isSlickCore
            ? base.vhDb
            : Number((base.vhDb + distFromCenter * 10).toFixed(1)),
          textureEntropy: isSlickCore
            ? base.textureEntropy
            : Number((base.textureEntropy + 0.3).toFixed(2)),
          confidence: isSlickCore
            ? base.confidence
            : Number(Math.max(10, base.confidence - distFromCenter * 100).toFixed(1)),
          classification: isSlickCore
            ? base.classification
            : "Ambient Seawater",
          backscatterSigma0: isSlickCore
            ? base.backscatterSigma0
            : Number((base.backscatterSigma0 * 4).toFixed(4)),
        };

        setHoverPixel({ x: mouseX, y: mouseY, data: synthData });
      }
    },
    [isDragging, isPanning, showPixelInspector, comparison.basePixel]
  );

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsPanning(false);
  };

  // Zoom controls
  const handleZoomIn = () => setZoomScale((s) => Math.min(4, s + 0.5));
  const handleZoomOut = () => setZoomScale((s) => Math.max(1, s - 0.5));
  const handleResetZoom = () => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Canvas drawing functions for Before & After
  useEffect(() => {
    const beforeCanvas = beforeCanvasRef.current;
    const afterCanvas = afterCanvasRef.current;

    if (!beforeCanvas || !afterCanvas) return;

    const width = beforeCanvas.width || 800;
    const height = beforeCanvas.height || 500;

    const ctxBefore = beforeCanvas.getContext("2d");
    const ctxAfter = afterCanvas.getContext("2d");

    if (!ctxBefore || !ctxAfter) return;

    // Render Before Canvas
    renderCanvasState(
      ctxBefore,
      width,
      height,
      comparison,
      "BEFORE",
      replayProgress
    );

    // Render After Canvas
    renderCanvasState(
      ctxAfter,
      width,
      height,
      comparison,
      "AFTER",
      replayProgress
    );
  }, [comparison, replayProgress]);

  return (
    <div className="relative flex flex-1 flex-col h-full min-h-0 min-w-0 bg-bg-0 overflow-hidden select-none">
      {/* Viewer Top Action Ribbon */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-line bg-bg-1 z-20">
        {/* Mode Switcher Tabs */}
        <div className="flex items-center gap-1 bg-bg-2 p-1 rounded-lg border border-line">
          <ModeTab
            mode="SLIDER"
            label="Slider"
            icon={Sliders}
            active={viewingMode === "SLIDER"}
            onClick={() => onViewingModeChange("SLIDER")}
          />
          <ModeTab
            mode="FADE"
            label="Fade"
            icon={Layers}
            active={viewingMode === "FADE"}
            onClick={() => onViewingModeChange("FADE")}
          />
          <ModeTab
            mode="SWIPE"
            label="Swipe"
            icon={Eye}
            active={viewingMode === "SWIPE"}
            onClick={() => onViewingModeChange("SWIPE")}
          />
          <ModeTab
            mode="SPLIT_ZOOM"
            label="Split Zoom"
            icon={Maximize2}
            active={viewingMode === "SPLIT_ZOOM"}
            onClick={() => onViewingModeChange("SPLIT_ZOOM")}
          />
          <ModeTab
            mode="REPLAY"
            label="Replay"
            icon={Play}
            active={viewingMode === "REPLAY"}
            onClick={() => onViewingModeChange("REPLAY")}
          />
        </div>

        {/* Dynamic Controls / Telemetry */}
        <div className="flex items-center gap-2">
          {/* Replay Play/Pause */}
          <button
            onClick={() => setIsPlayingReplay(!isPlayingReplay)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md border text-xs font-mono transition-colors ${
              isPlayingReplay
                ? "bg-amber/10 border-amber/30 text-amber"
                : "bg-bg-2 border-line text-ink-dim hover:text-ink"
            }`}
          >
            {isPlayingReplay ? (
              <>
                <Pause className="w-3.5 h-3.5" /> PAUSE ANIM
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" /> REPLAY ANIM
              </>
            )}
          </button>

          {/* Toggle Annotations */}
          <button
            onClick={onToggleAnnotations}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md border text-xs font-mono transition-colors ${
              showAnnotations
                ? "bg-aqua/10 border-aqua/30 text-aqua"
                : "bg-bg-2 border-line text-ink-faint hover:text-ink"
            }`}
            title="Toggle scientific callout annotations"
          >
            <Zap className="w-3.5 h-3.5" />
            ANNOTATIONS
          </button>

          {/* Toggle Pixel Inspector */}
          <button
            onClick={onTogglePixelInspector}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md border text-xs font-mono transition-colors ${
              showPixelInspector
                ? "bg-teal/10 border-teal/30 text-teal"
                : "bg-bg-2 border-line text-ink-faint hover:text-ink"
            }`}
            title="Toggle mouse hover telemetry inspector"
          >
            <Crosshair className="w-3.5 h-3.5" />
            PIXEL INSPECTOR
          </button>

          {/* Zoom Controls */}
          <div className="flex items-center border border-line rounded-md bg-bg-2 overflow-hidden">
            <button
              onClick={handleZoomOut}
              className="p-1.5 text-ink-dim hover:text-ink transition-colors border-r border-line"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono text-[10px] text-aqua">
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 text-ink-dim hover:text-ink transition-colors border-l border-line"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            {(zoomScale !== 1 || panOffset.x !== 0 || panOffset.y !== 0) && (
              <button
                onClick={handleResetZoom}
                className="p-1.5 text-ink-faint hover:text-ink border-l border-line transition-colors"
                title="Reset zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Comparison Canvas Stage */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseDown={(e) => {
          if (e.target === containerRef.current) {
            setIsPanning(true);
            panStartRef.current = {
              x: e.clientX - panOffset.x,
              y: e.clientY - panOffset.y,
            };
          }
        }}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="relative flex-1 w-full h-full overflow-hidden cursor-crosshair bg-[#03080e]"
      >
        {/* Render View Based on Mode */}
        {viewingMode === "SPLIT_ZOOM" ? (
          /* Mode 4: Split Screen Side-by-Side Synchronized Zoom */
          <div className="flex w-full h-full divide-x divide-line">
            {/* Left Frame: Before */}
            <div className="relative flex-1 h-full overflow-hidden bg-bg-0">
              <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded bg-bg-1/90 border border-line text-xs font-mono font-semibold text-ink-dim shadow-panel">
                BEFORE: {comparison.beforeLabel}
              </div>
              <div
                className="w-full h-full flex items-center justify-center transition-transform duration-75"
                style={{
                  transform: `scale(${zoomScale}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                }}
              >
                <canvas
                  ref={beforeCanvasRef}
                  width={800}
                  height={550}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Right Frame: After */}
            <div className="relative flex-1 h-full overflow-hidden bg-bg-0">
              <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded bg-bg-1/90 border border-amber/30 text-xs font-mono font-semibold text-amber shadow-panel">
                AFTER: {comparison.afterLabel}
              </div>
              <div
                className="w-full h-full flex items-center justify-center transition-transform duration-75"
                style={{
                  transform: `scale(${zoomScale}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                }}
              >
                <canvas
                  ref={afterCanvasRef}
                  width={800}
                  height={550}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        ) : (
          /* Single Stage Overlaid View (Slider, Fade, Swipe, Replay) */
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Canvas Transformation Wrapper */}
            <div
              className="relative w-full h-full flex items-center justify-center transition-transform duration-75"
              style={{
                transform: `scale(${zoomScale}) translate(${panOffset.x}px, ${panOffset.y}px)`,
              }}
            >
              {/* After Layer (Bottom or Clip) */}
              <div className="absolute inset-0 w-full h-full">
                <canvas
                  ref={afterCanvasRef}
                  width={1024}
                  height={640}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Before Layer with Dynamic Clip-Path according to mode */}
              <div
                className="absolute inset-0 w-full h-full transition-opacity duration-300"
                style={{
                  clipPath:
                    viewingMode === "SLIDER" || viewingMode === "SWIPE"
                      ? `inset(0 ${100 - sliderPos}% 0 0)`
                      : "none",
                  opacity: viewingMode === "FADE" ? 1 - fadeOpacity : 1,
                }}
              >
                <canvas
                  ref={beforeCanvasRef}
                  width={1024}
                  height={640}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Annotations Overlay Layer */}
              {showAnnotations && (
                <div className="absolute inset-0 pointer-events-none z-10">
                  {comparison.annotations.map((ann) => (
                    <AnnotationCallout key={ann.id} annotation={ann} />
                  ))}
                </div>
              )}
            </div>

            {/* Draggable Slider Curtain Line */}
            {(viewingMode === "SLIDER" || viewingMode === "SWIPE") && (
              <div
                className="absolute top-0 bottom-0 z-20 flex items-center justify-center pointer-events-auto cursor-ew-resize"
                style={{ left: `${sliderPos}%` }}
                onMouseDown={handleMouseDownSlider}
              >
                {/* Vertical Divider Line */}
                <div className="w-0.5 h-full bg-aqua shadow-[0_0_12px_#38BDF8]" />

                {/* Handle Knob */}
                <div className="absolute flex items-center justify-center w-8 h-8 rounded-full bg-bg-1 border-2 border-aqua text-aqua shadow-float hover:scale-110 transition-transform">
                  <Sliders className="w-4 h-4 rotate-90" />
                </div>

                {/* Percent Badge */}
                <div className="absolute bottom-6 px-2 py-0.5 rounded bg-bg-1/90 border border-line text-[10px] font-mono text-aqua shadow-panel whitespace-nowrap">
                  {Math.round(sliderPos)}% REVEAL
                </div>
              </div>
            )}

            {/* Fade Mode Opacity Control Ribbon */}
            {viewingMode === "FADE" && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2 rounded-xl bg-bg-1/90 border border-line backdrop-blur-md shadow-float">
                <span className="text-xs font-mono text-ink-dim">
                  BEFORE (RAW)
                </span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={fadeOpacity}
                  onChange={(e) => setFadeOpacity(parseFloat(e.target.value))}
                  className="w-48 h-1.5 bg-bg-2 rounded-lg appearance-none cursor-pointer accent-aqua"
                />
                <span className="text-xs font-mono text-amber">
                  AFTER (AI PROCESSED)
                </span>
              </div>
            )}

            {/* Top Image Badges */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
              <span className="px-3 py-1 rounded-md bg-bg-1/80 border border-line text-xs font-mono text-ink-dim backdrop-blur-sm">
                RAW INPUT: {comparison.beforeLabel}
              </span>
            </div>
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
              <span className="px-3 py-1 rounded-md bg-bg-1/80 border border-amber/40 text-xs font-mono text-amber backdrop-blur-sm">
                AI PROCESSED: {comparison.afterLabel}
              </span>
            </div>
          </div>
        )}

        {/* Hover Pixel Inspector Popup */}
        {showPixelInspector && hoverPixel && (
          <div
            className="absolute z-30 pointer-events-none p-3 rounded-xl bg-bg-1/95 border border-teal/40 shadow-float backdrop-blur-md text-xs font-mono text-ink min-w-[220px]"
            style={{
              left: Math.min(hoverPixel.x + 15, 600),
              top: Math.min(hoverPixel.y + 15, 400),
            }}
          >
            <div className="flex items-center justify-between pb-1.5 border-b border-line mb-2 text-teal font-semibold">
              <span className="flex items-center gap-1">
                <Crosshair className="w-3.5 h-3.5" /> PIXEL INSPECTOR
              </span>
              <span className="text-[10px] text-ink-faint">
                {hoverPixel.data.lat}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
              <span className="text-ink-faint">Coordinates:</span>
              <span className="text-ink text-right">{hoverPixel.data.lat}</span>
              <span className="text-ink-faint">VV Backscatter:</span>
              <span className="text-aqua text-right font-semibold">
                {hoverPixel.data.vvDb} dB
              </span>
              <span className="text-ink-faint">VH Backscatter:</span>
              <span className="text-aqua text-right font-semibold">
                {hoverPixel.data.vhDb} dB
              </span>
              <span className="text-ink-faint">Texture Entropy:</span>
              <span className="text-ink text-right">
                {hoverPixel.data.textureEntropy}
              </span>
              <span className="text-ink-faint">AI Confidence:</span>
              <span className="text-amber text-right font-semibold">
                {hoverPixel.data.confidence}%
              </span>
              <span className="text-ink-faint">Classification:</span>
              <span className="text-teal text-right font-semibold col-span-1 truncate">
                {hoverPixel.data.classification}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Viewer Bottom Telemetry Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-line bg-bg-1 z-20 text-xs font-mono text-ink-dim">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-aqua" />
            SENSOR: <strong className="text-ink">{comparison.satelliteSensor}</strong>
          </span>
          <span className="flex items-center gap-1.5">
            RES: <strong className="text-ink">{comparison.resolution}</strong>
          </span>
          {comparison.areaKm2 && (
            <span className="flex items-center gap-1.5">
              AREA: <strong className="text-amber">{comparison.areaKm2} km²</strong>
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <span>
            CONFIDENCE:{" "}
            <strong className="text-green font-semibold">
              {comparison.confidence}%
            </strong>
          </span>
          {comparison.gpuProcessingMs && (
            <span>
              LATENCY:{" "}
              <strong className="text-teal">
                {comparison.gpuProcessingMs} ms
              </strong>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Mode Switcher Tab Sub-component
function ModeTab({
  mode,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  mode: ComparisonViewingMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-colors ${
        active
          ? "bg-bg-1 text-aqua font-semibold shadow-sm border border-line-active"
          : "text-ink-faint hover:text-ink hover:bg-bg-1/50"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

// Annotation Callout Sub-component
function AnnotationCallout({
  annotation,
}: {
  annotation: ComparisonData["annotations"][0];
}) {
  const colorMap = {
    amber: "border-amber text-amber bg-amber/10 shadow-[0_0_10px_rgba(214,168,79,0.2)]",
    aqua: "border-aqua text-aqua bg-aqua/10 shadow-[0_0_10px_rgba(56,189,248,0.2)]",
    teal: "border-teal text-teal bg-teal/10 shadow-[0_0_10px_rgba(34,211,167,0.2)]",
    red: "border-red text-red bg-red/10 shadow-[0_0_10px_rgba(239,68,68,0.2)]",
    green: "border-green text-green bg-green/10 shadow-[0_0_10px_rgba(34,197,94,0.2)]",
  };

  const styleColor = colorMap[annotation.color || "amber"];

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300 group"
      style={{ left: `${annotation.x}%`, top: `${annotation.y}%` }}
    >
      {/* Target Ring Pulse */}
      <div className="relative flex items-center justify-center">
        <span className="absolute w-6 h-6 rounded-full border border-amber animate-ping opacity-75" />
        <span className="w-3 h-3 rounded-full bg-amber shadow-[0_0_8px_#D6A84F]" />
      </div>

      {/* Callout Card */}
      <div
        className={`mt-2 p-2 rounded-lg border backdrop-blur-md text-xs font-mono whitespace-nowrap ${styleColor}`}
      >
        <div className="font-semibold text-[11px]">{annotation.label}</div>
        {annotation.detail && (
          <div className="text-[10px] opacity-80 mt-0.5">
            {annotation.detail}
          </div>
        )}
      </div>
    </div>
  );
}

// Canvas Renderer Function for 20 comparisons
function renderCanvasState(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  comparison: ComparisonData,
  state: "BEFORE" | "AFTER",
  progress: number
) {
  // Clear canvas with dark navy background
  ctx.fillStyle = "#050B11";
  ctx.fillRect(0, 0, width, height);

  // Draw oceanic gridlines
  ctx.strokeStyle = "rgba(35, 80, 106, 0.2)";
  ctx.lineWidth = 1;
  const gridSize = 40;
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Draw Coastline silhouette on right side
  ctx.fillStyle = "#091c28";
  ctx.strokeStyle = "#1b3a4b";
  ctx.beginPath();
  ctx.moveTo(width * 0.85, 0);
  ctx.quadraticCurveTo(width * 0.8, height * 0.4, width * 0.88, height * 0.7);
  ctx.lineTo(width * 0.82, height);
  ctx.lineTo(width, height);
  ctx.lineTo(width, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Render specific stage visualization based on renderType
  const centerX = width * 0.45;
  const centerY = height * 0.5;

  if (state === "BEFORE") {
    // Render Raw Inputs
    if (comparison.renderType === "speckle" || comparison.renderType === "sar_seg") {
      // Draw Speckle Noise SAR
      for (let i = 0; i < 3000; i++) {
        const nx = Math.random() * width * 0.8;
        const ny = Math.random() * height;
        const val = Math.random() * 80;
        ctx.fillStyle = `rgba(${val + 40}, ${val + 60}, ${val + 80}, ${Math.random() * 0.6})`;
        ctx.fillRect(nx, ny, 2, 2);
      }
    } else if (comparison.renderType === "rgb_sar") {
      // Draw Cloud Overcast
      ctx.fillStyle = "rgba(180, 200, 220, 0.75)";
      ctx.beginPath();
      ctx.arc(centerX - 40, centerY - 20, 160, 0, Math.PI * 2);
      ctx.arc(centerX + 80, centerY + 30, 180, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw vessel blips
    ctx.fillStyle = "#38BDF8";
    ctx.beginPath();
    ctx.arc(centerX - 100, centerY + 80, 5, 0, Math.PI * 2);
    ctx.fill();

    // Dark oil slick patch outline in raw SAR
    ctx.fillStyle = "rgba(2, 8, 14, 0.85)";
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, 110, 60, Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Render AFTER (AI Processed state)
    if (
      comparison.renderType === "sar_seg" ||
      comparison.renderType === "sheen" ||
      comparison.renderType === "final_dossier"
    ) {
      // Glowing Amber Oil Spill Polygon
      ctx.fillStyle = "rgba(214, 168, 79, 0.4)";
      ctx.strokeStyle = "#D6A84F";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, 120, 65, Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Core Hotspot
      ctx.fillStyle = "rgba(239, 68, 68, 0.6)";
      ctx.beginPath();
      ctx.ellipse(centerX - 10, centerY, 45, 25, Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (comparison.renderType === "speckle") {
      // Clean Denoised SAR
      ctx.fillStyle = "rgba(7, 26, 38, 0.9)";
      ctx.fillRect(0, 0, width * 0.8, height);

      // Sharp Slick Boundary
      ctx.strokeStyle = "#22D3A7";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, 110, 60, Math.PI / 6, 0, Math.PI * 2);
      ctx.stroke();
    } else if (comparison.renderType === "heatmap") {
      // Heatmap gradient
      const grad = ctx.createRadialGradient(
        centerX,
        centerY,
        10,
        centerX,
        centerY,
        140
      );
      grad.addColorStop(0, "rgba(239, 68, 68, 0.8)");
      grad.addColorStop(0.3, "rgba(245, 158, 11, 0.7)");
      grad.addColorStop(0.6, "rgba(34, 211, 167, 0.5)");
      grad.addColorStop(1, "rgba(56, 189, 248, 0)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 140, 0, Math.PI * 2);
      ctx.fill();
    } else if (
      comparison.renderType === "rk4" ||
      comparison.renderType === "current_drift"
    ) {
      // RK4 Particle Stream Animation
      ctx.strokeStyle = "#38BDF8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.bezierCurveTo(
        centerX - 80,
        centerY + 40,
        centerX - 140,
        centerY + 100,
        centerX - 200,
        centerY + 120
      );
      ctx.stroke();

      // Origin Target Ring
      const ox = centerX - 200;
      const oy = centerY + 120;
      ctx.strokeStyle = "#22D3A7";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ox, oy, 15 + Math.sin(progress * Math.PI * 4) * 5, 0, Math.PI * 2);
      ctx.stroke();
    } else if (comparison.renderType === "ais_ranking") {
      // Highlighted Target Vessel #1
      ctx.strokeStyle = "#D6A84F";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX - 100, centerY + 80, 20, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "#D6A84F";
      ctx.font = "11px JetBrains Mono";
      ctx.fillText(
        "#1 MV OCEAN CROWN (94.8%)",
        centerX - 180,
        centerY + 115
      );
    } else {
      // Default Processed Output
      ctx.fillStyle = "rgba(56, 189, 248, 0.2)";
      ctx.strokeStyle = "#38BDF8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, 110, 60, Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
}
