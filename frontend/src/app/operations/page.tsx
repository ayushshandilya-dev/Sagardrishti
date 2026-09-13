"use client";

import React from "react";
import { useCommandStore } from "@/lib/store";
import { MaritimeMap } from "@/components/map/MaritimeMap";
import { LayerChips } from "@/components/map/LayerChips";
import { EmptyState } from "@/components/kpi/EmptyState";
import { CopInspector } from "@/components/incident/CopInspector";
import { IncidentDrawer } from "@/components/incident/IncidentDrawer";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiCard } from "@/components/ui/KpiCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AnimatePresence, motion } from "framer-motion";
import { Siren, Satellite, Sailboat, Radar } from "lucide-react";

export default function OperationsPage() {
  const { incidents, selectedIncidentId, setSelectedIncidentId } =
    useCommandStore();
  const { isDemoRunning, demoStep, detectionMs } = useCommandStore();

  const selected = incidents.find((i) => i.eventId === selectedIncidentId) ?? null;
  const dm = detectionMs ?? 0;
  const detectionPhase = isDemoRunning && demoStep === 2;
  const inspectorOpen = !detectionPhase || dm >= 4500;
  const registryPulse = detectionPhase && dm >= 4700 && dm < 9000;
  const kpiPulse = detectionPhase && dm >= 4000 && dm < 7200;

  return (
    <div className="flex h-full flex-col gap-4 p-4 pb-3">
      <PageHeader
        title="Operations"
        eyebrow="INDIAN OCEAN COASTAL WATCH"
        subtitle="Multi-sensor surface monitoring · live COP"
        right={
          <>
            <StatusBadge label="LIVE" tone="ok" pulse />
            <StatusBadge
              label={`${incidents.length} incidents`}
              tone="crit"
              icon={<Siren className="h-3 w-3 text-red" />}
            />
          </>
        }
      />

      {/* 4 KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="relative">
          <KpiCard
            label="Active incidents"
            icon={Siren}
            tone="crit"
            value={incidents.length}
            badge={`${incidents.length} ACTIVE`}
            sub="SD-2026-00421 · SD-2026-00389"
          />
          <AnimatePresence>
            {kpiPulse && (
              <motion.span
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute -right-1.5 -top-1.5 z-10 rounded-full bg-red px-1.5 py-0.5 font-mono text-[9px] font-bold text-white shadow-float ring-2 ring-bg-1"
              >
                +1 DETECTED
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <KpiCard
          label="SAR passes"
          icon={Satellite}
          tone="info"
          value={24}
          unit="/ 24 h"
          sub="Sentinel-1A · RISAT-1A"
        />
        <KpiCard
          label="AIS vessels tracked"
          icon={Sailboat}
          tone="ok"
          value={4821}
          sub="Arabian Sea · Gulf of Kutch"
        />
        <KpiCard
          label="EEZ coverage"
          icon={Radar}
          tone="warn"
          value={2.37}
          unit="M km²"
          sub="98.2 % taskable"
        />
      </div>

      {/* COP: map ~80% + incident drawer */}
      <div className="relative grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_300px] gap-4 overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="relative min-h-0 overflow-hidden rounded-panel border border-line bg-bg-0"
        >
          {incidents.length === 0 ? (
            <EmptyState />
          ) : (
            <MaritimeMap
              incident={selected ?? undefined}
              onSpillClick={(inc) => setSelectedIncidentId(inc.eventId)}
              showChips
            />
          )}

          {/* Layer chips only when a map is live */}
          {incidents.length > 0 && <LayerChips />}

          {/* Floating inspector — stays hidden until the detection beat opens it */}
          <AnimatePresence mode="wait">
            {selected && (
              <div
                className="absolute left-3 top-3 z-10"
                style={{
                  transform: inspectorOpen ? "translateX(0)" : "translateX(-120%)",
                  opacity: inspectorOpen ? 1 : 0,
                  transition: "transform 700ms cubic-bezier(.3,.8,.3,1), opacity 500ms ease-out",
                }}
              >
                <CopInspector incident={selected} shownAt={{ x: 0 }} />
              </div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.aside
          initial={{ opacity: 0, x: 6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between px-0.5 pb-2">
            <span className="text-label-caps text-ink-dim">INCIDENT REGISTRY</span>
            <StatusBadge label={String(incidents.length)} tone="neutral" dot={false} />
          </div>
          <IncidentDrawer
            incidents={incidents}
            selectedId={selectedIncidentId}
            onSelect={(inc) => setSelectedIncidentId(inc.eventId)}
            detecting={registryPulse}
          />
        </motion.aside>
      </div>
    </div>
  );
}