"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Incident } from "@/lib/types";
import { cn } from "@/lib/util";
import { hashSeed, mulberry32, pointInSlick } from "./sarCanvas";
import { InvestigationState } from "./useInvestigation";
import { Crosshair, Orbit, Box, Scan } from "lucide-react";

type CamMode = "ORBIT" | "TOP" | "TILT";

interface VolumeSceneProps {
  incident: Incident;
  inv: InvestigationState;
}

const WORLD = 7; // world units for the slick footprint

export const VolumeScene: React.FC<VolumeSceneProps> = ({ incident, inv }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [camMode, setCamMode] = useState<CamMode>("ORBIT");
  const [crossSection, setCrossSection] = useState(false);
  const [spin, setSpin] = useState(true);
  const camModeRef = useRef(camMode);
  const csRef = useRef(crossSection);
  const spinRef = useRef(spin);
  const invRef = useRef(inv);
  useEffect(() => {
    camModeRef.current = camMode;
  }, [camMode]);
  useEffect(() => {
    csRef.current = crossSection;
  }, [crossSection]);
  useEffect(() => {
    spinRef.current = spin;
  }, [spin]);
  useEffect(() => {
    invRef.current = inv;
  }, [inv]);
  const [reduced] = useState(
    () =>
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.localClippingEnabled = true;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x050b11, 16, 42);

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 200);
    camera.position.set(9, 6.5, 9.5);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.target.set(0, 0.6, 0);
    controls.maxPolarAngle = Math.PI * 0.52;
    controls.autoRotate = !reduced && spinRef.current;
    controls.autoRotateSpeed = 0.9;

    /* lights */
    scene.add(new THREE.AmbientLight(0x35607a, 0.85));
    const dir = new THREE.DirectionalLight(0x9fc7e8, 1.4);
    dir.position.set(6, 14, 5);
    scene.add(dir);
    const warm = new THREE.PointLight(0xd6a84f, 1.2, 30);
    warm.position.set(0, 4, 2);
    scene.add(warm);

    const clip = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    /* ocean ground */
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(18, 48).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x06202e, transparent: true, opacity: 0.55, depthWrite: false })
    );
    ground.position.y = 0.02;
    scene.add(ground);

    /* build extrusion from the slick silhouette */
    const seed = hashSeed(incident.eventId);
    const rng = mulberry32(seed);
    const pts = Array.from({ length: 48 }, (_, i) => {
      const t = (i / 48) * Math.PI * 2;
      const wob = 1 + 0.18 * Math.sin(3 * t + rng() * 6) + 0.12 * Math.sin(5 * t + 3);
      const x = (Math.cos(t) * wob) / 2 + 0.5;
      const y = (Math.sin(t) * wob) / 2 + 0.5;
      return new THREE.Vector2((x - 0.5) * WORLD, (y - 0.5) * WORLD);
    });

    const shape = new THREE.Shape(pts.map((p) => new THREE.Vector2(p.x, p.y)));
    const depth = 2.1;
    const geoMain = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.14, bevelSize: 0.14, bevelSegments: 3 });
    geoMain.center();

    const body = new THREE.Mesh(
      geoMain,
      new THREE.MeshPhongMaterial({
        color: 0xd6a84f,
        transparent: true,
        opacity: 0.44,
        emissive: 0x6b4c12,
        emissiveIntensity: 0.5,
        side: THREE.DoubleSide,
        clippingPlanes: [],
      })
    );
    scene.add(body);

    const edgeGeo = new THREE.EdgesGeometry(geoMain, 14);
    const edge = new THREE.LineSegments(
      edgeGeo,
      new THREE.LineBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.85 })
    );
    scene.add(edge);

    /* contamination particles (inside footprint) */
    const COUNT = 900;
    const pos = new Float32Array(COUNT * 3);
    const speedA = new Float32Array(COUNT);
    const phaseA = new Float32Array(COUNT);
    let placed = 0;
    while (placed < COUNT) {
      const nx = rng();
      const ny = rng();
      if (!pointInSlick(incident, nx, ny)) continue;
      const i = placed * 3;
      pos[i] = (nx - 0.5) * WORLD * 0.92;
      pos[i + 1] = rng() * depth * 1.1;
      pos[i + 2] = (ny - 0.5) * WORLD * 0.92;
      speedA[placed] = 0.12 + rng() * 0.22;
      phaseA[placed] = rng();
      placed++;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0xfacc15,
      size: 0.05,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    /* resize */
    const ro = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(container);

    let raf = 0;
    const T = performance.now();

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const t = (performance.now() - T) / 1000;

      const clipPlanes = csRef.current ? [clip] : [];
      body.material.clippingPlanes = clipPlanes;
      pMat.clippingPlanes = clipPlanes;

      const s = invRef.current;
      const rise =
        s.phase === "segment" || s.phase === "verify"
          ? 0.3 + 0.7 * s.prog
          : s.phase === "complete"
            ? 1
            : s.phase === "detect"
              ? 0.18
              : 0.1;
      const g = body.scale.z;
      body.scale.z = THREE.MathUtils.lerp(g, rise, 0.08);
      edge.scale.z = THREE.MathUtils.lerp(edge.scale.z, rise, 0.08);
      body.rotation.y += 0 ? 0 : 0;
      if (!reduced) body.rotation.y = Math.sin(t * 0.1) * 0.02;

      /* particles drift upward + along current */
      if (!reduced) {
        const arr = pGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < COUNT; i++) {
          const i3 = i * 3;
          arr[i3 + 1] += speedA[i] * 0.016;
          arr[i3] += 0.012 * Math.sin(t * 0.4 + phaseA[i] * 9);
          if (arr[i3 + 1] > depth * 1.18 || arr[i3] > WORLD * 0.56) {
            arr[i3 + 1] = 0;
            arr[i3] = -WORLD * 0.4 + phaseA[i] * (WORLD * 0.8);
          }
        }
        pGeo.attributes.position.needsUpdate = true;
      }

      controls.autoRotate = !reduced && spinRef.current && camModeRef.current === "ORBIT";
      setCamKey(camModeRef.current, camera, controls);

      renderer.render(scene, camera);
    };

    loop();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.dispose();
      geoMain.dispose();
      edgeGeo.dispose();
      pGeo.dispose();
      controls.dispose();
      if (renderer.domElement.parentElement === container) container.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incident]);

  return (
    <div className="relative h-full w-full bg-[#050B11]">
      <div ref={containerRef} className="absolute inset-0" />

      {/* mode rail */}
      <div className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-md px-2 py-1 backdrop-blur-sm"
        style={{ background: "rgba(5,11,17,0.72)", border: "1px solid rgba(214,168,79,0.25)" }}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-amber animate-[pulse-soft_1.6s_ease-in-out_infinite]" />
        <span className="font-mono text-[9px] font-semibold tracking-[0.14em] text-ink">CONTAMINATION VOLUME</span>
        <span className="font-mono text-[9px] text-ink-faint">ED25519 · CLOUD 3D</span>
      </div>

      <div className="absolute right-3 top-3 z-10 flex flex-col gap-1 rounded-md p-1 backdrop-blur-sm"
        style={{ background: "rgba(5,11,17,0.7)", border: "1px solid rgba(214,168,79,0.25)" }}
      >
        <button
          onClick={() => setCamMode("ORBIT")}
          className={cn("flex items-center gap-1.5 rounded px-2 py-1 font-mono text-[9px]", camMode === "ORBIT" ? "bg-amber/20 text-amber" : "text-ink-dim hover:bg-bg-2 hover:text-ink")}
        >
          <Orbit className="h-3 w-3" /> ORBIT
        </button>
        <button
          onClick={() => setCamMode("TOP")}
          className={cn("flex items-center gap-1.5 rounded px-2 py-1 font-mono text-[9px]", camMode === "TOP" ? "bg-amber/20 text-amber" : "text-ink-dim hover:bg-bg-2 hover:text-ink")}
        >
          <Scan className="h-3 w-3" /> TOP
        </button>
        <button
          onClick={() => setCamMode("TILT")}
          className={cn("flex items-center gap-1.5 rounded px-2 py-1 font-mono text-[9px]", camMode === "TILT" ? "bg-amber/20 text-amber" : "text-ink-dim hover:bg-bg-2 hover:text-ink")}
        >
          <Crosshair className="h-3 w-3" /> TILT
        </button>
        <button
          onClick={() => setCrossSection((v) => !v)}
          className={cn("flex items-center gap-1.5 rounded px-2 py-1 font-mono text-[9px]", crossSection ? "bg-teal/20 text-teal" : "text-ink-dim hover:bg-bg-2 hover:text-ink")}
        >
          <Box className="h-3 w-3" /> CROSS-SECTION
        </button>
      </div>

      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2">
        <button
          onClick={() => setSpin((v) => !v)}
          className={cn("rounded px-2 py-1 font-mono text-[9px] font-semibold ring-1", spin ? "bg-amber/15 text-amber ring-amber/40" : "bg-[#0A1620]/90 text-ink-faint ring-[rgba(56,189,248,0.15)]")}
        >
          {spin ? "AUTO-ROTATE ON" : "AUTO-ROTATE OFF"}
        </button>
        <span className="font-mono text-[9px] text-ink-faint">DRAG TO ORBIT · SCROLL TO ZOOM</span>
      </div>

      <div className="pointer-events-none absolute bottom-3 right-3 z-10 font-mono text-[9px] text-ink-faint">
        DEPTH PROFILE · μm 2.1 m max · FRESNEL
      </div>
    </div>
  );
};

