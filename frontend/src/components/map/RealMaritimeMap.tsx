"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useCommandStore } from "@/lib/store";
import { CandidateVessel, Incident, DriftTrajectoryPoint } from "@/lib/types";
import { LayerChips } from "./LayerChips";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ShieldCheck,
  Satellite,
  Compass,
  Layers,
  Activity,
  Maximize2,
  Box,
  Eye,
} from "lucide-react";
import {
  createOilSheenLayer,
  shipSilhouette,
  generateVesselWake,
  createBathymetryLayer,
  createParticleLayer,
  createLaneFlowLayer,
  createPortLightLayer,
  createBloomLayer,
  createSwathSweepLayer,
  createEnvironmentalHeatmapLayer,
  INFRASTRUCTURE_NODES,
  SUBSEA_PIPELINES,
  ENVIRONMENTAL_ZONES,
  DREDGED_CHANNELS,
  calculateHudPlacement,
  HudLeaderLine,
  FloatingGlassHud,
  IncidentIntelligenceHud,
  VesselInvestigationHud,
  PortInfrastructureHud,
  flyToPose,
  focusOnVessel,
  focusOnSpill,
  DEMO_STAGE_POSES,
  THEATRE_OVERVIEW,
  type SheenLayerHandle,
  type ContaminationMode,
  type BloomHandle,
  type BloomPoint,
  type SwathHandle,
  type LivingHandle,
  type InfrastructureNode,
} from "./engine";

/* Compass bearing (degrees clockwise from north) between two coordinates */
function bearingDeg(a: [number, number], b: [number, number]): number {
  const p = Math.PI / 180;
  const dLon = (b[0] - a[0]) * p * Math.cos(((b[1] + a[1]) / 2) * p);
  const dLat = (b[1] - a[1]) * p;
  return ((Math.atan2(dLon, dLat) * 180) / Math.PI + 360) % 360;
}

/* Procedural vector arrow canvas icon */
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

/* Mission stage alerts for the demo story */
const STAGE_ALERTS: Record<number, string> = {
  1: "STAGE 1 · SENTINEL-1A SAR INGEST ACTIVE",
  2: "STAGE 2 · RADAR BEAM SWEEP & BACKSCATTER ANOMALY",
  3: "STAGE 3 · OIL SPILL CLASSIFIED — MINERAL SHEEN (18.6 KM²)",
  4: "STAGE 4 · HYDRODYNAMIC INCOIS CURRENTS ACTIVATED",
  5: "STAGE 5 · RK4 LAGRANGIAN BACKTRACKING UNDERWAY",
  6: "STAGE 6 · DISCHARGE ORIGIN CONVERGENCE (T-12H)",
  7: "STAGE 7 · SUSPECT VESSEL ISOLATED (IMO 9720134)",
  8: "STAGE 8 · SHA-256 MERKLE LEDGER SEALED · SECTION 65B",
};

/* AI Analyst narrative lines */
const ANALYST_LINES: Record<number, string> = {
  1: "Sentinel-1A SAR pass initialized — C-band IW mode, relative orbit #118 over Gulf of Kutch.",
  2: "Radar swath sweeping maritime corridor; cross-track phase analysis isolates low-backscatter anomaly.",
  3: "Mineral oil sheen confirmed; multi-spectral damping indicates fresh hydrocarbon discharge.",
  4: "INCOIS regional surface velocity field active — 1.1 kn ebb stream channeling through Outer Kutch.",
  5: "4th-Order Runge–Kutta reverse advection computes 12-hour drift trajectory.",
  6: "Discharge origin locked at 21.654°N, 68.892°E; temporal window correlates to 02:30–03:45 UTC.",
  7: "Bayesian attribution pins Tanker IMO 9720134 — collinear heading, tank wash profile, AIS blind spot.",
  8: "Forensic dossier committed to tamper-evident Merkle ledger with Ed25519 legal signature.",
};

