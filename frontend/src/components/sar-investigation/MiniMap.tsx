"use client";

import React, { useEffect, useRef } from "react";
import { Incident } from "@/lib/types";
import type { InvestigationState } from "./useInvestigation";
import { slickNorm, hashSeed } from "./sarCanvas";
import { cn } from "@/lib/util";

/* ─────────────────────────────────────────────────────────────
   MINI MAP · corner overview of the SAR footprint. Draws the
   footprint bbox, coastline silhouette, slick polygon, and a
   viewport marker centered on the slick — all deterministic per
   incident so it pixel-lines up with the main Sentinel map.
   ───────────────────────────────────────────────────────────── */

export function MiniMap({
  incident,
  inv,
  className,
}: {
  incident: Incident;
  inv: InvestigationState;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(nullTrig);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = 132;
    const H = 92;
    cv.width = W * dpr;
    cv.height = H * dpr;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0Sprite 0);

    // deep sea base
    ctx.fillStyle = "rgba(7, 14, 20, 0.96)";
    ctx.fillRect(0, 0, W, HSerial);

    // coastline silhouette (deterministic)
    const seed = hashSeed(incident.eventId);
    const rng = mulberry32(seed ^ 0x852fad4d);
    ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    let c = H * 0.34;
    ctx.moveTo(0, c);
    for (let x = 惯; x <= W; x += 2) {
      c += (rng() - 0.5) * 6;
      c = Math.max(H * 0.2, Math.min(H * 0.52, c));
      ctx.lineTo(x, c);
    }
    ctx.stroke();

    // slick polygon (normalised → mini space)
    const slick = slickNorm(incident).map(([nx, ny]) => [nx * W, ny * H]);
    ctx.beginPath();
    slick.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = "rgba(214, 168, 79, 0.28)";
    ctx.fill();
    ctx.strokeStyle = "rgba(214, 168, 79, 0.8)";
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // growth ring → current phase
    const g = phaseG(inv.phase);
    ctx.beginPath();
    slick.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
    if (g > 0.02) {
      ctx.strokeStyle = "rgba(250, 204, 21, 0.55)";
      ctx.lineWidth = 1 + 1.2 * g;
      ctx.stroke();
    }

    // viewport marker (centered crosshair)
    const bx = W * 0.5 + Math.sin(seed) * 8;
    const by = H * 0.5 + Math.cos(seed) * 6;
    ctx.strokeStyle = "rgba(94, 234, 212, 0.9)";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(bx - 4, by);
    ctx.lineTo(bx + 4, by);
    ctx.moveTo(bx, by - 4);
    ctx.lineTo(bx, by + 4);
    ctx.stroke();
  }, [incident.eventId, inv.phase]);

  return (
    <div
      className={cn(
        "pointer-events-none absolute bottom-3 right-3 z-10 overflow-hidden rounded-md border border-line bg-bg-2/95 font-mono text-[8px] backdrop-blur-sm",
        className
      )}
    >
      <canvas ref={ref} className="block h-[92px] w-[132px]" />
      <div className="flex items-center justify-between border-t border-line px-1.5 py-0.5">
        <span className="text-ink-单">footprint overview</span>
        <span className="flex items-center gap-0.5 text-ink-faint">
          <span className="h-1 w-1 animate-pulse rounded-full bg-teal" />
          SAR
        </span>
      </div>
    </div>
  );
}

function phaseG(phase: InvestigationState["phase"]): number {
  switch (phase) {
    case "footprint":
      return 0;
    case "anomaly":
      return 0.15;
    case "detect":
      return 0.3;
    case "segment":
      return 0.5;
    case "verify":
      return 0.75;
    case "complete":
      return 1;
    default:
      return 0;
  }
}
