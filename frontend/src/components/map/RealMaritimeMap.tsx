"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useCommandStore } from "@/lib/store";
import { CandidateVessel, Incident, DriftTrajectoryPoint } from "@/lib/types";
import { LayerChips } from "./LayerChips";
import { ZoomIn, ZoomOut, RotateCcw, ShieldCheck } from "lucide-react";

/* Compass bearing (degrees clockwise from north) between two lng/lat points */
function bearingDeg(a: [number, number], b: [number, number]): number {
  const p = Math.PI / 180;
  const dLon = (b[0] - a[0]) * p * Math.cos(((b[1] + a[1]) / 2) * p);
  const dLat = (b[1] - a[1]) * p;
  return ((Math.atan2(dLon, dLat) * 180) / Math.PI + 360) % 360;
}

/* Procedural arrow icon (points north by default) for vector layers */
function arrowIcon(color: string, len = 5): ImageData {
  const S = 32;
  const cv = document.createElement("canvas");
  cv.width = S;
  cv.height = S;
  const ctx = cv.getContext("2d")!;
  ctx.translate(S / 2, S / 2);
  ctx.rotate(Math.PI / 2);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -len);
  ctx.lineTo(len * 0.72, len);
  ctx.lineTo(0, len * 0.5);
  ctx.lineTo(-len * 0.72, len);
  ctx.closePath();
  ctx.fill();
  return ctx.getImageData(0, 0, S, S);
}

interface RealMaritimeMapProps {
  incident?: Incident;
  candidateVessels?: CandidateVessel[];
  onSelectVessel?: (vessel: CandidateVessel) => void;
  onSpillClick?: (incident: Incident) => void;
  showChips?: boolean;
  interactive?: boolean;
  children?: React.ReactNode;
}

