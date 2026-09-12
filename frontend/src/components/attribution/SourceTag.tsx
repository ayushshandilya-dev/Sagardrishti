import React from "react";
import { cn } from "@/lib/util";

export type DataSourceTag = "AIS" | "SIM";

export function sourceLabel(v: { aisStatus?: string }): DataSourceTag {
  if (v.aisStatus === "ACTIVE" || v.aisStatus === "LIVE") return "AIS";
  return "SIM";
}

export const SourceTag: React.FC<{ source: DataSourceTag }> = ({ source }) => (
  <span
    className={cn(
      "shrink-0 rounded px-1 py-px font-mono text-[9px] font-semibold ring-1",
      source === "AIS"
        ? "bg-teal/10 text-teal ring-teal/30"
        : "bg-amber/10 text-amber ring-amber/30"
    )}
  >
    {source}
  </span>
);