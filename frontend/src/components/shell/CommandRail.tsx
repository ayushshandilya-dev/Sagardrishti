"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  Satellite,
  Wind,
  Target,
  Ship,
  Link2,
  FileText,
  Settings,
  Sparkles,
} from "lucide-react";
import { useCommandStore } from "@/lib/store";

const RAIL_WIDTH = 64;

interface RailItem {
  key: string;
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  scope: string;
}

export const CommandRail: React.FC = () => {
  const pathname = usePathname();
  const { selectedIncidentId, selectedVesselImo } = useCommandStore();

  const items: RailItem[] = [
    { key: "operations", href: "/operations", label: "Operations", icon: Compass, scope: "operations" },
    {
      key: "sar",
      href: `/sar/${selectedIncidentId || "SD-2026-00421"}`,
      label: "SAR Investigation",
      icon: Satellite,
      scope: "sar",
    },
    { key: "drift", href: "/drift", label: "Reverse Drift", icon: Wind, scope: "drift" },
    { key: "attribution", href: "/attribution", label: "Attribution", icon: Target, scope: "attribution" },
    {
      key: "vessels",
      href: `/vessels/${selectedVesselImo || 9123456}`,
      label: "Vessel Investigation",
      icon: Ship,
      scope: "vessels",
    },
    { key: "evidence", href: "/evidence", label: "Evidence Ledger", icon: Link2, scope: "evidence" },
    { key: "dossier", href: "/dossier", label: "Legal Dossier", icon: FileText, scope: "dossier" },
    { key: "explainability", href: "/explainability", label: "Explainability Gallery", icon: Sparkles, scope: "explainability" },
  ];

  const isActive = (item: RailItem) => {
    if (item.scope === "operations") return pathname === "/operations";
    return pathname.startsWith(`/${item.scope}`);
  };

  return (
    <aside
      className="z-30 flex shrink-0 select-none flex-col border-r border-line bg-bg-1"
      style={{ width: RAIL_WIDTH }}
    >
      <nav className="flex flex-1 flex-col items-center gap-1.5 pt-2.5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <Link
              key={item.key}
              href={item.href}
              title={item.label}
              className="group relative flex h-11 w-11 items-center justify-center rounded-xl transition-colors focus-ring"
            >
              <span
                className={`absolute left-[-1px] top-[9px] bottom-[9px] w-0.5 rounded-r transition-colors ${
                  active ? "bg-aqua" : "bg-transparent"
                }`}
              />
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                  active
                    ? "bg-bg-2 text-aqua"
                    : "text-ink-faint group-hover:bg-bg-2 group-hover:text-ink-dim"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
              {active && (
                <span className="absolute bottom-0.5 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-aqua" />
              )}

              <span className="pointer-events-none absolute left-full ml-1 z-50 hidden whitespace-nowrap rounded-md border border-line-active bg-panel px-2 py-1 text-[11px] text-ink shadow-float group-hover:block">
                <span className="text-ink-faint">DETECT/ANALYZE → </span>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col items-center gap-1.5 border-t border-line py-2.5">
        <Link
          href="/settings"
          title="Settings / Layers"
          className="group relative flex h-11 w-11 items-center justify-center rounded-xl transition-colors focus-ring"
        >
          <span
            className={`absolute left-[-1px] top-[9px] bottom-[9px] w-0.5 rounded-r transition-colors ${
              pathname.startsWith("/settings") ? "bg-teal" : "bg-transparent"
            }`}
          />
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
              pathname.startsWith("/settings")
                ? "bg-bg-2 text-teal"
                : "text-ink-faint group-hover:bg-bg-2 group-hover:text-ink-dim"
            }`}
          >
            <Settings className="h-[18px] w-[18px]" />
          </span>
          <span className="pointer-events-none absolute left-full ml-1 z-50 hidden whitespace-nowrap rounded-md border border-line-active bg-panel px-2 py-1 text-[11px] text-ink shadow-float group-hover:block">
            Settings / Layers
          </span>
        </Link>
      </div>
    </aside>
  );
};