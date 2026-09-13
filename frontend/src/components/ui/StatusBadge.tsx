import React from "react";

export type StatusTone = "info" | "ok" | "warn" | "crit" | "neutral";

export const TONE_HEX: Record<StatusTone, string> = {
  info: "#38BDF8",
  ok: "#22D3A7",
  warn: "#F59E0B",
  crit: "#EF4444",
  neutral: "#6B7F8C",
};

export const TONE_TEXT: Record<StatusTone, string> = {
  info: "text-aqua",
  ok: "text-teal",
  warn: "text-orange",
  crit: "text-red",
  neutral: "text-ink-dim",
};

export const TONE_BG: Record<StatusTone, string> = {
  info: "bg-aqua/10",
  ok: "bg-teal/10",
  warn: "bg-orange/10",
  crit: "bg-red/10",
  neutral: "bg-bg-2",
};

export const TONE_RING: Record<StatusTone, string> = {
  info: "ring-aqua/30",
  ok: "ring-teal/30",
  warn: "ring-orange/30",
  crit: "ring-red/30",
  neutral: "ring-line",
};

export const TONE_DOT: Record<StatusTone, string> = {
  info: "bg-aqua",
  ok: "bg-teal",
  warn: "bg-orange",
  crit: "bg-red",
  neutral: "bg-ink-faint",
};

interface StatusBadgeProps {
  label: string;
  tone?: StatusTone;
  dot?: boolean;
  pulse?: boolean;
  index?: string | number;
  icon?: React.ReactNode;
  title?: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  tone = "neutral",
  dot = true,
  pulse = false,
  index,
  icon,
  title,
  className = "",
}) => {
  return (
    <span
      title={title}
      className={`inline-flex h-5 shrink-0 items-center gap-1.5 rounded-md px-2 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] ring-1 ${TONE_BG[tone]} ${TONE_RING[tone]} ${TONE_TEXT[tone]} ${className}`}
    >
      {icon && (
        <span className="flex items-center text-inherit">{icon}</span>
      )}
      {dot && (
        <span
          className={`h-1 w-1 rounded-full ${TONE_DOT[tone]} ${pulse ? "animate-pulse" : ""}`}
        />
      )}
      {label}
      {index !== undefined && (
        <span className="tabular-sm opacity-80">{index}</span>
      )}
    </span>
  );
};