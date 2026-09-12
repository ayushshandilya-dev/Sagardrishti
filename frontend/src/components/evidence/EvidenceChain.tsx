"use client";

import React from "react";
import { MerkleBlock } from "@/lib/types";
import { Link2, Hash, Layers } from "lucide-react";

export const EvidenceChain: React.FC<{ blocks: MerkleBlock[] }> = ({ blocks }) => {
  return (
    <div className="relative flex flex-col">
      <div className="absolute bottom-4 left-[9px] top-2 w-px bg-line" />
      {blocks.map((b) => {
        const keys = Object.keys(b.attribution_matrix);
        return (
          <div key={b.index} className="relative flex gap-3 pb-4 last:pb-0">
            <div className="relative z-10 mt-1.5 h-[18px] w-[18px] shrink-0 rounded-full bg-bg-0 ring-2 ring-line" style={{ boxShadow: "0 0 0 3px #07141D" }}>
              <div className="absolute inset-[5px] rounded-full bg-aqua/70" />
            </div>
            <div className="min-w-0 flex-1 rounded-panel border border-line bg-bg-1 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold text-ink">
                  <Layers className="h-3 w-3 text-aqua" />
                  BLOCK #{String(b.index).padStart(2, "0")}
                </span>
                <span className="font-mono text-[9px] text-ink-faint tnum">{b.timestamp}</span>
              </div>

              <div className="mt-2 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="flex w-16 shrink-0 items-center gap-1 font-mono text-[8px] text-ink-faint">
                    <Hash className="h-2.5 w-2.5 text-teal" /> MERKLE
                  </span>
                  <span className="truncate font-mono text-[9px] text-ink-dim" title={b.merkle_root}>{b.merkle_root}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex w-16 shrink-0 items-center gap-1 font-mono text-[8px] text-ink-faint">
                    <Link2 className="h-2.5 w-2.5 text-aqua" /> PREV
                  </span>
                  <span className="truncate font-mono text-[9px] text-ink-dim" title={b.prev_block_hash}>{b.prev_block_hash}</span>
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
          </div>
        );
      })}
    </div>
  );
};