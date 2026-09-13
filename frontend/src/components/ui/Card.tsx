import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  accent?: string;
  interactive?: boolean;
  padded?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = "",
  accent,
  interactive = false,
  padded = true,
}) => {
  return (
    <div
      className={`relative overflow-hidden rounded-panel border border-line bg-bg-1 transition-colors duration-150 ${
        interactive ? "hover:bg-bg-2" : ""
      } ${padded ? "px-3.5 pb-3 pt-3" : ""} ${className}`}
    >
      {accent && (
        <span
          className="absolute inset-x-0 top-0 h-0.5"
          style={{ background: accent }}
        />
      )}
      {children}
    </div>
  );
};