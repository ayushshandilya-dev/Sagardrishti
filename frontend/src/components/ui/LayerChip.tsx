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
      className={`pointer-events-auto flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-[10px] font-medium transition-all duration-150 border ${
        active
          ? "bg-bg-2 text-ink border-line shadow-xs"
          : "text-ink-faint border-transparent hover:text-ink hover:bg-bg-2/50"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full transition-opacity ${
          active ? "opacity-100" : "opacity-30"
        }`}
        style={{ background: color }}
      />
      <span>{label}</span>
    </button>
  );
};