"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Satellite } from "lucide-react";

export const EmptyState: React.FC<{ label?: string }> = ({
  label = "No active incidents",
}) => {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex h-full w-full flex-col items-center justify-center gap-3 bg-bg-0"
    >
      <Satellite className="h-8 w-8 text-ink-faint" />
      <div className="font-mono text-sm text-ink-dim">{label}</div>
      <div className="meta">Next SAR pass in progress · auto-detection armed</div>
    </motion.div>
  );
};