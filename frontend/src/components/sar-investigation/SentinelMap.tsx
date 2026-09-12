"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Incident } from "@/lib/types";
import { useCommandStore } from "@/lib/store";
import { cn } from "@/lib/util";
import { hashSeed, mulberry32 } from "./sarCanvas";
import { InvestigationState } from "./useInvestigation";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Box,
  Maximize2,
  Compass,
  Layers,
} from "lucide-react";

const ESRI_TILES =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

/* organic slick ring in lng/lat around the incident centroid */
function slickGeo(incident: Incident): number[][][] {
  const seed = hashSeed(incident.eventId);
  const rng = mulberry32(seed);
  const { centroid, lengthKm, widthKm, skeletonOrientationDeg } = incident.spillGeometry;
  const a = (lengthKm / 2) * 0.62;
  const b = (widthKm / 2) * 1.38;
  const rot = ((skeletonOrientationDeg + 90) * Math.PI) / 180;
  const lat0 = centroid.latitude;
  const lng0 = centroid.longitude;
  const kmPerLat = 111.32;
  const kmPerLng = 111.32 * Math.cos((lat0 * Math.PI) / 180);
  const N = 48;
  const ring: [number, number][] = [];
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    const wob = 1 + 0.2 * Math.sin(3 * t + rng() * 6) + 0.1 * Math.sin(5 * t + 3);
    const x = a * Math.cos(t) * wob;
    const y = b * Math.sin(t) * wob;
    const px = x * Math.cos(rot) - y * Math.sin(rot);
    const py = x * Math.sin(rot) + y * Math.cos(rot);
    ring.push([lng0 + px / kmPerLng, lat0 + py / kmPerLat]);
  }
  ring.push(ring[0]);
  return [ring];
}

/* navy cinematic grade over satellite imagery (matches ops map look) */
const GRADE_OVERLAY = "rgba(8,28,48,0.5)";

interface EnvToggles {
  currents: boolean;
  wind: boolean;
  bathy: boolean;
  lanes: boolean;
  eez: boolean;
  ports: boolean;
  weather: boolean;
}

const ENV_DEFAULTS: EnvToggles = {
  currents: true,
  wind: true,
  bathy: true,
  lanes: false,
  eez: true,
  ports: true,
  weather: true,
};

interface SentinelMapProps {
  incident: Incident;
  inv: InvestigationState;
  volumeMode: boolean;
  onToggleVolume: () => void;
}