function setCamKey(mode: CamMode, camera: THREE.PerspectiveCamera, controls: OrbitControls) {
  const targets: Record<CamMode, () => void> = {
    TOP: () => {
      if (camera.position.y < 8) smoothTo(camera, new THREE.Vector3(0, 12.5, 0.01), 2000);
    },
    TILT: () => {
      if (Math.abs(camera.position.x) < 8.4 || Math.abs(camera.position.z) < 8.4) {
        smoothTo(camera, new THREE.Vector3(8.6, 5.6, 8.6), 1600);
      }
    },
    ORBIT: () => {
      const d = camera.position.length();
      if (d < 6.5 || d > 13) smoothTo(camera, new THREE.Vector3(9, 6.5, 9.5), 1400);
    },
  };
  targets[mode]();
  controls.update();
}

function smoothTo(camera: THREE.PerspectiveCamera, target: THREE.Vector3, dur: number) {
  const S = 14;
  const steps = Math.max(4, Math.floor(dur / S));
  const from = camera.position.clone();
  let i = 0;
  const prev = camera as THREE.PerspectiveCamera & { __t: number | undefined };
  if (prev.__t) cancelAnimationFrame(prev.__t);
  const step = () => {
    i++;
    const t = Math.min(1, i / steps);
    const e = 1 - Math.pow(1 - t, 3);
    camera.position.lerpVectors(from, target, e);
    if (i < steps) prev.__t = requestAnimationFrame(step);
    else prev.__t = undefined;
  };
  step();
  void dur;
}