const SHIPPING_LANES: { name: string; traffic: number; dailyCount: number; coords: [number, number][] }[] = [
  {
    name: "KANDLA CRUDE IMPORT CORRIDOR",
    traffic: 3,
    dailyCount: 42,
    coords: [[70.3, 22.95], [70.1, 22.9], [69.7, 22.8], [69.2, 22.6], [68.6, 22.2]],
  },
  {
    name: "MUNDRA CONTAINER & EXPORT ROUTE",
    traffic: 3,
    dailyCount: 58,
    coords: [[70.0, 22.85], [69.85, 22.7], [69.6, 22.45], [69.2, 21.9], [68.7, 21.4]],
  },
  {
    name: "SIKKA ENERGY TERMINAL FAIRWAY",
    traffic: 2,
    dailyCount: 26,
    coords: [[69.9, 22.5], [69.75, 22.5], [69.5, 22.4], [69.2, 22.2], [68.9, 22.0]],
  },
  {
    name: "ARABIAN SEA TRANSIT CORRIDOR",
    traffic: 3,
    dailyCount: 84,
    coords: [[67.8, 19.6], [68.4, 20.6], [69.0, 21.2], [69.6, 21.6], [70.2, 21.9]],
  },
];

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
  const livingRef = useRef<Record<string, LivingHandle | null>>({});
  const bloomRef = useRef<BloomHandle | null>(null);
  const swathRef = useRef<SwathHandle | null>(null);

  const store = useCommandStore();
  const incident = propIncident ?? store.getSelectedIncident();
  const layers = store.layers;
  const demoStep = store.demoStep;
  const isDemoRunning = store.isDemoRunning;
  const detectionMs = store.detectionMs;
  const hasVerified = store.hasVerified;
  const merkleRoot = store.evidenceLedger?.merkleRoot;
  const currentDriftHour = store.currentDriftHour;

  const [mapLoaded, setMapLoaded] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const [clockUtc, setClockUtc] = useState("");
  const [contaminationMode, setContaminationMode] = useState<ContaminationMode>("volume");
  const [activeHud, setActiveHud] = useState<"incident" | "satellite" | "vessel" | "port" | null>("incident");
  const [selectedPortNode, setSelectedPortNode] = useState<InfrastructureNode | null>(null);

  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({ w: 1200, h: 800 });
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

  /* Resize listener */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          w: Math.max(100, Math.floor(entry.contentRect.width)),
          h: Math.max(100, Math.floor(entry.contentRect.height)),
        });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  /* UTC Clock */
  useEffect(() => {
    const tick = () => setClockUtc(new Date().toISOString().slice(11, 19) + "Z");
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, []);

  /* Update contamination mode in shader handle */
  useEffect(() => {
    sheenRef.current?.setMode(contaminationMode);
  }, [contaminationMode]);

  /* Dynamic RK4 Drift Playhead & Slick Contraction */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !incident) return;

    const traj = store.driftResult?.trajectory;
    if (!traj || traj.length === 0) return;

    const stepRatio = Math.min(1, Math.max(0, currentDriftHour / 12));
    const targetIdx = Math.min(traj.length - 1, Math.floor(stepRatio * (traj.length - 1)));
    const pt = traj[targetIdx];
    if (!pt) return;

    const uncertaintyRadius = 0.4 + stepRatio * 2.8;

    const headGeoJson: GeoJSON.Feature<GeoJSON.Point> = {
      type: "Feature",
      properties: { hour: currentDriftHour, uncertainty: uncertaintyRadius },
      geometry: { type: "Point", coordinates: [pt.longitude, pt.latitude] },
    };

    const headSource = map.getSource("drift-head") as maplibregl.GeoJSONSource | undefined;
    if (headSource) {
      headSource.setData(headGeoJson);
    } else {
      map.addSource("drift-head", {
        type: "geojson",
        data: headGeoJson,
      });

      map.addLayer({
        id: "drift-head-uncertainty",
        type: "circle",
        source: "drift-head",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 7, 8 * (1 + stepRatio), 11, 22 * (1 + stepRatio)],
          "circle-color": "#38BDF8",
          "circle-opacity": 0.2,
          "circle-stroke-width": 1.2,
          "circle-stroke-color": "#38BDF8",
        },
      });

      map.addLayer({
        id: "drift-head-marker",
        type: "circle",
        source: "drift-head",
        paint: {
          "circle-radius": 5.5,
          "circle-color": "#22D3A7",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#050B11",
        },
      });
    }

    // Dynamic slick morphing: scale down towards the backtrack point
    if (incident.spillGeometry?.polygonGeoJson?.coordinates?.[0]) {
      const baseCoords: number[][] = incident.spillGeometry.polygonGeoJson.coordinates[0];
      const obsCentroid = [incident.spillGeometry.centroid.longitude, incident.spillGeometry.centroid.latitude];
      const scale = 1.0 - stepRatio * 0.8;

      const transformedCoords = baseCoords.map(([lng, lat]) => {
        const relLng = lng - obsCentroid[0];
        const relLat = lat - obsCentroid[1];
        return [
          pt.longitude + relLng * scale,
          pt.latitude + relLat * scale,
        ];
      });

      const polySource = map.getSource("oil-poly") as maplibregl.GeoJSONSource | undefined;
      if (polySource) {
        polySource.setData({
          type: "Feature",
          properties: { eventId: incident.eventId },
          geometry: { type: "Polygon", coordinates: [transformedCoords] },
        });
      }
    }
  }, [currentDriftHour, mapLoaded, incident, store.driftResult]);

  /* ═══════════════════════════════════════════════════════════
     BASE GEO LAYERS & GIS INFRASTRUCTURE
     ═══════════════════════════════════════════════════════════ */
  function addBaseLayers(map: maplibregl.Map) {
    const inc = incident;

    /* Vector icons */
    if (!map.hasImage("arrow-wind")) map.addImage("arrow-wind", arrowIcon("#22D3A7", 4));
    if (!map.hasImage("arrow-current")) map.addImage("arrow-current", arrowIcon("#38BDF8", 5));
    if (!map.hasImage("arrow-sat")) map.addImage("arrow-sat", arrowIcon("#7DD3FC", 6));
    if (!map.hasImage("arrow-lane")) map.addImage("arrow-lane", arrowIcon("#A7F3E0", 4));

    /* Graticule lines */
    const lonLines: [number, number][][] = [];
    const latLines: [number, number][][] = [];
    for (let lon = 66.0; lon <= 71.5; lon += 0.5) {
      lonLines.push([[lon, 19.2], [lon, 24.2]]);
    }
    for (let lat = 19.5; lat <= 24.0; lat += 0.5) {
      latLines.push([[65.8, lat], [71.6, lat]]);
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

    /* ── COASTAL GIS INFRASTRUCTURE (Ports, Terminals, SBMs, Refineries) ── */
    map.addSource("infra-nodes", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: INFRASTRUCTURE_NODES.map((n) => ({
          type: "Feature",
          properties: {
            id: n.id,
            name: n.name,
            type: n.type,
            category: n.category,
            vessels: n.metadata.vesselsPresent ?? 0,
            throughput: n.metadata.dailyThroughput ?? "",
          },
          geometry: { type: "Point", coordinates: n.coords },
        })),
      },
    });

    // Infrastructure halo & symbols
    map.addLayer({
      id: "infra-glow",
      type: "circle",
      source: "infra-nodes",
      paint: {
        "circle-radius": [
          "match", ["get", "type"],
          "port", 9,
          "terminal", 8,
          "sbm", 7,
          6,
        ],
        "circle-color": [
          "match", ["get", "type"],
          "port", "#22D3A7",
          "terminal", "#F59E0B",
          "sbm", "#38BDF8",
          "#E8F0F3",
        ],
        "circle-blur": 1.2,
        "circle-opacity": 0.5,
      },
    });

    map.addLayer({
      id: "infra-dot",
      type: "circle",
      source: "infra-nodes",
      paint: {
        "circle-radius": [
          "match", ["get", "type"],
          "port", 4.5,
          "terminal", 4,
          "sbm", 3.5,
          3,
        ],
        "circle-color": [
          "match", ["get", "type"],
          "port", "#22D3A7",
          "terminal", "#F59E0B",
          "sbm", "#38BDF8",
          "#E8F0F3",
        ],
        "circle-stroke-width": 1.2,
        "circle-stroke-color": "#04121F",
      },
    });

    map.addLayer({
      id: "infra-labels",
      type: "symbol",
      source: "infra-nodes",
      minzoom: 7.2,
      layout: {
        "text-field": ["get", "name"],
        "text-size": 8,
        "text-font": ["Open Sans Semibold"],
        "text-letter-spacing": 0.08,
        "text-offset": [0, 1.2],
        "text-anchor": "top",
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": "#A7F3D0",
        "text-halo-color": "#04121F",
        "text-halo-width": 1.4,
      },
    });

    /* ── SUBSEA CRUDE PIPELINE CORRIDORS ── */
    map.addSource("subsea-pipelines", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: SUBSEA_PIPELINES.map((p) => ({
          type: "Feature",
          properties: { name: p.name, diameter: p.diameterInches },
          geometry: { type: "LineString", coordinates: p.coords },
        })),
      },
    });

    map.addLayer({
      id: "pipelines-glow",
      type: "line",
      source: "subsea-pipelines",
      paint: {
        "line-color": "#F59E0B",
        "line-width": 4,
        "line-blur": 3,
        "line-opacity": 0.22,
      },
    });

    map.addLayer({
      id: "pipelines-core",
      type: "line",
      source: "subsea-pipelines",
      paint: {
        "line-color": "#FBBF24",
        "line-width": 1.2,
        "line-dasharray": [3, 2],
        "line-opacity": 0.75,
      },
    });

    /* ── DREDGED APPROACH CHANNELS ── */
    map.addSource("dredged-channels", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: DREDGED_CHANNELS.map((ch) => ({
          type: "Feature",
          properties: { name: ch.name, depth: ch.depth },
          geometry: { type: "LineString", coordinates: ch.coords },
        })),
      },
    });

    map.addLayer({
      id: "channels-glow",
      type: "line",
      source: "dredged-channels",
      paint: {
        "line-color": "#0EA5E9",
        "line-width": 6,
        "line-blur": 4,
        "line-opacity": 0.2,
      },
    });

    map.addLayer({
      id: "channels-line",
      type: "line",
      source: "dredged-channels",
      paint: {
        "line-color": "#38BDF8",
        "line-width": 1.4,
        "line-dasharray": [4, 4],
        "line-opacity": 0.65,
      },
    });

    /* ── SENSITIVE ECOLOGICAL ZONES (Marine Park & Mangroves) ── */
    map.addSource("eco-zones", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: ENVIRONMENTAL_ZONES.map((z) => ({
          type: "Feature",
          properties: { name: z.name, score: z.sensitivityScore },
          geometry: { type: "Polygon", coordinates: [z.coords] },
        })),
      },
    });

    map.addLayer({
      id: "eco-fill",
      type: "fill",
      source: "eco-zones",
      paint: {
        "fill-color": "#10B981",
        "fill-opacity": 0.12,
      },
    });

    map.addLayer({
      id: "eco-outline",
      type: "line",
      source: "eco-zones",
      paint: {
        "line-color": "#34D399",
        "line-width": 1.2,
        "line-dasharray": [2, 2],
        "line-opacity": 0.55,
      },
    });

    /* ── SENTINEL-1 SWATH FOOTPRINT ── */
    if (inc) {
      const m = inc.sarMetadata;
      const slant = m.passDirection === "ASCENDING" ? 1 : -1;
      const [cx, cy] = [
        inc.spillGeometry.centroid.longitude,
        inc.spillGeometry.centroid.latitude,
      ];
      const L = 1.6;
      const W = 0.46;
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
        paint: { "fill-color": "#38BDF8", "fill-opacity": 0.02 },
      });
      map.addLayer({
        id: "swath-outline",
        type: "line",
        source: "sentinel-swath",
        paint: {
          "line-color": "#38BDF8",
          "line-width": 1.2,
          "line-dasharray": [3, 3],
          "line-opacity": 0.55,
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
          "line-width": 1.2,
          "line-dasharray": [2, 4],
          "line-opacity": 0.45,
        },
      });
    }

    /* ── BATHYMETRY CONTOURS ── */
    const c1000: [number, number][] = [[65.8, 24.0], [67.0, 22.8], [68.3, 21.8], [69.8, 20.9], [71.0, 20.1]];
    const c200: [number, number][] = [[66.2, 23.4], [67.6, 22.2], [68.9, 21.3], [70.4, 20.5]];
    const c100: [number, number][] = [[66.8, 23.5], [67.9, 22.5], [69.2, 21.7], [70.7, 20.9]];
    const c50: [number, number][] = [[67.5, 23.6], [68.6, 22.7], [69.8, 22.0], [71.0, 21.3]];
    const c20: [number, number][] = [[68.8, 23.1], [69.4, 22.65], [70.0, 22.45], [70.5, 22.2]];

    map.addSource("bathy", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          { type: "Feature", properties: { depth: -1000 }, geometry: { type: "LineString", coordinates: c1000 } },
          { type: "Feature", properties: { depth: -200 }, geometry: { type: "LineString", coordinates: c200 } },
          { type: "Feature", properties: { depth: -100 }, geometry: { type: "LineString", coordinates: c100 } },
          { type: "Feature", properties: { depth: -50 }, geometry: { type: "LineString", coordinates: c50 } },
          { type: "Feature", properties: { depth: -20 }, geometry: { type: "LineString", coordinates: c20 } },
        ],
      },
    });

    map.addLayer({
      id: "bathy-lines",
      type: "line",
      source: "bathy",
      paint: {
        "line-color": "#38BDF8",
        "line-width": ["interpolate", ["linear"], ["get", "depth"], -1000, 0.6, -20, 1.6],
        "line-opacity": ["interpolate", ["linear"], ["get", "depth"], -1000, 0.25, -20, 0.65],
      },
    });

    /* ── INDIAN EEZ ── */
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
        "line-width": 1.4,
        "line-dasharray": [4, 3],
        "line-opacity": 0.65,
      },
    });

    /* ── SHIPPING LANES ── */
    map.addSource("lanes", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: SHIPPING_LANES.map((l) => ({
          type: "Feature",
          properties: { name: l.name, traffic: l.traffic, dailyCount: l.dailyCount },
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
        "line-width": ["interpolate", ["linear"], ["get", "traffic"], 1, 4, 3, 8],
        "line-blur": 5,
        "line-opacity": 0.16,
      },
    });
    map.addLayer({
      id: "lanes-line",
      type: "line",
      source: "lanes",
      paint: {
        "line-color": "#22D3A7",
        "line-width": 1.1,
        "line-dasharray": [3, 4],
        "line-opacity": 0.45,
      },
    });

    /* ── RK4 REVERSE DRIFT PATH ── */
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
        "line-width": 1.8,
        "line-opacity": 0.75,
        "line-dasharray": [2, 2],
      },
    });

    /* Origin uncertainty ellipse */
    if (driftLine.length > 0) {
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
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 7, 4, 9, 8],
          "circle-color": "#D6A84F",
          "circle-blur": 1.2,
          "circle-opacity": 0.45,
        },
      });
      map.addLayer({
        id: "drift-origin",
        type: "circle",
        source: "drift-origin",
        paint: {
          "circle-radius": 5,
          "circle-color": "#F59E0B",
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#050B11",
          "circle-opacity": 0.95,
        },
      });
    }

    // Interactive clicks on infrastructure nodes
    map.on("click", "infra-dot", (e) => {
      const feat = e.features?.[0];
      if (!feat) return;
      const id = String(feat.properties?.id);
      const found = INFRASTRUCTURE_NODES.find((n) => n.id === id);
      if (found) {
        setSelectedPortNode(found);
        setActiveHud("port");
      }
    });

    map.on("mouseenter", "infra-dot", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "infra-dot", () => {
      map.getCanvas().style.cursor = "";
    });
  }

  /* ═══════════════════════════════════════════════════════════
     OIL SPILL LAYERS (Boundary, Calipers & Procedural Sheen)
     ═══════════════════════════════════════════════════════════ */
  function addOilLayers(map: maplibregl.Map, inc: Incident) {
    const coords: number[][] = inc.spillGeometry.polygonGeoJson.coordinates[0];
    const ring = coords as [number, number][];

    /* Procedural WebGL sheen */
    const sheen = createOilSheenLayer("oil-sheen-webgl", ring);
    sheenRef.current = sheen.handle;
    sheen.handle.setMode(contaminationMode);
    sheen.handle.setVisible(layers.oil);
    if (map.getLayer("oil-sheen-webgl")) map.removeLayer("oil-sheen-webgl");
    map.addLayer(sheen.layer);

    /* GeoJSON Boundary outline & click hit-test */
    map.addSource("oil-poly", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: { eventId: inc.eventId },
        geometry: { type: "Polygon", coordinates: [ring] },
      },
    });

    map.addLayer({
      id: "oil-outline",
      type: "line",
      source: "oil-poly",
      paint: {
        "line-color": "#F59E0B",
        "line-width": 1.6,
        "line-opacity": 0.85,
      },
    });

    map.addLayer({
      id: "oil-fill-target",
      type: "fill",
      source: "oil-poly",
      paint: {
        "fill-color": "#000000",
        "fill-opacity": 0.01, // transparent hit target
      },
    });

    /* Scientific Dimension Calipers (Major & Minor Axis) */
    const c = inc.spillGeometry.centroid;
    const rad = (inc.spillGeometry.skeletonOrientationDeg * Math.PI) / 180;
    const lenHalf = (inc.spillGeometry.lengthKm / 111.3) * 0.5;
    const widHalf = (inc.spillGeometry.widthKm / 111.3) * 0.5;

    const majorP1: [number, number] = [c.longitude - Math.sin(rad) * lenHalf, c.latitude - Math.cos(rad) * lenHalf];
    const majorP2: [number, number] = [c.longitude + Math.sin(rad) * lenHalf, c.latitude + Math.cos(rad) * lenHalf];

    map.addSource("oil-calipers", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { label: `${inc.spillGeometry.lengthKm.toFixed(1)} km MAJOR` },
            geometry: { type: "LineString", coordinates: [majorP1, majorP2] },
          },
        ],
      },
    });

    map.addLayer({
      id: "oil-calipers-line",
      type: "line",
      source: "oil-calipers",
      paint: {
        "line-color": "#FBBF24",
        "line-width": 1.2,
        "line-dasharray": [1.5, 2.5],
        "line-opacity": 0.65,
      },
    });

    map.on("click", "oil-fill-target", () => {
      onSpillClick?.(inc);
      setActiveHud("incident");
    });
  }

  /* ═══════════════════════════════════════════════════════════
     LIVING GPU ENGINE STACKS
     ═══════════════════════════════════════════════════════════ */
  function addLivingOverlayStacks(map: maplibregl.Map) {
    const inc = incident;

    try {
      const g = createBathymetryLayer("bathy-relief");
      if (map.getLayer("bathy-relief")) map.removeLayer("bathy-relief");
      map.addLayer(g.layer);
      livingRef.current.bathy = g.handle;
      g.handle.setVisible(layers.bathy);
      g.handle.setAlpha(0.42);
    } catch (err) {
      console.warn("SD: bathy relief layer error:", err);
    }

    try {
      const c = createParticleLayer("particles-current", "current");
      if (map.getLayer("particles-current")) map.removeLayer("particles-current");
      map.addLayer(c.layer);
      livingRef.current.currents = c.handle;
      c.handle.setVisible(layers.currents);
    } catch (err) {
      console.warn("SD: current particles error:", err);
    }

    try {
      const w = createParticleLayer("particles-wind", "wind");
      if (map.getLayer("particles-wind")) map.removeLayer("particles-wind");
      map.addLayer(w.layer);
      livingRef.current.wind = w.handle;
      w.handle.setVisible(layers.weather);
      w.handle.setAlpha(0.55);
    } catch (err) {
      console.warn("SD: wind particles error:", err);
    }

    try {
      const lf = createLaneFlowLayer("lanes-flow", SHIPPING_LANES);
      if (map.getLayer("lanes-flow")) map.removeLayer("lanes-flow");
      map.addLayer(lf.layer);
      livingRef.current.laneFlow = lf.handle;
      lf.handle.setVisible(layers.shipping);
    } catch (err) {
      console.warn("SD: lane flow error:", err);
    }

    try {
      const beacons = INFRASTRUCTURE_NODES.map((p) => ({
        name: p.name,
        c: p.coords,
        intensity: p.type === "port" ? 1.0 : 0.65,
      }));
      const pl = createPortLightLayer("port-lights", beacons);
      if (map.getLayer("port-lights")) map.removeLayer("port-lights");
      map.addLayer(pl.layer);
      livingRef.current.portLights = pl.handle;
      pl.handle.setAlpha(0.65);
    } catch (err) {
      console.warn("SD: port lights error:", err);
    }

    try {
      const b = createBloomLayer("bloom-intel");
      if (map.getLayer("bloom-intel")) map.removeLayer("bloom-intel");
      map.addLayer(b.layer);
      bloomRef.current = b.handle;
    } catch (err) {
      console.warn("SD: bloom layer error:", err);
    }

    try {
      const sw = createSwathSweepLayer("sentinel-sweep");
      if (map.getLayer("sentinel-sweep")) map.removeLayer("sentinel-sweep");
      map.addLayer(sw.layer);
      swathRef.current = sw.handle;
      sw.handle.setVisible(layers.sentinel);
      sw.handle.setAlpha(isDemoRunning && demoStep <= 2 ? 0.65 : 0);
      if (inc) {
        const m = inc.sarMetadata;
        const slant = m.passDirection === "ASCENDING" ? 1 : -1;
        const [cx, cy] = [
          inc.spillGeometry.centroid.longitude,
          inc.spillGeometry.centroid.latitude,
        ];
        sw.handle.setAxis([cx - 1.5 * slant * 0.55, cy - 1.5], [cx + 1.5 * slant * 0.55, cy + 1.5]);
      }
    } catch (err) {
      console.warn("SD: swath sweep error:", err);
    }
  }

  /* ═══════════════════════════════════════════════════════════
     MAP INITIALIZATION
     ═══════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        sources: {
          esriSatellite: {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            maxzoom: 19,
          },
        },
        layers: [
          { id: "ocean-fill", type: "background", paint: { "background-color": "#030C16" } },
          {
            id: "satellite-raster",
            type: "raster",
            source: "esriSatellite",
            paint: {
              "raster-opacity": 1.0,
              "raster-saturation": 0.28,
              "raster-contrast": 0.15,
              "raster-brightness-min": 0.0,
              "raster-brightness-max": 1.0,
              "raster-fade-duration": 0,
            },
          },
        ],
      },
      center: [69.112, 21.845],
      zoom: 8,
      pitch: 15,
      attributionControl: false,
      pitchWithRotate: false,
      dragRotate: false,
      canvasContextAttributes: { antialias: true },
    });

    map.on("load", () => {
      setMapLoaded(true);
      map.resize();
      addBaseLayers(map);
      addLivingOverlayStacks(map);
      if (incident) addOilLayers(map, incident);
    });

    map.on("move", () => {
      const c = map.getCenter();
      setReadout({ lat: c.lat, lng: c.lng, z: map.getZoom() });
    });

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.length = 0;
      markersByImoRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Layer visibility sync */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const setVis = (id: string, v: boolean) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", v ? "visible" : "none");
    };

    setVis("eez-glow", layers.eez);
    setVis("eez-line", layers.eez);
    setVis("lanes-glow", layers.shipping);
    setVis("lanes-line", layers.shipping);
    setVis("drift-path", layers.drift);
    setVis("drift-origin", layers.drift);
    setVis("drift-ellipse", layers.drift);
    setVis("bathy-lines", layers.bathy);
    setVis("oil-outline", layers.oil);
    setVis("oil-fill-target", layers.oil);
    setVis("oil-calipers-line", layers.oil);
    setVis("swath-fill", layers.sentinel);
    setVis("swath-outline", layers.sentinel);
    setVis("swath-core", layers.sentinel);
    setVis("sentinel-axis", layers.sentinel);

    livingRef.current.bathy?.setVisible(layers.bathy);
    livingRef.current.currents?.setVisible(layers.currents);
    livingRef.current.wind?.setVisible(layers.weather);
    livingRef.current.laneFlow?.setVisible(layers.shipping);
    sheenRef.current?.setVisible(layers.oil);
    bloomRef.current?.setVisible(layers.oil);
    swathRef.current?.setVisible(layers.sentinel);
  }, [layers, mapLoaded]);

  /* ═══════════════════════════════════════════════════════════
     AIS FLEET RENDERING (Silhouettes, Wakes, Vector Trails)
     ═══════════════════════════════════════════════════════════ */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const markers = markersRef.current;
    const markersByImo = markersByImoRef.current;

    const renderFleet = () => {
      const s = useCommandStore.getState();
      const list = propVessels ?? s.candidateVessels;
      const selImo = s.selectedVesselImo;
      const onSel = onSelectVesselRef.current;

      markers.forEach((m) => m.remove());
      markers.length = 0;
      markersByImo.clear();

      if (!s.layers.ais || list.length === 0) return;

      list.forEach((v) => {
        const isSuspect = v.attributionRank === 1;
        const isSelected = selImo === v.imo;
        const color = isSuspect ? "#EF4444" : isSelected ? "#22D3A7" : "#38BDF8";

        const el = document.createElement("div");
        el.className = "group cursor-pointer select-none relative";

        el.innerHTML = `
          <div class="relative flex items-center justify-center">
            ${generateVesselWake(v)}
            <div style="transform: rotate(${v.courseOverGround}deg); transform-origin: 50% 100%;" class="pointer-events-none absolute bottom-[10px] left-1/2 h-[24px] w-px bg-current opacity-70">
              <div class="absolute -top-[1px] left-1/2 h-0 w-0 -translate-x-1/2 border-x-[3px] border-b-[5px] border-x-transparent border-b-current"></div>
            </div>
            <div style="transform: rotate(${v.heading}deg);" class="relative">
              ${shipSilhouette(v, color)}
            </div>
            ${
              isSuspect
                ? `<div class="absolute -top-1.5 -right-1.5 h-3 w-3 rounded-full bg-red ring-2 ring-bg-1 animate-pulse"></div>`
                : ""
            }
          </div>
        `;

        el.addEventListener("click", () => {
          useCommandStore.getState().setSelectedVesselImo(v.imo);
          onSel?.(v);
          setActiveHud("vessel");
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([v.longitude, v.latitude])
          .addTo(map);

        markers.push(marker);
        markersByImo.set(v.imo, marker);
      });
    };

    renderFleet();
    const unsub = useCommandStore.subscribe(renderFleet);
    return () => {
      unsub();
      markers.forEach((m) => m.remove());
      markers.length = 0;
      markersByImo.clear();
    };
  }, [mapLoaded, propVessels]);

  /* ═══════════════════════════════════════════════════════════
     CINEMATIC CAMERA & 8-STAGE DEMO CHOREOGRAPHY
     ═══════════════════════════════════════════════════════════ */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !isDemoRunning) return;

    const pose = DEMO_STAGE_POSES[demoStep];
    if (pose) flyToPose(map, pose);

    if (demoStep === 1 || demoStep === 2) {
      swathRef.current?.setActive(true);
      swathRef.current?.setAlpha(0.65);
    } else {
      swathRef.current?.setActive(false);
      swathRef.current?.setAlpha(0.0);
    }

    if (demoStep >= 7) {
      setActiveHud("vessel");
    } else if (demoStep >= 3) {
      setActiveHud("incident");
    }
  }, [demoStep, isDemoRunning, mapLoaded]);

  /* Alert toast messages */
  useEffect(() => {
    if (isDemoRunning && STAGE_ALERTS[demoStep]) {
      setAlert(STAGE_ALERTS[demoStep]);
      const t = setTimeout(() => setAlert(null), 3200);
      return () => clearTimeout(t);
    }
  }, [demoStep, isDemoRunning]);

  /* Calculate Screen Anchor Placement for Floating HUD */
  const incidentPlacement = useMemo(() => {
    const map = mapRef.current;
    if (!map || !incident) return null;
    try {
      const c = incident.spillGeometry.centroid;
      const pt = map.project([c.longitude, c.latitude]);
      return calculateHudPlacement(
        { x: pt.x, y: pt.y },
        240,
        140,
        containerSize.w,
        containerSize.h,
        "top-right"
      );
    } catch {
      return null;
    }
  }, [incident, containerSize, readout]);

  const topVessel = (propVessels ?? store.candidateVessels).find((v) => v.attributionRank === 1);
  const vesselPlacement = useMemo(() => {
    const map = mapRef.current;
    if (!map || !topVessel) return null;
    try {
      const pt = map.project([topVessel.longitude, topVessel.latitude]);
      return calculateHudPlacement(
        { x: pt.x, y: pt.y },
        250,
        150,
        containerSize.w,
        containerSize.h,
        "top-left"
      );
    } catch {
      return null;
    }
  }, [topVessel, containerSize, readout]);

  const portPlacement = useMemo(() => {
    const map = mapRef.current;
    if (!map || !selectedPortNode) return null;
    try {
      const pt = map.project(selectedPortNode.coords);
      return calculateHudPlacement(
        { x: pt.x, y: pt.y },
        240,
        130,
        containerSize.w,
        containerSize.h,
        "top-right"
      );
    } catch {
      return null;
    }
  }, [selectedPortNode, containerSize, readout]);

  const zoomIn = () => mapRef.current?.zoomIn({ duration: 200 });
  const zoomOut = () => mapRef.current?.zoomOut({ duration: 200 });
  const reset = () => {
    if (mapRef.current) flyToPose(mapRef.current, THEATRE_OVERVIEW);
  };

  return (
    <div className={`relative h-full w-full overflow-hidden bg-bg-0 ${interactive ? "select-none" : ""}`}>
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />

      {/* ── CRISP PERIMETER VIGNETTE (Keeps map satellite colors 100% vivid & untouched) ── */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] shadow-[inset_0_0_100px_rgba(0,0,0,0.30)]"
      />

      {/* ── TACTICAL CONTAMINATION MODE SWITCHER (Top Center) ── */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 rounded-xl border border-line bg-bg-1/90 p-1 shadow-float backdrop-blur-md">
        {(["sar", "heatmap", "volume", "mesh"] as const).map((mode) => {
          const active = contaminationMode === mode;
          const labels: Record<ContaminationMode, string> = {
            sar: "2D SAR",
            heatmap: "HEATMAP",
            volume: "3D VOLUME",
            mesh: "CONFIDENCE MESH",
          };
          return (
            <button
              key={mode}
              onClick={() => setContaminationMode(mode)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-[10px] font-semibold transition-all duration-200 ${
                active
                  ? "bg-amber/20 text-amber border border-amber/50 shadow-sm"
                  : "text-ink-dim hover:text-ink hover:bg-panel-hover border border-transparent"
              }`}
            >
              {mode === "volume" && <Box className="h-3 w-3" />}
              {mode === "sar" && <Satellite className="h-3 w-3" />}
              {mode === "heatmap" && <Activity className="h-3 w-3" />}
              {mode === "mesh" && <Layers className="h-3 w-3" />}
              <span>{labels[mode]}</span>
            </button>
          );
        })}
      </div>

      {/* ── FLOATING INTELLIGENCE HUDS WITH LEADER LINES ── */}
      {mapLoaded && activeHud === "incident" && incident && incidentPlacement && (
        <IncidentIntelligenceHud
          incident={incident}
          placement={incidentPlacement}
          contaminationMode={contaminationMode}
        />
      )}

      {mapLoaded && activeHud === "vessel" && topVessel && vesselPlacement && (
        <VesselInvestigationHud vessel={topVessel} placement={vesselPlacement} />
      )}

      {mapLoaded && activeHud === "port" && selectedPortNode && portPlacement && (
        <PortInfrastructureHud node={selectedPortNode} placement={portPlacement} />
      )}

      {/* ── SATELLITE TELEMETRY HUD (Top Right) ── */}
      {incident && (
        <div className="pointer-events-none absolute right-3 top-14 z-10 w-52 rounded-xl border border-line bg-bg-1/90 p-2.5 font-mono text-[10px] leading-relaxed shadow-float backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-aqua font-bold">
            <Satellite className="h-3.5 w-3.5" />
            <span>SENTINEL-1A · C-SAR</span>
            <span className="ml-auto text-ink-faint font-normal">{clockUtc}</span>
          </div>
          <div className="mt-2 space-y-1 text-ink-dim">
            <div className="flex justify-between">
              <span className="text-ink-faint">PASS / ORBIT</span>
              <span className="text-ink font-semibold">{incident.sarMetadata.passDirection} #{incident.sarMetadata.relativeOrbit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-faint">INCIDENCE</span>
              <span className="text-ink font-semibold">{incident.sarMetadata.incidenceAngleDeg.toFixed(1)}°</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-faint">POLARIZATION</span>
              <span className="text-ink font-semibold">{incident.sarMetadata.polarization.join(" + ")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-faint">RESOLUTION</span>
              <span className="text-ink font-semibold">{incident.sarMetadata.resolutionMeters ?? 10} M (IW)</span>
            </div>
          </div>
        </div>
      )}

      {/* ── MISSION DEMO TIMELINE & STORY NARRATION (Bottom Center) ── */}
      {isDemoRunning && (
        <div className="pointer-events-none absolute bottom-16 left-1/2 -translate-x-1/2 z-20 w-fit rounded-xl border border-line bg-bg-1/95 px-4 py-2.5 shadow-float backdrop-blur-md">
          <div className="mb-1.5 flex items-center justify-between font-mono text-[9px] uppercase tracking-widest text-ink-faint">
            <span>Operational Storyline</span>
            <span className="text-amber font-bold">STAGE {demoStep} / 8</span>
          </div>
          <div className="h-1 w-full min-w-[420px] overflow-hidden rounded-full bg-bg-2">
            <div
              className="h-full bg-amber transition-all duration-500"
              style={{ width: `${Math.max(4, (demoStep / 8) * 100)}%` }}
            />
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            {(["INGEST", "SWEEP", "SPILL", "CURRENTS", "BACKTRACK", "ORIGIN", "SUSPECT", "LEDGER"] as const).map(
              (label, i) => {
                const step = i + 1;
                const done = demoStep > step;
                const cur = demoStep === step;
                return (
                  <div
                    key={label}
                    className={`flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[9px] tracking-wide transition-all duration-300 ${
                      done
                        ? "bg-aqua/20 text-aqua font-semibold"
                        : cur
                          ? "bg-amber/20 text-amber font-bold ring-1 ring-amber/60"
                          : "text-ink-faint"
                    }`}
                  >
                    {done ? "✓" : cur ? "▶" : "·"} {label}
                  </div>
                );
              }
            )}
          </div>
          <p className="mt-2 text-[10px] font-mono text-ink-dim max-w-md">
            {ANALYST_LINES[demoStep] ?? "Monitoring Indian Coast Guard operational theatre."}
          </p>
        </div>
      )}

      {/* Alert toast */}
      {alert && (
        <div className="pointer-events-none absolute left-1/2 top-16 z-30 -translate-x-1/2 whitespace-nowrap rounded-lg border border-red/40 bg-red/20 px-4 py-1.5 font-mono text-xs font-bold text-red shadow-float backdrop-blur-md animate-bounce">
          {alert}
        </div>
      )}

      {/* Evidence verification badge */}
      {hasVerified && (
        <div className="pointer-events-none absolute left-1/2 top-14 -translate-x-1/2 z-20 flex items-center gap-2 rounded-xl border border-green/40 bg-bg-1/95 px-3 py-1 font-mono text-[10px] text-green shadow-float">
          <ShieldCheck className="h-4 w-4" />
          <span className="font-bold">EVIDENCE SEALED</span>
          <span className="text-ink-faint">SHA-256 ·</span>
          <span className="font-mono">{merkleRoot ? `${merkleRoot.slice(0, 10)}…` : "CHAIN-VALID"}</span>
        </div>
      )}

      {children}
      {showChips && <LayerChips />}

      {/* Basemap Attribution */}
      <div className="pointer-events-none absolute bottom-3 right-3 z-10 font-mono text-[9px] text-ink-faint/80">
        © Maxar · Esri World Imagery · INCOIS · Sentinel-1
      </div>

      {/* Position Readout (Top Left) */}
      <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-2 rounded-xl border border-line bg-bg-1/90 px-3 py-1.5 font-mono text-[10px] text-ink-dim shadow-float backdrop-blur-md">
        <span className="h-1.5 w-1.5 rounded-full bg-green animate-pulse" />
        <span className="font-semibold text-ink">
          {readout.lat.toFixed(3)}°N, {readout.lng.toFixed(3)}°E
        </span>
        <span className="text-ink-faint">· Z{readout.z.toFixed(1)}</span>
      </div>

      {/* Map Camera Controls */}
      <div className="absolute right-3 top-3 z-10 flex flex-col gap-0.5 rounded-xl border border-line bg-bg-1/90 p-0.5 shadow-float backdrop-blur-md">
        <button
          onClick={zoomIn}
          className="rounded-lg p-1.5 text-ink-dim transition-colors hover:bg-panel-hover hover:text-ink"
          title="Zoom in"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={zoomOut}
          className="rounded-lg p-1.5 text-ink-dim transition-colors hover:bg-panel-hover hover:text-ink"
          title="Zoom out"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={reset}
          className="rounded-lg p-1.5 text-ink-dim transition-colors hover:bg-panel-hover hover:text-ink"
          title="Reset Theatre View"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default RealMaritimeMap;