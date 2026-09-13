import * as maplibregl from "maplibre-gl";
import { LonLat } from "./gl";

/* ─────────────────────────────────────────────────────────────
   CINEMATIC CAMERA CHOREOGRAPHY ENGINE
   Provides smooth, non-jarring camera transitions (fly-to, tilt,
   orbit, and demo-stage tracking) across operational phases.
   ───────────────────────────────────────────────────────────── */

export interface CameraPose {
  center: LonLat;
  zoom: number;
  pitch?: number;
  bearing?: number;
  duration?: number;
  curve?: number;
}

export const THEATRE_OVERVIEW: CameraPose = {
  center: [69.2, 22.0],
  zoom: 7.6,
  pitch: 10,
  bearing: 0,
  duration: 1400,
  curve: 1.4,
};

export const DEMO_STAGE_POSES: Record<number, CameraPose> = {
  // Stage 1: Satellite Enters (Wide orbital swath overview)
  1: {
    center: [69.35, 22.2],
    zoom: 7.8,
    pitch: 12,
    bearing: -8,
    duration: 1600,
    curve: 1.2,
  },
  // Stage 2: Radar Beam Scans (Sentinel-1 sweep across Gulf of Kutch)
  2: {
    center: [69.18, 22.0],
    zoom: 8.2,
    pitch: 18,
    bearing: 5,
    duration: 1500,
    curve: 1.3,
  },
  // Stage 3: Oil Spill Appears (Cinematic focus on slick anomaly)
  3: {
    center: [69.112, 21.845],
    zoom: 8.9,
    pitch: 24,
    bearing: 12,
    duration: 1400,
    curve: 1.4,
  },
  // Stage 4: Currents Activate (Tilt up to reveal hydrodynamic particle streamlines)
  4: {
    center: [69.05, 21.9],
    zoom: 8.5,
    pitch: 28,
    bearing: 15,
    duration: 1400,
    curve: 1.2,
  },
  // Stage 5: Reverse Drift Advection (Camera frames the RK4 Lagrangian backtrack)
  5: {
    center: [68.95, 21.75],
    zoom: 8.7,
    pitch: 26,
    bearing: -6,
    duration: 1500,
    curve: 1.3,
  },
  // Stage 6: Origin Convergence (Discharge origin uncertainty ellipse)
  6: {
    center: [68.78, 21.6],
    zoom: 9.1,
    pitch: 28,
    bearing: -10,
    duration: 1400,
    curve: 1.3,
  },
  // Stage 7: Suspect Vessel Isolated (Target lock on suspect vessel IMO 9720134)
  7: {
    center: [68.89, 21.65],
    zoom: 9.5,
    pitch: 32,
    bearing: -16,
    duration: 1600,
    curve: 1.4,
  },
  // Stage 8: Evidence Verified (Wide theater confirmation view)
  8: {
    center: [69.05, 21.85],
    zoom: 8.3,
    pitch: 16,
    bearing: 0,
    duration: 1400,
    curve: 1.2,
  },
};

/**
 * Execute a cinematic camera transition with smooth cubic-bezier easing
 */
export function flyToPose(map: maplibregl.Map, pose: CameraPose) {
  if (!map) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduced) {
    map.jumpTo({
      center: pose.center,
      zoom: pose.zoom,
      pitch: pose.pitch ?? 0,
      bearing: pose.bearing ?? 0,
    });
    return;
  }

  map.flyTo({
    center: pose.center,
    zoom: pose.zoom,
    pitch: pose.pitch ?? 0,
    bearing: pose.bearing ?? 0,
    duration: pose.duration ?? 1400,
    curve: pose.curve ?? 1.4,
    essential: true,
  });
}

/**
 * Focus camera smoothly on a suspect vessel with an investigative pitch
 */
export function focusOnVessel(map: maplibregl.Map, coords: LonLat) {
  flyToPose(map, {
    center: coords,
    zoom: 9.4,
    pitch: 28,
    bearing: -12,
    duration: 1300,
  });
}

/**
 * Focus camera smoothly on the oil spill centroid
 */
export function focusOnSpill(map: maplibregl.Map, coords: LonLat) {
  flyToPose(map, {
    center: coords,
    zoom: 8.8,
    pitch: 22,
    bearing: 8,
    duration: 1300,
  });
}
