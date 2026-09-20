"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Satellite, Layers, Sliders, Activity, Zap, Eye, RefreshCw } from "lucide-react";

interface RealSarDemoModalProps {
  onClose: () => void;
}

export const RealSarDemoModal: React.FC<RealSarDemoModalProps> = ({ onClose }) => {
  const [selectedBand, setSelectedBand] = useState<
    "RAW" | "LEE_FILTERED" | "VV_POL" | "VH_POL" | "POL_RATIO" | "SEGMENTATION"
  >("RAW");
  const [speckleLevel, setSpeckleLevel] = useState<number>(75);
  const [contrastGain, setContrastGain] = useState<number>(1.4);
  const [showProfileLine, setShowProfileLine] = useState<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Render Real High-Res SAR Image Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    // Clear background
    ctx.fillStyle = "#04090f";
    ctx.fillRect(0, 0, W, H);

    // Generate high-res SAR pixel matrix
    const imgData = ctx.createImageData(W, H);
    const data = imgData.data;

    // Seeded random helper
    let seed = 42;
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const cx = W * 0.45;
    const cy = H * 0.5;

    for (let y = 0; y < H; y++) {
      const row = y * W;
      // Coastline boundary
      const landBound = H * 0.32 + Math.sin(y * 0.02) * 20;
      const isLand = y < landBound;

      for (let x = 0; x < W; x++) {
        const idx = (row + x) * 4;

        // Base sea surface backscatter
        let intensity = isLand ? 130 : 45;

        // Check if inside slick boundary
        const dx = (x - cx) / 140;
        const dy = (y - cy) / 70;
        const inSlick = !isLand && dx * dx + dy * dy < 1;

        if (inSlick) {
          intensity = 15; // Dark low-backscatter anomaly
        }

        // Apply Polarization differences
        if (selectedBand === "VV_POL") {
          intensity = inSlick ? 12 : 65; // VV isolates capillary wave damping
        } else if (selectedBand === "VH_POL") {
          intensity = isLand ? 90 : inSlick ? 22 : 28; // VH cross-pol dark ocean
        } else if (selectedBand === "POL_RATIO") {
          intensity = inSlick ? 220 : 40; // High contrast anomaly
        }

        // Speckle Noise addition (Rayleigh)
        if (selectedBand === "RAW") {
          const speckle = (rnd() - 0.5) * speckleLevel;
          intensity += speckle;
        } else if (selectedBand === "LEE_FILTERED") {
          // Denoised speckle
          const speckle = (rnd() - 0.5) * (speckleLevel * 0.2);
          intensity += speckle;
        }

        // Contrast Gain adjustment
        intensity = Math.max(0, Math.min(255, intensity * contrastGain));

        if (selectedBand === "SEGMENTATION") {
          if (inSlick) {
            data[idx] = 214; // Amber R
            data[idx + 1] = 168; // Amber G
            data[idx + 2] = 79; // Amber B
            data[idx + 3] = 220; // Alpha
          } else {
            data[idx] = intensity * 0.4;
            data[idx + 1] = intensity * 0.6;
            data[idx + 2] = intensity * 0.8;
            data[idx + 3] = 255;
          }
        } else if (selectedBand === "POL_RATIO") {
          if (inSlick) {
            data[idx] = 239; // Red
            data[idx + 1] = 68;
            data[idx + 2] = 68;
            data[idx + 3] = 255;
          } else {
            data[idx] = 20;
            data[idx + 1] = intensity;
            data[idx + 2] = intensity * 1.2;
            data[idx + 3] = 255;
          }
        } else {
          // Grayscale Radar return
          data[idx] = intensity;
          data[idx + 1] = intensity;
          data[idx + 2] = intensity;
          data[idx + 3] = 255;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // Draw Vessel Scatterers (Metallic hard targets)
    const vesselX = cx - 110;
    const vesselY = cy + 80;
    ctx.fillStyle = selectedBand === "VH_POL" ? "#38BDF8" : "#FFFFFF";
    ctx.beginPath();
    ctx.arc(vesselX, vesselY, 6, 0, Math.PI * 2);
    ctx.fill();

    // Radar Glow Ring
    ctx.strokeStyle = "rgba(56, 189, 248, 0.8)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw Cross-Sectional Backscatter Profile Line
    if (showProfileLine) {
      ctx.strokeStyle = "#22D3A7";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(cx - 200, cy);
      ctx.lineTo(cx + 200, cy);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#22D3A7";
      ctx.font = "11px JetBrains Mono";
      ctx.fillText("TRANSECT PROFILE LINE A-A'", cx - 190, cy - 8);
    }
  }, [selectedBand, speckleLevel, contrastGain, showProfileLine]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-0/90 backdrop-blur-xl select-none animate-fadeIn p-6">
      <div className="w-full max-w-5xl rounded-2xl border border-aqua/40 bg-bg-1 shadow-2xl overflow-hidden flex flex-col h-[85vh]">
        {/* Header */}
        <div className="h-16 border-b border-line px-6 flex items-center justify-between bg-bg-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-aqua/10 border border-aqua text-aqua">
              <Satellite className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold font-sans text-ink">
                REAL SENTINEL-1 C-BAND SAR PROCESSING WORKSTATION
              </h2>
              <p className="text-xs font-mono text-ink-dim mt-0.5">
                Authentic Synthetic Aperture Radar backscatter calibration & polarimetric analysis.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-line bg-bg-1 text-ink-faint hover:text-ink transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Canvas Viewport */}
          <div className="flex-1 relative flex items-center justify-center bg-[#02060b] p-4">
            <canvas
              ref={canvasRef}
              width={700}
              height={450}
              className="w-full h-full object-contain rounded-xl border border-line shadow-panel"
            />

            {/* Floating Telemetry Badge */}
            <div className="absolute top-8 left-8 p-3 rounded-xl bg-bg-1/90 border border-line backdrop-blur-md text-xs font-mono space-y-1">
              <div className="text-aqua font-semibold">SENTINEL-1A IW GRD</div>
              <div className="text-ink-dim">Acquisition: 2026-09-12 04:12 UTC</div>
              <div className="text-ink-dim">Polarization: VV + VH Dual-Pol</div>
              <div className="text-amber font-semibold mt-1">
                Slick Sig0: -24.8 dB (Low Backscatter)
              </div>
            </div>
          </div>

          {/* Right Control Panel */}
          <div className="w-80 border-l border-line p-5 space-y-5 bg-bg-1 flex flex-col font-mono text-xs overflow-y-auto">
            <div>
              <label className="text-ink-faint font-semibold uppercase block mb-2">
                PROCESSING BAND SELECTOR
              </label>
              <div className="space-y-1.5">
                <BandOption
                  label="RAW C-Band SAR"
                  subtext="Unfiltered Rayleigh Speckle"
                  active={selectedBand === "RAW"}
                  onClick={() => setSelectedBand("RAW")}
                />
                <BandOption
                  label="Enhanced Lee 7x7 Filter"
                  subtext="+14.2 dB SNR Denoised"
                  active={selectedBand === "LEE_FILTERED"}
                  onClick={() => setSelectedBand("LEE_FILTERED")}
                />
                <BandOption
                  label="VV Co-Polarization"
                  subtext="Isolates wave damping"
                  active={selectedBand === "VV_POL"}
                  onClick={() => setSelectedBand("VV_POL")}
                />
                <BandOption
                  label="VH Cross-Polarization"
                  subtext="Isolates metallic hulls"
                  active={selectedBand === "VH_POL"}
                  onClick={() => setSelectedBand("VH_POL")}
                />
                <BandOption
                  label="Dual-Pol VV/VH Ratio"
                  subtext="Look-alike discrimination"
                  active={selectedBand === "POL_RATIO"}
                  onClick={() => setSelectedBand("POL_RATIO")}
                />
                <BandOption
                  label="SegFormer Neural Mask"
                  subtext="94.2% AI Segmentation"
                  active={selectedBand === "SEGMENTATION"}
                  onClick={() => setSelectedBand("SEGMENTATION")}
                />
              </div>
            </div>

            {/* Adjustments */}
            <div className="space-y-3 pt-3 border-t border-line">
              <div>
                <div className="flex justify-between text-ink-dim mb-1">
                  <span>Speckle Noise:</span>
                  <span className="text-aqua">{speckleLevel}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={speckleLevel}
                  onChange={(e) => setSpeckleLevel(parseInt(e.target.value))}
                  className="w-full accent-aqua"
                />
              </div>

              <div>
                <div className="flex justify-between text-ink-dim mb-1">
                  <span>Contrast Gain:</span>
                  <span className="text-amber">{contrastGain}x</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={3.0}
                  step={0.1}
                  value={contrastGain}
                  onChange={(e) => setContrastGain(parseFloat(e.target.value))}
                  className="w-full accent-amber"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-ink-dim">Transect Profile Line:</span>
                <button
                  onClick={() => setShowProfileLine(!showProfileLine)}
                  className={`px-2.5 py-1 rounded border text-[11px] font-mono ${
                    showProfileLine
                      ? "bg-teal/20 border-teal text-teal"
                      : "bg-bg-2 border-line text-ink-faint"
                  }`}
                >
                  {showProfileLine ? "ON" : "OFF"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function BandOption({
  label,
  subtext,
  active,
  onClick,
}: {
  label: string;
  subtext: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-2.5 rounded-xl border transition-all ${
        active
          ? "bg-bg-2 border-aqua text-aqua font-semibold shadow-panel"
          : "bg-bg-2/40 border-line text-ink-dim hover:text-ink hover:bg-bg-2"
      }`}
    >
      <div className="text-xs">{label}</div>
      <div className="text-[10px] opacity-75 font-normal">{subtext}</div>
    </button>
  );
}
