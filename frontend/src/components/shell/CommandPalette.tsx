"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCommandStore } from "@/lib/store";
import {
  Search,
  Compass,
  Satellite,
  Wind,
  Target,
  Ship,
  Link2,
  FileText,
  Sparkles,
  Layers,
  AlertTriangle,
  X,
  CornerDownLeft,
} from "lucide-react";

interface PaletteItem {
  id: string;
  category: "Navigation" | "Incidents" | "Vessels" | "Layers";
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  badge?: string;
}

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const {
    incidents,
    candidateVessels,
    setSelectedIncidentId,
    setSelectedVesselImo,
    layers,
    setLayer,
  } = useCommandStore();

  // Keyboard shortcut listener (Ctrl+K or Cmd+K)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    const onCustomOpen = () => setIsOpen(true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("open-command-palette", onCustomOpen);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("open-command-palette", onCustomOpen);
    };
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  const items = useMemo<PaletteItem[]>(() => {
    const list: PaletteItem[] = [
      // Navigation
      {
        id: "nav-operations",
        category: "Navigation",
        title: "Operations (COP)",
        subtitle: "Multi-sensor maritime common operating picture",
        icon: Compass,
        action: () => router.push("/operations"),
      },
      {
        id: "nav-sar",
        category: "Navigation",
        title: "SAR Multi-Spectral Workstation",
        subtitle: "Sentinel-1A dual-pol backscatter decomposition",
        icon: Satellite,
        action: () => router.push("/sar/SD-2026-00421"),
      },
      {
        id: "nav-drift",
        category: "Navigation",
        title: "Reverse Drift Reconstruction (RK4)",
        subtitle: "Lagrangian advection origin backtracking",
        icon: Wind,
        action: () => router.push("/drift"),
      },
      {
        id: "nav-attribution",
        category: "Navigation",
        title: "Vessel Attribution Matrix",
        subtitle: "5-factor Bayesian candidate ranking",
        icon: Target,
        action: () => router.push("/attribution"),
      },
      {
        id: "nav-evidence",
        category: "Navigation",
        title: "Forensic Evidence Ledger",
        subtitle: "SHA-256 Merkle chain & Ed25519 verification",
        icon: Link2,
        action: () => router.push("/evidence"),
      },
      {
        id: "nav-dossier",
        category: "Navigation",
        title: "Legal Case Dossier",
        subtitle: "Court-ready Sec. 65B maritime pollution report",
        icon: FileText,
        action: () => router.push("/dossier"),
      },
      {
        id: "nav-explainability",
        category: "Navigation",
        title: "Explainability Gallery",
        subtitle: "Interactive forensic algorithm comparison suite",
        icon: Sparkles,
        action: () => router.push("/explainability"),
      },
    ];

    // Incidents
    incidents.forEach((inc) => {
      list.push({
        id: `inc-${inc.eventId}`,
        category: "Incidents",
        title: `${inc.eventId} · ${inc.spillGeometry.areaKm2} km²`,
        subtitle: `${inc.radarBrief.slice(0, 52)}…`,
        icon: AlertTriangle,
        badge: inc.classification.classLabel.replace("_", " "),
        action: () => {
          setSelectedIncidentId(inc.eventId);
          router.push("/operations");
        },
      });
    });

    // Vessels
    candidateVessels.forEach((v) => {
      list.push({
        id: `vessel-${v.imo}`,
        category: "Vessels",
        title: `${v.vesselName} (IMO ${v.imo})`,
        subtitle: `${v.vesselType} · ${v.flag} · Score ${(v.attributionScore * 100).toFixed(1)}%`,
        icon: Ship,
        badge: v.riskBadge,
        action: () => {
          setSelectedVesselImo(v.imo);
          router.push(`/vessels/${v.imo}`);
        },
      });
    });

    // Layers
    list.push({
      id: "layer-ais",
      category: "Layers",
      title: `Toggle AIS Layer [${layers.ais ? "ACTIVE" : "OFF"}]`,
      subtitle: "Live AIS vessel positions and course vectors",
      icon: Layers,
      action: () => setLayer("ais", !layers.ais),
    });
    list.push({
      id: "layer-drift",
      category: "Layers",
      title: `Toggle RK4 Drift Layer [${layers.drift ? "ACTIVE" : "OFF"}]`,
      subtitle: "Lagrangian reverse advection particle flow",
      icon: Layers,
      action: () => setLayer("drift", !layers.drift),
    });
    list.push({
      id: "layer-pipelines",
      category: "Layers",
      title: `Toggle Subsea Pipelines [${layers.pipelines ? "ACTIVE" : "OFF"}]`,
      subtitle: "Offshore oil & gas pipeline corridors",
      icon: Layers,
      action: () => setLayer("pipelines", !layers.pipelines),
    });

    return list;
  }, [
    router,
    incidents,
    candidateVessels,
    layers,
    setLayer,
    setSelectedIncidentId,
    setSelectedVesselImo,
  ]);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [items, query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(
        (prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length)
      );
    } else if (e.key === "Enter" && filteredItems[selectedIndex]) {
      e.preventDefault();
      filteredItems[selectedIndex].action();
      setIsOpen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-bg-0/80 backdrop-blur-md transition-opacity">
      <div
        className="w-full max-w-xl overflow-hidden rounded-panel border border-line-active bg-bg-1 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input Header */}
        <div className="flex items-center gap-3 border-b border-line px-4 py-3 bg-bg-2">
          <Search className="h-4 w-4 text-aqua shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Jump to incident, vessel, layer or workstation… (e.g. 'Mumbai', '9123456')"
            className="w-full bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none font-sans"
          />
          <kbd className="hidden sm:inline-flex items-center rounded border border-line bg-bg-0 px-1.5 py-0.5 font-mono text-[9px] text-ink-faint">
            ESC
          </kbd>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded p-1 text-ink-faint hover:text-ink hover:bg-bg-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-ink-faint">
              No matching maritime targets, incidents, or commands found.
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    item.action();
                    setIsOpen(false);
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between gap-3 rounded-md px-3 py-2 cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-bg-2 border border-line-active text-ink"
                      : "text-ink-dim hover:bg-bg-2/50"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded ${
                        isSelected
                          ? "bg-aqua/10 text-aqua ring-1 ring-aqua/30"
                          : "bg-bg-0 text-ink-faint"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-ink truncate">
                          {item.title}
                        </span>
                        {item.badge && (
                          <span className="rounded bg-bg-0 px-1.5 py-0.2 font-mono text-[8px] font-semibold text-aqua ring-1 ring-line">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-ink-faint truncate font-mono">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <CornerDownLeft className="h-3.5 w-3.5 text-aqua shrink-0" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Hint */}
        <div className="flex items-center justify-between border-t border-line bg-bg-0/60 px-3.5 py-2 text-[10px] text-ink-faint font-mono">
          <div className="flex items-center gap-2">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span className="text-aqua">SAGAR-DRISHTI TACTICAL CORE</span>
        </div>
      </div>
    </div>
  );
};
