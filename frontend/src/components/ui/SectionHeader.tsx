import React from "react";
import { StatusTone, TONE_HEX } from "./StatusBadge";

interface SectionHeaderProps {
  title: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  tone?: StatusTone;
  trailing?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  icon: Icon,
  tone = "info",
  trailing,
  className = "",
}) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {Icon && (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-bg-2 ring-1 ring-line">
          <Icon className="h-3.5 w-3.5" style={{ color: TONE_HEX[tone] }} />
        </span>
      )}
      <span className="truncate text-label-caps text-ink-dim">{title}</span>
      {trailing && <span className="ml-auto shrink-0">{trailing}</span>}
    </div>
  );
};