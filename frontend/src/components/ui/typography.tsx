import React from "react";
import { StatusTone, TONE_TEXT } from "./StatusBadge";

interface BaseTextProps extends React.HTMLAttributes<HTMLElement> {
  as?: "h1" | "h2" | "h3" | "span" | "div" | "p";
}

export const Display: React.FC<BaseTextProps> = ({
  as: Tag = "h1",
  className = "",
  ...rest
}) => <Tag className={`text-display-lg text-ink ${className}`} {...rest} />;

export const Headline: React.FC<BaseTextProps> = ({
  as: Tag = "h2",
  className = "",
  ...rest
}) => <Tag className={`text-headline-md text-ink ${className}`} {...rest} />;

export const Title: React.FC<BaseTextProps> = ({
  as: Tag = "h3",
  className = "",
  ...rest
}) => <Tag className={`text-title-sm text-ink ${className}`} {...rest} />;

export const BodyMd: React.FC<BaseTextProps> = ({
  as: Tag = "p",
  className = "",
  ...rest
}) => <Tag className={`text-body-md text-ink ${className}`} {...rest} />;

export const BodySm: React.FC<BaseTextProps> = ({
  as: Tag = "p",
  className = "",
  ...rest
}) => <Tag className={`text-body-sm text-ink-dim ${className}`} {...rest} />;

export const LabelCaps: React.FC<BaseTextProps> = ({
  as: Tag = "span",
  className = "",
  ...rest
}) => <Tag className={`text-label-caps text-ink-dim ${className}`} {...rest} />;

interface TelemetryProps extends Omit<BaseTextProps, "className"> {
  size?: "lg" | "md" | "sm";
  tone?: StatusTone;
  className?: string;
}

const TEL_SIZE = {
  lg: "text-telemetry-lg",
  md: "text-telemetry-md",
  sm: "text-telemetry-sm",
} as const;

export const Telemetry: React.FC<TelemetryProps> = ({
  as: Tag = "span",
  size = "md",
  tone,
  className = "",
  ...rest
}) => (
  <Tag
    className={`tabular-sm ${TEL_SIZE[size]} ${tone ? TONE_TEXT[tone] : "text-ink"} ${className}`}
    {...rest}
  />
);