import React from "react";
import { StatusBadge, StatusTone } from "./StatusBadge";

export interface InspectorItem {
  id: string;
  callsign: string;
  handle?: string;
  heading?: number;
  speed?: number;
  latencyMs?: number;
  tone?: StatusTone;
}

interface InspectorRowProps {
  item: InspectorItem;
  selected?: boolean;
  onSelect?: (id: string) => void;
}

export const InspectorRow: React.FC<InspectorRowProps> = ({
  item,
  selected = false,
  onSelect,
}) => {
  const latencyWarn = (item.latencyMs ?? 0) > 100;
  return (
    <li
      className={`border-l-[3px] transition-colors ${
        selected ? "border-aqua bg-aqua/10" : "border-line"
      }`}
    >
      <button
        onClick={() => onSelect?.(item.id)}
        aria-pressed={selected}
        className={`flex w-full items-center gap-2 px-3 py-[7px] text-left transition-colors ${
          selected ? "" : "hover:bg-bg-2"
        }`}
      >
        <div className="min-w-0 flex-1">
          <div className="truncate font-mono text-[11px] font-semibold text-ink">
            {item.callsign}
          </div>
          {item.handle && (
            <div className="truncate text-[9px] font-medium uppercase tracking-wider text-ink-faint">
              {item.handle}
            </div>
          )}
        </div>
        <div className="shrink-0 text-right font-mono text-[10px] tabular-sm leading-tight">
          <div className="text-ink">
            {item.speed !== undefined ? `${item.speed.toFixed(1)} kn` : "—"}
          </div>
          <div className="text-ink-faint">
            {item.heading !== undefined ? `${item.heading}° COG` : "COG —"}
          </div>
        </div>
        {item.latencyMs !== undefined && (
          <span
            className={`shrink-0 w-10 text-right font-mono text-[9px] tabular-sm ${
              latencyWarn ? "text-amber" : "text-ink-faint"
            }`}
          >
            {(item.latencyMs).toFixed(0)}ms
          </span>
        )}
      </button>
    </li>
  );
};

interface InspectorPanelProps {
  title: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  count?: number;
  items: InspectorItem[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  empty?: string;
  footer?: React.ReactNode;
  className?: string;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  title,
  icon: Icon,
  count,
  items,
  selectedId = null,
  onSelect,
  empty = "NO CONTACTS IN REGISTRY",
  footer,
  className = "",
}) => {
  return (
    <div
      className={`flex min-h-0 flex-col overflow-hidden rounded-panel border border-line bg-bg-1 ${className}`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          {Icon && (
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-bg-2 ring-1 ring-line">
              <Icon className="h-3.5 w-3.5 text-aqua" />
            </span>
          )}
          <span className="truncate text-label-caps text-ink-dim">{title}</span>
        </div>
        {count !== undefined && (
          <StatusBadge label={String(count)} tone="neutral" dot={false} />
        )}
      </div>
      {items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-3 py-6">
          <span className="text-label-caps text-ink-faint">{empty}</span>
        </div>
      ) : (
        <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
          {items.map((item) => (
            <InspectorRow
              key={item.id}
              item={item}
              selected={item.id === selectedId}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
      {footer && (
        <div className="border-t border-line px-3 py-1.5">{footer}</div>
      )}
    </div>
  );
};