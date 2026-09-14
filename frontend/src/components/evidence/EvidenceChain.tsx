"use client";

import React from "react";
import { MerkleBlock } from "@/lib/types";
import { motion } from "framer-motion";
import { Link2, Hash, Layers, CheckCircle2 } from "lucide-react";

export const EvidenceChain: React.FC<{ blocks: MerkleBlock[] }> = ({ blocks }) => {
  return (
    <div className="relative flex flex-col">
      {/* Connecting Chain Line with Glow */}
      <div className="absolute bottom-4 left-[9px] top-2 w-0.5 bg-gradient-to-b from-aqua/50 via-teal/40 to-line" />

      {blocks.map((b, i) => {
        const keys = Object.keys(b.attribution_matrix);
        return (
          <motion.div
            key={b.index}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: i * 0.05 }}
            className="relative flex gap-3 pb-4 last:pb-0 group"
          >
            {/* Pulsing Node Anchor */}
            <div
              className="relative z-10 mt-1.5 h-[18px] w-[18px] shrink-0 rounded-full bg-bg-0 ring-2 ring-line transition-all group-hover:ring-aqua"
              style={{ boxShadow: "0 0 0 3px #07141D" }}
            >
              <div className="absolute inset-[4px] rounded-full bg-aqua group-hover:scale-110 transition-transform shadow-[0_0_8px_rgba(56,189,248,0.6)]" />
            </div>

            {/* Block Card */}
            <div className="min-w-0 flex-1 rounded-panel border border-line bg-bg-1 px-3 py-2.5 transition-colors hover:border-line-active hover:bg-bg-2 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold text-ink">
                  <Layers className="h-3 w-3 text-aqua" />
                  BLOCK #{String(b.index).padStart(2, "0")}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[9px] text-ink-faint tnum">{b.timestamp}</span>
                  <CheckCircle2 className="h-3 w-3 text-teal" />
                </div>
              </div>

              <div className="mt-2 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="flex w-16 shrink-0 items-center gap-1 font-mono text-[8px] text-ink-faint">
                    <Hash className="h-2.5 w-2.5 text-teal" /> MERKLE
                  </span>
                  <span className="truncate font-mono text-[9px] text-ink-dim" title={b.merkle_root}>
                    {b.merkle_root}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex w-16 shrink-0 items-center gap-1 font-mono text-[8px] text-ink-faint">
                    <Link2 className="h-2.5 w-2.5 text-aqua" /> PREV
                  </span>
                  <span className="truncate font-mono text-[9px] text-ink-dim" title={b.prev_block_hash}>
                    {b.prev_block_hash}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex w-16 shrink-0 items-center gap-1 font-mono text-[8px] text-ink-faint">NONCE</span>
                  <span className="font-mono text-[9px] text-ink-faint tnum">{b.nonce.toLocaleString("en-IN")}</span>
                </div>
              </div>

              {keys.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1 border-t border-line pt-2">
                  {keys.map((k) => (
                    <span key={k} className="rounded bg-bg-0 px-1.5 py-0.5 font-mono text-[8px] text-ink-dim ring-1 ring-line">
                      {k}
                      <span className="ml-1 text-teal">✓</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};