/* Sentinel-1 swath reveal — subtle 250 ms ease-out fade */
function revealSwath(map: maplibregl.Map, reduced: boolean) {
  if (!map.getLayer("swath-fill")) return () => {};
  map.setPaintProperty("swath-fill", "fill-opacity", reduced ? 0.1 : 0);
  map.setPaintProperty("swath-outline", "line-opacity", reduced ? 0.55 : 0);
  if (reduced) return () => {};
  const t0 = performance.now();
  let raf = 0;
  const step = (t: number) => {
    const d = Math.min(1, (t - t0) / 250);
    const e = Math.max(0, Math.min(1, 1 - Math.pow(1 - d, 3)));
    map.setPaintProperty("swath-fill", "fill-opacity", 0.1 * e);
    map.setPaintProperty("swath-outline", "line-opacity", 0.55 * e);
    if (d < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

/* Top-view vessel silhouettes — tanker / cargo / fishing */
function shipGlyph(v: CandidateVessel) {
  const t = (v.vesselType ?? "").toLowerCase();
  const isTanker = /tanker|crude|product/.test(t);
  const isFishing = /fish|trawl/.test(t);
  if (isTanker) {
    return `
      <svg width="22" height="22" viewBox="0 0 24 24">
        <rect x="6.6" y="2.6" width="10.8" height="18.8" rx="5.4" fill="currentColor"/>
        <rect x="6.6" y="2.6" width="10.8" height="18.8" rx="5.4" fill="#050B11" opacity="0.32"/>
        <rect x="8.6" y="7.4" width="6.8" height="4.8" rx="1.1" fill="#0A1520"/>
        <circle cx="12" cy="15.4" r="2.5" fill="#0A1520"/>
        <circle cx="12" cy="15.4" r="1.25" fill="#EF4444"/>
      </svg>`;
  }
  if (isFishing) {
    return `
      <svg width="22" height="22" viewBox="0 0 24 24">
        <rect x="7.4" y="4" width="9.2" height="16" rx="4.6" fill="currentColor"/>
        <rect x="10.3" y="8.6" width="3.4" height="5.2" rx="0.8" fill="#0A1520"/>
        <line x1="12" y1="9" x2="3.6" y2="2.4" stroke="currentColor" stroke-width="1"/>
      </svg>`;
  }
  return `
    <svg width="22" height="22" viewBox="0 0 24 24">
      <rect x="6.6" y="2.6" width="10.8" height="18.8" rx="5.4" fill="currentColor"/>
      <rect x="6.6" y="2.6" width="10.8" height="18.8" rx="5.4" fill="#050B11" opacity="0.32"/>
      <rect x="8.2" y="13.8" width="3.2" height="3.4" rx="0.5" fill="#0A1520"/>
      <rect x="11.7" y="13.8" width="3.2" height="3.4" rx="0.5" fill="#0A1520"/>
      <rect x="8.2" y="9.2" width="3.2" height="3.4" rx="0.5" fill="#0A1520"/>
      <rect x="11.7" y="9.2" width="3.2" height="3.4" rx="0.5" fill="#0A1520"/>
      <rect x="9.9" y="6.4" width="4.2" height="2.7" rx="0.9" fill="#0A1520"/>
    </svg>`;
}

/* Mission alert copy for each demo stage */
const STAGE_ALERTS: Record<number, string> = {
  1: "SENTINEL-1A PASS INGESTED",
  2: "OIL SPILL DETECTED — SD-2026-00421",
  3: "SAR FORENSICS COMPLETE",
  4: "RK4 BACKTRACK UNDERWAY",
  5: "SOURCE ATTRIBUTION LOCKED",
  6: "SUSPECT VESSEL ISOLATED",
  7: "EVIDENCE LEDGER SEALED · ED25519",
};

/* AI Analyst live narration per demo stage */
const ANALYST_LINES: Record<number, string> = {
  1: "Sentinel-1A SAR pass streaming — orbit 118, Gulf of Kutch segment, 09:42Z.",
  2: "Backscatter anomaly segmented; polymer sheen matched — 18.6 km² classified.",
  3: "SAR forensics pinned the slick centroid; cross-track phase signature locked.",
  4: "RK4 backtrack ensemble running — 27 h window, 6 kn SE monsoon drift.",
  5: "Source ranked IMOS 9720134 — discharge window 02:10–03:40 UTC.",
  6: "Suspect isolated in AIS blind spot; 30-min trail corroborates onset.",
  7: "Ledger sealed — SHA-256 Merkle root committed, ED25519 signed.",
};

export const RealMaritimeMap: React.FC<RealMaritimeMapProps> = ({
  incident: propIncident,
  candidateVessels: propVessels,
  onSelectVessel,
  onSpillClick,
  showChips = true,
  interactive = true,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const satRef = useRef<maplibregl.Marker | null>(null);
  const haloRef = useRef<maplibregl.Marker | null>(null);
  const onSelectVesselRef = useRef(onSelectVessel);
  const driftLineRef = useRef<DriftTrajectoryPoint[]>([]);
  const prevDemoStepRef = useRef(0);

  const store = useCommandStore();
  const incident = propIncident ?? store.getSelectedIncident();
  const layers = store.layers;
  const demoStep = store.demoStep;
  const isDemoRunning = store.isDemoRunning;
  const detectionMs = store.detectionMs;
  const hasVerified = store.hasVerified;
  const merkleRoot = store.evidenceLedger?.merkleRoot;

  const [mapLoaded, setMapLoaded] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const [readout, setReadout] = useState<{ lat: number; lng: number; z: number }>({
    lat: 21.845,
    lng: 69.112,
    z: 8,
  });

  const driftLine = useMemo(
    () => store.driftResult?.trajectory ?? [],
    [store.driftResult]
  );

  useEffect(() => {
    onSelectVesselRef.current = onSelectVessel;
  }, [onSelectVessel]);

  useEffect(() => {
    driftLineRef.current = driftLine;
  }, [driftLine]);

  /* ── ADD STATIC GEOJSON LAYERS ─────────────────────────────── */
function addBaseLayers(map: maplibregl.Map) {
    const inc = incident;

    /* Vector arrow icons (wind / current / orbit) — register first */
    if (!map.hasImage("arrow-wind")) map.addImage("arrow-wind", arrowIcon("#22D3A7", 4));
    if (!map.hasImage("arrow-current")) map.addImage("arrow-current", arrowIcon("#38BDF8", 5));
    if (!map.hasImage("arrow-sat")) map.addImage("arrow-sat", arrowIcon("#7DD3FC", 6));

    /* Graticule — lat/lon grid so the ocean never reads as a void */
    const lonLines: [number, number][][] = [];
    const latLines: [number, number][][] = [];
    for (let lon = 66.2; lon <= 71.2; lon += 0.5) {
      lonLines.push([[lon, 19.4], [lon, 24.1]]);
    }
    for (let lat = 19.5; lat <= 24.0; lat += 0.5) {
      latLines.push([[66.0, lat], [71.4, lat]]);
    }
    map.addSource("graticule", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [...lonLines, ...latLines].map(([a, b]) => ({
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: [a, b] },
        })),
      },
    });
    map.addLayer({
      id: "graticule",
      type: "line",
      source: "graticule",
      paint: {
        "line-color": "#122634",
        "line-width": 0.5,
        "line-opacity": 0.22,
      },
    });

    /* Sentinel-1 swath footprint — acquisition coverage band */
    if (inc) {
      const m = inc.sarMetadata;
      const slant = m.passDirection === "ASCENDING" ? 1 : -1;
      const [cx, cy] = [
        inc.spillGeometry.centroid.longitude,
        inc.spillGeometry.centroid.latitude,
      ];
      const L = 1.5;
      const W = 0.42;
      const ax = slant * 0.55;
      const ay = 1.0;
      const nx = -ay;
      const ny = ax;
      const ring: [number, number][] = [
        [cx - L * ax - W * nx, cy - L * ay - W * ny],
        [cx - L * ax + W * nx, cy - L * ay + W * ny],
        [cx + L * ax + W * nx, cy + L * ay + W * ny],
        [cx + L * ax - W * nx, cy + L * ay - W * ny],
      ];
      map.addSource("sentinel-swath", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: { mission: m.mission, orbit: m.relativeOrbit },
          geometry: { type: "Polygon", coordinates: [[...ring, ring[0]]] },
        },
      });
      map.addLayer({
        id: "swath-fill",
        type: "fill",
        source: "sentinel-swath",
        paint: {
          "fill-color": "#38BDF8",
          "fill-opacity": 0,
        },
      });
      map.addLayer({
        id: "swath-outline",
        type: "line",
        source: "sentinel-swath",
        paint: {
          "line-color": "#38BDF8",
          "line-width": 1,
          "line-dasharray": [3, 3],
          "line-opacity": 0,
        },
      });

      const axisStart: [number, number] = [cx - L * ax - 0.1, cy - L * ay];
      const axisEnd: [number, number] = [cx + L * ax + 0.1, cy + L * ay];
      map.addSource("sentinel-track", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: [axisStart, axisEnd] },
        },
      });
      map.addLayer({
        id: "swath-core",
        type: "line",
        source: "sentinel-track",
        paint: { "line-color": "#38BDF8", "line-width": 14, "line-blur": 10, "line-opacity": 0.08 },
      });
      map.addLayer({
        id: "sentinel-axis",
        type: "line",
        source: "sentinel-track",
        paint: {
          "line-color": "#38BDF8",
          "line-width": 1,
          "line-dasharray": [2, 4],
          "line-opacity": 0.3,
        },
      });
      const dirPt: [number, number] = [
        axisStart[0] + (axisEnd[0] - axisStart[0]) * 0.55,
        axisStart[1] + (axisEnd[1] - axisStart[1]) * 0.55,
      ];
      map.addSource("sentinel-dir-pt", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: { bearing: bearingDeg(axisStart, axisEnd) },
          geometry: { type: "Point", coordinates: dirPt },
        },
      });
      map.addLayer({
        id: "sentinel-dir",
        type: "symbol",
        source: "sentinel-dir-pt",
        layout: {
          "icon-image": "arrow-sat",
          "icon-rotate": ["get", "bearing"],
          "icon-size": 0.4,
          "icon-allow-overlap": true,
        },
        paint: { "icon-opacity": 0.85 },
      });
    }

    /* Bathymetry depth contours — coastal shallows closer to land (legible over imagery) */
      map.addSource("bathy", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [
            { type: "Feature", properties: { depth: -1000 }, geometry: { type: "LineString", coordinates: [[65.8, 24.0], [67.0, 22.8], [68.3, 21.8], [69.8, 20.9], [71.0, 20.1]] } },
            { type: "Feature", properties: { depth: -200 }, geometry: { type: "LineString", coordinates: [[66.2, 23.4], [67.6, 22.2], [68.9, 21.3], [70.4, 20.5]] } },
            { type: "Feature", properties: { depth: -100 }, geometry: { type: "LineString", coordinates: [[66.8, 23.5], [67.9, 22.5], [69.2, 21.7], [70.7, 20.9]] } },
            { type: "Feature", properties: { depth: -50 }, geometry: { type: "LineString", coordinates: [[67.5, 23.6], [68.6, 22.7], [69.8, 22.0], [71.0, 21.3]] } },
          ],
        },
      });
      map.addLayer({
        id: "bathy-lines",
        type: "line",
        source: "bathy",
        paint: {
          "line-color": "#39A8D8",
          "line-width": ["interpolate", ["linear"], ["get", "depth"], -1000, 0.5, -50, 1.4],
          "line-opacity": ["interpolate", ["linear"], ["get", "depth"], -1000, 0.22, -50, 0.6],
        },
      });
      map.addSource("bathy-label-pts", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [
            { type: "Feature", properties: { depth: -1000 }, geometry: { type: "Point", coordinates: [68.85, 21.55] } },
            { type: "Feature", properties: { depth: -200 }, geometry: { type: "Point", coordinates: [68.7, 21.85] } },
            { type: "Feature", properties: { depth: -100 }, geometry: { type: "Point", coordinates: [68.95, 22.2] } },
            { type: "Feature", properties: { depth: -50 }, geometry: { type: "Point", coordinates: [69.35, 22.5] } },
          ],
        },
      });
      map.addLayer({
        id: "bathy-labels",
        type: "symbol",
        source: "bathy-label-pts",
        layout: {
          "text-field": ["concat", ["to-string", ["get", "depth"]], " m"],
          "text-size": 8,
          "text-font": ["Open Sans Regular"],
          "text-letter-spacing": 0.06,
          "text-anchor": "left",
          "text-offset": [0.5, 0],
        },
        paint: { "text-color": "#69C2E8", "text-halo-color": "#04121F", "text-halo-width": 1.3 },
      });

      /* Bathymetry shader — translucent depth bands between contours (ocean depth tint) */
      const c1000 = [[65.8, 24.0], [67.0, 22.8], [68.3, 21.8], [69.8, 20.9], [71.0, 20.1]] as [number, number][];
      const c200 = [[66.2, 23.4], [67.6, 22.2], [68.9, 21.3], [70.4, 20.5]] as [number, number][];
      const c100 = [[66.8, 23.5], [67.9, 22.5], [69.2, 21.7], [70.7, 20.9]] as [number, number][];
      const c50 = [[67.5, 23.6], [68.6, 22.7], [69.8, 22.0], [71.0, 21.3]] as [number, number][];
      const band = (a: [number, number][], b: [number, number][]): [number, number][] => [...a, ...[...b].reverse(), a[0]];
      map.addSource("depth-bands", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [
            { type: "Feature", properties: { band: "deep" }, geometry: { type: "Polygon", coordinates: [band(c1000, c200)] } },
            { type: "Feature", properties: { band: "mid" }, geometry: { type: "Polygon", coordinates: [band(c200, c100)] } },
            { type: "Feature", properties: { band: "shelf" }, geometry: { type: "Polygon", coordinates: [band(c100, c50)] } },
          ],
        },
      });
      map.addLayer({
        id: "depth-deep",
        type: "fill",
        source: "depth-bands",
        filter: ["==", ["get", "band"], "deep"],
        paint: { "fill-color": "#0E2A40", "fill-opacity": 0.18 },
      });
      map.addLayer({
        id: "depth-mid",
        type: "fill",
        source: "depth-bands",
        filter: ["==", ["get", "band"], "mid"],
        paint: { "fill-color": "#13445F", "fill-opacity": 0.16 },
      });
      map.addLayer({
        id: "depth-shelf",
        type: "fill",
        source: "depth-bands",
        filter: ["==", ["get", "band"], "shelf"],
        paint: { "fill-color": "#1C5578", "fill-opacity": 0.14 },
      });

      /* Indian EEZ boundary — soft glow underlay + thin dashed line + label */
      const eez: [number, number][] = [
        [66.6, 23.9], [67.05, 22.9], [67.35, 21.7], [67.7, 20.2], [68.15, 18.6], [68.9, 17.1], [70.3, 15.0],
      ];
      map.addSource("eez", {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: eez } },
      });
      map.addLayer({
        id: "eez-glow",
        type: "line",
        source: "eez",
        paint: { "line-color": "#38BDF8", "line-width": 7, "line-blur": 6, "line-opacity": 0.14 },
      });
      map.addLayer({
        id: "eez-line",
        type: "line",
        source: "eez",
        paint: {
          "line-color": "#38BDF8",
          "line-width": 1.2,
          "line-dasharray": [4, 3],
          "line-opacity": 0.55,
        },
      });
      map.addSource("eez-label-pt", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [67.28, 22.3] },
        },
      });
      map.addLayer({
        id: "eez-label",
        type: "symbol",
        source: "eez-label-pt",
        layout: {
          "text-field": "INDIAN EEZ",
          "text-size": 9,
          "text-font": ["Open Sans Semibold"],
          "text-letter-spacing": 0.18,
          "text-anchor": "left",
          "text-offset": [0.8, 0],
          "text-rotation-alignment": "map",
        },
        paint: { "text-color": "#4FA9D6", "text-halo-color": "#04121F", "text-halo-width": 1.4 },
      });

      /* Shipping lane corridors — glow underlay + direction dashes */
      const lanes: [number, number][][] = [
        [[66.9, 21.4], [68.1, 21.95], [69.3, 22.45], [70.4, 22.85]],
        [[68.0, 22.5], [69.2, 22.85], [70.3, 23.2]],
        [[67.8, 19.6], [69.0, 19.9], [70.2, 20.3]],
      ];
      map.addSource("lanes", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: lanes.map((coords) => ({
            type: "Feature",
            properties: { name: "Traffic separation corridor" },
            geometry: { type: "LineString", coordinates: coords },
          })),
        },
      });
      map.addLayer({
        id: "lanes-glow",
        type: "line",
        source: "lanes",
        paint: { "line-color": "#22D3A7", "line-width": 4, "line-blur": 4, "line-opacity": 0.1 },
      });
      map.addLayer({
        id: "lanes-line",
        type: "line",
        source: "lanes",
        paint: {
          "line-color": "#22D3A7",
          "line-width": 0.9,
          "line-dasharray": [3, 6],
          "line-opacity": 0.3,
        },
      });

      /* Wind arrows — uniform NE monsoon flow, scientific dart grid */
      const windPts: [number, number][] = [
        [68.1, 21.0], [68.6, 21.3], [69.1, 21.6], [69.6, 21.9],
        [68.3, 21.7], [68.8, 21.95], [69.4, 22.2], [69.95, 22.45],
        [68.5, 22.3], [69.0, 22.5], [69.55, 22.75], [70.1, 22.95],
        [68.8, 22.85], [69.3, 23.05], [69.85, 23.2],
      ];
      map.addSource("wind-points", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: windPts.map((c) => ({
            type: "Feature",
            properties: { bearing: 59 },
            geometry: { type: "Point", coordinates: c },
          })),
        },
      });
      map.addLayer({
        id: "wind-arrows",
        type: "symbol",
        source: "wind-points",
        layout: {
          "icon-image": "arrow-wind",
          "icon-rotate": ["get", "bearing"],
          "icon-size": 0.34,
          "icon-allow-overlap": true,
        },
        paint: { "icon-opacity": 0.62 },
      });

      /* Ocean current vectors — SE monsoon drift over the shelf */
      const currentPts: { c: [number, number]; b: number }[] = [
        { c: [67.9, 21.2], b: 119 }, { c: [68.5, 21.5], b: 119 },
        { c: [69.1, 21.9], b: 119 }, { c: [69.6, 22.3], b: 119 },
        { c: [68.3, 22.2], b: 119 }, { c: [68.9, 22.6], b: 119 },
        { c: [69.5, 22.85], b: 119 }, { c: [70.0, 23.1], b: 119 },
      ];
      map.addSource("current-points", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: currentPts.map(({ c, b }) => ({
            type: "Feature",
            properties: { bearing: b },
            geometry: { type: "Point", coordinates: c },
          })),
        },
      });
      map.addLayer({
        id: "current-arrows",
        type: "symbol",
        source: "current-points",
        layout: {
          "icon-image": "arrow-current",
          "icon-rotate": ["get", "bearing"],
          "icon-size": 0.42,
          "icon-allow-overlap": true,
        },
        paint: { "icon-opacity": 0.72 },
      });

      /* Weather overlay — monsoon squall bands sweeping the shelf */
      map.addSource("weather-bands", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [
            { type: "Feature", properties: { strip: 1 }, geometry: { type: "Polygon", coordinates: [[[66.9, 24.3], [68.9, 22.5], [69.5, 23.2], [67.4, 25.0], [66.9, 24.3]]] } },
            { type: "Feature", properties: { strip: 2 }, geometry: { type: "Polygon", coordinates: [[[67.9, 23.6], [69.9, 21.9], [70.5, 22.5], [68.4, 24.2], [67.9, 23.6]]] } },
          ],
        },
      });
      map.addLayer({
        id: "weather-bands",
        type: "fill",
        source: "weather-bands",
        paint: { "fill-color": "#6E7FCF", "fill-opacity": 0.07 },
      });
      map.addLayer({
        id: "weather-outline",
        type: "line",
        source: "weather-bands",
        paint: { "line-color": "#6E7FCF", "line-width": 0.6, "line-dasharray": [4, 4], "line-opacity": 0.25 },
      });
      map.addSource("weather-label", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [68.3, 23.2] },
        },
      });
      map.addLayer({
        id: "weather-label",
        type: "symbol",
        source: "weather-label",
        layout: {
          "text-field": "MONSOON SQUALL · 32KT · PRECIP 40%",
          "text-size": 8,
          "text-font": ["Open Sans Regular"],
          "text-letter-spacing": 0.08,
        },
        paint: { "text-color": "#A8B4E8", "text-halo-color": "#04121F", "text-halo-width": 1.3 },
      });

      /* Ports — Kandla, Mundra, Sikka, Vadinar (Gulf of Kutch terminals) */
      const ports: { name: string; c: [number, number] }[] = [
        { name: "KANDLA", c: [70.22, 23.03] },
        { name: "MUNDRA", c: [69.73, 22.85] },
        { name: "SIKKA", c: [69.84, 22.43] },
        { name: "VADINAR", c: [69.72, 22.48] },
      ];
      map.addSource("ports", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: ports.map((p) => ({
            type: "Feature",
            properties: { name: p.name },
            geometry: { type: "Point", coordinates: p.c },
          })),
        },
      });
      map.addLayer({
        id: "ports-dot",
        type: "circle",
        source: "ports",
        minzoom: 5.5,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 5.5, 1.4, 8, 2.8],
          "circle-color": "#E0863D",
          "circle-stroke-width": 1,
          "circle-stroke-color": "#050B11",
          "circle-opacity": 0.9,
        },
      });
      map.addLayer({
        id: "ports-label",
        type: "symbol",
        source: "ports",
        minzoom: 6.8,
        layout: {
          "text-field": ["get", "name"],
          "text-size": 8.5,
          "text-font": ["Open Sans Regular"],
          "text-letter-spacing": 0.1,
          "text-anchor": "bottom",
          "text-offset": [0, -0.6],
        },
        paint: { "text-color": "#7C9AA8", "text-halo-color": "#06121C", "text-halo-width": 1.4 },
      });

      /* Anchorages — designated holding zones off the Gulf terminals */
      const anchorZones: [number, number][][] = [
        [[70.02, 22.92], [70.16, 22.90], [70.15, 22.97], [70.02, 23.00]],
        [[69.60, 22.80], [69.72, 22.74], [69.75, 22.81], [69.62, 22.88]],
        [[69.80, 22.34], [69.92, 22.28], [69.96, 22.35], [69.83, 22.42]],
        [[69.64, 22.24], [69.76, 22.18], [69.79, 22.25], [69.67, 22.31]],
      ];
      map.addSource("anchors", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: anchorZones.map((ring) => ({
            type: "Feature",
            properties: {},
            geometry: { type: "Polygon", coordinates: [[...ring, ring[0]]] },
          })),
        },
      });
      map.addLayer({
        id: "anchors-fill",
        type: "fill",
        source: "anchors",
        paint: { "fill-color": "#38BDF8", "fill-opacity": 0.045 },
      });
      map.addLayer({
        id: "anchors-line",
        type: "line",
        source: "anchors",
        paint: {
          "line-color": "#38BDF8",
          "line-width": 0.8,
          "line-dasharray": [2, 3],
          "line-opacity": 0.4,
        },
      });
      map.addSource("anchors-labels", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: anchorZones.map((ring, i) => ({
            type: "Feature",
            properties: { n: i + 1 },
            geometry: {
              type: "Point",
              coordinates: [
                ring.reduce((s, p) => s + p[0], 0) / ring.length,
                ring.reduce((s, p) => s + p[1], 0) / ring.length,
              ],
            },
          })),
        },
      });
      map.addLayer({
        id: "anchors-label",
        type: "symbol",
        source: "anchors-labels",
        layout: {
          "text-field": ["concat", "ANCH A", ["to-string", ["get", "n"]]],
          "text-size": 7.5,
          "text-font": ["Open Sans Regular"],
          "text-letter-spacing": 0.08,
          "text-anchor": "center",
        },
        paint: { "text-color": "#69C2E8", "text-halo-color": "#04121F", "text-halo-width": 1.2 },
      });

      if (inc) addOilLayers(map, inc);

      /* RK4 drift trajectory — progressively revealed by lerp loop */
      const coords = driftLine.map((p: DriftTrajectoryPoint) => [p.longitude, p.latitude]);
      map.addSource("drift-path", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: coords },
        },
      });
      map.addLayer({
        id: "drift-path",
        type: "line",
        source: "drift-path",
        paint: {
          "line-color": "#38BDF8",
          "line-width": 1.6,
          "line-opacity": 0.6,
          "line-dasharray": [1.5, 2.5],
        },
      });

      /* Drift origin marker (moves as the backtrack plays) */
      const origin = driftLine[driftLine.length - 1];
      map.addSource("drift-origin", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [origin.longitude, origin.latitude] },
        },
      });
      map.addLayer({
        id: "drift-origin",
        type: "circle",
        source: "drift-origin",
        paint: {
          "circle-radius": 4.5,
          "circle-color": "#38BDF8",
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#050B11",
          "circle-opacity": 0.95,
        },
      });

      /* Layer ordering via toggles handled by visibility effect */
  }

  /* ── ADD OIL POLYGON LAYERS ──────────────────────────────── */
  function addOilLayers(map: maplibregl.Map, inc: Incident) {
    const coords = inc.spillGeometry.polygonGeoJson.coordinates;
    map.addSource("oil-spill", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: { eventId: inc.eventId },
        geometry: { type: "Polygon", coordinates: coords },
      },
    });
    map.addLayer({
      id: "oil-glow",
      type: "line",
      source: "oil-spill",
      paint: { "line-color": "#E0863D", "line-width": 7, "line-blur": 7, "line-opacity": 0.24 },
    });
    map.addLayer({
      id: "oil-fill",
      type: "fill",
      source: "oil-spill",
      paint: {
        "fill-color": "#D6A84F",
        "fill-opacity": 0.26,
        "fill-outline-color": "#D6A84F",
      },
    });
    map.addLayer({
      id: "oil-outline",
      type: "line",
      source: "oil-spill",
      paint: { "line-color": "#E0863D", "line-width": 1.6, "line-opacity": 0.75 },
    });

    const centroid = inc.spillGeometry.centroid;
    map.addSource("oil-centroid", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: [centroid.longitude, centroid.latitude] },
      },
    });
    map.addLayer({
      id: "oil-pulse",
      type: "circle",
      source: "oil-centroid",
      paint: {
        "circle-radius": 3.5,
        "circle-color": "#D6A84F",
        "circle-opacity": 0.95,
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#050B11",
      },
    });
    map.addLayer({
      id: "oil-ring",
      type: "circle",
      source: "oil-centroid",
      paint: {
        "circle-radius": 4,
        "circle-color": "#D6A84F",
        "circle-opacity": 0,
        "circle-stroke-width": 1,
        "circle-stroke-color": "#E0863D",
      },
    });
    map.addLayer({
      id: "oil-ripple",
      type: "circle",
      source: "oil-centroid",
      paint: {
        "circle-radius": 4,
        "circle-color": "#D6A84F",
        "circle-opacity": 0,
        "circle-stroke-width": 1.4,
        "circle-stroke-color": "#E0863D",
      },
    });
    map.on("click", "oil-fill", () => onSpillClick?.(inc));
    map.on("mouseenter", "oil-fill", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "oil-fill", () => {
      map.getCanvas().style.cursor = "";
    });
  }

  /* ── INITIALISE MAP ────────────────────────────────────────── */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        sources: {
          navy: {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            maxzoom: 19,
          },
        },
        layers: [
          { id: "ocean-fill", type: "background", paint: { "background-color": "#04121F" } },
          {
            id: "ocean-raster",
            type: "raster",
            source: "navy",
            paint: {
              "raster-opacity": 1,
              "raster-saturation": -0.12,
            },
          },
        ],
      },
      center: [69.112, 21.845],
      zoom: 8,
      attributionControl: false,
      pitchWithRotate: false,
      dragRotate: false,
    });

    map.on("load", () => {
      setMapLoaded(true);
      map.resize();
      addBaseLayers(map);
    });

    map.on("move", () => {
      const c = map.getCenter();
      setReadout({ lat: c.lat, lng: c.lng, z: map.getZoom() });
    });

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── SMOOTH RK4 BACKTRACK — lerp path + origin backward ────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const smooth = { v: -1 };
    let raf = 0;
    let running = false;

    const stop = () => {
      if (running) {
        cancelAnimationFrame(raf);
        running = false;
      }
    };

    const tick = () => {
      running = true;
      const s = useCommandStore.getState();
      const line = driftLineRef.current;
      if (line.length < 2 || !s.layers.drift) {
        stop();
        return;
      }
      const target = Math.max(0, Math.min(1, s.currentDriftHour / 12));
      if (smooth.v < 0) smooth.v = target;
      const k = reduced ? 1 : Math.min(1, 0.14);
      smooth.v += (target - smooth.v) * k;
      if (Math.abs(target - smooth.v) < 0.003) smooth.v = target;

      const pos = smooth.v * (line.length - 1);
      const i = Math.floor(pos);
      const f = pos - i;
      const coords: [number, number][] = line
        .slice(0, i + 1)
        .map((p) => [p.longitude, p.latitude]);
      if (i < line.length - 1) {
        const a = line[i];
        const b = line[i + 1];
        coords.push([
          a.longitude + (b.longitude - a.longitude) * f,
          a.latitude + (b.latitude - a.latitude) * f,
        ]);
      }
      const src = map.getSource("drift-path") as maplibregl.GeoJSONSource | undefined;
      if (src) {
        src.setData({
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: coords },
        });
      }
      const org = map.getSource("drift-origin") as maplibregl.GeoJSONSource | undefined;
      if (org) {
        org.setData({
          type: "Feature",
          properties: {},
          geometry: {
            type: "Point",
            coordinates: coords[coords.length - 1],
          },
        });
      }

      const settled = Math.abs(target - smooth.v) < 0.003;
      if (settled && !s.isDemoRunning) {
        stop();
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const onState = (state: ReturnType<typeof useCommandStore.getState>, prev: typeof state) => {
      if (
        state.currentDriftHour !== prev.currentDriftHour ||
        state.layers.drift !== prev.layers.drift ||
        state.isDemoRunning !== prev.isDemoRunning
      ) {
        if (document.hidden) return;
        stop();
        raf = requestAnimationFrame(tick);
      }
    };
    const onVis = () => {
      if (document.hidden) {
        stop();
      } else if (useCommandStore.getState().layers.drift) {
        raf = requestAnimationFrame(tick);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    const unsub = useCommandStore.subscribe(onState);
    if (useCommandStore.getState().layers.drift && !document.hidden) {
      raf = requestAnimationFrame(tick);
    }
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      unsub();
      stop();
    };
  }, [mapLoaded]);

  /* ── OIL PULSE — fast centroid ring every 900 ms + slow sheen ripple every 3 s ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !incident || !map.getLayer("oil-ring")) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      if (!document.hidden) {
        const k = ((t - t0) / 900) % 1;
        map.setPaintProperty("oil-ring", "circle-radius", 4 + k * 7);
        map.setPaintProperty("oil-ring", "circle-opacity", 0.4 * (1 - k));
        const r = ((t - t0) / 3000) % 1;
        map.setPaintProperty("oil-ripple", "circle-radius", 4 + r * 15);
        map.setPaintProperty("oil-ripple", "circle-opacity", 0.3 * (1 - r) * (1 - r));
      }
      raf = requestAnimationFrame(step);
    };
    const onVis = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        map.setPaintProperty("oil-ring", "circle-opacity", 0);
        map.setPaintProperty("oil-ripple", "circle-opacity", 0);
      } else {
        raf = requestAnimationFrame(step);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    raf = requestAnimationFrame(step);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      cancelAnimationFrame(raf);
    };
  }, [incident, mapLoaded]);

  /* ── CURRENT PARTICLES — slow drifTing specks on the ambient water ── */
  useEffect(() => {
    const cv = particlesRef.current;
    if (!cv || !mapLoaded) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = cv.getContext("2d")!;
    const fit = () => {
      const r = cv.getBoundingClientRect();
      cv.width = Math.max(1, Math.floor(r.width));
      cv.height = Math.max(1, Math.floor(r.height));
    };
    fit();
    window.addEventListener("resize", fit);

    type P = { x: number; y: number; vx: number; vy: number; r: number; a: number };
    const mk = (): P => {
      const s = 6 + Math.random() * 11;
      const a = 0.85 + Math.random() * 0.3; // flow skew toward SE
      return {
        x: Math.random() * cv.width,
        y: Math.random() * cv.height,
        vx: a * s,
        vy: a * s * 0.72,
        r: 0.6 + Math.random() * 1,
        a: 0.1 + Math.random() * 0.2,
      };
    };
    const parts: P[] = Array.from({ length: reduced ? 0 : 30 }, mk);
    const eddies: P[] = Array.from({ length: reduced ? 0 : 5 }, () => ({
      ...mk(), r: 2 + Math.random(), a: 0.06 + Math.random() * 0.08,
    }));

    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (const p of [...parts, ...eddies]) {
        p.x += p.vx; p.y += p.vy;
        if (p.x > cv.width + 4) p.x = -4;
        if (p.y > cv.height + 4) p.y = -4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(122,205,244,${p.a})`;
        ctx.fill();
      }
      if (reduced) return;
      raf = requestAnimationFrame(draw);
    };
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (document.hidden) return;
      if (reduced) draw();
      else raf = requestAnimationFrame(draw);
    };
    draw();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", fit);
      cancelAnimationFrame(raf);
    };
  }, [mapLoaded]);

  /* ── SENTINEL SWATH — fade in on load and during demo SAR stage ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !incident) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cancel = revealSwath(map, reduced);
    return cancel;
  }, [incident, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const prev = prevDemoStepRef.current;
    prevDemoStepRef.current = demoStep;
    const entering =
      isDemoRunning &&
      (demoStep === 1 || (demoStep === 3 && prev === 2));
    if (!entering) return;
    if (!map.getSource("sentinel-swath")) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return revealSwath(map, reduced);
  }, [demoStep, isDemoRunning, mapLoaded]);

  /* ── SWATH LABEL — acquisition metadata chip ──────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !incident) return;
    if (!map.getSource("sentinel-swath")) return;

    const m = incident.sarMetadata;
    const [cx, cy] = [
      incident.spillGeometry.centroid.longitude,
      incident.spillGeometry.centroid.latitude,
    ];
    const slant = m.passDirection === "ASCENDING" ? 1 : -1;
    const L = 1.5;
    const W = 0.45;
    const pos: [number, number] = [cx - 0.45 * slant * L + W * slant, cy + 0.5 * L];

    const el = document.createElement("div");
    el.className =
      "pointer-events-none flex items-center gap-1.5 whitespace-nowrap rounded-md bg-bg-1 px-2 py-1 font-mono text-[10px] text-aqua ring-1 ring-line shadow-float";
    el.innerHTML = `
      <span class="h-1.5 w-1.5 rounded-full bg-aqua"></span>
      <span class="font-semibold">S1A · IW</span>
      <span class="text-ink-faint">${m.acquisitionUtc.substring(11, 19)}Z</span>
      <span class="text-ink-faint">·</span>
      <span>${m.passDirection.slice(0, 4).toUpperCase()}</span>
      <span class="text-ink-faint">· REL ${m.relativeOrbit}</span>
    `;

    const label = new maplibregl.Marker({ element: el, anchor: "left" })
      .setLngLat(pos)
      .addTo(map);
    return () => {
      label.remove();
    };
  }, [incident, mapLoaded]);

  /* ── SENTINEL ORBIT — satellite marker sweeps the swath during demo ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !incident) return;
    const m = incident.sarMetadata;
    const slant = m.passDirection === "ASCENDING" ? 1 : -1;
    const [cx, cy] = [
      incident.spillGeometry.centroid.longitude,
      incident.spillGeometry.centroid.latitude,
    ];
    const L = 1.5;
    const ax = slant * 0.55;
    const ay = 1.0;
    const A: [number, number] = [cx - L * ax - 0.1, cy - L * ay];
    const B: [number, number] = [cx + L * ax + 0.1, cy + L * ay];

    if (!satRef.current) {
      const el = document.createElement("div");
      el.className = "pointer-events-none flex flex-col items-center";
      el.style.filter = "drop-shadow(0 0 6px rgba(56,189,248,0.75))";
      el.innerHTML = `
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#7DD3FC" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
          <path d="M13 7 9 3 5 7l4 4"/>
          <path d="m17 11 4 4-4 4-4-4"/>
          <path d="m8 12 4 4 6-6-4-4Z"/>
          <path d="m16 8 3-3"/>
          <path d="M9 21a6 6 0 0 0-6-6"/>
        </svg>`;
      satRef.current = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat(B)
        .addTo(map);
      if (!map.getSource("sat-trail")) {
        map.addSource("sat-trail", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: [B, B] },
          },
        });
        map.addLayer({
          id: "sat-trail",
          type: "line",
          source: "sat-trail",
          paint: {
            "line-color": "#38BDF8",
            "line-width": 1.2,
            "line-opacity": 0.55,
            "line-dasharray": [3, 3],
          },
        });
      }
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (isDemoRunning && demoStep === 1) {
      let raf = 0;
      const t0 = performance.now();
      const dur = reduced ? 3200 : 8500;
      const loop = (t: number) => {
        if (document.hidden) {
          raf = requestAnimationFrame(loop);
          return;
        }
        const k = Math.min(1, (t - t0) / dur);
        const e = k * k * (3 - 2 * k);
        const lng = A[0] + (B[0] - A[0]) * e;
        const lat = A[1] + (B[1] - A[1]) * e;
        satRef.current?.setLngLat([lng, lat]);
        const ts = map.getSource("sat-trail") as
          | maplibregl.GeoJSONSource
          | undefined;
        if (ts) {
          ts.setData({
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: [
                [A[0], A[1]],
                [lng, lat],
              ],
            },
          });
        }
        if (k < 1) raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(raf);
    }

    satRef.current?.setLngLat(B);
    const ts = map.getSource("sat-trail") as maplibregl.GeoJSONSource | undefined;
    if (ts) {
      ts.setData({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: [B, B] },
      });
    }
    return () => {};
  }, [incident, mapLoaded, demoStep, isDemoRunning]);

  useEffect(
    () => () => {
      satRef.current?.remove();
      satRef.current = null;
    },
    []
  );

  /* ── SUSPECT VESSEL — amber halo + forced trail during demo stages 4+ ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const s = useCommandStore.getState();
    const list = propVessels ?? s.candidateVessels;
    const top = list.find((v) => v.attributionRank === 1) ?? list[0];
    const tl = top ? `trail-${top.imo}` : null;

    haloRef.current?.remove();
    haloRef.current = null;

    if (top && (hasVerified || (isDemoRunning && demoStep >= 4))) {
      const el = document.createElement("div");
      el.className = "pointer-events-none";
      el.innerHTML = `
        <div class="relative flex items-center justify-center">
          <span class="absolute h-9 w-9 rounded-full border border-amber/70 animate-ping opacity-60"></span>
          <span class="absolute h-5 w-5 rounded-full border border-amber bg-amber/15"></span>
          <span class="h-2.5 w-2.5 rounded-full bg-amber" style="box-shadow:0 0 10px rgba(224,134,61,0.9)"></span>
        </div>`;
      haloRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([top.longitude, top.latitude])
        .addTo(map);
      if (tl && map.getLayer(tl)) {
        map.setLayoutProperty(tl, "visibility", "visible");
      }
    }

    return () => {
      haloRef.current?.remove();
      haloRef.current = null;
      if (tl && map.getLayer(tl)) {
        map.setLayoutProperty(tl, "visibility", "none");
      }
    };
  }, [demoStep, isDemoRunning, hasVerified, mapLoaded, propVessels]);

  /* ── STAGE-2 "SENTINEL-1 DETECTION EVENT" — cinematic timeline ── */
  const stage2Active = isDemoRunning && demoStep === 2;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !stage2Active || !incident) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const store = useCommandStore.getState();
    const t0 = performance.now();
    let raf = 0;
    let lastBucket = -1;
    let oilOn = store.layers.oil;
    let revealed = false;
    let zooped = false;
    let oilRamp = 0;

    const setP = (
      id: string,
      paint: "fill-opacity" | "line-opacity" | "circle-opacity",
      v: number
    ) => {
      if (map.getLayer(id)) map.setPaintProperty(id, paint, v);
    };

    const tick = (t: number) => {
      if (document.hidden) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const ms = t - t0;
      const bucket = Math.floor(ms / 250) * 250;
      if (bucket !== lastBucket) {
        lastBucket = bucket;
        useCommandStore.getState().setDetectionMs(bucket);
      }

      /* hide the spill until the SAR classification completes (t=3s) */
      if (oilOn && ms < 3000) {
        oilOn = false;
        useCommandStore.getState().setLayer("oil", false);
      }
      if (ms >= 3000) {
        if (!oilOn) {
          oilOn = true;
          oilRamp = t;
          useCommandStore.getState().setLayer("oil", true);
        }
        const k = Math.min(1, (t - oilRamp) / 1200);
        setP("oil-fill", "fill-opacity", 0.26 * k);
        setP("oil-outline", "line-opacity", 0.75 * k);
        setP("oil-glow", "line-opacity", 0.35 * k);
      }

      /* footprint: vanish at start, re-sweep before detection (t≈2s) */
      if (!revealed) {
        if (ms < 100) {
          setP("swath-fill", "fill-opacity", 0);
          setP("swath-outline", "line-opacity", 0);
        }
        if (ms >= 2000) {
          revealSwath(map, reduced);
          revealed = true;
        }
      }

      /* tighten framing on the slick at the detection moment (t≈5s) */
      if (!zooped && ms >= 4800) {
        zooped = true;
        const c = incident.spillGeometry.centroid;
        map.easeTo({ center: [c.longitude, c.latitude], zoom: 8.6, duration: 1400 });
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      const s = useCommandStore.getState();
      s.setDetectionMs(null);
      if (oilOn) s.setLayer("oil", true);
      setP("swath-fill", "fill-opacity", 0.1);
      setP("swath-outline", "line-opacity", 0.55);
      setP("oil-fill", "fill-opacity", 0.26);
      setP("oil-outline", "line-opacity", 0.75);
      setP("oil-glow", "line-opacity", 0.35);
    };
  }, [mapLoaded, stage2Active, incident]);

  /* ── STAGE-2 SCENE MARKERS — radar pulse, swell ripple, confidence chip ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !incident) return;
    if (!stage2Active) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const c = incident.spillGeometry.centroid;
    const lngLat: [number, number] = [c.longitude, c.latitude];
    const markers: maplibregl.Marker[] = [];
    let pulse = false;
    let ripple = false;
    let conf = false;

    const mk = (el: HTMLElement, anchor: "center" | "top" = "center") => {
      const m = new maplibregl.Marker({ element: el, anchor })
        .setLngLat(lngLat)
        .addTo(map);
      markers.push(m);
      return m;
    };

    const step = () => {
      const ms = useCommandStore.getState().detectionMs ?? -1;
      if (!pulse && ms >= 2600 && ms < 5000 && !reduced) {
        pulse = true;
        const el = document.createElement("div");
        el.className = "pointer-events-none";
        el.innerHTML = `<div class="h-7 w-7 rounded-full border border-aqua/70" style="animation:sd-ring 900ms cubic-bezier(.2,.6,.3,1) both"></div>`;
        mk(el);
      }
      if (!ripple && ms >= 5900 && !reduced) {
        ripple = true;
        const el = document.createElement("div");
        el.className = "pointer-events-none";
        el.innerHTML = `<div class="h-6 w-6 rounded-full border-2 border-amber/70" style="animation:sd-swell 1500ms ease-out 2 both"></div>`;
        mk(el);
      }
      if (!conf && ms >= 5600) {
        conf = true;
        const el = document.createElement("div");
        el.className =
          "pointer-events-none flex flex-col items-start gap-1 rounded-md bg-bg-1/90 px-2 py-1.5 font-mono text-[10px] ring-1 ring-line shadow-float";
        el.innerHTML = `
          <div class="flex w-36 items-center justify-between"><span class="text-ink-faint">CONF</span><span class="tnum font-semibold text-amber">94.2%</span></div>
          <div class="h-1 w-full overflow-hidden rounded-full bg-bg-2"><div class="h-full bg-amber" style="width:0%;transition:width 1400ms cubic-bezier(.4,0,.2,1)"></div></div>
          <div class="text-green">Mineral Oil Sheen Confirmed</div>`;
        mk(el, "top");
        const bar = el.querySelector<HTMLElement>("[style*='width:0%']");
        if (bar) requestAnimationFrame(() => bar.style.setProperty("width", "94.2%"));
      }
    };
    step();
    const i = setInterval(step, 250);
    return () => {
      clearInterval(i);
      markers.forEach((m) => m.remove());
    };
  }, [mapLoaded, stage2Active, incident]);

  /* ── MISSION ALERTS — toast on each demo stage boundary ────── */
  useEffect(() => {
    let id: ReturnType<typeof setTimeout> | undefined;
    let id2: ReturnType<typeof setTimeout> | undefined;
    const msg = isDemoRunning ? STAGE_ALERTS[demoStep] : undefined;
    if (msg) {
      id = setTimeout(() => setAlert(msg), 90);
      id2 = setTimeout(() => setAlert(null), 2600);
    } else {
      id = setTimeout(() => setAlert(null), 90);
    }
    return () => {
      if (id) clearTimeout(id);
      if (id2) clearTimeout(id2);
    };
  }, [demoStep, isDemoRunning]);

  /* ── LAYER VISIBILITY SYNC ─────────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const vis = (id: string, v: boolean) => {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, "visibility", v ? "visible" : "none");
      }
    };
    vis("eez-glow", layers.eez);
    vis("eez-line", layers.eez);
    vis("eez-label", layers.eez);
    vis("lanes-glow", layers.shipping);
    vis("lanes-line", layers.shipping);
    vis("oil-glow", layers.oil);
    vis("oil-fill", layers.oil);
    vis("oil-outline", layers.oil);
    vis("oil-pulse", layers.oil);
    vis("oil-ring", layers.oil);
    vis("oil-ripple", layers.oil);
    vis("drift-path", layers.drift);
    vis("drift-origin", layers.drift);
    vis("density-heat", layers.ais);
    vis("wind-arrows", layers.weather);
    vis("weather-bands", layers.weather);
    vis("weather-outline", layers.weather);
    vis("weather-label", layers.weather);
    vis("current-arrows", layers.currents);
  }, [layers, mapLoaded]);

  /* ── AIS VESSELS — realistic glyphs, hover trails, clustering ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !map.getSource("graticule")) return;

    const build = () => {
      const s = useCommandStore.getState();
      const list = propVessels ?? s.candidateVessels;
      const selImo = s.selectedVesselImo;
      const onSel = onSelectVesselRef.current;

      /* drop previous markers and their trail layers */
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      list.forEach((v) => {
        const tl = `trail-${v.imo}`;
        if (map.getLayer(tl)) map.removeLayer(tl);
        if (map.getSource(tl)) map.removeSource(tl);
      });

      if (!s.layers.ais || list.length === 0) return;

      const zoom = map.getZoom();

      /* maritime traffic-density heatmap on the live AIS field */
      const densitySrc = map.getSource("traffic-density") as maplibregl.GeoJSONSource | undefined;
      if (densitySrc) {
        densitySrc.setData({
          type: "FeatureCollection",
          features: list.map((v) => ({
            type: "Feature",
            properties: { w: Math.min(3, 1 + v.speedOverGround / 12) },
            geometry: { type: "Point", coordinates: [v.longitude, v.latitude] },
          })),
        });
      }
      if (!map.getLayer("density-heat") && !map.getSource("traffic-density")) {
        map.addSource("traffic-density", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: "density-heat",
          type: "heatmap",
          source: "traffic-density",
          paint: {
            "heatmap-weight": ["get", "w"],
            "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 6, 22, 9, 55],
            "heatmap-intensity": 1,
            "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 5.5, 0.3, 9.2, 0],
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0, "rgba(0,0,0,0)",
              0.15, "rgba(56,189,248,0.28)",
              0.45, "rgba(224,134,61,0.5)",
              0.7, "rgba(239,140,60,0.6)",
              1, "rgba(239,68,68,0.66)",
            ],
          },
        });
      }

      /* zoomed out → spatial clustering */
      if (zoom < 7.2) {
        const CELL = 0.45;
        const buckets = new Map<string, CandidateVessel[]>();
        list.forEach((v) => {
          const key = `${Math.floor((v.longitude - 54) / CELL)},${Math.floor(
            (v.latitude - 4) / CELL
          )}`;
          const arr = buckets.get(key) ?? [];
          arr.push(v);
          buckets.set(key, arr);
        });
        buckets.forEach((group) => {
          const n = group.length;
          const cx = group.reduce((sum, v) => sum + v.longitude, 0) / n;
          const cy = group.reduce((sum, v) => sum + v.latitude, 0) / n;
          const el = document.createElement("div");
          if (n === 1) {
            const v = group[0];
            const color = v.attributionRank === 1 ? "#EF4444" : "#38BDF8";
            el.className = "cursor-pointer select-none";
            el.innerHTML = `
              <div class="relative flex items-center justify-center" style="color:${color}">
                <div style="transform: translateX(-50%) rotate(${v.heading + 180}deg); transform-origin:50% 50%; width:30px; height:11px; clip-path:polygon(0 100%, 100% 100%, 50% 0); background:linear-gradient(to top, rgba(56,189,248,0.3), rgba(56,189,248,0.05));" class="absolute left-1/2 top-1/2 pointer-events-none"></div>
                <div style="transform: translateX(-50%) rotate(${v.heading}deg); transform-origin: 50% 100%;" class="pointer-events-none absolute bottom-[9px] left-1/2 h-[22px] w-px bg-current opacity-60">
                  <div class="absolute -top-[1px] left-1/2 h-0 w-0 -translate-x-1/2 border-x-[3px] border-b-[5px] border-x-transparent border-b-current"></div>
                </div>
                ${shipGlyph(v)}
              </div>`;
            el.addEventListener("click", () => {
              map.easeTo({ center: [v.longitude, v.latitude], zoom: Math.min(zoom + 2, 9.2), duration: 250 });
            });
          } else {
            const hasTop = group.some((v) => v.attributionRank === 1);
            el.className = "cursor-pointer select-none";
            el.innerHTML = `
              <div class="flex h-7 min-w-[1.85rem] items-center justify-center rounded-full shadow-float ring-1 ${
                hasTop ? "bg-red/15 text-red ring-red/50" : "bg-bg-1 text-aqua ring-aqua/50"
              } px-1.5 font-mono text-[10px] font-semibold">${n}</div>`;
            el.addEventListener("click", () => {
              map.easeTo({ center: [cx, cy], zoom: Math.min(zoom + 1.6, 9.2), duration: 250 });
            });
          }
          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([cx, cy])
            .addTo(map);
          markersRef.current.push(marker);
        });
        return;
      }

      /* individual markers + near-visible wakes, hover/selected 30-min trails */
      list.forEach((v) => {
        /* 30-minute trajectory: SOG(kt)/60 nm per min → SOG/120 ° over 30 min */
        const N = 8;
        const total = Math.max(0.01, v.speedOverGround / 120);
        const a = ((v.courseOverGround + 180) * Math.PI) / 180;
        const kLat = Math.max(0.7, Math.cos((v.latitude * Math.PI) / 180));
        const pts: [number, number][] = [];
        for (let i = 0; i < N; i++) {
          const d = (i / (N - 1)) * total;
          const wiggle = Math.sin(i * 1.9) * 0.0035 * (1 - i / N);
          pts.push([
            v.longitude - Math.sin(a) * (d / kLat) + wiggle,
            v.latitude - Math.cos(a) * d + wiggle * 0.6,
          ]);
        }
        map.addSource(`trail-${v.imo}`, {
          type: "geojson",
          data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: pts } },
        });
        map.addLayer({
          id: `trail-${v.imo}`,
          type: "line",
          source: `trail-${v.imo}`,
          layout: { visibility: selImo === v.imo ? "visible" : "none" },
          paint: {
            "line-color": v.attributionRank === 1 ? "#EF4444" : "#38BDF8",
            "line-width": 1,
            "line-opacity": 0.5,
            "line-dasharray": [2, 2],
          },
        });

        const el = document.createElement("div");
        const isTop = v.attributionRank === 1;
        const isSelected = selImo === v.imo;
        const color = isTop
          ? "#EF4444"
          : selImo && !isSelected
            ? "#38BDF8"
            : selImo
              ? "#22D3A7"
              : "#38BDF8";
        const dimmed = selImo && !isSelected ? "opacity-40" : "";

        el.className = `group cursor-pointer select-none ${dimmed}`;
        const wakeLen = 24 + Math.min(26, v.speedOverGround * 1.8);
        el.innerHTML = `
          <div class="relative flex items-center justify-center">
            <div style="transform: translateX(-50%) rotate(${v.heading + 180}deg); transform-origin:50% 50%; width:${wakeLen}px; height:11px; clip-path:polygon(0 100%, 100% 100%, 50% 0); background:linear-gradient(to top, rgba(56,189,248,0.34), rgba(56,189,248,0.06));" class="absolute left-1/2 top-1/2 pointer-events-none"></div>
            <div style="transform: translateX(-50%) rotate(${v.heading}deg); transform-origin:50% 100%;" class="pointer-events-none absolute bottom-[9px] left-1/2 h-[22px] w-px bg-current opacity-60">
              <div class="absolute -top-[1px] left-1/2 h-0 w-0 -translate-x-1/2 border-x-[3px] border-b-[5px] border-x-transparent border-b-current"></div>
            </div>
            <div style="color: ${color};" class="relative">
              ${shipGlyph(v)}
            </div>
            <div class="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden whitespace-nowrap rounded-md border border-line-active bg-panel px-2 py-1.5 font-mono text-[10px] leading-tight text-ink shadow-float group-hover:block">
              <div class="font-semibold text-aqua">${v.vesselName}</div>
              <div class="text-ink-dim mt-0.5">IMO ${v.imo} · ${v.speedOverGround.toFixed(1)} kn</div>
              <div class="text-ink-faint">HDG ${v.heading}° · 09:42 UTC</div>
            </div>
            ${
              isTop
                ? `<div class="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red ring-2 ring-bg-1"></div>`
                : ""
            }
          </div>
        `;

        el.addEventListener("mouseenter", () => {
          map.setLayoutProperty(`trail-${v.imo}`, "visibility", "visible");
        });
        el.addEventListener("mouseleave", () => {
          map.setLayoutProperty(`trail-${v.imo}`, "visibility", "none");
        });
        el.addEventListener("click", () => {
          useCommandStore.getState().setSelectedVesselImo(v.imo);
          onSel?.(v);
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([v.longitude, v.latitude])
          .addTo(map);
        markersRef.current.push(marker);
      });
    };

    build();
    map.on("zoomend", build);
    const unsub = useCommandStore.subscribe(
      (state, prev) => {
        if (
          state.selectedVesselImo !== prev.selectedVesselImo ||
          state.candidateVessels !== prev.candidateVessels ||
          state.layers.ais !== prev.layers.ais
        ) {
          build();
        }
      }
    );

    return () => {
      unsub();
      map.off("zoomend", build);
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      const s = useCommandStore.getState();
      (propVessels ?? s.candidateVessels).forEach((v) => {
        const tl = `trail-${v.imo}`;
        if (map.getLayer(tl)) map.removeLayer(tl);
        if (map.getSource(tl)) map.removeSource(tl);
      });
      if (map.getLayer("density-heat")) map.removeLayer("density-heat");
      if (map.getSource("traffic-density")) map.removeSource("traffic-density");
    };
  }, [mapLoaded, propVessels]);

  /* ── OIL AREA LABEL + HEAT SHIMMER — zoom-gated DOM markers ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !incident) return;

    const el = document.createElement("div");
    el.className =
      "pointer-events-none flex items-center gap-1 whitespace-nowrap rounded-md bg-bg-1 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber ring-1 ring-line";
    el.textContent = `${incident.spillGeometry.areaKm2} km²`;

    const label = new maplibregl.Marker({ element: el, anchor: "top" })
      .setLngLat([
        incident.spillGeometry.centroid.longitude,
        incident.spillGeometry.centroid.latitude,
      ])
      .addTo(map);

    /* heat shimmer — soft rising haze above the slick (reduced-motion: static) */
    const heat = document.createElement("div");
    heat.className = "sd-heat pointer-events-none";
    heat.style.cssText =
      "position:absolute;width:180px;height:120px;border-radius:50%;pointer-events:none;filter:blur(14px);mix-blend-mode:soft-light;background:radial-gradient(50% 50% at 50% 60%, rgba(224,134,61,0.55), rgba(224,134,61,0.12) 55%, transparent 78%)";
    const shimmer = new maplibregl.Marker({ element: heat, anchor: "center" })
      .setLngLat([
        incident.spillGeometry.centroid.longitude,
        incident.spillGeometry.centroid.latitude,
      ])
      .addTo(map);

    const sync = () => {
      const show = layers.oil && map.getZoom() >= 8;
      el.style.opacity = show ? "1" : "0";
      heat.style.opacity = show ? "1" : "0";
      el.style.transition = "opacity 150ms ease-out";
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        heat.style.animation = "none";
      }
    };
    sync();
    map.on("zoom", sync);
    map.on("move", sync);

    return () => {
      label.remove();
      shimmer.remove();
      map.off("zoom", sync);
      map.off("move", sync);
    };
  }, [incident, mapLoaded, layers.oil]);

  /* ── SMOOTH FLY TO INCIDENT ON SELECTION ───────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !incident) return;
    const c = incident.spillGeometry.centroid;
    const cur = map.getCenter();
    const far = Math.hypot(cur.lng - c.longitude, cur.lat - c.latitude);
    if (far > 0.02) {
      map.flyTo({
        center: [c.longitude, c.latitude],
        zoom: 8,
        duration: 250,
        essential: true,
      });
    }
  }, [incident, mapLoaded]);

  /* stage-2 detection event overlay state */
  const detecting = isDemoRunning && demoStep === 2;
  const dm = detectionMs ?? 0;
  const connActive = detecting && mapLoaded && !!incident && dm >= 4500;
  const [conn, setConn] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!connActive || !map || !incident) {
      setConn(null);
      return;
    }
    const upd = () => {
      try {
        const c = incident.spillGeometry.centroid;
        const p = map.project([c.longitude, c.latitude]);
        setConn({ x: p.x, y: p.y });
      } catch {
        setConn(null);
      }
    };
    upd();
    map.on("move", upd);
    map.on("zoom", upd);
    return () => {
      map.off("move", upd);
      map.off("zoom", upd);
    };
  }, [connActive, incident, mapLoaded]);

  const zoomIn = () => mapRef.current?.zoomIn({ duration: 200 });
  const zoomOut = () => mapRef.current?.zoomOut({ duration: 200 });
  const reset = () =>
    mapRef.current?.flyTo({ center: [69.112, 21.845], zoom: 8, duration: 200 });

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-bg-0 ${interactive ? "select-none" : ""}`}
    >
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />

      {/* Ocean sheen — slow ambient shimmer over the water (reduced-motion: static) */}
      <div
        className="sd-shimmer pointer-events-none absolute inset-0 z-[1] mix-blend-soft-light"
        style={{ background: "radial-gradient(60% 50% at 30% 30%, rgba(98,190,235,0.16), transparent 70%), radial-gradient(50% 40% at 75% 65%, rgba(90,180,230,0.12), transparent 70%)", animation: "sd-shimmer 22s ease-in-out infinite" }}
      />

      {/* Drifting current particles (tiny, above tint, below labels) */}
      <canvas
        ref={particlesRef}
        className="pointer-events-none absolute inset-0 z-[2] h-full w-full"
      />

      {/* Night-grade cinematic grade — navy matte over satellite imagery */}
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{ background: "rgba(8,28,48,0.5)", mixBlendMode: "multiply" }}
      />

      {/* Deep-ocean vignette + atmospheric haze over the water */}
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{ background: "radial-gradient(120% 100% at 50% 40%, transparent 55%, rgba(3,8,12,0.55) 100%), radial-gradient(80% 55% at 50% 0%, rgba(96,190,240,0.07), transparent 70%)" }}
      />

      <style>{`@keyframes sd-pop{0%{opacity:0;transform:translate(-50%,-6px)}100%{opacity:1;transform:translate(-50%,0)}}
