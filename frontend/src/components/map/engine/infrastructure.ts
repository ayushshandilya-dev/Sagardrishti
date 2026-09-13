import { LonLat } from "./gl";

/* ─────────────────────────────────────────────────────────────
   GULF OF KUTCH — MARITIME INFRASTRUCTURE INTELLIGENCE
   GIS features & operational metadata for major Indian ports,
   oil terminals, offshore SBMs, pipelines, and environmental zones.
   ───────────────────────────────────────────────────────────── */

export interface InfrastructureNode {
  id: string;
  name: string;
  type: "port" | "terminal" | "sbm" | "refinery" | "tank_farm" | "pipeline" | "mangrove" | "salt_flat";
  category: string;
  coords: LonLat;
  status: "ACTIVE" | "OPERATIONAL" | "HIGH_SECURITY" | "PROTECTED";
  metadata: {
    operator?: string;
    capacity?: string;
    berths?: number;
    depthMeters?: number;
    dailyThroughput?: string;
    vesselsPresent?: number;
    notes?: string;
  };
}

export interface PipelineRoute {
  id: string;
  name: string;
  type: "crude" | "product" | "gas";
  diameterInches: number;
  status: "ACTIVE" | "STANDBY";
  coords: LonLat[];
}

export interface EnvironmentalZone {
  id: string;
  name: string;
  type: "mangrove" | "salt_flat" | "marine_park" | "mudflat";
  sensitivityScore: number; // 1 to 10
  coords: LonLat[];
}

/* Major Maritime Ports & Terminals */
export const INFRASTRUCTURE_NODES: InfrastructureNode[] = [
  {
    id: "port-mundra",
    name: "MUNDRA PORT (ADANI PORTS)",
    type: "port",
    category: "Commercial Mega-Port & Container Hub",
    coords: [69.73, 22.85],
    status: "OPERATIONAL",
    metadata: {
      operator: "Adani Ports & SEZ (APSEZ)",
      capacity: "155 MT/year",
      berths: 28,
      depthMeters: 17.5,
      dailyThroughput: "420,000 MT/day",
      vesselsPresent: 63,
      notes: "Largest private commercial port in India; 4 container terminals, deep-draft coal & multipurpose berths.",
    },
  },
  {
    id: "port-kandla",
    name: "DEENDAYAL PORT (KANDLA)",
    type: "port",
    category: "Major Central Port & Crude Import Hub",
    coords: [70.22, 23.03],
    status: "OPERATIONAL",
    metadata: {
      operator: "Deendayal Port Authority (Govt of India)",
      capacity: "144 MT/year",
      berths: 22,
      depthMeters: 14.2,
      dailyThroughput: "390,000 MT/day",
      vesselsPresent: 41,
      notes: "Primary liquid cargo and crude oil import terminal for Northern and Western India.",
    },
  },
  {
    id: "terminal-sikka",
    name: "SIKKA ENERGY TERMINAL",
    type: "terminal",
    category: "Specialized Oil & Hydrocarbon Jetty",
    coords: [69.84, 22.43],
    status: "HIGH_SECURITY",
    metadata: {
      operator: "Reliance Industries / GMB",
      capacity: "42 MT/year",
      berths: 5,
      depthMeters: 19.0,
      dailyThroughput: "115,000 MT/day",
      vesselsPresent: 17,
      notes: "Dedicated captive jetty handling VLCC crude offloading and refined product export.",
    },
  },
  {
    id: "port-vadinar",
    name: "VADINAR OFFSHORE TERMINAL",
    type: "terminal",
    category: "Crude Oil Deepwater Receiving Facility",
    coords: [69.72, 22.48],
    status: "OPERATIONAL",
    metadata: {
      operator: "Nayara Energy / IOCL",
      capacity: "96 MT/year",
      berths: 4,
      depthMeters: 23.0,
      dailyThroughput: "260,000 MT/day",
      vesselsPresent: 29,
      notes: "Hosts multiple SBMs receiving supertankers up to 300,000 DWT.",
    },
  },
  {
    id: "port-okha",
    name: "OKHA HARBOUR & ICG BASE",
    type: "port",
    category: "Strategic Naval Anchorage & Coast Guard Station",
    coords: [69.07, 22.47],
    status: "HIGH_SECURITY",
    metadata: {
      operator: "Indian Coast Guard (ICG) / Gujarat Maritime Board",
      capacity: "8 MT/year",
      berths: 3,
      depthMeters: 11.5,
      dailyThroughput: "22,000 MT/day",
      vesselsPresent: 6,
      notes: "ICG District HQ forward maritime surveillance base with Fast Interceptor Craft and OPV moorings.",
    },
  },
  {
    id: "sbm-vadinar-1",
    name: "VADINAR SBM-1 (IOCL)",
    type: "sbm",
    category: "Single Buoy Mooring",
    coords: [69.64, 22.54],
    status: "OPERATIONAL",
    metadata: {
      operator: "Indian Oil Corporation Ltd (IOCL)",
      depthMeters: 26.5,
      notes: "Offshore catenary mooring buoy accommodating VLCCs up to 320,000 DWT in deep water.",
    },
  },
  {
    id: "sbm-vadinar-2",
    name: "VADINAR SBM-2 (NAYARA)",
    type: "sbm",
    category: "Single Buoy Mooring",
    coords: [69.58, 22.51],
    status: "OPERATIONAL",
    metadata: {
      operator: "Nayara Energy Limited",
      depthMeters: 28.0,
      notes: "Handles heavy sour crude imports feeding the Vadinar refinery.",
    },
  },
  {
    id: "sbm-sikka-1",
    name: "SIKKA SBM-A (RELIANCE)",
    type: "sbm",
    category: "Single Buoy Mooring",
    coords: [69.78, 22.52],
    status: "HIGH_SECURITY",
    metadata: {
      operator: "Reliance Industries Ltd",
      depthMeters: 31.0,
      notes: "Ultra-deep offshore mooring for VLCC/ULCC supertankers with subsea 48-inch pipeline manifold.",
    },
  },
  {
    id: "refinery-jamnagar",
    name: "JAMNAGAR REFINERY COMPLEX",
    type: "refinery",
    category: "World's Largest Petroleum Refining Hub",
    coords: [70.02, 22.38],
    status: "HIGH_SECURITY",
    metadata: {
      operator: "Reliance Industries / Nayara Energy",
      capacity: "1.24 Million BPD (68.2 MT/yr)",
      notes: "Houses the world's largest refining complex; interconnected with Sikka and Vadinar terminals via pipeline corridors.",
    },
  },
  {
    id: "tankfarm-mundra",
    name: "MUNDRA CRUDE TANK FARM",
    type: "tank_farm",
    category: "Strategic Hydrocarbon Storage",
    coords: [69.75, 22.88],
    status: "OPERATIONAL",
    metadata: {
      capacity: "3.2 Million m³",
      notes: "36 floating-roof crude storage tanks serving Northern India pipelines.",
    },
  },
];

