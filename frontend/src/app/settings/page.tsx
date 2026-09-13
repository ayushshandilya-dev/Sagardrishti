"use client";

import React from "react";
import { useCommandStore } from "@/lib/store";
import { MOCK_SAT_PASSES } from "@/lib/mockData";
import { cn } from "@/lib/util";
import { MapLayersState, SatPass, AlertSeverity } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Layers,
  Radar,
  Waves,
  Satellite,
  Radio,
  Bell,
  Keyboard,
} from "lucide-react";

const LAYER_META: { key: keyof MapLayersState; label: string; desc: string; dot: string }[] = [
  { key: "eez", label: "EEZ boundary", desc: "Exclusive economic zone line", dot: "#38BDF8" },
  { key: "shipping", label: "Shipping lanes", desc: "Lloyd's + IMO corridor data", dot: "#22D3A7" },
  { key: "ais", label: "AIS traffic", desc: "Live vessel tracks", dot: "#38BDF8" },
  { key: "oil", label: "Oil slick", desc: "SAR-derived polygon", dot: "#D6A84F" },
  { key: "drift", label: "RK4 drift", desc: "Reverse-drift trajectory", dot: "#38BDF8" },
  { key: "weather", label: "Weather", desc: "ECMWF 10 m wind field", dot: "#22D3A7" },
  { key: "currents", label: "Currents", desc: "INCOIS ocean currents", dot: "#38BDF8" },
];

const DATA_SOURCES: { name: string; kind: "SAR" | "OCEAN" | "AIS"; sub: string; latency: string }[] = [
  { name: "Sentinel-1A", kind: "SAR", sub: "C-band IW · 5 d repeat", latency: "SYNC 08:00 Z" },
  { name: "RISAT-1A", kind: "SAR", sub: "C-band · 25 d repeat", latency: "SYNC 06:12 Z" },
  { name: "INCOIS Ocean State", kind: "OCEAN", sub: "Currents · 3 h forecast", latency: "SYNC 09:30 Z" },
  { name: "ECMWF ERA5", kind: "OCEAN", sub: "10 m wind · 3 h step", latency: "SYNC 09:45 Z" },
  { name: "AIS coastal network", kind: "AIS", sub: "In-zone reception", latency: "LIVE · 18 s" },
];

const kindColor: Record<string, string> = {
  SAR: "#38BDF8",
  OCEAN: "#22D3A7",
  AIS: "#22D3A7",
};

