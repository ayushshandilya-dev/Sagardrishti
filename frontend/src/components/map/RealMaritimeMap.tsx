"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useCommandStore } from "@/lib/store";
import { CandidateVessel, Incident, DriftTrajectoryPoint } from "@/lib/types";
import { LayerChips } from "./LayerChips";
import { ZoomIn, ZoomOut, RotateCcw, ShieldCheck, Satellite } from "lucide-react";
import { createOilSheenLayer } from "./engine";
import { shipSilhouette, shipMetrics } from "./engine";
import type { SheenLayerHandle } from "./engine";

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

/* Cursor arrow direction icon */
function bearingArrowIcon(color: string): ImageData {
  return arrowIcon(color, 5);
}

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
  const markersByImoRef = useRef<Map<number, maplibregl.Marker>>(new Map());
  const satRef = useRef<maplibregl.Marker | null>(null);
  const haloRef = useRef<maplibregl.Marker | null>(null);
  const onSelectVesselRef = useRef(onSelectVessel);
  const driftLineRef = useRef<DriftTrajectoryPoint[]>([]);
  const prevDemoStepRef = useRef(0);
  const sheenRef = useRef<SheenLayerHandle | null>(null);

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
  const [clockUtc, setClockUtc] = useState("");
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

  /* Mission clock — live UTC readout for the telemetry HUD */
  useEffect(() => {
    const tick = () => setClockUtc(new Date().toISOString().slice(11, 19) + "Z");
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, []);

  /* ═══════════════════════════════════════════════════════════
     BASE GEO LAYERS
     ═══════════════════════════════════════════════════════════ */
  function addBaseLayers(map: maplibregl.Map) {
    const inc = incident;

    /* Vector arrow icons */
    if (!map.hasImage("arrow-wind")) map.addImage("arrow-wind", arrowIcon("#22D3A7", 4));
    if (!map.hasImage("arrow-current")) map.addImage("arrow-current", arrowIcon("#38BDF8", 5));
    if (!map.hasImage("arrow-sat")) map.addImage("arrow-sat", arrowIcon("#7DD3FC", 6));
    if (!map.hasImage("arrow-lane")) map.addImage("arrow-lane", bearingArrowIcon("#A7F3E0"));

    /* Graticule */
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

    /* ── SENTINEL-1 SWATH ────────────────────────────────────── */
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
        paint: { "fill-color": "#38BDF8", "fill-opacity": 0 },
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

    /* ── BATHYMETRY CONTOURS + DEPTH SHADER ──────────────────── */
    const c1000: [number, number][] = [[65.8, 24.0], [67.0, 22.8], [68.3, 21.8], [69.8, 20.9], [71.0, 20.1]];
    const c200: [number, number][] = [[66.2, 23.4], [67.6, 22.2], [68.9, 21.3], [70.4, 20.5]];
    const c100: [number, number][] = [[66.8, 23.5], [67.9, 22.5], [69.2, 21.7], [70.7, 20.9]];
    const c50: [number, number][] = [[67.5, 23.6], [68.6, 22.7], [69.8, 22.0], [71.0, 21.3]];

    map.addSource("bathy", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          { type: "Feature", properties: { depth: -1000 }, geometry: { type: "LineString", coordinates: c1000 } },
          { type: "Feature", properties: { depth: -200 }, geometry: { type: "LineString", coordinates: c200 } },
          { type: "Feature", properties: { depth: -100 }, geometry: { type: "LineString", coordinates: c100 } },
          { type: "Feature", properties: { depth: -50 }, geometry: { type: "LineString", coordinates: c50 } },
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

    /* depth shading between contours — translucent layered gradients */
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
      paint: {
        "fill-color": "#062038",
        "fill-opacity": ["interpolate", ["linear"], ["zoom"], 5, 0.3, 8, 0.1],
      },
    });
    map.addLayer({
      id: "depth-mid",
      type: "fill",
      source: "depth-bands",
      filter: ["==", ["get", "band"], "mid"],
      paint: {
        "fill-color": "#0C3A58",
        "fill-opacity": ["interpolate", ["linear"], ["zoom"], 5, 0.22, 8, 0.08],
      },
    });
    map.addLayer({
      id: "depth-shelf",
      type: "fill",
      source: "depth-bands",
      filter: ["==", ["get", "band"], "shelf"],
      paint: {
        "fill-color": "#124866",
        "fill-opacity": ["interpolate", ["linear"], ["zoom"], 5.5, 0.2, 8, 0.07],
      },
    });
    /* continental shelf rim — the "shelf glow" edge */
    map.addSource("shelf-rim", {
      type: "geojson",
      data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: c200 } },
    });
    map.addLayer({
      id: "shelf-rim",
      type: "line",
      source: "shelf-rim",
      paint: { "line-color": "#2CBFCC", "line-width": 6, "line-blur": 5, "line-opacity": 0.16 },
    });

    /* ── COASTLINE ENHANCEMENT ───────────────────────────────── */
    const shoreN: [number, number][] = [
      [68.25, 23.18], [68.7, 23.32], [69.15, 23.25], [69.6, 23.12],
      [69.95, 23.05], [70.22, 23.03], [70.55, 23.05], [70.95, 23.02],
    ];
    const shoreS: [number, number][] = [
      [68.3, 22.12], [68.75, 22.38], [69.07, 22.45], [69.35, 22.5],
      [69.62, 22.56], [69.73, 22.84], [69.95, 22.86],
    ];
    const tideBand: [number, number][] = [
      [69.2, 22.6], [69.5, 22.75], [69.8, 22.9], [69.9, 23.0],
    ];
    map.addSource("coast", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          { type: "Feature", properties: { side: "n" }, geometry: { type: "LineString", coordinates: shoreN } },
          { type: "Feature", properties: { side: "s" }, geometry: { type: "LineString", coordinates: shoreS } },
          { type: "Feature", properties: { side: "tidal" }, geometry: { type: "LineString", coordinates: tideBand } },
        ],
      },
    });
    map.addLayer({
      id: "coast-glow",
      type: "line",
      source: "coast",
      paint: {
        "line-color": [
          "match",
          ["get", "side"],
          "n", "#9BE3E0",
          "s", "#8ECEB1",
          "#A5D8C9",
        ],
        "line-width": 5,
        "line-blur": 4,
        "line-opacity": 0.3,
      },
    });
    map.addLayer({
      id: "coast-line",
      type: "line",
      source: "coast",
      paint: {
        "line-color": "#7FC7C4",
        "line-width": 0.9,
        "line-opacity": 0.55,
      },
    });
    /* estuarine sediment — turbid amber plumes at river mouths */
    const sediment: [number, number][][] = [
      [[69.6, 22.72], [69.98, 22.92], [69.9, 22.87], [69.55, 22.7]],
      [[70.08, 22.97], [70.32, 23.07], [70.34, 23.03], [70.1, 22.94]],
      [[68.98, 22.38], [69.1, 22.47], [69.08, 22.43], [68.96, 22.36]],
      [[69.5, 22.44], [69.72, 22.52], [69.7, 22.5], [69.48, 22.42]],
    ];
    map.addSource("sediment", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: sediment.map((ring) => ({
          type: "Feature",
          properties: { tier: "silt" },
          geometry: { type: "Polygon", coordinates: [[...ring, ring[0]]] },
        })),
      },
    });
    map.addLayer({
      id: "coast-sediment",
      type: "fill",
      source: "sediment",
      minzoom: 5.5,
      paint: {
        "fill-color": "#C79A55",
        "fill-opacity": ["interpolate", ["linear"], ["zoom"], 5.5, 0.05, 8.5, 0.14],
      },
    });
    /* salt marsh texture — very fine dashed ticks along the tidal band */
    map.addLayer({
      id: "coast-tidal",
      type: "line",
      source: "coast",
      filter: ["==", ["get", "side"], "tidal"],
      paint: {
        "line-color": "#5FA88F",
        "line-width": 1.1,
        "line-dasharray": [0.8, 1.6],
        "line-opacity": ["interpolate", ["linear"], ["zoom"], 6, 0, 9, 0.5],
      },
    });

    /* ── INDIAN EEZ ──────────────────────────────────────────── */
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
      paint: { "line-color": "#38BDF8", "line-width": 7, "line-blur": 6, "line-opacity": 0.16 },
    });
    map.addLayer({
      id: "eez-line",
      type: "line",
      source: "eez",
      paint: {
        "line-color": "#38BDF8",
        "line-width": ["interpolate", ["linear"], ["zoom"], 5, 1.6, 9, 0.9],
        "line-dasharray": [4, 3],
        "line-opacity": ["interpolate", ["linear"], ["zoom"], 5, 0.65, 9, 0.25],
      },
    });
    map.addSource("eez-label-pt", {
      type: "geojson",
      data: { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [67.28, 22.3] } },
    });
    map.addLayer({
      id: "eez-label",
      type: "symbol",
      source: "eez-label-pt",
      layout: {
        "text-field": "INDIAN EEZ — 200 NM",
        "text-size": 9,
        "text-font": ["Open Sans Semibold"],
        "text-letter-spacing": 0.18,
        "text-anchor": "left",
        "text-offset": [0.8, 0],
        "text-rotation-alignment": "map",
      },
      paint: { "text-color": "#4FA9D6", "text-halo-color": "#04121F", "text-halo-width": 1.4 },
    });

    /* ── SHIPPING CORRIDORS ──────────────────────────────────── */
    const lanes: { name: string; traffic: number; coords: [number, number][] }[] = [
      {
        name: "MUNDRA EXPORT CORRIDOR",
        traffic: 3,
        coords: [[70.0, 22.85], [69.85, 22.7], [69.6, 22.45], [69.2, 21.9], [68.7, 21.4]],
      },
      {
        name: "KANDLA CRUDE IMPORT LANE",
        traffic: 3,
        coords: [[70.3, 22.95], [70.1, 22.9], [69.7, 22.8], [69.2, 22.6], [68.6, 22.2]],
      },
      {
        name: "ARABIAN SEA TRANSIT ROUTE",
        traffic: 2,
        coords: [[67.8, 19.6], [68.4, 20.6], [69.0, 21.2], [69.6, 21.6], [70.2, 21.9]],
      },
      {
        name: "SIKKA ENERGY TERMINAL ROUTE",
        traffic: 1,
        coords: [[69.9, 22.5], [69.75, 22.5], [69.5, 22.4], [69.2, 22.2], [68.9, 22.0]],
      },
    ];
    map.addSource("lanes", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: lanes.map((l) => ({
          type: "Feature",
          properties: { name: l.name, traffic: l.traffic },
          geometry: { type: "LineString", coordinates: l.coords },
        })),
      },
    });
    map.addLayer({
      id: "lanes-glow",
      type: "line",
      source: "lanes",
      paint: {
        "line-color": "#22D3A7",
        "line-width": ["interpolate", ["linear"], ["get", "traffic"], 1, 3, 3, 7],
        "line-blur": 5,
        "line-opacity": 0.12,
      },
    });
    map.addLayer({
      id: "lanes-line",
      type: "line",
      source: "lanes",
      paint: {
        "line-color": "#22D3A7",
        "line-width": ["interpolate", ["linear"], ["get", "traffic"], 1, 0.7, 3, 1.2],
        "line-dasharray": [3, 6],
        "line-opacity": 0.32,
      },
    });
    /* direction arrows + route labels along each corridor */
    const laneMeta: { pts: { c: [number, number]; b: number }[]; label: { c: [number, number]; b: number; name: string } }[] =
      lanes.map((l) => {
        const pts = l.coords
          .map((p, i, arr) => {
            if (i === arr.length - 1) return null;
            const a = arr[i];
            const b = arr[i + 1];
            const t = 0.5;
            return {
              c: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] as [number, number],
              b: bearingDeg(a, b),
            };
          })
          .filter(Boolean) as { c: [number, number]; b: number }[];
        const mid = l.coords[Math.floor(l.coords.length / 2)];
        return { pts, label: { c: mid, b: bearingDeg(l.coords[0], l.coords[1]), name: l.name } };
      });
    map.addSource("lane-arrows", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: laneMeta.flatMap(({ pts }) =>
          pts.map((p) => ({
            type: "Feature",
            properties: { bearing: p.b },
            geometry: { type: "Point", coordinates: p.c },
          }))
        ),
      },
    });
    map.addLayer({
      id: "lanes-arrows",
      type: "symbol",
      source: "lane-arrows",
      layout: {
        "icon-image": "arrow-lane",
        "icon-rotate": ["get", "bearing"],
        "icon-size": 0.32,
        "icon-allow-overlap": true,
        "icon-rotation-alignment": "map",
      },
      paint: { "icon-opacity": 0.55 },
    });
    map.addSource("lane-labels", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: laneMeta.map(({ label }) => ({
          type: "Feature",
          properties: { name: label.name, bearing: label.b },
          geometry: { type: "Point", coordinates: label.c },
        })),
      },
    });
    map.addLayer({
      id: "lanes-label",
      type: "symbol",
      source: "lane-labels",
      minzoom: 6,
      layout: {
        "text-field": ["get", "name"],
        "text-size": 7.5,
        "text-font": ["Open Sans Regular"],
        "text-letter-spacing": 0.12,
        "text-rotation-alignment": "map",
        "symbol-placement": "point",
        "text-allow-overlap": false,
      },
      paint: { "text-color": "#8FE3CF", "text-halo-color": "#04121F", "text-halo-width": 1.2 },
    });

    /* ── WIND ARROWS — NE monsoon field ───────────────────────── */
    const windPts: { c: [number, number]; b: number; base: number }[] = [
      { c: [68.1, 21.0], b: 59, base: 59 }, { c: [68.6, 21.3], b: 59, base: 59 }, { c: [69.1, 21.6], b: 59, base: 59 }, { c: [69.6, 21.9], b: 59, base: 59 },
      { c: [68.3, 21.7], b: 59, base: 59 }, { c: [68.8, 21.95], b: 59, base: 59 }, { c: [69.4, 22.2], b: 59, base: 59 }, { c: [69.95, 22.45], b: 59, base: 59 },
      { c: [68.5, 22.3], b: 59, base: 59 }, { c: [69.0, 22.5], b: 59, base: 59 }, { c: [69.55, 22.75], b: 59, base: 59 }, { c: [70.1, 22.95], b: 59, base: 59 },
      { c: [68.8, 22.85], b: 59, base: 59 }, { c: [69.3, 23.05], b: 59, base: 59 }, { c: [69.85, 23.2], b: 59, base: 59 },
    ];
    map.addSource("wind-points", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: windPts.map((w) => ({
          type: "Feature",
          properties: { bearing: w.b, base: w.base },
          geometry: { type: "Point", coordinates: w.c },
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
      paint: { "icon-opacity": 0.6 },
    });

    /* ── OCEAN CURRENT VECTORS ───────────────────────────────── */
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
      paint: { "icon-opacity": 0.68 },
    });

    /* ── WEATHER — monsoon squall + wave-energy heat ─────────── */
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
      paint: { "fill-color": "#6E7FCF", "fill-opacity": 0.06 },
    });
    map.addLayer({
      id: "weather-outline",
      type: "line",
      source: "weather-bands",
      paint: { "line-color": "#6E7FCF", "line-width": 0.6, "line-dasharray": [4, 4], "line-opacity": 0.22 },
    });
    map.addSource("weather-label", {
      type: "geojson",
      data: { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [68.3, 23.2] } },
    });
    map.addLayer({
      id: "weather-label",
      type: "symbol",
      source: "weather-label",
      layout: {
        "text-field": "MONSOON SQUALL · 32KT · SEA 2.1M",
        "text-size": 8,
        "text-font": ["Open Sans Regular"],
        "text-letter-spacing": 0.08,
      },
      paint: { "text-color": "#A8B4E8", "text-halo-color": "#04121F", "text-halo-width": 1.3 },
    });
    /* wave-height field — offshore swell gradient (blue heat) */
    const wavePts: { c: [number, number]; w: number }[] = [];
    for (let d = 0; d < 14; d++) {
      const dt = d * 0.42;
      const dans = d * 0.9;
      for (let k = 0; k < 5; k++) {
        const kt = (k + (d % 2) * 0.5) * 0.34;
        wavePts.push({
          c: [67.0 + dt * 0.16 + kt, 19.6 + dans * 0.18 + (k % 2) * 0.3],
          w: 1.1 + ((d + k) % 4) * 0.55,
        });
      }
    }
    map.addSource("wave-field", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: wavePts.map((p) => ({
          type: "Feature",
          properties: { w: p.w },
          geometry: { type: "Point", coordinates: p.c },
        })),
      },
    });
    map.addLayer({
      id: "wave-heat",
      type: "heatmap",
      source: "wave-field",
      paint: {
        "heatmap-weight": ["get", "w"],
        "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 5.5, 18, 9, 40],
        "heatmap-intensity": 0.7,
        "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 4.5, 0, 6, 0.4, 9, 0.15],
        "heatmap-color": [
          "interpolate", ["linear"], ["heatmap-density"],
          0, "rgba(0,0,0,0)",
          0.3, "rgba(23,110,190,0.35)",
          0.6, "rgba(24,160,210,0.5)",
          1, "rgba(96,235,240,0.6)",
        ],
      },
    });

    /* ── PORTS — realistic beacons ───────────────────────────── */
    const ports: { name: string; c: [number, number]; throughput: string; vessels: number }[] = [
      { name: "KANDLA", c: [70.22, 23.03], throughput: "144 MT/yr", vessels: 41 },
      { name: "MUNDRA", c: [69.73, 22.85], throughput: "155 MT/yr", vessels: 63 },
      { name: "SIKKA", c: [69.84, 22.43], throughput: "42 MT/yr", vessels: 17 },
      { name: "OKHA", c: [69.07, 22.47], throughput: "8 MT/yr", vessels: 6 },
      { name: "VADINAR", c: [69.72, 22.48], throughput: "96 MT/yr", vessels: 29 },
    ];
    map.addSource("ports", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: ports.map((p) => ({
          type: "Feature",
          properties: { name: p.name, throughput: p.throughput, vessels: p.vessels },
          geometry: { type: "Point", coordinates: p.c },
        })),
      },
    });
    map.addLayer({
      id: "ports-halo",
      type: "circle",
      source: "ports",
      minzoom: 5,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 5, 8, 11],
        "circle-color": "#38BDF8",
        "circle-blur": 1,
        "circle-opacity": 0.22,
      },
    });
    map.addLayer({
      id: "ports-dot",
      type: "circle",
      source: "ports",
      minzoom: 5.5,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 5.5, 1.4, 8, 2.6],
        "circle-color": "#5FD8EC",
        "circle-stroke-width": 1,
        "circle-stroke-color": "#050B11",
        "circle-opacity": 0.95,
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
        "text-font": ["Open Sans Semibold"],
        "text-letter-spacing": 0.1,
        "text-anchor": "bottom",
        "text-offset": [0, -0.6],
      },
      paint: { "text-color": "#9FE6F2", "text-halo-color": "#06121C", "text-halo-width": 1.4 },
    });

    /* ── ANCHORAGES ──────────────────────────────────────────── */
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

    /* ── TRAFFIC DENSITY HEAT (live AIS field) ───────────────── */
    if (!map.getSource("traffic-density")) {
      map.addSource("traffic-density", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
    }
    if (!map.getLayer("density-heat")) {
      map.addLayer({
        id: "density-heat",
        type: "heatmap",
        source: "traffic-density",
        paint: {
          "heatmap-weight": ["get", "w"],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 6, 22, 9, 55],
          "heatmap-intensity": 1,
          "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 5.5, 0.3, 9.2, 0.12],
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0, "rgba(0,0,0,0)",
            0.15, "rgba(56,189,248,0.2)",
            0.45, "rgba(224,134,61,0.4)",
            0.7, "rgba(239,140,60,0.5)",
            1, "rgba(239,68,68,0.55)",
          ],
        },
      });
    }

    /* ── RK4 REVERSE DRIFT PATH ──────────────────────────────── */
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
    /* hourly reconstruction markers */
    map.addSource("drift-h-marks", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: driftLine.map((p) => ({
          type: "Feature",
          properties: { hour: p.hourOffset },
          geometry: { type: "Point", coordinates: [p.longitude, p.latitude] },
        })),
      },
    });
    map.addLayer({
      id: "drift-h-dots",
      type: "circle",
      source: "drift-h-marks",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 7, 1.1, 10, 2.2],
        "circle-color": "#7DD3FC",
        "circle-stroke-width": 0.6,
        "circle-stroke-color": "#04121F",
        "circle-opacity": 0.55,
      },
    });
    map.addLayer({
      id: "drift-h-labels",
      type: "symbol",
      source: "drift-h-marks",
      minzoom: 8,
      layout: {
        "text-field": ["concat", "T-", ["to-string", ["get", "hour"]]],
        "text-size": 7,
        "text-font": ["Open Sans Regular"],
        "text-offset": [0, -0.8],
        "text-anchor": "bottom",
        "text-allow-overlap": true,
      },
      paint: { "text-color": "#7DD3FC", "text-halo-color": "#04121F", "text-halo-width": 1.2 },
    });

    /* origin uncertainty ellipse */
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
      id: "drift-ellipse",
      type: "circle",
      source: "drift-origin",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 7, 3, 9, 6],
        "circle-color": "#D6A84F",
        "circle-blur": 1,
        "circle-opacity": 0.4,
      },
    });
    map.addLayer({
      id: "drift-origin",
      type: "circle",
      source: "drift-origin",
      paint: {
        "circle-radius": 4.5,
        "circle-color": "#D6A84F",
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#050B11",
        "circle-opacity": 0.95,
      },
    });
    map.addSource("drift-origin-label", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: [origin.longitude, origin.latitude] },
      },
    });
    map.addLayer({
      id: "drift-origin-label",
      type: "symbol",
      source: "drift-origin-label",
      minzoom: 7,
      layout: {
        "text-field": "DISCHARGE ORIGIN · T-12H",
        "text-size": 7.5,
        "text-font": ["Open Sans Semibold"],
        "text-letter-spacing": 0.1,
        "text-anchor": "bottom",
        "text-offset": [0, -1.1],
      },
      paint: { "text-color": "#E6C078", "text-halo-color": "#04121F", "text-halo-width": 1.3 },
    });
  }

  /* ═══════════════════════════════════════════════════════════
     OIL SPILL LAYERS — thin (trail etc.) SYNCED ENGINE
     ═══════════════════════════════════════════════════════════ */
  function pointInRing(pt: [number, number], ring: number[][]): boolean {
    const [x, y] = pt;
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1];
      const xj = ring[j][0], yj = ring[j][1];
      const intersect =
        yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function removeOilLayers(map: maplibregl.Map) {
    const ids = [
      "oil-fill", "oil-sheen", "oil-heat", "oil-glow", "oil-outline",
      "oil-centroid", "oil-ring", "oil-sar-dark",
    ];
    ids.forEach((id) => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    const srcs = [
      "oil-poly", "oil-heat-pts", "oil-centroid-src", "oil-sar",
    ];
    srcs.forEach((s) => {
      if (map.getSource(s)) map.removeSource(s);
    });
  }

  function addOilLayers(map: maplibregl.Map, inc: Incident) {
    const coords: number[][] = inc.spillGeometry.polygonGeoJson.coordinates[0];
    const ring = coords as [number, number][];

    /* SAR dark anomaly — the low-backscatter footprint the oil damps */
    map.addSource("oil-sar", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: { eventId: inc.eventId },
        geometry: { type: "Polygon", coordinates: [ring] },
      },
    });
    map.addLayer({
      id: "oil-sar-dark",
      type: "fill",
      source: "oil-sar",
      paint: {
        "fill-color": "#01060C",
        "fill-opacity": ["interpolate", ["linear"], ["zoom"], 5, 0, 7, 0.22, 9.5, 0.4],
      },
    });

    /* fallback tint + click target (also the interactive surface) */
    map.addSource("oil-poly", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: { eventId: inc.eventId },
        geometry: { type: "Polygon", coordinates: [ring] },
      },
    });
    map.addLayer({
      id: "oil-fill",
      type: "fill",
      source: "oil-poly",
      paint: {
        "fill-color": "#D6A84F",
        "fill-opacity": 0.1,
        "fill-outline-color": "#D6A84F",
      },
    });

    /* procedural multilayered sheen — WebGL custom layer */
    try {
      const created = createOilSheenLayer("oil-sheen", ring);
      if (map.getLayer("oil-sheen")) map.removeLayer("oil-sheen");
      map.addLayer(created.layer);
      sheenRef.current = created.handle;
      sheenRef.current.setAlpha(0.3);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("SD: oil sheen engine unavailable, using tint only.", err);
    }

    /* contamination heatmap — yellow → orange → crimson near origin */
    const bb = inc.spillGeometry.boundingBox;
    const heatPts: { c: [number, number]; w: number }[] = [];
    const cx = inc.spillGeometry.centroid.longitude;
    const cy = inc.spillGeometry.centroid.latitude;
    let maxH = 1e-9;
    for (let i = 0; i < 90; i++) {
      const lng = bb.lowerLeft.longitude + Math.random() * (bb.upperRight.longitude - bb.lowerLeft.longitude);
      const lat = bb.lowerLeft.latitude + Math.random() * (bb.upperRight.latitude - bb.lowerLeft.latitude);
      if (!pointInRing([lng, lat], ring)) continue;
      const d = Math.hypot(lng - cx, lat - cy);
      const w = Math.max(0.02, 1 - d * 3.2);
      if (w > maxH) maxH = w;
      heatPts.push({ c: [lng, lat], w });
    }
    heatPts.forEach((p) => (p.w = p.w / (maxH * 0.6)));
    map.addSource("oil-heat-pts", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: heatPts.map((p) => ({
          type: "Feature",
          properties: { w: p.w },
          geometry: { type: "Point", coordinates: p.c },
        })),
      },
    });
    map.addLayer({
      id: "oil-heat",
      type: "heatmap",
      source: "oil-heat-pts",
      paint: {
        "heatmap-weight": ["get", "w"],
        "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 7, 20, 9.5, 46],
        "heatmap-intensity": 0.85,
        "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 6.5, 0, 7.6, 0.55, 9.5, 0.3],
        "heatmap-color": [
          "interpolate", ["linear"], ["heatmap-density"],
          0, "rgba(0,0,0,0)",
          0.2, "rgba(255,238,140,0.22)",
          0.45, "rgba(255,180,70,0.42)",
          0.7, "rgba(255,110,50,0.55)",
          1, "rgba(226,40,45,0.66)",
        ],
      },
    });

    /* boundary outline — organic GeoJSON edge */
    map.addLayer({
      id: "oil-glow",
      type: "line",
      source: "oil-poly",
      paint: { "line-color": "#E0863D", "line-width": 7, "line-blur": 7, "line-opacity": 0.24 },
    });
    map.addLayer({
      id: "oil-outline",
      type: "line",
      source: "oil-poly",
      paint: { "line-color": "#E0863D", "line-width": 1.4, "line-opacity": 0.75 },
    });

    /* centroid marker */
    const centroid = inc.spillGeometry.centroid;
    map.addSource("oil-centroid-src", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: [centroid.longitude, centroid.latitude] },
      },
    });
    map.addLayer({
      id: "oil-centroid",
      type: "circle",
      source: "oil-centroid-src",
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
      source: "oil-centroid-src",
      paint: {
        "circle-radius": 4,
        "circle-color": "#D6A84F",
        "circle-opacity": 0,
        "circle-stroke-width": 1,
        "circle-stroke-color": "#E0863D",
      },
    });

    if (map.getLayer("oil-fill")) {
      map.on("click", "oil-fill", () => onSpillClick?.(inc));
      map.on("mouseenter", "oil-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "oil-fill", () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("click", "oil-outline", () => onSpillClick?.(inc));
      map.on("mouseenter", "oil-outline", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "oil-outline", () => {
        map.getCanvas().style.cursor = "";
      });
    }
  }

  /* Port hover card popups */
  function wirePortPopups(map: maplibregl.Map) {
    if (!map.getLayer("ports-dot")) return;
    for (const evt of ["mouseenter", "click"] as const) {
      map.on(evt, "ports-dot", (e) => {
        const feat = e.features?.[0];
        if (!feat) return;
        const props = feat.properties as any;
        const name = props?.name ?? "PORT";
        const throughput = props?.throughput ?? "—";
        const vessels = props?.vessels ?? "—";
        const el = document.createElement("div");
        el.className =
          "pointer-events-none rounded-md bg-bg-1/95 px-2.5 py-1.5 font-mono text-[10px] text-ink ring-1 ring-line shadow-float";
        el.innerHTML = `
          <div class="flex items-center gap-1.5 font-semibold text-aqua">
            <span class="h-1.5 w-1.5 rounded-full bg-aqua animate-pulse"></span>${name}
          </div>
          <div class="mt-1 flex gap-3 text-ink-dim">
            <span><span class="text-ink-faint">THROUGHPUT</span> ${throughput}</span>
            <span><span class="text-ink-faint">VESSELS</span> ${vessels}</span>
          </div>`;
        const popup = new maplibregl.Popup({
          offset: 10,
          closeButton: false,
          closeOnClick: false,
          className: "sd-port-popup",
        })
          .setLngLat((feat.geometry as any).coordinates)
          .setDOMContent(el)
          .addTo(map);
        const clear = () => {
          popup.remove();
          map.off("mousemove", clear);
        };
        map.once("mousemove", () => {}); /* noop to release the handler flow */
        setTimeout(clear, 2600);
      });
    }
  }

  /* ═══════════════════════════════════════════════════════════
     MAP INIT
     ═══════════════════════════════════════════════════════════ */
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
              "raster-saturation": -0.15,
              "raster-contrast": 0.18,
              "raster-brightness-min": 0.72,
              "raster-brightness-max": 1.05,
              "raster-fade-duration": 200,
            },
          },
        ],
      },
      center: [69.112, 21.845],
      zoom: 8,
      attributionControl: false,
      pitchWithRotate: false,
      dragRotate: false,
      canvasContextAttributes: { antialias: true },
    });

    map.on("load", () => {
      setMapLoaded(true);
      map.resize();
      addBaseLayers(map);
      wirePortPopups(map);
    });

    map.on("move", () => {
      const c = map.getCenter();
      setReadout({ lat: c.lat, lng: c.lng, z: map.getZoom() });
    });

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      markersByImoRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── OIL LAYERS SYNCED TO THE SELECTED INCIDENT ────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !incident) return;
    removeOilLayers(map);
    addOilLayers(map, incident);
    return () => {
      /* keep layers for the drawer switching back */
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incident, mapLoaded]);

  /* ── SMOOTH RK4 BACKTRACK ──────────────────────────────────── */
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
      const ogLabel = map.getSource("drift-origin-label") as maplibregl.GeoJSONSource | undefined;
      if (ogLabel) {
        ogLabel.setData({
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: coords[coords.length - 1] },
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

  /* ── OIL PULSE — soft amber contamination ring every 5 s ───── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !incident || !map.getLayer("oil-ring")) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      if (!document.hidden) {
        const k = ((t - t0) / 5000) % 1;
        map.setPaintProperty("oil-ring", "circle-radius", 4 + k * 24);
        map.setPaintProperty("oil-ring", "circle-opacity", 0.38 * (1 - k) * (1 - k));
      }
      raf = requestAnimationFrame(step);
    };
    const onVis = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        map.setPaintProperty("oil-ring", "circle-opacity", 0);
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

  /* ── CURRENT PARTICLES + SUBTLE CAUSTIC SHIMMER ────────────── */
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

    type P = { x: number; y: number; vx: number; vy: number; r: number; a: number; ph: number };
    const mk = (): P => {
      const s = 5 + Math.random() * 10;
      const a = 0.85 + Math.random() * 0.3;
      return {
        x: Math.random() * cv.width,
        y: Math.random() * cv.height,
        vx: a * s,
        vy: a * s * 0.72,
        r: 0.5 + Math.random() * 0.9,
        a: 0.08 + Math.random() * 0.18,
        ph: Math.random() * Math.PI * 2,
      };
    };
    const parts: P[] = Array.from({ length: reduced ? 0 : 44 }, mk);
    const eddies: P[] = Array.from({ length: reduced ? 0 : 6 }, () => ({
      ...mk(), r: 2 + Math.random(), a: 0.05 + Math.random() * 0.08, ph: Math.random() * 6,
    }));

    let raf = 0;
    let tickMs = 0;
    const draw = (t: number) => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      tickMs = t;
      for (const p of [...parts, ...eddies]) {
        p.x += p.vx * 0.016;
        p.y += p.vy * 0.016;
        if (p.x > cv.width + 4) p.x = -4;
        if (p.y > cv.height + 4) p.y = -4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(122,205,244,${p.a})`;
        ctx.fill();
      }
      /* very subtle caustic veils — barely-there moving arcs */
      if (!reduced) {
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
          const bcx = cv.width * (0.2 + (i % 4) * 0.2);
          const bcy = cv.height * (0.6 + ((i / 2) % 2) * 0.3);
          const q = 0.5 + 0.5 * Math.sin(tickMs / 2400 + i * 1.7);
          ctx.strokeStyle = `rgba(76,190,235,${0.05 + q * 0.05})`;
          ctx.beginPath();
          ctx.ellipse(bcx, bcy, 14 + i * 9 + q * 8, 5 + i * 2.4 + q * 3, i * 0.9, 0, Math.PI * 1.4);
          ctx.stroke();
        }
      }
      if (reduced) return;
      raf = requestAnimationFrame(draw);
    };
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (document.hidden) return;
      if (reduced) draw(performance.now());
      else raf = requestAnimationFrame(draw);
    };
    draw(performance.now());
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", fit);
      cancelAnimationFrame(raf);
    };
  }, [mapLoaded]);

  /* ── LIVE ENVIRONMENT — wind/current arrows slowly rotate ──── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    let t = 0;
    const i = setInterval(() => {
      if (document.hidden) return;
      t += 1;
      const wind = map.getSource("wind-points") as maplibregl.GeoJSONSource | undefined;
      if (wind) {
        const fc = (wind as any)._data ?? useCommandStore.getState().layers.weather;
        if (fc) {
          const data = (wind as any)._data;
          if (data && data.features) {
            const feats = (data.features as any[]).map((f, idx) => ({
              ...f,
              properties: {
                ...f.properties,
                bearing: (f.properties?.base ?? 59) + Math.sin(t / 1.4 + idx * 0.8) * 5,
              },
            }));
            wind.setData({ type: "FeatureCollection", features: feats });
          }
        }
      }
      const cur = map.getSource("current-points") as maplibregl.GeoJSONSource | undefined;
      if (cur) {
        const data = (cur as any)._data;
        if (data && data.features) {
          const feats = (data.features as any[]).map((f, idx) => ({
            ...f,
            properties: {
              ...f.properties,
              bearing: (f.properties?.bearing ?? 119) + Math.sin(t / 1.1 + idx * 0.5) * 4,
            },
          }));
          cur.setData({ type: "FeatureCollection", features: feats });
        }
      }
    }, 1500);
    return () => clearInterval(i);
  }, [mapLoaded]);

  /* ── IDLE BREATHING CAMERA — barely-there drone drift ──────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    let raf = 0;
    let breathing = false;
    let baseZoom = map.getZoom();
    let selfMove = false;
    const onMoveStart = () => {
      if (!selfMove) breathing = false;
    };
    const loop = (t: number) => {
      const s = useCommandStore.getState();
      if (!document.hidden && !s.isDemoRunning) {
        if (!breathing && !map.isMoving()) {
          breathing = true;
          baseZoom = map.getZoom();
        }
        if (breathing && !map.isMoving()) {
          const breathe = Math.sin(t / 11000) * 0.045 + Math.sin(t / 47000) * 0.035;
          selfMove = true;
          map.jumpTo({ center: map.getCenter(), zoom: baseZoom + breathe });
          selfMove = false;
        }
      } else {
        breathing = false;
      }
      raf = requestAnimationFrame(loop);
    };
    map.on("movestart", onMoveStart);
    raf = requestAnimationFrame(loop);
    return () => {
      map.off("movestart", onMoveStart);
      cancelAnimationFrame(raf);
    };
  }, [mapLoaded]);

  /* ── SENTINEL SWATH — fade on load / SAR stage ────────────── */
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

  /* ── SWATH LABEL ───────────────────────────────────────────── */
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

  /* ── SENTINEL ORBIT ────────────────────────────────────────── */
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

  /* ── SUSPECT VESSEL — rotating amber halo + confidence ring ── */
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
          <span class="absolute h-11 w-11 rounded-full" style="animation:sd-halo-rot 9s linear infinite;background:conic-gradient(from 0deg, transparent 0%, rgba(224,134,61,0.8) 28%, transparent 56%)"></span>
          <span class="absolute h-9 w-9 rounded-full border border-amber/40"></span>
          <span class="absolute h-9 w-9 rounded-full border border-amber/15" style="animation:sd-swell 2.6s ease-out infinite"></span>
          <span class="absolute h-5 w-5 rounded-full border border-amber/60 animate-ping opacity-60"></span>
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoStep, isDemoRunning, hasVerified, mapLoaded, propVessels]);

  /* ── STAGE-2 SENTINEL DETECTION TIMELINE ───────────────────── */
  const stage2Active = isDemoRunning && demoStep === 2;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !stage2Active || !incident) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const s = useCommandStore.getState();
    const t0 = performance.now();
    let raf = 0;
    let lastBucket = -1;
    let oilOn = s.layers.oil;
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
        sheenRef.current?.setVisible(false);
      }
      if (ms >= 3000) {
        if (!oilOn) {
          oilOn = true;
          oilRamp = t;
          useCommandStore.getState().setLayer("oil", true);
          sheenRef.current?.setVisible(true);
        }
        const k = Math.min(1, (t - oilRamp) / 1200);
        setP("oil-fill", "fill-opacity", 0.1 * k);
        setP("oil-outline", "line-opacity", 0.75 * k);
        setP("oil-glow", "line-opacity", 0.35 * k);
        sheenRef.current?.setAlpha(0.3 * k);
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
      const st = useCommandStore.getState();
      st.setDetectionMs(null);
      if (oilOn) st.setLayer("oil", true);
      sheenRef.current?.setVisible(true);
      sheenRef.current?.setAlpha(0.3);
      setP("swath-fill", "fill-opacity", 0.1);
      setP("swath-outline", "line-opacity", 0.55);
      setP("oil-fill", "fill-opacity", 0.1);
      setP("oil-outline", "line-opacity", 0.75);
      setP("oil-glow", "line-opacity", 0.35);
    };
  }, [mapLoaded, stage2Active, incident]);

  /* ── STAGE-2 SCENE MARKERS ─────────────────────────────────── */
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

  /* ── MISSION ALERTS TOAST ──────────────────────────────────── */
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
    vis("lanes-arrows", layers.shipping);
    vis("lanes-label", layers.shipping);
    vis("oil-sar-dark", layers.oil);
    vis("oil-fill", layers.oil);
    vis("oil-heat", layers.oil);
    vis("oil-glow", layers.oil);
    vis("oil-outline", layers.oil);
    vis("oil-centroid", layers.oil);
    vis("oil-ring", layers.oil);
    sheenRef.current?.setVisible(layers.oil);
    vis("drift-path", layers.drift);
    vis("drift-origin", layers.drift);
    vis("drift-ellipse", layers.drift);
    vis("drift-h-dots", layers.drift);
    vis("drift-h-labels", layers.drift);
    vis("drift-origin-label", layers.drift);
    vis("density-heat", layers.ais);
    vis("wind-arrows", layers.weather);
    vis("weather-bands", layers.weather);
    vis("weather-outline", layers.weather);
    vis("weather-label", layers.weather);
    vis("wave-heat", layers.weather);
    vis("current-arrows", layers.currents);
    vis("bathy-lines", layers.bathy);
    vis("bathy-labels", layers.bathy);
    vis("shelf-rim", layers.bathy);
    vis("depth-deep", layers.bathy);
    vis("depth-mid", layers.bathy);
    vis("depth-shelf", layers.bathy);
    vis("coast-glow", layers.coast);
    vis("coast-line", layers.coast);
    vis("coast-sediment", layers.coast);
    vis("coast-tidal", layers.coast);
    vis("swath-fill", layers.sentinel);
    vis("swath-outline", layers.sentinel);
    vis("swath-core", layers.sentinel);
    vis("sentinel-axis", layers.sentinel);
    vis("sentinel-dir", layers.sentinel);
  }, [layers, mapLoaded]);

  /* ── AIS VESSELS — realistic silhouettes, trails, live fix ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !map.getSource("graticule")) return;

    const build = () => {
      const s = useCommandStore.getState();
      const list = propVessels ?? s.candidateVessels;
      const selImo = s.selectedVesselImo;
      const onSel = onSelectVesselRef.current;

      /* drop previous markers and their trail/proj layers */
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      markersByImoRef.current.clear();
      list.forEach((v) => {
        [`trail-${v.imo}`, `trail-dots-${v.imo}`, `proj-${v.imo}`, `gap-${v.imo}`].forEach((id) => {
          if (map.getLayer(id)) map.removeLayer(id);
          if (map.getSource(id)) map.removeSource(id);
        });
      });

      if (!s.layers.ais || list.length === 0) return;

      const zoom = map.getZoom();

      /* live traffic-density field */
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

      /* zoomed out → spatial clusters */
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
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <rect x="6.6" y="2.6" width="10.8" height="18.8" rx="5.4" fill="currentColor"/>
                  <rect x="6.6" y="2.6" width="10.8" height="18.8" rx="5.4" fill="#050B11" opacity="0.32"/>
                </svg>
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

      /* individual vessels */
      list.forEach((v) => {
        /* 30-minute AIS trail — backward-projected, timestamped */
        const N = 9;
        const total = Math.max(0.008, v.speedOverGround / 120);
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
        const trailColor = v.attributionRank === 1 ? "#EF4444" : "#38BDF8";

        map.addSource(`trail-${v.imo}`, {
          type: "geojson",
          data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: pts } },
        });
        map.addLayer({
          id: `trail-${v.imo}`,
          type: "line",
          source: `trail-${v.imo}`,
          layout: { visibility: "none" },
          paint: {
            "line-color": trailColor,
            "line-width": 1.1,
            "line-opacity": 0.5,
            "line-dasharray": [2, 2],
          },
        });

        /* 5-minute time pips on the trail */
        map.addSource(`trail-dots-${v.imo}`, {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [0, 2, 4, 6, 8]
              .filter((idx) => idx < pts.length)
              .map((idx) => ({
                type: "Feature",
                properties: {},
                geometry: { type: "Point", coordinates: pts[idx] },
              })),
          },
        });
        map.addLayer({
          id: `trail-dots-${v.imo}`,
          type: "circle",
          source: `trail-dots-${v.imo}`,
          layout: { visibility: "none" },
          paint: {
            "circle-radius": 2,
            "circle-color": "#7DD3FC",
            "circle-stroke-width": 0.5,
            "circle-stroke-color": "#04121F",
            "circle-opacity": 0.8,
          },
        });

        /* 10-minute projected heading (dashed white) */
        const hd = (v.heading * Math.PI) / 180;
        const fwd: [number, number][] = [];
        const projScale = Math.max(0.004, v.speedOverGround / 9000);
        for (let i = 1; i <= 3; i++) {
          fwd.push([
            v.longitude + Math.sin(hd) * (i * projScale) / kLat,
            v.latitude + Math.cos(hd) * (i * projScale),
          ]);
        }
        map.addSource(`proj-${v.imo}`, {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: [[v.longitude, v.latitude], ...fwd] },
          },
        });
        map.addLayer({
          id: `proj-${v.imo}`,
          type: "line",
          source: `proj-${v.imo}`,
          layout: { visibility: "none" },
          paint: {
            "line-color": "#E8F0F3",
            "line-width": 0.8,
            "line-opacity": 0.45,
            "line-dasharray": [0.5, 2.5],
          },
        });

        /* AIS blackout segment — highlighted red when a transponder gap exists */
        if (/gap/i.test(v.aisAnomaly)) {
          const gs = Math.min(2, N - 3);
          map.addSource(`gap-${v.imo}`, {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: { type: "LineString", coordinates: pts.slice(gs, gs + 3) },
            },
          });
          map.addLayer({
            id: `gap-${v.imo}`,
            type: "line",
            source: `gap-${v.imo}`,
            layout: { visibility: "none" },
            paint: {
              "line-color": "#EF4444",
              "line-width": 1.6,
              "line-opacity": 0.75,
              "line-dasharray": [3, 1],
            },
          });
        }

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
        const mtr = shipMetrics(v);

        el.className = `group cursor-pointer select-none ${dimmed}`;
        const wakeLen = 20 + Math.min(30, v.speedOverGround * 2);
        el.innerHTML = `
          <div class="relative flex items-center justify-center">
            <div style="transform: translateX(-50%) rotate(${v.heading + 180}deg); transform-origin:50% 50%; width:${wakeLen}px; height:12px; clip-path:polygon(0 100%, 100% 100%, 50% 0); background:linear-gradient(to top, rgba(56,189,248,0.34), rgba(56,189,248,0.06));" class="absolute left-1/2 top-1/2 pointer-events-none opacity-80"></div>
            <div style="transform: translateX(-50%) rotate(${v.courseOverGround}deg); transform-origin:50% 100%;" class="pointer-events-none absolute bottom-[9px] left-1/2 h-[22px] w-px bg-current opacity-60">
              <div class="absolute -top-[1px] left-1/2 h-0 w-0 -translate-x-1/2 border-x-[3px] border-b-[5px] border-x-transparent border-b-current"></div>
            </div>
            <div style="transform:rotate(${v.heading}deg); filter:drop-shadow(0 0 2px rgba(2,8,14,0.9));" class="relative" data-ship>
              ${shipSilhouette(v, color)}
            </div>
            <div class="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden whitespace-nowrap rounded-md border border-line-active bg-panel px-2 py-1.5 font-mono text-[10px] leading-tight text-ink shadow-float group-hover:block">
              <div class="font-semibold text-aqua">${v.vesselName}</div>
              <div class="text-ink-dim mt-0.5">IMO ${v.imo} · ${v.speedOverGround.toFixed(1)} kn</div>
              <div class="text-ink-faint">HDG ${v.heading}° · COG ${v.courseOverGround}° · ${v.lengthMeters ?? "—"}m</div>
              <div class="text-ink-faint mt-0.5">${v.aisStatus}${v.aisAnomaly ? " · ⚠ " + v.aisAnomaly : ""}</div>
            </div>
            ${
              isTop
                ? `<div class="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red ring-2 ring-bg-1"></div>`
                : ""
            }
          </div>
        `;

        const showDetail = () => {
          map.setLayoutProperty(`trail-${v.imo}`, "visibility", "visible");
          map.setLayoutProperty(`trail-dots-${v.imo}`, "visibility", "visible");
          map.setLayoutProperty(`proj-${v.imo}`, "visibility", "visible");
          const gid = `gap-${v.imo}`;
          if (map.getLayer(gid)) map.setLayoutProperty(gid, "visibility", "visible");
        };
        const hideDetail = () => {
          map.setLayoutProperty(`trail-${v.imo}`, "visibility", "none");
          map.setLayoutProperty(`trail-dots-${v.imo}`, "visibility", "none");
          map.setLayoutProperty(`proj-${v.imo}`, "visibility", "none");
          const gid = `gap-${v.imo}`;
          if (map.getLayer(gid)) map.setLayoutProperty(gid, "visibility", "none");
        };
        el.addEventListener("mouseenter", showDetail);
        el.addEventListener("mouseleave", hideDetail);
        el.addEventListener("click", () => {
          useCommandStore.getState().setSelectedVesselImo(v.imo);
          onSel?.(v);
        });
        if (isSelected) showDetail();

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([v.longitude, v.latitude])
          .addTo(map);
        markersRef.current.push(marker);
        markersByImoRef.current.set(v.imo, marker);
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
      markersByImoRef.current.clear();
      const s = useCommandStore.getState();
      (propVessels ?? s.candidateVessels).forEach((v) => {
        [`trail-${v.imo}`, `trail-dots-${v.imo}`, `proj-${v.imo}`, `gap-${v.imo}`].forEach((id) => {
          if (map.getLayer(id)) map.removeLayer(id);
          if (map.getSource(id)) map.removeSource(id);
        });
      });
    };
  }, [mapLoaded, propVessels]);

  /* ── LIVE AIS — tiny position jitter so the fleet breathes ─── */
  useEffect(() => {
    if (!mapLoaded) return;
    let t = 0;
    const i = setInterval(() => {
      if (document.hidden) return;
      t += 1;
      const s = useCommandStore.getState();
      if (!s.layers.ais || !mapRef.current) return;
      const zoom = mapRef.current.getZoom();
      if (zoom < 7.2) return;
      markersByImoRef.current.forEach((m, imo) => {
        const v = s.candidateVessels.find((vv) => vv.imo === imo);
        if (!v) return;
        const amp = Math.min(8e-5, v.speedOverGround * 6e-6);
        m.setLngLat([
          v.longitude + Math.sin((t * 1.7 + imo) % 7) * amp,
          v.latitude + Math.cos((t * 1.3 + imo * 2) % 5) * amp,
        ]);
      });
    }, 2300);
    return () => clearInterval(i);
  }, [mapLoaded]);

  /* ── OIL AREA LABEL + HEAT SHIMMER ─────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !incident) return;

    const el = document.createElement("div");
    el.className =
      "pointer-events-none flex items-center gap-1 whitespace-nowrap rounded-md bg-bg-1 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber ring-1 ring-line";
    el.textContent = `${incident.spillGeometry.areaKm2} km² · SHEEN`;

    const label = new maplibregl.Marker({ element: el, anchor: "top" })
      .setLngLat([
        incident.spillGeometry.centroid.longitude,
        incident.spillGeometry.centroid.latitude,
      ])
      .addTo(map);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incident, mapLoaded, layers.oil]);

  /* ── CINEMATIC FLY-TO ON INCIDENT SELECTION ────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !incident) return;
    const c = incident.spillGeometry.centroid;
    const cur = map.getCenter();
    const far = Math.hypot(cur.lng - c.longitude, cur.lat - c.latitude);
    if (far > 0.02 && !isDemoRunning) {
      map.flyTo({
        center: [c.longitude, c.latitude],
        zoom: Math.max(8, map.getZoom()),
        duration: 1400,
        essential: true,
        curve: 1.4,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  /* sea-state telemetry derived from the drift vector field */
  const lastDrift = driftLine[driftLine.length - 1];
  const windKn = lastDrift ? (lastDrift.windSpeed * 1.944).toFixed(0) : "12";
  const curKn = lastDrift ? (lastDrift.currentSpeed * 1.944).toFixed(1) : "1.0";
  const seaState = lastDrift
    ? lastDrift.windSpeed >= 7
      ? "3 · MODERATE"
      : lastDrift.windSpeed >= 4.5
        ? "2 · SLIGHT"
        : "1 · CALM"
    : "2 · SLIGHT";

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-bg-0 ${interactive ? "select-none" : ""}`}
    >
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />

      {/* ── CINEMATIC GRADE — photoreal | satellite, not Google ── */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] mix-blend-soft-light"
        style={{
          background:
            "linear-gradient(180deg, rgba(30,80,120,0.14) 0%, rgba(10,34,52,0.06) 30%, rgba(4,18,30,0.1) 100%), radial-gradient(95% 65% at 30% 80%, rgba(28,110,140,0.18), transparent 62%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1] mix-blend-multiply"
        style={{ background: "rgba(7,26,45,0.42)" }}
      />
      {/* rim light — cyan atmospheric horizon */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] mix-blend-screen"
        style={{
          background:
            "radial-gradient(140% 90% at 50% -12%, rgba(86,190,240,0.10), transparent 55%), radial-gradient(90% 55% at 88% 62%, rgba(40,120,170,0.08), transparent 60%)",
        }}
      />
      {/* deep-ocean vignette */}
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{ background: "radial-gradient(120% 100% at 50% 40%, transparent 55%, rgba(3,8,12,0.55) 100%)" }}
      />

      {/* Drifting current particles + caustics */}
      <canvas
        ref={particlesRef}
        className="pointer-events-none absolute inset-0 z-[2] h-full w-full"
      />

      <style>{`@keyframes sd-pop{0%{opacity:0;transform:translate(-50%,-6px)}100%{opacity:1;transform:translate(-50%,0)}}
@keyframes sd-sweep{0%{transform:translateX(-150%)}100%{transform:translateX(150%)}}
@keyframes sd-scan{0%{top:-3%;opacity:0}10%{opacity:.8}90%{opacity:.35}100%{top:97%;opacity:0}}
@keyframes sd-ring{0%{transform:scale(.35);opacity:.9}100%{transform:scale(2.6);opacity:0}}
@keyframes sd-swell{0%{transform:scale(.2);opacity:.9}100%{transform:scale(3);opacity:0}}
@keyframes sd-halo-rot{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes sd-heat{0%{transform:translate(-50%,-50%) scale(1) rotate(0deg)}33%{transform:translate(-50%,-54%) scale(1.07) rotate(1.2deg)}66%{transform:translate(-50%,-46%) scale(.96) rotate(-1.2deg)}100%{transform:translate(-50%,-50%) scale(1) rotate(0deg)}}
@keyframes sd-alert{0%{opacity:0;transform:translate(-50%,-8px)}12%{opacity:1;transform:translate(-50%,0)}82%{opacity:1}100%{opacity:0;transform:translate(-50%,-4px)}}
@keyframes sd-draw{from{stroke-dashoffset:600}to{stroke-dashoffset:0}}
.sd-port-popup .maplibregl-popup-content{padding:0;background:transparent;border-radius:8px}
@media(prefers-reduced-motion:reduce){.sd-heat{animation:none!important}}
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

      {/* ── SATELLITE TELEMETRY HUD — glass tactical panel ─────── */}
      {incident && (
        <div className="pointer-events-none absolute right-3 top-[118px] z-10 w-48 rounded-lg bg-bg-1/95 p-2.5 font-mono text-[10px] leading-relaxed ring-1 ring-line shadow-float">
          <div className="flex items-center gap-1.5 text-aqua">
            <Satellite className="h-3.5 w-3.5" />
            <span className="font-semibold tracking-wide">SENTINEL-1A</span>
            <span className="ml-auto tnum text-ink-faint">{clockUtc}</span>
          </div>
          <div className="mt-1.5 space-y-1 text-ink-dim">
            <div className="flex justify-between"><span className="text-ink-faint">ORBIT</span><span className="tnum text-ink">#{incident.sarMetadata.relativeOrbit} · 693 KM</span></div>
            <div className="flex justify-between"><span className="text-ink-faint">INCIDENCE</span><span className="tnum text-ink">{incident.sarMetadata.incidenceAngleDeg.toFixed(1)}°</span></div>
            <div className="flex justify-between"><span className="text-ink-faint">POLARIZATION</span><span className="text-ink">{incident.sarMetadata.polarization.join(" + ")}</span></div>
            <div className="flex justify-between"><span className="text-ink-faint">RESOLUTION</span><span className="tnum text-ink">{incident.sarMetadata.resolutionMeters ?? 10} M</span></div>
            <div className="flex justify-between"><span className="text-ink-faint">ACQUISITION</span><span className="tnum text-ink">{incident.sarMetadata.acquisitionUtc.substring(11, 19)}Z</span></div>
          </div>
          <div className="mt-2 border-t border-line pt-1.5">
            <div className="flex justify-between"><span className="text-ink-faint">SEA STATE</span><span className="text-teal">{seaState}</span></div>
            <div className="flex justify-between"><span className="text-ink-faint">WIND</span><span className="tnum text-ink">{windKn} KN · 252°</span></div>
            <div className="flex justify-between"><span className="text-ink-faint">CURRENT</span><span className="tnum text-ink">{curKn} KN · 235°</span></div>
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