/* Subsea Crude Pipeline GIS Corridors */
export const SUBSEA_PIPELINES: PipelineRoute[] = [
  {
    id: "pipe-sbm-sikka",
    name: "SIKKA SBM-A TO SHORE CRUDE CORRIDOR",
    type: "crude",
    diameterInches: 48,
    status: "ACTIVE",
    coords: [
      [69.78, 22.52],
      [69.81, 22.48],
      [69.84, 22.43],
      [69.89, 22.41],
      [70.02, 22.38],
    ],
  },
  {
    id: "pipe-vadinar-sbm1",
    name: "VADINAR SBM-1 TO IOCL TANK FARM",
    type: "crude",
    diameterInches: 42,
    status: "ACTIVE",
    coords: [
      [69.64, 22.54],
      [69.68, 22.51],
      [69.72, 22.48],
    ],
  },
  {
    id: "pipe-vadinar-sbm2",
    name: "VADINAR SBM-2 TO NAYARA STORAGE",
    type: "crude",
    diameterInches: 42,
    status: "ACTIVE",
    coords: [
      [69.58, 22.51],
      [69.65, 22.49],
      [69.72, 22.48],
    ],
  },
  {
    id: "pipe-mundra-haldia",
    name: "MUNDRA-PANIPAT CRUDE PIPELINE FEEDER",
    type: "crude",
    diameterInches: 36,
    status: "ACTIVE",
    coords: [
      [69.73, 22.85],
      [69.75, 22.88],
      [69.79, 22.95],
      [69.85, 23.05],
    ],
  },
];

/* Sensitive Ecological Coastal Zones in Gulf of Kutch */
export const ENVIRONMENTAL_ZONES: EnvironmentalZone[] = [
  {
    id: "zone-pirotan",
    name: "PIROTAN ISLAND & MARINE SANCTUARY",
    type: "marine_park",
    sensitivityScore: 10,
    coords: [
      [69.93, 22.56],
      [70.01, 22.61],
      [70.04, 22.58],
      [69.98, 22.53],
      [69.93, 22.56],
    ],
  },
  {
    id: "zone-narara",
    name: "NARARA REEF & MANGROVE RESERVE",
    type: "mangrove",
    sensitivityScore: 9,
    coords: [
      [69.68, 22.44],
      [69.75, 22.47],
      [69.77, 22.43],
      [69.70, 22.41],
      [69.68, 22.44],
    ],
  },
  {
    id: "zone-kandla-mudflats",
    name: "KANDLA CREEK INTERTIDAL MUDFLATS",
    type: "mudflat",
    sensitivityScore: 8,
    coords: [
      [70.15, 22.98],
      [70.28, 23.08],
      [70.32, 23.04],
      [70.19, 22.95],
      [70.15, 22.98],
    ],
  },
  {
    id: "zone-rann-salt",
    name: "LITTLE RANN SALT FLATS",
    type: "salt_flat",
    sensitivityScore: 7,
    coords: [
      [70.80, 23.10],
      [71.15, 23.25],
      [71.20, 23.05],
      [70.85, 22.95],
      [70.80, 23.10],
    ],
  },
];

/* Harbor dredged navigation corridors for Kandla & Mundra */
export const DREDGED_CHANNELS: { name: string; depth: number; widthMeters: number; coords: LonLat[] }[] = [
  {
    name: "KANDLA DREDGED APPROACH CHANNEL",
    depth: 14.5,
    widthMeters: 450,
    coords: [
      [69.90, 22.82],
      [70.05, 22.92],
      [70.18, 22.99],
      [70.22, 23.03],
    ],
  },
  {
    name: "MUNDRA DEEPWATER ACCESS CHANNEL",
    depth: 18.0,
    widthMeters: 550,
    coords: [
      [69.58, 22.68],
      [69.65, 22.75],
      [69.70, 22.80],
      [69.73, 22.85],
    ],
  },
  {
    name: "SIKKA CRUDE VLCC FAIRWAY",
    depth: 24.0,
    widthMeters: 600,
    coords: [
      [69.45, 22.58],
      [69.60, 22.56],
      [69.72, 22.52],
      [69.84, 22.43],
    ],
  },
];