const SEV_OPTS: AlertSeverity[] = ["CRITICAL", "SUSPICIOUS", "VERIFIED"];

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "relative h-4.5 w-8 shrink-0 rounded-full transition-colors duration-150 ring-1 focus-ring",
        on ? "bg-aqua/30 ring-aqua/50" : "bg-bg-0 ring-line"
      )}
    >
      <span
        className={cn(
          "absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full transition-all duration-150",
          on ? "left-[18px] bg-aqua" : "left-0.5 bg-ink-faint"
        )}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { layers, setLayer, resetLayers, alerts, alertFilter, setAlertFilter, markAlertRead } =
    useCommandStore();
  const passes = MOCK_SAT_PASSES as SatPass[];

  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col gap-3 overflow-y-auto p-4">
      <PageHeader
        title="Settings & layers"
        badge={{ label: "COP CONFIGURATION", tone: "neutral" }}
        subtitle="Layer stack, data source health and operational configuration"
      />

      <div className="grid grid-cols-2 gap-3">
        {/* layers */}
        <Panel
          title="Map layers"
          icon={Layers}
          tone="info"
          toolbar={
            <button
              onClick={resetLayers}
              className="font-mono text-[9px] text-ink-faint transition-colors duration-150 hover:text-ink"
            >
              RESET
            </button>
          }
          bodyClassName="px-4 py-2"
        >
          <div className="flex flex-col">
            {LAYER_META.map(({ key, label, desc, dot }) => (
              <div
                key={key}
                className="flex items-center gap-2.5 border-b border-dashed border-line/60 py-2 last:border-0"
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />
                <div className="min-w-0 flex-1">
                  <div className="text-body-sm font-medium text-ink">{label}</div>
                  <div className="truncate text-telemetry-sm text-ink-faint">{desc}</div>
                </div>
                <Toggle on={layers[key]} onClick={() => setLayer(key, !layers[key])} />
              </div>
            ))}
          </div>
        </Panel>

        {/* data sources */}
        <div className="flex flex-col gap-3">
          <Panel
            title="Satellite pass schedule"
            icon={Satellite}
            tone="info"
            bodyClassName="px-4 py-2"
          >
            <div className="flex flex-col">
              {passes.map((p) => (
                <div key={p.id} className="flex items-center gap-2 border-b border-dashed border-line/60 py-1.5 last:border-0">
                  <span className="w-24 shrink-0 text-telemetry-sm text-ink">{p.mission}</span>
                  <span className="rounded bg-bg-0 px-1.5 py-px font-mono text-[8px] text-ink-faint ring-1 ring-line">
                    {p.mode}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-right text-telemetry-sm text-ink-faint tnum">
                    {p.nextUtc} UTC
                  </span>
                  <span className={cn("text-telemetry-sm", p.operational ? "text-green" : "text-amber")}>
                    {p.operational ? "GO" : "STANDBY"} · T−{p.etaMinutes} m
                  </span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            title="Data source health"
            icon={Radio}
            tone="ok"
            bodyClassName="px-4 py-2"
          >
            <div className="flex flex-col">
              {DATA_SOURCES.map((s) => (
                <div key={s.name} className="flex items-center gap-2 border-b border-dashed border-line/60 py-2 last:border-0">
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-bg-0 ring-1 ring-line">
                    {kindColor[s.kind] === "#22D3A7" ? (
                      <Waves className="h-3 w-3 text-teal" />
                    ) : kindColor[s.kind] === "#38BDF8" ? (
                      <Radar className="h-3 w-3 text-aqua" />
                    ) : (
                      <Radio className="h-3 w-3 text-teal" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-body-sm font-medium text-ink">{s.name}</div>
                    <div className="text-telemetry-sm text-ink-faint">{s.sub}</div>
                  </div>
                  <StatusBadge label={s.latency} tone="ok" dot={false} />
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {/* alerts */}
      <Panel
        title="Operational alerts"
        icon={Bell}
        tone="warn"
        toolbar={
          <div className="flex items-center gap-1">
            {(["ALL", ...SEV_OPTS] as const).map((f) => (
              <button
                key={f}
                onClick={() => setAlertFilter(f as AlertSeverity | "ALL")}
                className={cn(
                  "rounded px-2 py-0.5 font-mono text-[9px] transition-colors duration-150 focus-ring",
                  alertFilter === f ? "bg-aqua/10 font-semibold text-aqua ring-1 ring-aqua/30" : "text-ink-faint hover:text-ink"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        }
        bodyClassName="px-4 py-3"
      >
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
          {alerts.map((a) => {
            const sev =
              a.severity === "CRITICAL" ? "#EF4444" : a.severity === "SUSPICIOUS" ? "#F59E0B" : "#22C55E";
            return (
              <button
                key={a.id}
                onClick={() => markAlertRead(a.id)}
                className={cn(
                  "rounded-panel border border-line bg-bg-0 px-3 py-2 text-left transition-opacity duration-150 focus-ring",
                  a.read && "opacity-45"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <StatusBadge
                    label={a.severity}
                    tone={a.severity === "CRITICAL" ? "crit" : a.severity === "SUSPICIOUS" ? "warn" : "ok"}
                    dot={false}
                  />
                  <span className="font-mono text-[8px] text-ink-faint tnum">{a.timestamp}</span>
                </div>
                <div className="mt-1 text-body-sm font-medium text-ink">{a.title}</div>
                <div className="mt-0.5 text-telemetry-sm leading-relaxed text-ink-faint">{a.description}</div>
                <div className="mt-1 font-mono text-[8px] text-ink-faint">{a.location}</div>
              </button>
            );
          })}
        </div>
      </Panel>

      {/* keybindings */}
      <Panel
        title="Keybindings"
        icon={Keyboard}
        tone="info"
        bodyClassName="px-4 pb-4 pt-2"
      >
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
          {[
            ["1–7", "Layer toggles"],
            ["+ / −", "Map zoom"],
            ["G", "Reset view"],
            ["Space", "Drift play"],
            ["V", "Verify chain"],
          ].map(([k, v]) => (
            <div key={k} className="rounded bg-bg-0 px-2.5 py-1.5 ring-1 ring-line">
              <div className="font-mono text-[10px] font-semibold text-aqua">{k}</div>
              <div className="text-telemetry-sm text-ink-faint">{v}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}