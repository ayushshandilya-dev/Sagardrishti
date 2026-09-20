import React from "react";
import { Card } from "./Card";
import { StatusBadge, StatusTone, TONE_HEX } from "./StatusBadge";

import { NumberTicker } from "./NumberTicker";

interface KpiCardProps {
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  value: React.ReactNode;
  unit?: string;
  sub?: React.ReactNode;
  tone?: StatusTone;
  badge?: string;
  footer?: React.ReactNode;
  className?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  icon: Icon,
  value,
  unit,
  sub,
  tone = "info",
  badge,
  footer,
  className = "",
}) => {
  const renderedValue =
    typeof value === "number" ? (
      <NumberTicker
        value={value}
        decimals={Number.isInteger(value) ? 0 : 2}
      />
    ) : (
      value
    );

  return (
    <Card accent={TONE_HEX[tone]} interactive className={className}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-bg-2 ring-1 ring-line">
            <Icon className="h-4 w-4" style={{ color: TONE_HEX[tone] }} />
          </span>
          <span className="meta-label truncate">{label}</span>
        </div>
        {badge && <StatusBadge label={badge} tone={tone} dot={false} />}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5 text-telemetry-lg">
        <span className="tabular-sm text-ink">{renderedValue}</span>
        {unit && (
          <span className="font-mono text-[11px] font-normal text-ink-faint">
            {unit}
          </span>
        )}
      </div>
      {sub && <div className="meta mt-0.5 truncate">{sub}</div>}
      {footer && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-line pt-2">
          {footer}
        </div>
      )}
    </Card>
  );
};