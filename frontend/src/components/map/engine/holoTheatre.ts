import { LonLat } from "./gl";

/* ─────────────────────────────────────────────────────────────
   3D HOLOGRAPHIC MARITIME THEATRE (IMAGE 2 RECONSTRUCTION)
   Provides isometric tactical ocean grid mesh, electric neon
   coastline contour glows, high-intensity laser attribution beam,
   crimson spill origin beacon, and vertical holographic telemetry.
   ───────────────────────────────────────────────────────────── */

/* Gujarat & Saurashtra Coastlines (High-Resolution Geographic Path) */
export const GUJARAT_COASTLINE_SEGMENTS: LonLat[][] = [
  // Segment 1: Kutch North Shore (Koteshwar to Surajbari Inner Gulf)
  [
    [68.55, 23.82],
    [68.62, 23.55],
    [68.69, 23.23],
    [68.92, 23.01],
    [69.18, 22.88],
    [69.35, 22.82], // Mandvi
    [69.52, 22.83],
    [69.72, 22.84], // Mundra
    [69.95, 22.89],
    [70.12, 22.95],
    [70.22, 23.01], // Kandla
    [70.42, 23.12],
    [70.73, 23.20], // Surajbari
  ],
  // Segment 2: Saurashtra Gulf Shore & Outer Coast (Surajbari -> Navlakhi -> Sikka -> Okha -> Dwarka -> Veraval)
  [
    [70.73, 23.16],
    [70.52, 23.02],
    [70.47, 22.96], // Navlakhi
    [70.30, 22.69], // Jodiya
    [70.15, 22.58],
    [70.04, 22.50], // Jamnagar / Bedi
    [69.84, 22.43], // Sikka
    [69.72, 22.45], // Vadinar
    [69.60, 22.31], // Salaya
    [69.42, 22.33],
    [69.24, 22.40],
    [69.07, 22.47], // Okha
    [68.99, 22.41], // Mithapur
    [68.96, 22.24], // Dwarka
    [69.15, 22.02], // Kuranga
    [69.38, 21.82],
    [69.60, 21.64], // Porbandar
    [69.82, 21.42],
    [69.96, 21.25], // Madhavpur
    [70.12, 21.12], // Mangrol
    [70.37, 20.90], // Veraval
    [70.40, 20.89], // Somnath
    [70.70, 20.78], // Kodinar
    [71.01, 20.71], // Diu Island
    [71.36, 20.86], // Jafrabad
    [71.51, 20.91], // Pipavav
    [71.77, 21.08], // Mahuva
    [72.18, 21.39], // Alang
    [72.15, 21.78], // Bhavnagar
  ],
  // Segment 3: Pirotan Island & Marine National Park Sanctuary
  [
    [69.93, 22.56],
    [70.01, 22.61],
    [70.05, 22.58],
    [69.99, 22.53],
    [69.93, 22.56],
  ],
];

/**
 * Procedural Tactical Holographic Ocean Grid Mesh
 * Dense cyan coordinate grid covering Arabian Sea & Gulf of Kutch theatre
 */
export function generateTacticalHoloGridGeoJson(): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  const minLon = 68.0;
  const maxLon = 71.6;
  const minLat = 20.4;
  const maxLat = 23.4;

  const stepMinor = 0.08; // Dense ocean grid
  const stepMajor = 0.40; // Major navigation graticule

  // Longitude Meridians
  for (let lon = minLon; lon <= maxLon + 0.001; lon += stepMinor) {
    const isMajor = Math.abs(Math.round(lon * 10) / 10 - lon) < 0.01 && Math.round(lon * 10) % 4 === 0;
    features.push({
      type: "Feature",
      properties: {
        type: isMajor ? "major" : "minor",
        val: lon.toFixed(2),
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [lon, minLat],
          [lon, maxLat],
        ],
      },
    });
  }

  // Latitude Parallels
  for (let lat = minLat; lat <= maxLat + 0.001; lat += stepMinor) {
    const isMajor = Math.abs(Math.round(lat * 10) / 10 - lat) < 0.01 && Math.round(lat * 10) % 4 === 0;
    features.push({
      type: "Feature",
      properties: {
        type: isMajor ? "major" : "minor",
        val: lat.toFixed(2),
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [minLon, lat],
          [maxLon, lat],
        ],
      },
    });
  }

  return {
    type: "FeatureCollection",
    features,
  };
}

