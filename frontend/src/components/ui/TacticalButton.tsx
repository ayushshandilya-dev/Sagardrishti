import React from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-aqua text-[#08101A] hover:bg-[#22D3EE]",
  secondary: "bg-bg-2/70 text-ink ring-1 ring-line hover:ring-line-active hover:text-aqua",
  danger: "bg-red/15 text-red ring-1 ring-red/50 hover:bg-red/25",
  ghost: "text-ink-dim hover:bg-bg-2 hover:text-ink",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "h-7 px-2.5",
  md: "h-[34px] px-3.5",
};

interface TacticalButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  className?: string;
}

export const TacticalButton: React.FC<TacticalButtonProps> = ({
  variant = "secondary",
  size = "sm",
  icon: Icon,
  children,
  className = "",
  ...rest
}) => {
  return (
    <button
      className={`inline-flex select-none items-center justify-center gap-1.5 rounded-md font-mono text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors duration-150 focus-ring disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT[variant]} ${SIZE[size]} ${className}`}
      {...rest}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
};