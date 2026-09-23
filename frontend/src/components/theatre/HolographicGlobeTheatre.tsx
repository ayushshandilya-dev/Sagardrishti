"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useRouter } from "next/navigation";
import { buildRealisticEarthSystem } from "./realisticEarth";
import {
  Shield,
  Activity,
  Radio,
  Compass,
  AlertTriangle,
  Flame,
  Waves,
  Satellite,
  Maximize2,
  RotateCw,
  Play,
  ArrowRight,
  Crosshair,
  Volume2,
} from "lucide-react";

/* ── INCIDENTS PINNED ON THE GLOBE (Lat, Lon, Data) ── */
interface GlobeIncident {
  id: string;
  name: string;
  category: "OIL_SPILL" | "VESSEL_FIRE" | "SAR_ANOMALY" | "PIRACY_RISK";
  lat: number;
  lon: number;
  color: string;
  threatLevel: "CRITICAL" | "HIGH" | "ELEVATED";
  metric: string;
  vessels: number;
}

const INCIDENTS: GlobeIncident[] = [
  {
    id: "SD-2026-00421",
    name: "Gulf of Kutch Crude Slick",
    category: "OIL_SPILL",
    lat: 22.45,
    lon: 69.15,
    color: "#EF4444",
    threatLevel: "CRITICAL",
    metric: "18.6 km² · 42 MT",
    vessels: 14,
  },
  {
    id: "SD-2026-00389",
    name: "Mumbai High Outer Corridor",
    category: "SAR_ANOMALY",
    lat: 19.35,
    lon: 71.3,
    color: "#F59E0B",
    threatLevel: "HIGH",
    metric: "4.8 km² · Sheen",
    vessels: 28,
  },
  {
    id: "SD-2026-00312",
    name: "Red Sea - Bab el-Mandeb Chokepoint",
    category: "PIRACY_RISK",
    lat: 12.58,
    lon: 43.33,
    color: "#EF4444",
    threatLevel: "CRITICAL",
    metric: "AIS Gap · 6 Ships",
    vessels: 42,
  },
  {
    id: "SD-2026-00277",
    name: "Malacca Strait Gateway",
    category: "SAR_ANOMALY",
    lat: 5.65,
    lon: 95.32,
    color: "#F59E0B",
    threatLevel: "HIGH",
    metric: "Bilge Discharge",
    vessels: 73,
  },
  {
    id: "SD-2026-00190",
    name: "Mozambique Channel Transit",
    category: "VESSEL_FIRE",
    lat: -18.25,
    lon: 41.5,
    color: "#EF4444",
    threatLevel: "CRITICAL",
    metric: "Thermal Anomaly",
    vessels: 19,
  },
  {
    id: "SD-2026-00145",
    name: "Cape of Good Hope Route",
    category: "SAR_ANOMALY",
    lat: -34.35,
    lon: 18.48,
    color: "#EAB308",
    threatLevel: "ELEVATED",
    metric: "Swell 5.4m",
    vessels: 31,
  },
];

/* Helper to convert Lat/Lon to 3D Cartesian coordinates on sphere */
function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

