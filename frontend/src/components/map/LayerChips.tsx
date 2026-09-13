"use client";

import React from "react";
import { useCommandStore } from "@/lib/store";
import { MapLayersState } from "@/lib/types";
import { LayerChip } from "@/components/ui/LayerChip";

const CHIPS: { key: keyof MapLayersState; label: string; color: string }[] = [
  { key: "ais", label: "AIS", color: "#38BDF8" },
  { key: "eez", label: "EEZ", color: "#38BDF8" },
  { key: "oil", label: "Oil slick", color: "#D6A84F" },
  { key: "drift", label: "Drift", color: "#38BDF8" },
  { key: "weather", label: "Weather", color: "#22D3A7" },
  { key: "currents", label: "Currents", color: "#38BDF8" },
  { key: "shipping", label: "Shipping", color: "#22D3A7" },
  { key: "bathy", label: "Bathymetry", color: "#2CBFCC" },
  { key: "coast", label: "Coastline", color: "#8ECEB1" },
  { key: "sentinel", label: "Sentinel", color: "#7DD3FC" },
];

export const LayerChips: React.FC = () => {
  const { layers, toggleLayer } = useCommandStore();

  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex items-center gap-1 rounded-lg bg-bg-1 p-1 ring-1 ring-line">
      {CHIPS.map(({ key, label, color }) => (
        <LayerChip
          key={key}
          label={label}
          color={color}
          active={layers[key]}
          onToggle={() => toggleLayer(key)}
        />
      ))}
    </div>
  );
};