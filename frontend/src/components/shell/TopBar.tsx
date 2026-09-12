"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Satellite,
  Radar,
  Play,
  RotateCcw,
  Clock3,
  Waves,
  CloudSun,
  Activity,
} from "lucide-react";
import { useCommandStore } from "@/lib/store";
import { bootstrapApp } from "@/lib/bootstrap";
import { MOCK_SAT_PASSES } from "@/lib/mockData";

const fmtUtc = (d: Date) =>
  `${d.toISOString().substring(11, 19)} UTC`;
const fmtIst = (d: Date) => {
  const ist = new Date(d.getTime() + 330 * 60000);
  return `${ist.toISOString().substring(11, 19)} IST`;
};

export const TopBar: React.FC = () => {
  const router = useRouter();
  const [now, setNow] = useState<Date | null>(null);

  const { isDemoRunning, demoStep, startDemo, resetDemo, dataSource } =
    useCommandStore();

  const [latency, setLatency] = useState(42);

  useEffect(() => {
    const t = setTimeout(() => setNow(new Date()), 0);
    const i = setInterval(() => setNow(new Date()), 1000);
    const l = setInterval(() => setLatency(38 + Math.floor(Math.random() * 17)), 3000);
    return () => {
      clearTimeout(t);
      clearInterval(i);
      clearInterval(l);
    };
  }, []);

  const sentinel = MOCK_SAT_PASSES.find((p) => p.mission.includes("Sentinel"));
  const risat = MOCK_SAT_PASSES.find((p) => p.mission.includes("RISAT"));

  const [sentinelEta, setSentinelEta] = useState(sentinel?.etaMinutes ?? 118);
  useEffect(() => {
    const i = setInterval(
      () => setSentinelEta((e) => (e > 4 ? e - 1 : 118)),
      1500
    );
    return () => clearInterval(i);
  }, []);

  const runDemo = () => {
    startDemo();
    router.prefetch("/sar-investigation");
    router.push("/operations");
    /* 1 → 2: Sentinel-1 Detection Event runs ON the Operations map (≈7s) */
    setTimeout(() => {
      useCommandStore.setState({ demoStep: 2 });
    }, 4500);
    setTimeout(() => {
      useCommandStore.setState({ demoStep: 3 });
      router.push("/sar-investigation");
    }, 11900);
    /* stage 3 dwells on the SAR investigation workstation */
    setTimeout(() => {
      useCommandStore.setState((st) => ({
        demoStep: 4,
        isDriftPlaying: true,
        layers: { ...st.layers, drift: true },
      }));
      router.push("/drift");
    }, 28000);
    setTimeout(() => {
      useCommandStore.setState((st) => ({
        demoStep: 5,
        currentDriftHour: 12,
        layers: { ...st.layers, drift: true },
      }));
      router.push("/attribution");
    }, 33000);
    setTimeout(() => {
      useCommandStore.setState({ demoStep: 6 });
      router.push("/vessels/9123456");
    }, 38000);
    setTimeout(() => {
      useCommandStore.setState({ demoStep: 7, hasVerified: true });
      router.push("/evidence");
    }, 43000);
    setTimeout(() => {
      useCommandStore.getState().setLayer("drift", false);
      resetDemo();
      router.push("/dossier");
    }, 49000);
  };

  return (
    <header className="h-14 shrink-0 z-40 select-none flex items-center justify-between gap-3 border-b border-line bg-bg-1 px-3">
      {/* Brand */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-line-active bg-bg-2">
          <Waves className="h-4 w-4 text-aqua" />
          <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-teal ring-2 ring-bg-1" />
        </div>
        <div className="leading-tight">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold tracking-wide text-ink">
              SAGAR-DRISHTI <span className="text-ink-faint">V5</span>
            </span>
            <span className="rounded bg-bg-2 px-1.5 py-px font-mono text-[9px] font-medium tracking-widest text-teal ring-1 ring-line">
              ICG COMMAND
            </span>
          </div>
          <div className="meta flex items-center gap-1.5">
            <span>Indian Coast Guard</span>
            <span className="text-ink-faint">·</span>
            <span>Maritime Domain Awareness</span>
          </div>
        </div>

        <div className="mx-1 h-6 w-px bg-line" />

        {/* Mission status */}
        <div className="hidden xl:flex items-center gap-2 rounded-md bg-bg-2 px-2.5 py-1 ring-1 ring-line">
          <span className="h-1.5 w-1.5 rounded-full bg-green animate-pulse" />
          <span className="font-mono text-[10px] font-semibold text-green">
            MISSION NOMINAL
          </span>
          <span className="h-3 w-px bg-line" />
          <span className="font-mono text-[10px] text-ink-dim">
            DEFCON <span className="text-orange">2</span>
          </span>
        </div>
      </div>

      {/* Telemetry cluster */}
      <div className="hidden lg:flex items-center gap-2.5">
        <PassChip
          icon={<Satellite className="h-3.5 w-3.5 text-aqua" />}
          label="Sentinel-1A"
          value={`${sentinelEta}m`}
          hint="IW GRD"
          operational
        />
        <PassChip
          icon={<Radar className="h-3.5 w-3.5 text-teal" />}
          label="RISAT-1A"
          value={risat ? `${risat.etaMinutes}m` : "NEXT"}
          hint="MRS"
          operational
        />
        <Chip icon={<Waves className="h-3.5 w-3.5 text-teal" />} label="INCOIS" value="SYNC" tone="ok" />
        <Chip icon={<CloudSun className="h-3.5 w-3.5 text-teal" />} label="ECMWF" value="SYNC" tone="ok" />
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-2 rounded-md bg-bg-2 px-2.5 py-1 ring-1 ring-line">
          <Clock3 className="h-3.5 w-3.5 text-aqua" />
          <div className="font-mono text-[10px] leading-tight text-ink-dim tnum">
            <div className="text-ink">{now ? fmtUtc(now) : "--:--:--"}</div>
            <div className="text-ink-faint">{now ? fmtIst(now) : "----"}</div>
          </div>
        </div>

        <Chip
        icon={<Activity className="h-3.5 w-3.5 text-teal" />}
        label="LATENCY"
        value={`${latency} ms`}
        tone={latency < 60 ? "ok" : "warn"}
      />

        <button
          onClick={() => void bootstrapApp()}
          className={`flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[10px] font-semibold ring-1 transition-colors duration-150 focus-ring ${
            dataSource === "LIVE"
              ? "bg-green/10 text-green ring-green/30 hover:bg-green/15"
              : "bg-amber/10 text-amber ring-amber/30 hover:bg-amber/15"
          }`}
          title={
            dataSource === "LIVE"
              ? "Live FastAPI backend connected — cached scene data only as fallback. Click to re-sync."
              : "API unreachable — running on cached scene data (degraded mode). Click to retry."
          }
        >
          <span className={`h-1.5 w-1.5 rounded-full ${dataSource === "LIVE" ? "bg-green" : "bg-amber"}`} />
          DATA {dataSource}
        </button>

        <div className="flex items-center gap-1 rounded-lg bg-bg-2 p-1 ring-1 ring-line-active">
          <button
            onClick={runDemo}
            disabled={isDemoRunning}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[10px] font-semibold transition-colors disabled:cursor-default disabled:opacity-90 bg-bg-1 text-ink hover:bg-panel-hover focus-ring"
          >
            <Play className={`h-3 w-3 text-teal ${isDemoRunning ? "animate-pulse" : ""}`} />
            {isDemoRunning ? `STAGE ${demoStep}/7` : "DEMO MODE"}
          </button>
          <button
            onClick={resetDemo}
            className="rounded-md p-1 text-ink-faint transition-colors hover:bg-bg-1 hover:text-ink focus-ring"
            title="Reset demo state"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};

function Chip({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "ok" | "warn";
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-md bg-bg-2 px-2 py-1 ring-1 ring-line">
      {icon}
      <span className="font-mono text-[10px] text-ink-faint">{label}</span>
      <span
        className={`font-mono text-[10px] font-semibold ${
          tone === "ok" ? "text-green" : "text-orange"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function PassChip({
  icon,
  label,
  value,
  hint,
  operational,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  operational: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-md bg-bg-2 px-2 py-1 ring-1 ring-line">
      {icon}
      <div className="font-mono leading-tight">
        <div className="text-[10px] text-ink-faint">{label}</div>
        <div className="text-[10px] font-medium text-ink tnum">
          {value}
          <span className="ml-1 text-ink-faint">{hint}</span>
        </div>
      </div>
      {operational && (
        <span className="h-1.5 w-1.5 rounded-full bg-teal" title="Operational" />
      )}
    </div>
  );
}