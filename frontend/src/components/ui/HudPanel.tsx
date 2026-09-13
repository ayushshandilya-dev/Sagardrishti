import React from "react";
import { StatusBadge, StatusTone, TONE_DOT } from "./StatusBadge";
import { TelemetryRow } from "./TelemetryRow";

interface HudTelem {
  label: string;
  value: React.ReactNode;
  unit?: string;
}

interface HudPanelProps {
  tone?: StatusTone;
  label: string;
  badge?: string;
  title?: React.ReactNode;
  titleUnit?: string;
  rows?: HudTelem[];
  footer?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export const HudPanel: React.FC<HudPanelProps> = ({
  tone = "info",
  label,
  badge,
  title,
  titleUnit,
  rows,
  footer,
  className = "",
  children,
}) => {
  return (
    <div
      className={`w-64 rounded-xl border border-line bg-bg-1/85 shadow-float backdrop-blur-md ${className}`}
    >
      <div className="flex items-center justify-between gap-2 px-3 pb-1 pt-2.5">
        <span className="flex items-center gap-1.5 text-label-caps text-ink-faint">
          <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[tone]}`} />
          {label}
        </span>
        {badge && <StatusBadge label={badge} tone={tone} dot={false} />}
      </div>
      {(title || rows) && (
        <div className="px-3 pb-2">
          {title && (
            <div className="mb-0.5 flex items-baseline gap-1">
              <span className="tabular-sm text-telemetry-lg text-ink">
                {title}
              </span>
              {titleUnit && (
                <span className="font-mono text-[10px] text-ink-faint">
                  {titleUnit}
                </span>
              )}
            </div>
          )}
          {rows?.map((row) => (
            <TelemetryRow
              key={row.label}
              label={row.label}
              value={row.value}
              unit={row.unit}
            />
          ))}
        </div>
      )}
      {children}
      {footer && (
        <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-2">
          {footer}
        </div>
      )}
    </div>
  );
};