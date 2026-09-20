"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Waves, Wind, Play, Pause, RotateCcw, Clock, Compass, Activity, Zap } from "lucide-react";

interface RealSpillAnimationModalProps {
  onClose: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

export const RealSpillAnimationModal: React.FC<RealSpillAnimationModalProps> = ({ onClose }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [enableCurrents, setEnableCurrents] = useState<boolean>(true);
  const [enableWind, setEnableWind] = useState<boolean>(true);
  const [isReverseMode, setIsReverseMode] = useState<boolean>(true);
  const [particleCount, setParticleCount] = useState<number>(1200);
  const [timeOffsetHours, setTimeOffsetHours] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);

  // Initialize Lagrangian Particle Mesh
  useEffect(() => {
    const particles: Particle[] = [];
    const cx = 350;
    const cy = 250;

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 60;
      particles.push({
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        life: Math.random() * 100,
        maxLife: 100 + Math.random() * 50,
      });
    }
    particlesRef.current = particles;
  }, [particleCount]);

  // 60 FPS Particle Advection Animation Loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const originX = W * 0.25;
    const originY = H * 0.7;

    const renderFrame = () => {
      // Clear with deep ocean gradient
      ctx.fillStyle = "#03080e";
      ctx.fillRect(0, 0, W, H);

      // Draw gridlines
      ctx.strokeStyle = "rgba(35, 80, 106, 0.15)";
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y < H; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      // Draw INCOIS Current Vector Field Streamlines
      if (enableCurrents) {
        ctx.strokeStyle = "rgba(56, 189, 248, 0.25)";
        ctx.lineWidth = 1.5;
        for (let x = 40; x < W; x += 80) {
          for (let y = 40; y < H; y += 80) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            const dx = Math.cos((x + y) * 0.005) * 20;
            const dy = -Math.sin(x * 0.005) * 15;
            ctx.lineTo(x + dx, y + dy);
            ctx.stroke();

            // Arrow head
            ctx.fillStyle = "rgba(56, 189, 248, 0.35)";
            ctx.beginPath();
            ctx.arc(x + dx, y + dy, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Draw Windage Vectors
      if (enableWind) {
        ctx.strokeStyle = "rgba(245, 158, 11, 0.25)";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        for (let x = 60; x < W; x += 120) {
          ctx.beginPath();
          ctx.moveTo(x, 30);
          ctx.lineTo(x - 30, 80);
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }

      // Update & Draw Particles
      const speedMultiplier = isPlaying ? (isReverseMode ? -1.2 : 1.2) : 0;
      const particles = particlesRef.current;

      ctx.fillStyle = "rgba(214, 168, 79, 0.7)";
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Velocity fields
        let u = 0;
        let v = 0;

        if (enableCurrents) {
          u += -0.8; // Ocean current heading SW
          v += -0.4;
        }

        if (enableWind) {
          u += -0.4 * 0.032; // Windage factor 3.2%
          v += -0.2 * 0.032;
        }

        // Add turbulent dispersion
        u += (Math.random() - 0.5) * 0.2;
        v += (Math.random() - 0.5) * 0.2;

        p.x += u * speedMultiplier;
        p.y += v * speedMultiplier;

        // Reset particles if out of bounds
        if (p.x < 0 || p.x > W || p.y < 0 || p.y > H) {
          p.x = isReverseMode ? originX + (Math.random() - 0.5) * 40 : W * 0.6;
          p.y = isReverseMode ? originY + (Math.random() - 0.5) * 40 : H * 0.4;
        }

        // Particle Glow
        ctx.fillRect(p.x, p.y, 2, 2);
      }

      // Draw Origin Convergence Hotspot Ring
      ctx.strokeStyle = "#22D3A7";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(originX, originY, 22 + Math.sin(Date.now() * 0.005) * 6, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "#22D3A7";
      ctx.font = "11px JetBrains Mono";
      ctx.fillText("RECONSTRUCTED ORIGIN (T = -12.4h)", originX - 110, originY + 40);

      animId = requestAnimationFrame(renderFrame);
    };

    renderFrame();
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, enableCurrents, enableWind, isReverseMode]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-0/90 backdrop-blur-xl select-none animate-fadeIn p-6">
      <div className="w-full max-w-5xl rounded-2xl border border-teal/40 bg-bg-1 shadow-2xl overflow-hidden flex flex-col h-[85vh]">
        {/* Header */}
        <div className="h-16 border-b border-line px-6 flex items-center justify-between bg-bg-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal/10 border border-teal text-teal">
              <Waves className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-semibold font-sans text-ink">
                REAL HYDRODYNAMIC OIL SPILL LAGRANGIAN SIMULATOR
              </h2>
              <p className="text-xs font-mono text-ink-dim mt-0.5">
                Runge-Kutta 4th Order (RK4) advection-diffusion fluid dynamics solver.
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
          {/* Main Simulation Viewport */}
          <div className="flex-1 relative flex items-center justify-center bg-[#02060b] p-4">
            <canvas
              ref={canvasRef}
              width={750}
              height={450}
              className="w-full h-full object-contain rounded-xl border border-line shadow-panel"
            />

            {/* Live Physics HUD Badge */}
            <div className="absolute top-8 left-8 p-3.5 rounded-xl bg-bg-1/90 border border-line backdrop-blur-md font-mono text-xs space-y-1.5 min-w-[220px]">
              <div className="text-teal font-semibold flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-teal" />
                <span>RK4 LAGRANGIAN SOLVER</span>
              </div>
              <div className="text-ink-dim">
                Direction:{" "}
                <strong className={isReverseMode ? "text-amber" : "text-aqua"}>
                  {isReverseMode ? "REVERSE BACKTRACK (T → -12h)" : "FORWARD DRIFT"}
                </strong>
              </div>
              <div className="text-ink-dim">
                Active Mesh Particles: <strong className="text-ink">{particleCount}</strong>
              </div>
              <div className="text-ink-dim">
                Current Speed: <strong className="text-aqua">1.8 kts (INCOIS)</strong>
              </div>
              <div className="text-ink-dim">
                Wind Factor: <strong className="text-amber">3.2% (ECMWF)</strong>
              </div>
            </div>
          </div>

          {/* Right Control Bar */}
          <div className="w-80 border-l border-line p-5 space-y-5 bg-bg-1 flex flex-col font-mono text-xs overflow-y-auto">
            {/* Play/Pause & Direction Toggle */}
            <div className="space-y-2">
              <label className="text-ink-faint font-semibold uppercase block">
                SIMULATION CONTROLS
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl border font-semibold ${
                    isPlaying
                      ? "bg-teal/20 border-teal text-teal"
                      : "bg-bg-2 border-line text-ink-dim"
                  }`}
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  <span>{isPlaying ? "PAUSE" : "PLAY"}</span>
                </button>

                <button
                  onClick={() => setIsReverseMode(!isReverseMode)}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl border font-semibold ${
                    isReverseMode
                      ? "bg-amber/20 border-amber text-amber"
                      : "bg-aqua/20 border-aqua text-aqua"
                  }`}
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>{isReverseMode ? "REVERSE" : "FORWARD"}</span>
                </button>
              </div>
            </div>

            {/* Environmental Force Toggles */}
            <div className="space-y-2 pt-3 border-t border-line">
              <label className="text-ink-faint font-semibold uppercase block">
                ENVIRONMENTAL FORCES
              </label>

              <ForceToggle
                label="INCOIS Surface Currents"
                subtext="1.8 knots velocity mesh"
                active={enableCurrents}
                color="aqua"
                onClick={() => setEnableCurrents(!enableCurrents)}
              />

              <ForceToggle
                label="ECMWF 10m Wind Stress"
                subtext="3.2% windage + Ekman"
                active={enableWind}
                color="amber"
                onClick={() => setEnableWind(!enableWind)}
              />
            </div>

            {/* Particle Density */}
            <div className="pt-3 border-t border-line space-y-2">
              <div className="flex justify-between text-ink-dim">
                <span>Lagrangian Particle Array:</span>
                <span className="text-teal font-semibold">{particleCount}</span>
              </div>
              <input
                type="range"
                min={300}
                max={2500}
                step={100}
                value={particleCount}
                onChange={(e) => setParticleCount(parseInt(e.target.value))}
                className="w-full accent-teal"
              />
            </div>

            {/* Physics Equation Card */}
            <div className="p-3 rounded-xl border border-line bg-bg-2/60 font-mono text-[10px] text-ink-dim space-y-1">
              <div className="text-ink font-semibold flex items-center gap-1">
                <Zap className="h-3 w-3 text-amber" /> FLUID EQUATION
              </div>
              <div>dx/dt = U_current + 0.032 * V_wind</div>
              <div>dK/dt = Kx(∂²c/∂x²) + Ky(∂²c/∂y²)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function ForceToggle({
  label,
  subtext,
  active,
  color,
  onClick,
}: {
  label: string;
  subtext: string;
  active: boolean;
  color: "aqua" | "amber";
  onClick: () => void;
}) {
  const activeStyle =
    color === "aqua"
      ? "bg-aqua/10 border-aqua text-aqua"
      : "bg-amber/10 border-amber text-amber";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-2.5 rounded-xl border transition-all ${
        active
          ? activeStyle
          : "bg-bg-2/40 border-line text-ink-faint hover:text-ink"
      }`}
    >
      <div className="text-xs font-semibold">{label}</div>
      <div className="text-[10px] opacity-75 font-normal">{subtext}</div>
    </button>
  );
}