@keyframes sd-sweep{0%{transform:translateX(-150%)}100%{transform:translateX(150%)}}
@keyframes sd-scan{0%{top:-3%;opacity:0}10%{opacity:.8}90%{opacity:.35}100%{top:97%;opacity:0}}
@keyframes sd-ring{0%{transform:scale(.35);opacity:.9}100%{transform:scale(2.6);opacity:0}}
@keyframes sd-swell{0%{transform:scale(.2);opacity:.9}100%{transform:scale(3);opacity:0}}
@keyframes sd-heat{0%{transform:translate(-50%,-50%) scale(1) rotate(0deg)}33%{transform:translate(-50%,-54%) scale(1.07) rotate(1.2deg)}66%{transform:translate(-50%,-46%) scale(.96) rotate(-1.2deg)}100%{transform:translate(-50%,-50%) scale(1) rotate(0deg)}}
@keyframes sd-alert{0%{opacity:0;transform:translate(-50%,-8px)}12%{opacity:1;transform:translate(-50%,0)}82%{opacity:1}100%{opacity:0;transform:translate(-50%,-4px)}}
@keyframes sd-draw{from{stroke-dashoffset:600}to{stroke-dashoffset:0}}
@keyframes sd-shimmer{0%{transform:translate(-8%,-6%) scale(1) rotate(0deg)}50%{transform:translate(8%,6%) scale(1.15) rotate(4deg)}100%{transform:translate(-8%,-6%) scale(1) rotate(0deg)}}
@media(prefers-reduced-motion:reduce){.sd-shimmer{animation:none!important}}
.maplibregl-marker{z-index:30!important}`}</style>

      {detecting && (
        <>
          {dm < 2400 && (
            <div
              className="pointer-events-none absolute z-20 flex items-center gap-2 rounded-md bg-bg-1/95 px-3 py-1.5 font-mono text-[10px] text-aqua ring-1 ring-line shadow-float"
              style={{ left: "50%", top: 12, animation: "sd-pop 360ms ease-out both" }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-aqua animate-pulse" />
              SENTINEL-1A · SAR PASS #{incident?.sarMetadata.relativeOrbit ?? 118} — PROCESSING
            </div>
          )}

          <div
            className="pointer-events-none absolute inset-0 z-[2] bg-[#01050A]"
            style={{
              opacity: dm >= 4800 ? 0 : dm >= 1400 ? 0.1 : 0.14,
              transition: "opacity 700ms ease-out",
            }}
          />

          {dm >= 700 && dm < 4400 && (
            <div
              className="pointer-events-none absolute inset-0 z-[2]"
              style={{
                animation: "sd-sweep 1800ms cubic-bezier(.45,0,.25,1) both",
                background:
                  "linear-gradient(115deg, transparent 34%, rgba(56,189,248,0.06) 44%, rgba(56,189,248,0.2) 50%, rgba(56,189,248,0.06) 56%, transparent 66%)",
              }}
            />
          )}

          {dm >= 1900 && dm < 3600 && (
            <div
              className="pointer-events-none absolute left-0 right-0 z-[2] h-px bg-aqua/50"
              style={{ animation: "sd-scan 1000ms linear both" }}
            />
          )}

          {dm >= 3900 && dm < 5700 && (
            <div
              className="pointer-events-none absolute z-20 flex items-center gap-2 rounded-md bg-red/15 px-3.5 py-1.5 font-mono text-xs font-bold text-red ring-1 ring-red/50 shadow-float"
              style={{ left: "50%", top: "12%", animation: "sd-pop 360ms ease-out both" }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-red animate-pulse" />
              OIL SPILL DETECTED
            </div>
          )}

          {conn !== null && (
            <svg className="pointer-events-none absolute inset-0 z-[3] h-full w-full">
              <line
                x1={290}
                y1={60}
                x2={conn.x}
                y2={conn.y}
                stroke="#38BDF8"
                strokeWidth={1}
                strokeDasharray="600"
                opacity="0.6"
                style={{ animation: "sd-draw 900ms ease-out both" }}
              />
            </svg>
          )}
        </>
      )}

      {(mapLoaded && (hasVerified || (isDemoRunning && demoStep >= 5))) && (
        <div
          className="pointer-events-none absolute z-20 flex items-center gap-1.5 rounded-md bg-bg-1 px-2.5 py-1 font-mono text-[10px] text-green ring-1 ring-green/30 shadow-float"
          style={{
            left: "50%",
            top: 12,
            transform: "translateX(-50%)",
            animation: "sd-pop 260ms ease-out",
          }}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          <span className="h-1.5 w-1.5 rounded-full bg-green animate-pulse" />
          <span className="font-semibold">LEDGER VERIFIED</span>
          <span className="text-ink-faint">SHA-256 ·</span>
          <span className="tnum">{merkleRoot ? `${merkleRoot.substring(0, 10)}…` : "CHAIN-OK"}</span>
        </div>
      )}

      {/* Satellite orbit HUD */}
      {incident && (
        <div className="pointer-events-none absolute right-3 top-[118px] z-10 w-44 rounded-lg bg-bg-1/95 p-2.5 font-mono text-[10px] leading-relaxed ring-1 ring-line shadow-float">
          <div className="flex items-center gap-1.5 text-aqua">
            <span className="h-1.5 w-1.5 rounded-full bg-aqua animate-pulse" />
            <span className="font-semibold tracking-wide">SENTINEL-1A</span>
          </div>
          <div className="mt-1.5 space-y-1 text-ink-dim">
            <div className="flex justify-between"><span className="text-ink-faint">ORBIT</span><span className="tnum text-ink">#{incident.sarMetadata.relativeOrbit}</span></div>
            <div className="flex justify-between"><span className="text-ink-faint">ALT</span><span className="tnum text-ink">693 KM</span></div>
            <div className="flex justify-between"><span className="text-ink-faint">INCIDENCE</span><span className="tnum text-ink">38.2°</span></div>
            <div className="flex justify-between"><span className="text-ink-faint">BAND</span><span className="text-ink">C · IW</span></div>
            <div className="flex justify-between"><span className="text-ink-faint">ACQ</span><span className="tnum text-ink">{incident.sarMetadata.acquisitionUtc.substring(11, 19)}Z</span></div>
          </div>
        </div>
      )}

      {isDemoRunning && (
        <>
          {/* Mission timeline dock */}
          <div className="pointer-events-none absolute bottom-16 left-1/2 z-20 w-fit -translate-x-1/2 rounded-lg bg-bg-1/95 px-3 py-2 ring-1 ring-line shadow-float">
            <div className="mb-1.5 flex items-center justify-between font-mono text-[9px] uppercase tracking-widest text-ink-faint">
              <span>Mission timeline</span>
              <span className="text-aqua">DEMO</span>
            </div>
            <div className="h-0.5 w-full min-w-[380px] overflow-hidden rounded-full bg-bg-2">
              <div className="h-full bg-aqua transition-all duration-500" style={{ width: `${Math.max(2, ((demoStep - 1) / 6) * 100)}%` }} />
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              {(["INGEST", "DETECT", "FORENSICS", "DRIFT", "ATTRIBUTE", "VERIFY", "EVIDENCE"] as const).map((label, i) => {
                const step = i + 1;
                const done = demoStep > step;
                const cur = demoStep === step;
                return (
                  <div key={label} className={`flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[9px] tracking-wide transition-all duration-300 ${done ? "bg-aqua/15 text-aqua" : cur ? "bg-amber/15 text-amber ring-1 ring-amber/60" : "text-ink-faint"}`}>
                    {done ? "✓" : cur ? "▶" : "·"} {label}
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Analyst live narration */}
          <div className="pointer-events-none absolute bottom-14 left-3 z-20 max-w-xs rounded-lg bg-bg-1/95 px-3 py-2 font-mono text-[10px] leading-snug ring-1 ring-line shadow-float">
            <div className="flex items-center gap-1.5 text-amber">
              <span className="h-1.5 w-1.5 rounded-full bg-amber animate-pulse" />
              <span className="font-semibold tracking-wide">AI ANALYST</span>
            </div>
            <p key={demoStep} className="mt-1 text-ink-dim" style={{ animation: "sd-alert 1300ms ease-out both" }}>
              {ANALYST_LINES[demoStep] ?? "Monitoring the theatre."}
            </p>
          </div>
        </>
      )}

      {/* Mission alert toast */}
      {alert !== null && (
        <div
          className="pointer-events-none absolute left-1/2 top-16 z-20 whitespace-nowrap rounded-md bg-red/15 px-3.5 py-1.5 font-mono text-xs font-bold text-red ring-1 ring-red/50 shadow-float"
          style={{ transform: "translateX(-50%)", animation: "sd-alert 2600ms ease-out both" }}
        >
          {alert}
        </div>
      )}

      {children}

      {showChips && <LayerChips />}

      {/* basemap attribution */}
      <div className="pointer-events-none absolute bottom-3 right-3 z-10 font-mono text-[9px] text-ink-faint/80">
        © Esri · World Imagery
      </div>

      {/* Position readout */}
      <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-2 rounded-lg bg-bg-1 px-2.5 py-1.5 font-mono text-[10px] text-ink-dim ring-1 ring-line">
        <span className="h-1.5 w-1.5 rounded-full bg-green" />
        <span className="tnum">
          {readout.lat.toFixed(3)}°N, {readout.lng.toFixed(3)}°E · Z{readout.z.toFixed(1)}
        </span>
      </div>

      {/* Map controls */}
      <div className="absolute right-3 top-3 z-10 flex flex-col gap-0.5 rounded-lg bg-bg-1 p-0.5 ring-1 ring-line">
        <button onClick={zoomIn} className="rounded-md p-1.5 text-ink-dim transition-colors hover:bg-panel-hover hover:text-ink focus-ring" title="Zoom in">
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button onClick={zoomOut} className="rounded-md p-1.5 text-ink-dim transition-colors hover:bg-panel-hover hover:text-ink focus-ring" title="Zoom out">
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <button onClick={reset} className="rounded-md p-1.5 text-ink-dim transition-colors hover:bg-panel-hover hover:text-ink focus-ring" title="Reset view">
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default RealMaritimeMap;