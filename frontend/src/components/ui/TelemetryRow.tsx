import React from "react";

interface TelemetryRowProps {
  label: string;
  value: React.ReactNode;
  unit?: string;
  className?: string;
}

export const TelemetryRow: React.FC<TelemetryRowProps> = ({
  label,
  value,
  unit,
  className = "",
}) => {
  return (
    <div className={`flex items-baseline justify-between gap-3 py-[3px] ${className}`}>
      <span className="shrink-0 text-label-caps text-ink-faint">{label}</span>
      <span className="truncate font-mono text-[11px] font-medium tabular-sm text-ink">
        {value}
        {unit && (
          <span className="ml-0.5 text-[9px] font-normal text-ink-faint">
            {unit}
          </span>
        )}
      </span>
    </div>
  );
};