export const SentinelMap: React.FC<SentinelMapProps> = ({
  incident,
  inv,
  volumeMode,
  onToggleVolume,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [env, setEnv] = useState<EnvToggles>(ENV_DEFAULTS);
  const reduced = useMemo(
    () => (typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false),
    []
  );
  const invRef = useRef(inv);
  const envRef = useRef(env);
  useEffect(() => {
    invRef.current = inv;
  }, [inv]);
  useEffect(() => {
    envRef.current = env;
  }, [env]);

  const driftTrail = useCommandStore((s) => s.driftResult);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const map = new maplibregl.Map({
      container,
      style: (() => ({
        version: 8,
        sources: {
          esri: {
            type: "raster",
            tiles: [ESRI_TILES],
            tileSize: 256,
            attribution: "© Esri · World Imagery",
            maxzoom: 19,
          },
          slick: {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: { type: "Polygon", coordinates: slickGeo(incident) },
            },
          },
          drift: {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: (driftTrail?.trajectory ?? []).map((p) => [p.longitude, p.latitude] as [number, number]),
              },
            },
          },
        },
        layers: [
          { id: "esri", type: "raster", source: "esri" },
          {
            id: "drift-line",
            type: "line",
            source: "drift",
            paint: {
              "line-color": "#38BDF8",
              "line-opacity": 0.34,
              "line-width": 1,
              "line-dasharray": [1.2, 2.4],
            },
          },
          {
            id: "slick-fill",
            type: "fill",
            source: "slick",
            paint: {
              "fill-color": "#D6A84F",
              "fill-opacity": 0.15,
            },
          },
          {
            id: "slick-line",
            type: "line",
            source: "slick",
            paint: {
              "line-color": "#FACC15",
              "line-opacity": 0.85,
              "line-width": 1.1,
            },
          },
        ],
      }))() as unknown as maplibregl.StyleSpecification,
      center: [incident.spillGeometry.centroid.longitude, incident.spillGeometry.centroid.latitude],
      zoom: 12.3,
      pitch: 42,
      maxPitch: 65,
      bearing: 12,
      minZoom: 6,
      attributionControl: false,
    });

    map.on("load", () => {
      setReady(true);
    });
    mapRef.current = map;

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(container);
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incident]);

  /* cinematic intro fly-in on first paint */
  const didIntro = useRef(false);
  useEffect(() => {
    if (!ready || didIntro.current) return;
    didIntro.current = true;
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({
      center: [incident.spillGeometry.centroid.longitude, incident.spillGeometry.centroid.latitude],
      zoom: 12.4,
      pitch: 42,
      bearing: 12,
      duration: reduced ? 0 : 2200,
      essential: true,
    });
  }, [ready, incident, reduced]);

  /* overlay: swath footprint + beam + env layers */
  useEffect(() => {
    const cv = overlayRef.current;
    if (!cv || !ready) return;
    const map = mapRef.current!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const fit = () => {
      const rect = cv.parentElement!.getBoundingClientRect();
      cv.width = Math.max(1, Math.round(rect.width * dpr));
      cv.height = Math.max(1, Math.round(rect.height * dpr));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(cv.parentElement!);

    let raf = 0;
    const started = performance.now();

    const render = () => {
      raf = requestAnimationFrame(render);
      const now = performance.now();
      const t = (now - started) / 1000;
      const w = cv.clientWidth;
      const h = cv.clientHeight;
      if (w <= 0 || h <= 0) return;
      const ctx = cv.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const state = invRef.current;
      const envNow = envRef.current;

      /* ── footprint quad + scan beam ─────────────────────── */
      const footprint = footprintQuad(incident);
      const pts = footprint.map(([lng, lat]) => map.project([lng, lat]));
      const inView = pts.every((p) => p.x > -80 && p.x < w + 80 && p.y > -80 && p.y < h + 80);
      if (state.phase !== "idle" && inView) {
        ctx.save();
        ctx.beginPath();
        pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.closePath();
        ctx.fillStyle = "rgba(56,189,248,0.06)";
        ctx.fill();
        ctx.strokeStyle = "rgba(56,189,248,0.5)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        // beam sweeps once in the footprint phase, then fades to faint
        if (state.phase === "footprint") {
          const p = state.prog;
          const sweep = 0.05 + 0.9 * p;
          const x0 = -0.2 * w + sweep * 1.4 * w;
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(x0, -0.1 * h);
          ctx.lineTo(x0 + w * 0.24, h * 1.1);
          ctx.lineTo(x0 + w * 0.24 + 10, h * 1.1);
          ctx.lineTo(x0 + 10, -0.1 * h);
          ctx.closePath();
          ctx.fillStyle = "rgba(56,189,248,0.16)";
          ctx.fill();
          ctx.restore();
        }
      }

      /* ── verified pulse ─────────────────────────────────── */
      if (state.phase === "complete" || state.phase === "verify") {
        const c = map.project([
          incident.spillGeometry.centroid.longitude,
          incident.spillGeometry.centroid.latitude,
        ]);
        if (c.x > -50 && c.x < w + 50 && c.y > -50 && c.y < h + 50) {
          for (let k = 0; k < 2; k++) {
            const tt = ((t * 0.6 + k * 0.5) % 1);
            ctx.beginPath();
            ctx.arc(c.x, c.y, 10 + tt * 120, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(34,211,166,${0.38 * (1 - tt)})`;
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
        }
      }

      if (reduced) return;

      /* ── environmental overlay layers ───────────────────── */
      const seed = hashSeed(incident.eventId);
      const rng = mulberry32(seed);
      const cx = w * 0.52;
      const cy = h * 0.46;
      const zoom = map.getZoom();

      if (envNow.currents) {
        ctx.save();
        ctx.strokeStyle = "rgba(56,189,248,0.13)";
        ctx.lineWidth = 1;
        for (let i = 0; i < 26; i++) {
          const ph = ((t * (0.14 + rng() * 0.1) + i * 0.091) % 1.0);
          const y0 = ((i * 0.11 + ph * 0.1 + cy * 0.00004) % 1) * h * 0.98;
          const bend = Math.sin(y0 * 0.02 + t * 0.3) * 0.1;
          const ax = 0.12 + rng() * 0.1;
          const startX = (ph * w * 0.98 - w) % w;
          const len = 26 + rng() * 30;
          const x0 = ((startX + w) % w) + 0;
          const x1 = x0 + len * ax;
          const y1 = y0 + len * 0.12 * (1 + bend);
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x1 - 4, y1 - 3);
          ctx.lineTo(x1 - 4, y1 + 3);
          ctx.fillStyle = "rgba(56,189,248,0.16)";
          ctx.fill();
        }
        ctx.restore();
      }

      if (envNow.wind) {
        ctx.save();
        for (let i = 0; i < 9; i++) {
          const wx = (0.08 + 0.88 * rng()) * w;
          const wy = (0.12 + 0.86 * rng()) * h;
          const ang = -0.5 + Math.sin(t * 0.4 + i * 1.3) * 0.16;
          const len = 18 + rng() * 14;
          ctx.save();
          ctx.translate(wx, wy);
          ctx.rotate(-0.35 + ang);
          ctx.strokeStyle = "rgba(34,211,166,0.2)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(-len * 0.6, 0);
          ctx.lineTo(len * 0.6, 0);
          ctx.stroke();
          ctx.fillStyle = "rgba(34,211,166,0.2)";
          ctx.beginPath();
          ctx.moveTo(len * 0.6, 0);
          ctx.lineTo(len * 0.25, -4);
          ctx.lineTo(len * 0.25, 4);
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();
      }

      if (envNow.bathy) {
        const alpha = Math.min(0.5, Math.max(0.06, (zoom - 9.5) / 4.5));
        ctx.save();
        ctx.strokeStyle = `rgba(57,168,216,${alpha * 0.5})`;
        ctx.lineWidth = 1;
        for (let k = 1; k <= 4; k++) {
          ctx.beginPath();
          ctx.ellipse(cx, cy, 90 + k * 55, 60 + k * 42, 0.3, 0, Math.PI * 2);
          ctx.setLineDash([4, 6]);
          ctx.stroke();
        }
        ctx.restore();
      }

      if (envNow.lanes) {
        ctx.save();
        ctx.strokeStyle = "rgba(96,165,250,0.14)";
        ctx.setLineDash([10, 14]);
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
          const yy = h * (0.22 + i * 0.26);
          ctx.beginPath();
          ctx.moveTo(-30, yy);
          ctx.bezierCurveTo(w * 0.35, yy - 24, w * 0.66, yy + 22, w + 30, yy - 12);
          ctx.stroke();
        }
        ctx.restore();
      }

      if (envNow.eez) {
        ctx.save();
        ctx.strokeStyle = "rgba(226,232,240,0.22)";
        ctx.setLineDash([7, 5]);
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - w * 0.3, cy - h * 0.34, w * 0.6, h * 0.68);
        ctx.fillStyle = "rgba(226,232,240,0.26)";
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillText("INDIA EEZ · TTW", cx - w * 0.3 + 8, cy - h * 0.34 + 14);
        ctx.restore();
      }

      if (envNow.ports) {
        const ports: [string, number, number][] = [
          ["PORBANDAR", 0.22, 0.28],
          ["OKHA", 0.66, 0.22],
          ["NAVLAKHI", 0.78, 0.46],
        ];
        ctx.save();
        ports.forEach(([name, px, py]) => {
          const sx = w * px;
          const sy = h * py;
          ctx.fillStyle = "rgba(56,189,248,0.85)";
          ctx.fillRect(sx - 2, sy - 2, 4, 4);
          ctx.font = '9px "JetBrains Mono", monospace';
          ctx.fillStyle = "rgba(56,189,248,0.6)";
          ctx.fillText(name, sx + 6, sy + 2);
        });
        ctx.restore();
      }

      if (envNow.weather) {
        ctx.save();
        for (let i = 0; i < 2; i++) {
          const sx = w * (0.24 + i * 0.46);
          const sy = h * (0.16 + Math.sin(t * 0.2 + i) * 0.08);
          ctx.font = '9px "JetBrains Mono", monospace';
          ctx.fillStyle = `rgba(148,197,240,${0.5 + 0.25 * Math.sin(t * 0.5 + i)})`;
          ctx.fillText("SQUALL · NNE · 22 kn", sx, sy);
        }
        ctx.restore();
      }
    };

    raf = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [ready, incident, reduced]);

  const zoomBy = (d: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({ zoom: map.getZoom() + d * (d > 0 ? 1 : -1), duration: reduced ? 0 : 400 });
  };

  const resetView = () => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({
      center: [incident.spillGeometry.centroid.longitude, incident.spillGeometry.centroid.latitude],
      zoom: 12.4,
      pitch: 42,
      bearing: 12,
      duration: reduced ? 0 : 1100,
    });
  };

  const toggleFullscreen = () => {
    const el = containerRef.current?.closest("[data-inv-page]");
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const toggleEnv = (k: keyof EnvToggles) => setEnv((e) => ({ ...e, [k]: !e[k] }));

  const toggleChips: [keyof EnvToggles, string][] = [
    ["currents", "CUR"],
    ["wind", "WND"],
    ["bathy", "BAT"],
    ["lanes", "LAN"],
    ["eez", "EEZ"],
    ["ports", "PRT"],
    ["weather", "WTH"],
  ];

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-[#09141D]">
      {/* navy cinematic grade over the satellite imagery */}
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{ background: GRADE_OVERLAY, mixBlendMode: "multiply" }}
      />

      {/* acquisition HUD */}
      <div className="pointer-events-none absolute left-3 top-3 z-10">
        <div
          className="rounded-md px-2.5 py-1.5 font-mono backdrop-blur-sm"
          style={{ background: "rgba(5,11,17,0.72)", border: "1px solid rgba(56,189,248,0.18)" }}
        >
          <div className="flex items-center gap-1.5 text-[9px] tracking-[0.14em]">
            <span className="h-1.5 w-1.5 rounded-full bg-teal animate-[pulse-soft_1.4s_ease-in-out_infinite]" />
            <span className="font-semibold text-ink">SENTINEL-1A</span>
            <span className="text-ink-faint">PASS 118 · DESCENDING</span>
          </div>
          <div className="mt-0.5 text-[9px] text-ink-dim">
            IW GRD · σ° 34.2° INC · 10:30:20 UTC · ORBIT {incident.sarMetadata.relativeOrbit}
          </div>
        </div>
      </div>

      {/* env layer chips */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-0.5">
        {toggleChips.map(([k, label]) => (
          <button
            key={k}
            onClick={() => toggleEnv(k)}
            className={cn(
              "rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold transition-colors",
              env[k] ? "bg-aqua/15 text-aqua ring-1 ring-aqua/40" : "bg-[#0A1620]/80 text-ink-faint ring-1 ring-[rgba(56,189,248,0.12)]"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* controls */}
      <div className="absolute right-3 top-14 z-10 flex flex-col gap-1 rounded-md p-1 backdrop-blur-sm"
        style={{ background: "rgba(5,11,17,0.66)", border: "1px solid rgba(56,189,248,0.14)" }}
      >
        <button onClick={() => zoomBy(1)} className="rounded p-1.5 text-ink-dim hover:bg-bg-2 hover:text-ink" aria-label="Zoom in">
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => zoomBy(-1)} className="rounded p-1.5 text-ink-dim hover:bg-bg-2 hover:text-ink" aria-label="Zoom out">
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onToggleVolume}
          className={cn("rounded p-1.5 transition-colors", volumeMode ? "bg-amber/20 text-amber" : "text-ink-dim hover:bg-bg-2 hover:text-ink")}
          aria-label="Toggle 3D contamination volume"
          title="3D contamination volume"
        >
          <Box className="h-3.5 w-3.5" />
        </button>
        <button onClick={resetView} className="rounded p-1.5 text-ink-dim hover:bg-bg-2 hover:text-ink" aria-label="Reset view">
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => {
            const map = mapRef.current;
            if (!map) return;
            map.easeTo({ pitch: map.getPitch() > 10 ? 0 : 45, duration: reduced ? 0 : 500 });
          }}
          className="rounded p-1.5 text-ink-dim hover:bg-bg-2 hover:text-ink"
          aria-label="Toggle pitch"
        >
          <Layers className="h-3.5 w-3.5" />
        </button>
        <button onClick={toggleFullscreen} className="rounded p-1.5 text-ink-dim hover:bg-bg-2 hover:text-ink" aria-label="Fullscreen">
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
        <div className="mt-0.5 flex items-center justify-center pt-1" style={{ borderTop: "1px solid rgba(56,189,248,0.12)" }}>
          <Compass className="h-3.5 w-3.5 text-ink-faint" />
        </div>
      </div>

      {/* overlay canvas — footprint beam + env layers */}
      <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 z-[5] h-full w-full" />

      <div className="pointer-events-none absolute bottom-3 right-3 z-[6] font-mono text-[9px] text-ink-faint">
        {inv.phase === "idle" ? "STANDBY — AWAITING ACQUISITION" : `SWATH IW · ${incident.sarMetadata.incidenceAngleDeg}° INC`}
      </div>
    </div>
  );
};

/* footprint quad in lng/lat around the slick, rotated diagonally */
function footprintQuad(incident: Incident): [number, number][] {
  const c = incident.spillGeometry.centroid;
  const degPerLat = 1 / 111.32;
  const degPerLng = 1 / (111.32 * Math.cos((c.latitude * Math.PI) / 180));
  const wKm = Math.max(18, incident.spillGeometry.lengthKm * 2.2);
  const hKm = Math.max(14, incident.spillGeometry.widthKm * 4.2);
  const rot = ((incident.spillGeometry.skeletonOrientationDeg + 40) * Math.PI) / 180;
  const half = [
    [wKm * 0.5, hKm * 0.5],
    [-wKm * 0.5, hKm * 0.5],
    [-wKm * 0.5, -hKm * 0.5],
    [wKm * 0.5, -hKm * 0.5],
  ].map(([x, y]) => {
    const px = x * Math.cos(rot) - y * Math.sin(rot);
    const py = x * Math.sin(rot) + y * Math.cos(rot);
    return [c.longitude + px * degPerLng, c.latitude + py * degPerLat] as [number, number];
  });
  return half;
}