/**
 * Neon Coastline GeoJSON FeatureCollection
 */
export function generateNeonCoastlineGeoJson(): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: GUJARAT_COASTLINE_SEGMENTS.map((segment, idx) => ({
      type: "Feature",
      properties: { id: `coast-${idx}` },
      geometry: {
        type: "LineString",
        coordinates: segment,
      },
    })),
  };
}

/**
 * Generates the High-Intensity Neon Green Laser Beam connecting Suspect Vessel to Spill Origin
 */
export function generateLaserAttributionGeoJson(
  vesselCoord: [number, number],
  originCoord: [number, number]
): GeoJSON.FeatureCollection {
  // Compute mid-way curvature or direct collinear beam
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { role: "laser-beam" },
        geometry: {
          type: "LineString",
          coordinates: [vesselCoord, originCoord],
        },
      },
      // Beam terminus points
      {
        type: "Feature",
        properties: { role: "origin-point" },
        geometry: {
          type: "Point",
          coordinates: originCoord,
        },
      },
      {
        type: "Feature",
        properties: { role: "vessel-point" },
        geometry: {
          type: "Point",
          coordinates: vesselCoord,
        },
      },
    ],
  };
}

/**
 * HTML DOM Element builder for the Crimson Spill Origin Target Beacon
 * Matches Image 2's red target beacon with outer shockwave rings
 */
export function createCrimsonOriginBeaconElement(timeLabel = "03:15 UTC (T-12H)"): HTMLDivElement {
  const container = document.createElement("div");
  container.className = "group relative pointer-events-auto cursor-pointer select-none flex items-center justify-center";
  container.style.width = "120px";
  container.style.height = "120px";

  container.innerHTML = `
    <!-- Outer Expanding Crimson Shockwave Rings -->
    <div class="absolute inset-0 m-auto h-24 w-24 rounded-full border border-red-500/40 animate-ping opacity-60 pointer-events-none"></div>
    <div class="absolute inset-0 m-auto h-16 w-16 rounded-full border-2 border-red-500/70 animate-pulse pointer-events-none"></div>
    
    <!-- Rotating Reticle Crosshair -->
    <div class="absolute inset-0 m-auto h-20 w-20 rounded-full border border-dashed border-red-400/50 animate-[spin_18s_linear_infinite] pointer-events-none"></div>
    <div class="absolute inset-0 m-auto h-12 w-12 rounded-full border border-dotted border-red-300/40 animate-[spin_10s_linear_infinite_reverse] pointer-events-none"></div>

    <!-- Central Ruby Core Glow -->
    <div class="relative flex items-center justify-center">
      <div class="h-4 w-4 rounded-full bg-red-600 shadow-[0_0_20px_#ef4444,0_0_40px_#dc2626] ring-2 ring-red-300"></div>
      <div class="absolute h-1.5 w-1.5 rounded-full bg-white"></div>
    </div>

    <!-- Floating Tactical Locus Tag -->
    <div class="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-red-500/60 bg-black/90 px-2 py-0.5 font-mono text-[9px] font-black tracking-wider text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.5)] backdrop-blur-md">
      <div class="flex items-center gap-1">
        <span class="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping"></span>
        <span>SPILL ORIGIN LOCUS</span>
      </div>
      <div class="text-[8px] text-red-200 font-normal">${timeLabel}</div>
    </div>
  `;

  return container;
}
