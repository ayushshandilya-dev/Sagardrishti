import React from "react";
import { Incident, CandidateVessel } from "@/lib/types";
import { InfrastructureNode } from "./infrastructure";

/* ─────────────────────────────────────────────────────────────
   FLOATING INTELLIGENCE HUDS WITH DYNAMIC LEADER LINES
   Renders glass tactical panels anchored to geographic features
   with automatic collision avoidance and SVG elbow leader lines.
   ───────────────────────────────────────────────────────────── */

export interface HudAnchorPoint {
  x: number;
  y: number;
}

export interface HudPlacement {
  anchor: HudAnchorPoint;
  boxX: number;
  boxY: number;
  width: number;
  height: number;
  elbowX: number;
  elbowY: number;
  side: "top-right" | "top-left" | "bottom-right" | "bottom-left";
}

/**
 * Calculates optimal non-overlapping HUD screen position and leader line coordinates.
 */
export function calculateHudPlacement(
  anchor: HudAnchorPoint,
  width: number,
  height: number,
  containerWidth: number,
  containerHeight: number,
  preferredSide: "top-right" | "top-left" | "bottom-right" | "bottom-left" = "top-right",
  offsetDistance = 65
): HudPlacement {
  let side = preferredSide;

  // Boundary checks with fallback sides
  if (side === "top-right" && (anchor.x + offsetDistance + width > containerWidth - 20)) {
    side = "top-left";
  }
  if (side === "top-left" && (anchor.x - offsetDistance - width < 20)) {
    side = "bottom-right";
  }
  if (side === "bottom-right" && (anchor.y + offsetDistance + height > containerHeight - 40)) {
    side = "top-right";
  }

  let boxX = 0;
  let boxY = 0;
  let elbowX = 0;
  let elbowY = 0;

  switch (side) {
    case "top-right":
      boxX = anchor.x + offsetDistance;
      boxY = anchor.y - height - 15;
      elbowX = anchor.x + offsetDistance * 0.45;
      elbowY = boxY + height * 0.5;
      break;
    case "top-left":
      boxX = anchor.x - offsetDistance - width;
      boxY = anchor.y - height - 15;
      elbowX = anchor.x - offsetDistance * 0.45;
      elbowY = boxY + height * 0.5;
      break;
    case "bottom-right":
      boxX = anchor.x + offsetDistance;
      boxY = anchor.y + 25;
      elbowX = anchor.x + offsetDistance * 0.45;
      elbowY = boxY + height * 0.5;
      break;
    case "bottom-left":
      boxX = anchor.x - offsetDistance - width;
      boxY = anchor.y + 25;
      elbowX = anchor.x - offsetDistance * 0.45;
      elbowY = boxY + height * 0.5;
      break;
  }

  // Clamping to visible viewport
  boxX = Math.max(16, Math.min(containerWidth - width - 16, boxX));
  boxY = Math.max(16, Math.min(containerHeight - height - 16, boxY));

  return {
    anchor,
    boxX,
    boxY,
    width,
    height,
    elbowX,
    elbowY,
    side,
  };
}

/**
 * Dynamic SVG Leader Line connecting a geographical point to a floating HUD
 */
export const HudLeaderLine: React.FC<{
  placement: HudPlacement;
  color?: string;
}> = ({ placement, color = "#38BDF8" }) => {
  const { anchor, boxX, boxY, width, height, elbowX, elbowY, side } = placement;

  const targetX = side.includes("right") ? boxX : boxX + width;
  const targetY = boxY + height * 0.5;

  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible z-10">
      {/* Anchor point pulsing pip */}
      <circle cx={anchor.x} cy={anchor.y} r={2.5} fill={color} />
      <circle
        cx={anchor.x}
        cy={anchor.y}
        r={5.5}
        fill="none"
        stroke={color}
        strokeWidth={0.8}
        opacity={0.6}
        className="animate-ping"
      />

      {/* Elbow connection path */}
      <path
        d={`M ${anchor.x} ${anchor.y} L ${elbowX} ${elbowY} L ${targetX} ${targetY}`}
        fill="none"
        stroke={color}
        strokeWidth={1}
        strokeDasharray="3 2"
        opacity={0.7}
      />

      {/* Terminal anchor dot */}
      <circle cx={targetX} cy={targetY} r={1.5} fill={color} />
    </svg>
  );
};

/* Floating Glass HUD wrapper */
export const FloatingGlassHud: React.FC<{
  placement: HudPlacement;
  title: string;
  badge?: string;
  badgeTone?: "crit" | "ok" | "warn" | "info";
  color?: string;
  onClose?: () => void;
  children: React.ReactNode;
}> = ({
  placement,
  title,
  badge,
  badgeTone = "info",
  color = "#38BDF8",
  onClose,
  children,
}) => {
  const toneColor =
    badgeTone === "crit"
      ? "#EF4444"
      : badgeTone === "warn"
        ? "#F59E0B"
        : badgeTone === "ok"
          ? "#22D3A7"
          : "#38BDF8";

  return (
    <div
      className="pointer-events-auto absolute z-20 rounded-xl border border-line bg-bg-1/90 p-3 font-mono text-[10px] text-ink shadow-float backdrop-blur-md transition-all duration-300 select-none"
      style={{
        left: placement.boxX,
        top: placement.boxY,
        width: placement.width,
        borderColor: `${color}40`,
      }}
    >
      <div className="flex items-center justify-between border-b border-line pb-1.5 mb-2">
        <div className="flex items-center gap-1.5 font-bold tracking-wider" style={{ color }}>
          <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: color }} />
          {title}
        </div>
        {badge && (
          <span
            className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase"
            style={{
              backgroundColor: `${toneColor}20`,
              color: toneColor,
              border: `1px solid ${toneColor}40`,
            }}
          >
            {badge}
          </span>
        )}
      </div>

      <div className="space-y-1 text-ink-dim">{children}</div>
    </div>
  );
};

