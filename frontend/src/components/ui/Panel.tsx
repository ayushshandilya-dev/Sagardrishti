import React from "react";
import { SectionHeader } from "./SectionHeader";
import { StatusTone } from "./StatusBadge";

interface PanelProps {
  title?: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  tone?: StatusTone;
  toolbar?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

export const Panel: React.FC<PanelProps> = ({
  title,
  icon,
  tone = "info",
  toolbar,
  footer,
  children,
  className = "",
  bodyClassName = "",
}) => {
  return (
    <div
      className={`flex min-h-0 flex-col overflow-hidden rounded-panel border border-line bg-bg-1 ${className}`}
    >
      {title && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-3 py-2">
          <SectionHeader title={title} icon={icon} tone={tone} />
          {toolbar && <div className="flex shrink-0 items-center gap-2">{toolbar}</div>}
        </div>
      )}
      <div className={`min-h-0 flex-1 ${bodyClassName}`}>{children}</div>
      {footer && (
        <div className="shrink-0 border-t border-line px-3 py-1.5">{footer}</div>
      )}
    </div>
  );
};