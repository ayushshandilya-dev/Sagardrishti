"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Satellite,
  Radar,
  Play,
  RotateCcw,
  Clock3,
  Waves,
  CloudSun,
  Activity,
  Search,
  Globe,
} from "lucide-react";
import { useCommandStore } from "@/lib/store";
import { bootstrapApp } from "@/lib/bootstrap";
import { MOCK_SAT_PASSES } from "@/lib/mockData";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { NumberTicker } from "@/components/ui/NumberTicker";

const fmtUtc = (d: Date) =>
  `${d.toISOString().substring(11, 19)} UTC`;
const fmtIst = (d: Date) => {
  const ist = new Date(d.getTime() + 330 * 60000);
  return `${ist.toISOString().substring(11, 19)} IST`;
};

export const TopBar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [now, setNow] = useState<Date | null>(null);

  const { isDemoRunning, demoStep, isDemoPaused, startDemo, resetDemo, dataSource } =
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
    router.push("/operations");
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
            <span className="text-title-sm font-semibold tracking-tight text-ink">
              SAGAR-DRISHTI <span className="text-ink-faint">V5</span>
            </span>
            <StatusBadge label="ICG COMMAND" tone="ok" dot={false} />
          </div>
          <div className="meta flex items-center gap-1.5">
            <span>Indian Coast Guard</span>
            <span className="text-ink-faint">·</span>
            <span>Maritime Domain Awareness</span>
          </div>
        </div>

        <div className="mx-1 h-6 w-px bg-line" />

        {/* Mission status */}
        <div className="hidden xl:flex items-center gap-2">
          <StatusBadge label="Mission Nominal" tone="ok" pulse />
          <StatusBadge
            label="DEFCON"
            tone="warn"
            dot={false}
            index={2}
          />
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
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
          className="hidden md:flex items-center gap-2 rounded-md bg-bg-2 px-2.5 py-1 ring-1 ring-line hover:ring-line-active text-ink-dim hover:text-ink transition-colors focus-ring"
          title="Open Command Palette (Ctrl+K)"
        >
          <Search className="h-3.5 w-3.5 text-aqua" />
          <span className="text-telemetry-sm">Quick Jump</span>
          <kbd className="rounded border border-line bg-bg-0 px-1 font-mono text-[9px] text-ink-faint">
            Ctrl+K
          </kbd>
        </button>

        <div className="flex items-center gap-2 rounded-md bg-bg-2 px-2.5 py-1 ring-1 ring-line">
          <Clock3 className="h-3.5 w-3.5 text-aqua" />
          <div className="text-telemetry-sm leading-tight text-ink-dim tnum">
            <div className="text-ink">{now ? fmtUtc(now) : "--:--:--"}</div>
            <div className="text-ink-faint">{now ? fmtIst(now) : "----"}</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 rounded-md bg-bg-2 px-2 py-1 ring-1 ring-line">
          <Activity className="h-3.5 w-3.5 text-teal" />
          <span className="text-telemetry-sm text-ink-faint">LATENCY</span>
          <span
            className={`text-telemetry-sm font-semibold flex items-center gap-1 ${
              latency < 60 ? "text-green" : "text-orange"
            }`}
          >
            <NumberTicker value={latency} />
            <span className="text-[10px]">ms</span>
          </span>
        </div>

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

        {/* ── HIGH-VISIBILITY MISSION DEMO LAUNCHPAD ── */}
        <div className="flex items-center gap-1.5">
          {!isDemoRunning ? (
            <button
              onClick={runDemo}
              className="group relative flex items-center gap-2 rounded-lg border border-teal/50 bg-gradient-to-r from-teal/20 via-aqua/15 to-blue/20 px-3 py-1.5 font-mono text-xs font-bold text-teal shadow-[0_0_18px_rgba(34,211,167,0.25)] transition-all hover:border-teal hover:bg-teal/25 hover:shadow-[0_0_24px_rgba(34,211,167,0.45)] focus-ring active:scale-95"
              title="Launch 8-Stage Autonomous Mission Walkthrough"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal"></span>
              </span>
              <Play className="h-3.5 w-3.5 fill-teal text-teal group-hover:scale-110 transition-transform" />
              <span className="tracking-wide">MISSION DEMO</span>
              <span className="rounded bg-teal/25 px-1.5 py-0.5 text-[9px] font-mono text-ink tracking-normal">
                8 STAGES
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-1 rounded-lg border border-teal/40 bg-bg-2 p-1 ring-1 ring-teal/30 shadow-[0_0_15px_rgba(34,211,167,0.2)]">
              <button
                onClick={() => useCommandStore.getState().togglePauseDemo()}
                className="flex items-center gap-1.5 rounded-md bg-teal/20 px-2.5 py-1 font-mono text-[10px] font-bold text-teal hover:bg-teal/30 transition-colors"
                title={isDemoPaused ? "Click to resume autopilot" : "Click to pause timer"}
              >
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isDemoPaused ? "bg-amber" : "bg-teal"} opacity-75`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isDemoPaused ? "bg-amber" : "bg-teal"}`}></span>
                </span>
                <span>{isDemoPaused ? "PAUSED" : "LIVE DEMO"}</span>
                <span className="text-ink-dim">·</span>
                <span className="text-amber">S{demoStep}/8</span>
              </button>
              <button
                onClick={resetDemo}
                className="rounded-md p-1 text-ink-faint transition-colors hover:bg-red/20 hover:text-red focus-ring"
                title="Exit demo mode"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {!isDemoRunning && (
            <button
              onClick={resetDemo}
              className="rounded-md p-1 text-ink-faint transition-colors hover:bg-bg-1 hover:text-ink focus-ring"
              title="Reset demo state"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}

          <div className="h-5 w-px bg-line mx-1" />

          {/* ── 3D HOLOGRAPHIC COMMAND THEATRE QUICK SWITCHER (IMAGE 1 & 2) ── */}
          {pathname === "/globe" ? (
            <button
              onClick={() => router.push("/operations")}
              className="group relative flex items-center gap-1.5 rounded-lg border border-teal/50 bg-gradient-to-r from-teal/20 to-blue/20 px-2.5 py-1.5 font-mono text-xs font-bold text-teal shadow-[0_0_15px_rgba(34,211,167,0.25)] transition-all hover:bg-teal/30 hover:shadow-[0_0_20px_rgba(34,211,167,0.45)] focus-ring active:scale-95"
              title="Return to Tactical 2D/3D Operations Map"
            >
              <Waves className="h-3.5 w-3.5 text-aqua group-hover:scale-110 transition-transform" />
              <span>LIVE COP MAP</span>
            </button>
          ) : (
            <button
              onClick={() => router.push("/globe")}
              className="group relative flex items-center gap-1.5 rounded-lg border border-cyan-500/50 bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-bg-2 px-2.5 py-1.5 font-mono text-xs font-bold text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.25)] transition-all hover:border-cyan-400 hover:bg-cyan-900/40 hover:shadow-[0_0_22px_rgba(6,182,212,0.45)] focus-ring active:scale-95"
              title="Open Global 3D Holographic Globe Command Theatre (Image 1)"
            >
              <Globe className="h-3.5 w-3.5 text-cyan-400 group-hover:scale-110 group-hover:rotate-12 transition-transform" />
              <span>3D THEATRE</span>
              <span className="rounded bg-cyan-500/20 px-1 py-0.2 text-[8px] font-mono text-cyan-200">
                GLOBE
              </span>
            </button>
          )}
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
      <span className="text-telemetry-sm text-ink-faint">{label}</span>
      <span
        className={`text-telemetry-sm font-semibold ${
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
      <div className="text-telemetry-sm leading-tight">
        <div className="text-ink-faint">{label}</div>
        <div className="font-medium text-ink tnum">
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