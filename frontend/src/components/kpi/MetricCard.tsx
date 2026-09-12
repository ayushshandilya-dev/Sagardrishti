"use client";

import React, { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface MetricCardProps {
  title: string;
  value: number | string;
  unit?: string;
  sub?: string;
  live?: boolean;
  accent: "#38BDF8" | "#22D3A7" | "#D6A84F" | "#EF4444" | "#F59E0B";
}

function useCountUp(target: number, duration = 900, live = false) {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(() => (reduced ? target : 0));

  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    if (!live) return () => cancelAnimationFrame(raf);
    const drift = setInterval(
      () =>
        setValue((v) =>
          v > 0 ? Math.max(target - 90, Math.min(target + 6, v + (Math.random() < 0.5 ? -1 : 1))) : v
        ),
      6500
    );
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(drift);
    };
  }, [target, duration, reduced, live]);

  return value;
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, unit, sub, live = false, accent }) => {
  const isNumeric = typeof value === "number";
  const shown = useCountUp(isNumeric ? value : 0, 900, live);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="relative overflow-hidden rounded-panel border border-line bg-bg-1 px-4 pb-3.5 pt-4 transition-colors duration-150 hover:bg-bg-2"
    >
      <span
        className="absolute inset-x-0 top-0 h-0.5"
        style={{ background: accent }}
      />
      <div className="meta-label truncate">{title}</div>
      <div className="mt-1.5 flex items-baseline gap-1.5 font-mono">
        <span className="text-[26px] font-semibold leading-none tracking-tight text-ink tnum">
          {isNumeric ? shown.toLocaleString("en-IN") : value}
        </span>
        {unit && <span className="text-xs font-normal text-ink-faint">{unit}</span>}
      </div>
      {sub && <div className="meta mt-1.5 truncate">{sub}</div>}
    </motion.div>
  );
};