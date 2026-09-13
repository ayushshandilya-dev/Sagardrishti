import React from "react";

interface LayerChipProps {
  label: string;
  color: string;
  active: boolean;
  onToggle: () => void;
}

export const LayerChip: React.FC<LayerChipProps> = ({
  label,
  color,
  active,
  onToggle,
}) => {
  return (
    <button
      onClick={onToggle}
      aria-pressed={active}
      className={`pointer-events-auto rounded-md px-2.5 py-1 font-mono text-[10px] font-medium transition-colors duration-150 focus-ring ${
        active ? "text-ink" : "text-ink-faint hover:text-ink-dim"
      }`}
      style={active ? { boxShadow: `inset 0 0 0 1px ${color}44`, color } : { color }}
    >
      <span
        className={`mr-1 inline-block h-1 w-1 rounded-full transition-opacity ${
          active ? "opacity-100" : "opacity-0"
        }`}
        style={{ background: color }}
      />
      {label}
    </button>
  );
};