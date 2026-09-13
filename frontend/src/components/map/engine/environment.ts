import { LonLat } from "./gl";

/* ─────────────────────────────────────────────────────────────
   ENVIRONMENTAL SENSING & OCEANOGRAPHIC LAYERS
   Scientific data overlays for Sea Surface Temperature (SST),
   Chlorophyll-a (biogenic bloom discriminator), Wave Height (Hs),
   and Salinity fields derived from INCOIS and ECMWF Copernicus.
   ───────────────────────────────────────────────────────────── */

export interface EnvironmentalContour {
  value: number;
  unit: string;
  coords: LonLat[];
}

export interface EnvironmentalField {
  type: "sst" | "chlorophyll" | "waves" | "salinity";
  label: string;
  unit: string;
  min: number;
  max: number;
  contours: EnvironmentalContour[];
}

/* Sea Surface Temperature (SST) in °C (Summer/Monsoon Arabian Sea: 28.2°C to 30.2°C) */
export const SST_FIELD: EnvironmentalField = {
  type: "sst",
  label: "SEA SURFACE TEMPERATURE (INCOIS SST)",
  unit: "°C",
  min: 28.2,
  max: 30.2,
  contours: [
    {
      value: 28.4,
      unit: "°C",
      coords: [[66.5, 20.0], [67.5, 21.0], [68.8, 21.6], [70.2, 22.1]],
    },
    {
      value: 28.8,
      unit: "°C",
      coords: [[66.8, 20.8], [68.0, 21.6], [69.2, 22.2], [70.5, 22.6]],
    },
    {
      value: 29.2,
      unit: "°C",
      coords: [[67.2, 21.5], [68.4, 22.1], [69.5, 22.6], [70.4, 22.9]],
    },
    {
      value: 29.6,
      unit: "°C",
      coords: [[67.8, 22.2], [68.8, 22.5], [69.7, 22.8], [70.3, 23.0]],
    },
    {
      value: 30.0,
      unit: "°C",
      coords: [[68.5, 22.6], [69.2, 22.8], [69.9, 23.0], [70.2, 23.05]],
    },
  ],
};

/* Chlorophyll-a concentration in mg/m³ (Key for distinguishing biogenic slicks from mineral oil) */
export const CHLOROPHYLL_FIELD: EnvironmentalField = {
  type: "chlorophyll",
  label: "CHLOROPHYLL-A (MODIS/SENTINEL-3)",
  unit: "mg/m³",
  min: 0.15,
  max: 3.8,
  contours: [
    {
      value: 0.25,
      unit: "mg/m³",
      coords: [[66.6, 21.0], [67.8, 21.8], [68.9, 22.3]],
    },
    {
      value: 0.85,
      unit: "mg/m³",
      coords: [[67.5, 21.8], [68.6, 22.4], [69.4, 22.6]],
    },
    {
      value: 1.9,
      unit: "mg/m³",
      coords: [[68.4, 22.3], [69.2, 22.6], [69.8, 22.8]],
    },
    {
      value: 3.2,
      unit: "mg/m³",
      coords: [[69.1, 22.65], [69.6, 22.82], [70.1, 22.98]], // Near coastal mangrove estuaries
    },
  ],
};

/* Significant Wave Height (Hs) in meters (Monsoon swell: 1.2m to 2.8m) */
export const WAVE_FIELD: EnvironmentalField = {
  type: "waves",
  label: "SIGNIFICANT WAVE HEIGHT (Hs - ECMWF WAM)",
  unit: "m",
  min: 0.8,
  max: 2.8,
  contours: [
    {
      value: 2.6,
      unit: "m",
      coords: [[66.8, 19.8], [67.6, 20.6], [68.5, 21.2]],
    },
    {
      value: 2.2,
      unit: "m",
      coords: [[67.2, 20.5], [68.2, 21.2], [69.0, 21.8]],
    },
    {
      value: 1.8,
      unit: "m",
      coords: [[67.8, 21.2], [68.8, 21.8], [69.4, 22.2]],
    },
    {
      value: 1.4,
      unit: "m",
      coords: [[68.4, 21.8], [69.2, 22.3], [69.8, 22.5]],
    },
    {
      value: 1.0,
      unit: "m",
      coords: [[69.0, 22.4], [69.6, 22.7], [70.1, 22.9]], // Sheltered inner gulf
    },
  ],
};

/* Salinity in Practical Salinity Units (PSU) - hypersaline inner gulf vs open ocean */
export const SALINITY_FIELD: EnvironmentalField = {
  type: "salinity",
  label: "SURFACE SALINITY (INCOIS GODAS)",
  unit: "PSU",
  min: 35.8,
  max: 38.4,
  contours: [
    {
      value: 36.0,
      unit: "PSU",
      coords: [[66.6, 20.2], [67.8, 21.2], [68.9, 21.8]],
    },
    {
      value: 36.6,
      unit: "PSU",
      coords: [[67.5, 21.4], [68.6, 22.0], [69.3, 22.4]],
    },
    {
      value: 37.2,
      unit: "PSU",
      coords: [[68.4, 22.1], [69.2, 22.5], [69.8, 22.75]],
    },
    {
      value: 38.0,
      unit: "PSU",
      coords: [[69.2, 22.6], [69.8, 22.85], [70.2, 23.0]], // High evaporation in inner gulf
    },
  ],
};