/* Incident Geometry Tactical HUD */
export const IncidentIntelligenceHud: React.FC<{
  incident: Incident;
  placement: HudPlacement;
  contaminationMode: string;
}> = ({ incident, placement, contaminationMode }) => {
  const g = incident.spillGeometry;
  const m = incident.sarMetadata;
  const c = incident.classification;

  return (
    <>
      <HudLeaderLine placement={placement} color="#F59E0B" />
      <FloatingGlassHud
        placement={placement}
        title={`INCIDENT · ${incident.eventId}`}
        badge={incident.severity}
        badgeTone="crit"
        color="#F59E0B"
      >
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          <div className="flex justify-between">
            <span className="text-ink-faint">AREA</span>
            <span className="font-semibold text-ink">{g.areaKm2.toFixed(1)} km²</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-faint">PERIMETER</span>
            <span className="font-semibold text-ink">{g.perimeterKm.toFixed(1)} km</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-faint">MAJOR AXIS</span>
            <span className="font-semibold text-ink">{g.lengthKm.toFixed(1)} km</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-faint">MINOR AXIS</span>
            <span className="font-semibold text-ink">{g.widthKm.toFixed(1)} km</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-faint">AZIMUTH</span>
            <span className="font-semibold text-ink">{g.skeletonOrientationDeg}°</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-faint">CONFIDENCE</span>
            <span className="font-semibold text-amber">{(c.confidence * 100).toFixed(1)}%</span>
          </div>
        </div>
        <div className="mt-2 border-t border-line pt-1 text-[9px] text-ink-faint flex justify-between items-center">
          <span>MODE: <span className="font-semibold text-amber uppercase">{contaminationMode}</span></span>
          <span>POL: {m.polarization.join("+")}</span>
        </div>
      </FloatingGlassHud>
    </>
  );
};

/* Suspect Vessel Tactical HUD */
export const VesselInvestigationHud: React.FC<{
  vessel: CandidateVessel;
  placement: HudPlacement;
}> = ({ vessel, placement }) => {
  const isSuspect = vessel.attributionRank === 1;
  const color = isSuspect ? "#EF4444" : "#38BDF8";

  return (
    <>
      <HudLeaderLine placement={placement} color={color} />
      <FloatingGlassHud
        placement={placement}
        title={vessel.vesselName}
        badge={isSuspect ? `RANK #${vessel.attributionRank} SUSPECT` : `RANK #${vessel.attributionRank}`}
        badgeTone={isSuspect ? "crit" : "info"}
        color={color}
      >
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-ink-faint">IMO / MMSI</span>
            <span className="font-semibold text-ink">{vessel.imo} · {vessel.mmsi}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-faint">TYPE</span>
            <span className="font-semibold text-ink">{vessel.vesselType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-faint">SPEED / HEADING</span>
            <span className="font-semibold text-ink">{vessel.speedOverGround.toFixed(1)} kn · {vessel.heading}°</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-faint">ATTRIBUTION SCORE</span>
            <span className="font-semibold text-red">{(vessel.attributionScore * 100).toFixed(1)}%</span>
          </div>
          {vessel.aisAnomaly && (
            <div className="rounded bg-red/15 px-1.5 py-0.5 text-[9px] text-red font-semibold border border-red/30">
              ⚠ {vessel.aisAnomaly}
            </div>
          )}
        </div>
      </FloatingGlassHud>
    </>
  );
};

/* Port Infrastructure HUD */
export const PortInfrastructureHud: React.FC<{
  node: InfrastructureNode;
  placement: HudPlacement;
}> = ({ node, placement }) => {
  return (
    <>
      <HudLeaderLine placement={placement} color="#22D3A7" />
      <FloatingGlassHud
        placement={placement}
        title={node.name}
        badge={node.status}
        badgeTone="ok"
        color="#22D3A7"
      >
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-ink-faint">CATEGORY</span>
            <span className="font-semibold text-ink">{node.category}</span>
          </div>
          {node.metadata.operator && (
            <div className="flex justify-between">
              <span className="text-ink-faint">OPERATOR</span>
              <span className="font-semibold text-ink truncate max-w-[120px]">{node.metadata.operator}</span>
            </div>
          )}
          {node.metadata.dailyThroughput && (
            <div className="flex justify-between">
              <span className="text-ink-faint">THROUGHPUT</span>
              <span className="font-semibold text-ink">{node.metadata.dailyThroughput}</span>
            </div>
          )}
          {node.metadata.vesselsPresent !== undefined && (
            <div className="flex justify-between">
              <span className="text-ink-faint">SHIPS IN HARBOUR</span>
              <span className="font-semibold text-teal">{node.metadata.vesselsPresent} vessels</span>
            </div>
          )}
        </div>
      </FloatingGlassHud>
    </>
  );
};
