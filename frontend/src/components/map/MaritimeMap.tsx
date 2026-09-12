"use client";

import React from "react";
import dynamic from "next/dynamic";
import { CandidateVessel, Incident } from "@/lib/types";

const RealMap = dynamic(() => import("./RealMaritimeMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-bg-0 font-mono text-xs text-ink-faint">
      Initialising geospatial engine …
    </div>
  ),
});

interface MaritimeMapProps {
  incident?: Incident;
  candidateVessels?: CandidateVessel[];
  onSelectVessel?: (vessel: CandidateVessel) => void;
  onSpillClick?: (incident: Incident) => void;
  showChips?: boolean;
  interactive?: boolean;
  children?: React.ReactNode;
}

export const MaritimeMap: React.FC<MaritimeMapProps> = (props) => (
  <RealMap {...props} />
);