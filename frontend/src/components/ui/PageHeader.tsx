import React from "react";
import { StatusBadge, StatusTone } from "./StatusBadge";

export interface PageHeaderBadge {
  label: string;
  tone?: StatusTone;
}

interface PageHeaderProps {
  title: string;
  badge?: PageHeaderBadge;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  left?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  badge,
  subtitle,
  eyebrow,
  left,
  right,
  className = "",
}) => {
  return (
    <div className={`flex items-start justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {left}
          <h1 className="text-headline-md tracking-tight text-ink">{title}</h1>
          {eyebrow && <span className="text-label-caps text-ink-faint">{eyebrow}</span>}
          {badge && <StatusBadge label={badge.label} tone={badge.tone ?? "info"} />}
        </div>
        {subtitle && (
          <p className="mt-0.5 text-body-sm text-ink-dim">{subtitle}</p>
        )}
      </div>
      {right && <div className="flex shrink-0 items-center gap-3">{right}</div>}
    </div>
  );
};