export const HolographicGlobeTheatre: React.FC = () => {
  const router = useRouter();
  const mountRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<GlobeIncident>(INCIDENTS[0]);
  const [autoRotate, setAutoRotate] = useState(true);
  const [activeTab, setActiveTab] = useState<"incidents" | "telemetry">("incidents");

  /* Animated telemetry meters (bars) */
  const [meterBars, setMeterBars] = useState<number[]>([65, 80, 45, 90, 72, 88, 30, 95]);
  useEffect(() => {
    const i = setInterval(() => {
      setMeterBars([
        Math.floor(40 + Math.random() * 55),
        Math.floor(50 + Math.random() * 45),
        Math.floor(30 + Math.random() * 65),
        Math.floor(60 + Math.random() * 38),
        Math.floor(55 + Math.random() * 40),
        Math.floor(70 + Math.random() * 28),
        Math.floor(25 + Math.random() * 70),
        Math.floor(65 + Math.random() * 32),
      ]);
    }, 800);
    return () => clearInterval(i);
  }, []);

  /* Three.js Scene Setup */
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const width = el.clientWidth;
    const height = el.clientHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020712, 0.0018);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 8, 36);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    el.appendChild(renderer.domElement);

    // ── INTERACTIVE 3D ORBIT CONTROLS (FULL MOUSE & TOUCH ROTATION) ──
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enableZoom = true;
    controls.minDistance = 15;
    controls.maxDistance = 65;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.7;
    controls.enablePan = false;
    controlsRef.current = controls;

    // ── PHOTOREALISTIC SATELLITE EARTH SYSTEM (NASA SPEC) ──
    const GLOBE_RADIUS = 10;
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const { earthMesh, cloudMesh, atmosphereMesh, sunLight, ambientLight } =
      buildRealisticEarthSystem(GLOBE_RADIUS);

    scene.add(ambientLight);
    scene.add(sunLight);

    globeGroup.add(earthMesh);
    globeGroup.add(cloudMesh);
    scene.add(atmosphereMesh);

    // Initial orientation: Center on the Indian Ocean / Arabian Sea
    globeGroup.rotation.y = -Math.PI * 0.42;
    globeGroup.rotation.x = Math.PI * 0.08;

    // ── HOLOGRAPHIC EMITTER PEDESTAL / BASE (Matching Image 1) ──
    const pedestalGroup = new THREE.Group();
    pedestalGroup.position.set(0, -11.5, 0);
    scene.add(pedestalGroup);

    // Outer Glowing Tech Ring
    const ringGeo1 = new THREE.RingGeometry(11.5, 12.2, 64);
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
    });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI / 2;
    pedestalGroup.add(ring1);

    // Concentric Calibration Ring
    const ringGeo2 = new THREE.RingGeometry(9.0, 9.4, 48);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0x22d3a7,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
    });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.x = Math.PI / 2;
    pedestalGroup.add(ring2);

    // Radial spokes on pedestal
    const gridHelper = new THREE.PolarGridHelper(14, 16, 8, 64, 0x00f0ff, 0x064e6b);
    gridHelper.position.y = -0.05;
    pedestalGroup.add(gridHelper);

    // ── SATELLITE ORBITAL TRACK RINGS ──
    const orbitGroup = new THREE.Group();
    scene.add(orbitGroup);

    const orbitMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45 });
    const orbitPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      orbitPts.push(new THREE.Vector3(Math.cos(a) * 12.8, Math.sin(a) * 12.8 * 0.45, Math.sin(a) * 12.8 * 0.85));
    }
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPts);
    const orbitLine = new THREE.Line(orbitGeo, orbitMat);
    orbitGroup.add(orbitLine);

    // Satellite beacon dot
    const satGeo = new THREE.SphereGeometry(0.22, 16, 16);
    const satMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const satMesh = new THREE.Mesh(satGeo, satMat);
    orbitGroup.add(satMesh);

    // ── INCIDENT 3D PINS ON GLOBE ──
    const pinMeshes: { mesh: THREE.Mesh; ring: THREE.Mesh; inc: GlobeIncident }[] = [];
    INCIDENTS.forEach((inc) => {
      const pos = latLonToVector3(inc.lat, inc.lon, GLOBE_RADIUS + 0.15);
      const pinGeo = new THREE.SphereGeometry(0.32, 16, 16);
      const pinMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(inc.color) });
      const pinMesh = new THREE.Mesh(pinGeo, pinMat);
      pinMesh.position.copy(pos);
      globeGroup.add(pinMesh);

      // Radiating ring around pin
      const rGeo = new THREE.RingGeometry(0.4, 0.6, 24);
      const rMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(inc.color),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
      });
      const rMesh = new THREE.Mesh(rGeo, rMat);
      rMesh.position.copy(pos);
      rMesh.lookAt(new THREE.Vector3(0, 0, 0));
      globeGroup.add(rMesh);

      pinMeshes.push({ mesh: pinMesh, ring: rMesh, inc });
    });

    // ── PARTICLE STARFIELD ──
    const partGeo = new THREE.BufferGeometry();
    const partCount = 700;
    const partPos = new Float32Array(partCount * 3);
    for (let i = 0; i < partCount * 3; i += 3) {
      partPos[i] = (Math.random() - 0.5) * 120;
      partPos[i + 1] = (Math.random() - 0.5) * 120;
      partPos[i + 2] = (Math.random() - 0.5) * 120;
    }
    partGeo.setAttribute("position", new THREE.BufferAttribute(partPos, 3));
    const partMat = new THREE.PointsMaterial({ color: 0x7dd3fc, size: 0.45, transparent: true, opacity: 0.6 });
    const particles = new THREE.Points(partGeo, partMat);
    scene.add(particles);

    // ── ANIMATION LOOP ──
    let animId: number;
    let t = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      t += 0.015;

      // Update 3D Orbit Controls
      controls.update();

      // Atmospheric cloud layer rotation (orbital parallax over Earth)
      cloudMesh.rotation.y += 0.0003;

      // Rotate pedestal rings in opposing directions
      ring1.rotation.z += 0.004;
      ring2.rotation.z -= 0.006;

      // Animate satellite position
      const satAng = t * 0.4;
      satMesh.position.set(
        Math.cos(satAng) * 12.8,
        Math.sin(satAng) * 12.8 * 0.45,
        Math.sin(satAng) * 12.8 * 0.85
      );

      // Pulse incident rings
      pinMeshes.forEach((p, idx) => {
        const s = 1.0 + Math.sin(t * 3.5 + idx * 1.2) * 0.45;
        p.ring.scale.set(s, s, s);
      });

      renderer.render(scene, camera);
    };
    animate();

    // ── INTERACTIVE PIN RAYCASTING (Click on globe to select incident) ──
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerDown = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshesToTest = pinMeshes.map((p) => p.mesh);
      const intersects = raycaster.intersectObjects(meshesToTest);

      if (intersects.length > 0) {
        const hit = pinMeshes.find((p) => p.mesh === intersects[0].object);
        if (hit) {
          setSelectedIncident(hit.inc);
        }
      }
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);

    // Resize handler
    const handleResize = () => {
      if (!el) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      cancelAnimationFrame(animId);
      controls.dispose();
      renderer.dispose();
      if (el.contains(renderer.domElement)) {
        el.removeChild(renderer.domElement);
      }
    };
  }, []);

  /* Dynamically update autoRotate state on controls */
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  /* Smoothly re-orient camera when an incident is selected */
  useEffect(() => {
    if (!controlsRef.current || !selectedIncident || !cameraRef.current) return;
    const targetVector = latLonToVector3(selectedIncident.lat, selectedIncident.lon, 28);
    const camera = cameraRef.current;
    const startPos = camera.position.clone();

    let step = 0;
    const flyCamera = () => {
      step += 0.05;
      if (step <= 1 && cameraRef.current) {
        camera.position.lerpVectors(startPos, targetVector, step);
        controlsRef.current?.update();
        requestAnimationFrame(flyCamera);
      }
    };
    flyCamera();
  }, [selectedIncident]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#02060d] text-ink select-none font-sans">
      {/* 3D Three.js Container */}
      <div
        ref={mountRef}
        className="absolute inset-0 h-full w-full z-0 cursor-grab active:cursor-grabbing"
      />

      {/* ── TOP-LEFT: OFFICIAL INCOIS / ICG MILITARY SHIELD (Matching Image 1) ── */}
      <div className="pointer-events-auto absolute top-4 left-4 z-20 flex flex-col gap-1 rounded-2xl border border-teal/40 bg-bg-1/80 p-3.5 shadow-[0_0_30px_rgba(0,240,255,0.18)] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-teal/60 bg-gradient-to-br from-teal/30 via-blue/20 to-red/30 shadow-[0_0_20px_rgba(0,240,255,0.35)]">
            <Shield className="h-7 w-7 text-teal" />
            <div className="absolute inset-0 rounded-xl border border-cyan/40 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-black tracking-widest text-teal">
                INCOIS
              </span>
              <span className="rounded bg-teal/20 px-1.5 py-0.2 font-mono text-[9px] font-bold text-teal ring-1 ring-teal/40">
                INDIAN OCEAN
              </span>
            </div>
            <p className="font-mono text-[9px] text-ink-dim uppercase tracking-wider">
              Earth System Science Org · MoES India
            </p>
          </div>
        </div>
      </div>

      {/* ── LEFT PANEL: METRICS & DOPPLER RADAR SWEEP (Matching Image 1) ── */}
      <div className="pointer-events-auto absolute top-24 left-4 z-20 w-64 rounded-2xl border border-teal/30 bg-bg-1/85 p-3.5 shadow-[0_10px_35px_rgba(0,0,0,0.8)] backdrop-blur-xl ring-1 ring-teal/20">
        <div className="flex items-center justify-between border-b border-line pb-2 text-xs">
          <span className="font-mono font-bold tracking-widest text-teal">METRICS</span>
          <span className="flex items-center gap-1 font-mono text-[9px] text-teal">
            <Activity className="h-3 w-3 animate-pulse" /> SCAN ACTIVE
          </span>
        </div>

        {/* Circular Radar Sweep Scope */}
        <div className="relative mt-3 flex h-32 w-full items-center justify-center overflow-hidden rounded-xl border border-teal/40 bg-bg-0/90">
          <div className="absolute inset-2 rounded-full border border-teal/30" />
          <div className="absolute inset-6 rounded-full border border-teal/20" />
          <div className="absolute inset-10 rounded-full border border-teal/15" />
          {/* Crosshairs */}
          <div className="absolute h-full w-px bg-teal/20" />
          <div className="absolute w-full h-px bg-teal/20" />
          {/* Rotating Sweep Beam */}
          <div className="absolute h-full w-full rounded-full animate-spin" style={{ animationDuration: "3s" }}>
            <div className="h-1/2 w-1/2 bg-gradient-to-br from-teal/40 via-teal/5 to-transparent origin-bottom-right" />
          </div>
          {/* Target blips */}
          <div className="absolute top-8 left-16 h-2 w-2 rounded-full bg-red animate-ping" />
          <div className="absolute bottom-10 right-14 h-1.5 w-1.5 rounded-full bg-amber" />
          <span className="absolute bottom-1.5 left-2 font-mono text-[8px] text-teal/80">
            FREQ: 5.405 GHz · C-SAR
          </span>
        </div>

        {/* Vertical Equalizer Frequency Bars */}
        <div className="mt-3 flex items-end justify-between gap-1 h-12 px-1">
          {meterBars.map((val, idx) => (
            <div key={idx} className="flex-1 bg-bg-2 rounded-sm overflow-hidden h-full flex flex-col justify-end">
              <div
                className="w-full bg-gradient-to-t from-teal to-cyan transition-all duration-500 rounded-sm"
                style={{ height: `${val}%` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between font-mono text-[8px] text-ink-dim">
          <span>01</span>
          <span>HYDRO VECTORS</span>
          <span>08</span>
        </div>
      </div>

      {/* ── BOTTOM-LEFT: DISASTER MANAGEMENT INDICATORS (Waveform Graph) ── */}
      <div className="pointer-events-auto absolute bottom-4 left-4 z-20 w-80 rounded-2xl border border-red/40 bg-bg-1/85 p-3.5 shadow-[0_0_25px_rgba(239,68,68,0.18)] backdrop-blur-xl ring-1 ring-red/20">
        <div className="flex items-center justify-between border-b border-line pb-1.5 text-xs">
          <span className="font-mono font-bold tracking-widest text-red">
            DISASTER MANAGEMENT INDICATORS
          </span>
          <span className="font-mono text-[9px] text-red font-bold animate-pulse">LIVE</span>
        </div>

        {/* Seismograph / Waveform Chart */}
        <div className="relative mt-2 h-20 w-full overflow-hidden rounded-lg bg-bg-0/90 border border-red/20 p-1">
          <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 50">
            <defs>
              <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#EF4444" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {/* Waveform polygon fill */}
            <path
              d="M 0 50 L 0 35 L 8 28 L 14 42 L 20 18 L 26 30 L 32 12 L 40 40 L 48 20 L 56 34 L 64 8 L 72 26 L 80 14 L 88 38 L 94 22 L 100 30 L 100 50 Z"
              fill="url(#waveGrad)"
            />
            {/* Waveform stroke */}
            <path
              d="M 0 35 L 8 28 L 14 42 L 20 18 L 26 30 L 32 12 L 40 40 L 48 20 L 56 34 L 64 8 L 72 26 L 80 14 L 88 38 L 94 22 L 100 30"
              fill="none"
              stroke="#EF4444"
              strokeWidth="1.8"
            />
          </svg>
          <div className="absolute top-1 right-2 font-mono text-[8px] text-red/80">
            HYDROSTATIC DISPERSION INDEX: 84.6%
          </div>
        </div>
      </div>

      {/* ── TOP-RIGHT: CIRCULAR TARGETING DOPPLER SCOPE (Matching Image 1) ── */}
      <div className="pointer-events-auto absolute top-4 right-4 z-20 flex items-center gap-3 rounded-2xl border border-teal/40 bg-bg-1/80 p-2 shadow-[0_0_25px_rgba(0,240,255,0.2)] backdrop-blur-xl">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-teal/50 bg-bg-0">
          <div className="absolute inset-1 rounded-full border border-teal/20" />
          <div className="absolute h-full w-px bg-teal/30" />
          <div className="absolute w-full h-px bg-teal/30" />
          <div className="h-8 w-8 rounded-full border border-cyan animate-ping opacity-75" />
          <Crosshair className="h-5 w-5 text-teal" />
          <span className="absolute top-0.5 font-mono text-[7px] text-teal">000°</span>
          <span className="absolute right-0.5 font-mono text-[7px] text-teal">090°</span>
          <span className="absolute bottom-0.5 font-mono text-[7px] text-teal">180°</span>
          <span className="absolute left-0.5 font-mono text-[7px] text-teal">270°</span>
        </div>
        <div className="pr-2 font-mono text-[10px]">
          <div className="font-bold text-teal">SENTINEL-1A SAR</div>
          <div className="text-ink-dim">ORBIT: #118 · 22.45°N</div>
          <div className="text-amber font-semibold">TARGET LOCK: KUTCH</div>
        </div>
      </div>

      {/* ── RIGHT PANEL: DISASTER MANAGEMENT TELEMETRY (Matching Image 1) ── */}
      <div className="pointer-events-auto absolute top-24 right-4 z-20 w-80 rounded-2xl border border-red/50 bg-bg-1/90 p-4 shadow-[0_0_35px_rgba(239,68,68,0.22)] backdrop-blur-2xl ring-1 ring-red/30">
        <div className="flex items-center justify-between border-b border-red/30 pb-2">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-red animate-pulse" />
            <span className="font-mono text-xs font-black tracking-widest text-red">
              DISASTER MANAGEMENT
            </span>
          </div>
          <span className="rounded bg-red/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-red ring-1 ring-red/40">
            TOTAL: 73
          </span>
        </div>

        {/* Telemetry Numbers Grid */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="flex items-center justify-between rounded-lg bg-bg-2/80 p-2 border border-line">
            <span className="text-ink-dim text-[10px]">CRITICAL</span>
            <span className="text-red font-black text-sm">73</span>
            <span className="text-red font-mono text-[10px]">778.37.29</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-bg-2/80 p-2 border border-line">
            <span className="text-ink-dim text-[10px]">HIGH</span>
            <span className="text-amber font-black text-sm">30</span>
            <span className="text-amber font-mono text-[10px]">80.58.89</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-bg-2/80 p-2 border border-line">
            <span className="text-ink-dim text-[10px]">MONITORED</span>
            <span className="text-teal font-black text-sm">86</span>
            <span className="text-teal font-mono text-[10px]">1.69.95</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-bg-2/80 p-2 border border-line">
            <span className="text-ink-dim text-[10px]">INTERCEPT</span>
            <span className="text-cyan font-black text-sm">23</span>
            <span className="text-cyan font-mono text-[10px]">59.95.39</span>
          </div>
        </div>

        {/* Active Incidents List */}
        <div className="mt-3 flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
          {INCIDENTS.map((inc) => {
            const isSel = selectedIncident.id === inc.id;
            return (
              <button
                key={inc.id}
                onClick={() => setSelectedIncident(inc)}
                className={`flex items-center justify-between rounded-xl p-2 text-left transition-all ${
                  isSel
                    ? "bg-red/20 ring-1 ring-red text-red shadow-[0_0_15px_rgba(239,68,68,0.25)]"
                    : "bg-bg-2/60 text-ink-dim hover:bg-bg-2 hover:text-ink"
                }`}
              >
                <div>
                  <div className="font-mono text-[11px] font-bold text-ink">{inc.name}</div>
                  <div className="font-mono text-[9px] text-ink-dim">{inc.metric}</div>
                </div>
                <div className="text-right font-mono text-[9px]">
                  <span className={`rounded px-1.5 py-0.5 font-bold ${
                    inc.threatLevel === "CRITICAL" ? "bg-red/25 text-red" : "bg-amber/25 text-amber"
                  }`}>
                    {inc.threatLevel}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Enter Operations COP Button */}
        <button
          onClick={() => router.push("/operations")}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal via-cyan to-blue px-3 py-2 font-mono text-xs font-black text-bg-0 shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all hover:scale-[1.02] active:scale-95"
        >
          <span>ENTER OPERATIONS COP</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── BOTTOM-RIGHT: METMETVTS TELEMETRY (Matching Image 1) ── */}
      <div className="pointer-events-auto absolute bottom-4 right-4 z-20 w-80 rounded-2xl border border-teal/40 bg-bg-1/85 p-3 shadow-[0_0_25px_rgba(0,240,255,0.18)] backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-line pb-1.5 text-xs">
          <span className="font-mono font-bold tracking-widest text-teal">METMETVTS</span>
          <span className="font-mono text-[9px] text-teal">RADAR VTS LINK</span>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-teal/40 bg-bg-0">
            <div className="absolute inset-1 rounded-full border border-teal/20 animate-pulse" />
            <div className="absolute h-full w-px bg-teal/20" />
            <div className="absolute w-full h-px bg-teal/20" />
            <div className="h-2 w-2 rounded-full bg-teal animate-ping" />
          </div>
          <div className="flex-1 font-mono text-[9px] text-ink-dim space-y-0.5">
            <div className="flex justify-between">
              <span>SWELL HEIGHT:</span> <span className="text-teal font-bold">1.8 M</span>
            </div>
            <div className="flex justify-between">
              <span>TIDAL CURRENT:</span> <span className="text-teal font-bold">1.1 KN (EBB)</span>
            </div>
            <div className="flex justify-between">
              <span>SURFACE WIND:</span> <span className="text-amber font-bold">14 KN · NW</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── THEATRE CONTROLS DOCK (Bottom Center) ── */}
      <div className="pointer-events-auto absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-xl border border-teal/40 bg-bg-1/90 px-4 py-2 shadow-float backdrop-blur-md">
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-[10px] font-bold transition-all ${
            autoRotate
              ? "bg-teal/20 text-teal ring-1 ring-teal/40"
              : "bg-bg-2 text-ink-dim hover:text-ink"
          }`}
        >
          <RotateCw className={`h-3 w-3 ${autoRotate ? "animate-spin" : ""}`} />
          <span>{autoRotate ? "ORBIT ACTIVE" : "ORBIT PAUSED"}</span>
        </button>

        <div className="h-4 w-px bg-line" />

        <button
          onClick={() => router.push("/operations")}
          className="flex items-center gap-1.5 rounded-lg bg-teal px-3 py-1 font-mono text-[10px] font-black text-bg-0 shadow-[0_0_15px_rgba(0,240,255,0.4)] hover:bg-teal/90 transition-all"
        >
          <Play className="h-3 w-3 fill-current" />
          <span>LAUNCH COP RADAR</span>
        </button>
      </div>
    </div>
  );
};
