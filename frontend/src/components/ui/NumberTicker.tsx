"use client";

import React, { useEffect, useRef } from "react";
import { useMotionValue, useSpring, useReducedMotion } from "framer-motion";

interface NumberTickerProps {
  value: number;
  className?: string;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}

/**
 * Tactical spring-animated odometer ticker for numeric readouts.
 * Adheres to Sagar-Drishti's calm scientific telemetry principles.
 */
export const NumberTicker: React.FC<NumberTickerProps> = ({
  value,
  className = "",
  decimals = 0,
  prefix = "",
  suffix = "",
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const motionVal = useMotionValue(0);
  const reduced = useReducedMotion();

  const springVal = useSpring(motionVal, {
    damping: 24,
    stiffness: 90,
  });

  useEffect(() => {
    if (reduced) {
      if (ref.current) {
        ref.current.textContent = `${prefix}${value.toLocaleString(undefined, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })}${suffix}`;
      }
      return;
    }

    motionVal.set(value);
  }, [value, motionVal, reduced, prefix, suffix, decimals]);

  useEffect(() => {
    if (reduced) return;

    return springVal.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = `${prefix}${latest.toLocaleString(undefined, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })}${suffix}`;
      }
    });
  }, [springVal, decimals, prefix, suffix, reduced]);

  return (
    <span
      ref={ref}
      className={`inline-block tabular-nums font-mono ${className}`}
    >
      {prefix}
      {value.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
};
