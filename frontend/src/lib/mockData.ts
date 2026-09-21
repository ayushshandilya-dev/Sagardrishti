import {
  Incident,
  CandidateVessel,
  DriftResult,
  EvidenceLedgerResponse,
  EvidenceCheck,
  EvidenceManifestResponse,
  OperationalAlert,
  SatPass,
} from "./types";

/* ─────────────────────────────────────────────────────────────
   DETERMINISTIC TELEMETRY GENERATOR
   ───────────────────────────────────────────────────────────── */

const minutes = (startH: number, startM: number, stepMin: number, n: number) =>
  Array.from({ length: n }, (_, i) => {
    const total = startH * 60 + startM + i * stepMin;
    return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(
      total % 60
    ).padStart(2, "0")}`;
  });

function suspectTelemetry(): { time: string; sog: number; cog: number; heading: number; status: string }[] {
  const times = minutes(6, 0, 10, 30);
  return times.map((time, i) => {
    const m = parseInt(time.slice(0, 2)) * 60 + parseInt(time.slice(3, 5));
    let sog = 14.2;
    let status = "Cruise";
    if (m >= 490 && m <= 555) {
      sog = 6.2 - (m - 490) * 0.05;
      status = m < 530 ? "Slowing" : "Tank wash";
    }
    if (m > 555 && m <= 565) {
      sog = 4.6;
      status = "Tank wash";
    }
    if (m > 565 && m <= 580) {
      sog = 5.4 + (m - 565) * 0.12;
      status = "Accelerating";
    }
    if (m > 580) {
      sog = 13.4 + Math.min((m - 580) * 0.05, 1.2);
      status = "Cruise";
    }
    return {
      time,
      sog: Math.round(sog * 10) / 10,
      cog: 248 + Math.round(Math.sin(i / 3) * 3),
      heading: 248,
      status,
    };
  });
}

const suspectAisTimeline = () => [
  { time: "06:00", kind: "FIX" as const, note: "Transponder normal · 6 min interval" },
  { time: "08:12", kind: "FIX" as const, note: "Class A · Nav status under way" },
  { time: "08:18", kind: "GAP" as const, note: "No AIS fix — 42 min silence" },
  { time: "09:00", kind: "GAP" as const, note: "Still no fix · within spill corridor" },
  { time: "09:00", kind: "ANOMALY" as const, note: "SOG 14.2→4.6 kn, COG jitter +9°" },
  { time: "09:02", kind: "FIX" as const, note: "Transponder returns · SOG 4.6 kn" },
  { time: "10:00", kind: "MANEUVER" as const, note: "Resumes 13.8 kn cruise" },
];

const steadyTelemetry = (sog: number): { time: string; sog: number; cog: number; heading: number; status: string }[] =>
  minutes(6, 0, 15, 20).map((time, i) => ({
    time,
    sog: Math.round(sog * 10) / 10,
    cog: 260 - Math.round(Math.sin(i / 4) * 2),
    heading: 260,
    status: "Cruise",
  }));

/* ─────────────────────────────────────────────────────────────
   INCIDENTS
   ───────────────────────────────────────────────────────────── */

export const MOCK_INCIDENTS: Incident[] = [
  {
    eventId: "SD-2026-00421",
    timestampUtc: "2026-09-11T10:30:20Z",
    severity: "CRITICAL",
    sarMetadata: {
      mission: "SENTINEL-1A",
      sensor: "C-Band SAR (IW Mode)",
      productType: "GRD-IW",
      polarization: ["VV", "VH"],
      relativeOrbit: 118,
      passDirection: "DESCENDING",
      incidenceAngleDeg: 34.2,
      acquisitionUtc: "2026-09-11T10:30:20Z",
      rawSceneSha256: "3a7b8e519c2f6d0a4b8e7c1f9d2a5b6c7e8f0a1b2c3d4e5f6a7b8c9d0e1f2a3b",
      resolutionMeters: 10,
    },
    spillGeometry: {
      centroid: { latitude: 21.8452, longitude: 69.1124 },
      areaKm2: 18.6,
      perimeterKm: 31.2,
      lengthKm: 8.4,
      widthKm: 2.9,
      skeletonOrientationDeg: 248.5,
      boundingBox: {
        lowerLeft: { latitude: 21.825, longitude: 69.084 },
        upperRight: { latitude: 21.866, longitude: 69.138 },
      },
      polygonGeoJson: {
        type: "Polygon",
        coordinates: [
          [
            [69.092, 21.825],
            [69.135, 21.838],
            [69.128, 21.865],
            [69.085, 21.85],
            [69.092, 21.825],
          ],
        ],
      },
    },
    classification: {
      classLabel: "MINERAL_OIL",
      confidence: 0.942,
      lookAlikeProbs: {
        mineralOil: 0.942,
        biogenicSlick: 0.021,
        lowWindArea: 0.018,
        shipWake: 0.019,
      },
    },
    detectionScores: {
      textureScore: 0.912,
      vvVhAgreement: 0.884,
      morphologyAgreement: 0.923,
      thresholdScore: 0.871,
      segmentationAgreement: 0.958,
    },
    evidenceChips: [
      "VV Verified",
      "VH Verified",
      "Texture Verified",
      "Segmentation Verified",
      "Model Verified",
    ],
    radarBrief:
      "Sharp-edged dark formation with damped VV signal, reduced cross-pol backscatter and high GLCM homogeneity — consistent with a sheen of persistent hydrocarbon, not biogenic film.",
  },
  {
    eventId: "SD-2026-00389",
    timestampUtc: "2026-09-10T14:45:22Z",
    severity: "MAJOR",
    sarMetadata: {
      mission: "SENTINEL-1B",
      sensor: "C-Band SAR (IW Mode)",
      productType: "GRD-IW",
      polarization: ["VV", "VH"],
      relativeOrbit: 42,
      passDirection: "ASCENDING",
      incidenceAngleDeg: 38.7,
      acquisitionUtc: "2026-09-10T14:45:22Z",
      rawSceneSha256: "b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef012",
      resolutionMeters: 10,
    },
    spillGeometry: {
      centroid: { latitude: 19.2317, longitude: 72.8544 },
      areaKm2: 12.5,
      perimeterKm: 24.1,
      lengthKm: 6.2,
      widthKm: 2.1,
      skeletonOrientationDeg: 210.0,
      boundingBox: {
        lowerLeft: { latitude: 19.213, longitude: 72.827 },
        upperRight: { latitude: 19.253, longitude: 72.876 },
      },
      polygonGeoJson: {
        type: "Polygon",
        coordinates: [
          [
            [72.835, 19.215],
            [72.875, 19.235],
            [72.868, 19.275],
            [72.825, 19.245],
            [72.835, 19.215],
          ],
        ],
      },
    },
    classification: {
      classLabel: "MINERAL_OIL",
      confidence: 0.887,
      lookAlikeProbs: {
        mineralOil: 0.887,
        biogenicSlick: 0.065,
        lowWindArea: 0.032,
        shipWake: 0.016,
      },
    },
    detectionScores: {
      textureScore: 0.864,
      vvVhAgreement: 0.842,
      morphologyAgreement: 0.801,
      thresholdScore: 0.822,
      segmentationAgreement: 0.91,
    },
    evidenceChips: [
      "VV Verified",
      "Texture Verified",
      "Segmentation Verified",
      "Model Verified",
    ],
    radarBrief:
      "Moderate-confidence dark formation off Mumbai Marine ATS corridor. Lower VV/VH agreement typical of thinner sheen; under review pending next pass.",
  },
];

/* ─────────────────────────────────────────────────────────────
   REVERSE DRIFT RECONSTRUCTION
   ───────────────────────────────────────────────────────────── */

export const MOCK_DRIFT_RESULT: DriftResult = {
  status: "success",
  provenance: {
    driftModel: "4th-Order Runge-Kutta (RK4) Lagrangian Advection",
    currentSource: "INCOIS Coastal Forecast System (0.083°)",
    windSource: "ECMWF ERA5 10m Reanalysis (0.25°)",
    leewayFactor: "3.5% windage with 12° Northern-Hemisphere Coriolis deflection",
    stepSeconds: 300,
  },
  observedCentroid: {
    latitude: 21.8452,
    longitude: 69.1124,
    timestampUtc: "2026-09-11T10:30:00Z",
  },
  reconstructedOrigin: {
    latitude: 21.912,
    longitude: 69.248,
    timestampUtc: "2026-09-10T22:30:00Z",
    hoursBeforeObservation: 12.0,
    uncertaintyRadiusMeters: 450,
    rk4Confidence: 0.913,
  },
  trajectory: [
    { hourOffset: 0, timestampUtc: "2026-09-11T10:30:00Z", latitude: 21.8452, longitude: 69.1124, currentSpeed: 0.54, currentDirectionDeg: 235, windSpeed: 6.1, windDirectionDeg: 252, uncertaintyRadiusMeters: 150 },
    { hourOffset: -1, timestampUtc: "2026-09-11T09:30:00Z", latitude: 21.8508, longitude: 69.1237, currentSpeed: 0.53, currentDirectionDeg: 233, windSpeed: 6.2, windDirectionDeg: 250, uncertaintyRadiusMeters: 175 },
    { hourOffset: -2, timestampUtc: "2026-09-11T08:30:00Z", latitude: 21.8564, longitude: 69.135, currentSpeed: 0.55, currentDirectionDeg: 234, windSpeed: 6.0, windDirectionDeg: 254, uncertaintyRadiusMeters: 200 },
    { hourOffset: -3, timestampUtc: "2026-09-11T07:30:00Z", latitude: 21.862, longitude: 69.1463, currentSpeed: 0.52, currentDirectionDeg: 231, windSpeed: 6.3, windDirectionDeg: 249, uncertaintyRadiusMeters: 225 },
    { hourOffset: -4, timestampUtc: "2026-09-11T06:30:00Z", latitude: 21.8676, longitude: 69.1576, currentSpeed: 0.54, currentDirectionDeg: 236, windSpeed: 6.1, windDirectionDeg: 253, uncertaintyRadiusMeters: 250 },
    { hourOffset: -5, timestampUtc: "2026-09-11T05:30:00Z", latitude: 21.8732, longitude: 69.1689, currentSpeed: 0.51, currentDirectionDeg: 229, windSpeed: 6.4, windDirectionDeg: 248, uncertaintyRadiusMeters: 275 },
    { hourOffset: -6, timestampUtc: "2026-09-11T04:30:00Z", latitude: 21.8788, longitude: 69.1802, currentSpeed: 0.53, currentDirectionDeg: 234, windSpeed: 6.2, windDirectionDeg: 251, uncertaintyRadiusMeters: 300 },
    { hourOffset: -7, timestampUtc: "2026-09-11T03:30:00Z", latitude: 21.8844, longitude: 69.1915, currentSpeed: 0.56, currentDirectionDeg: 237, windSpeed: 6.0, windDirectionDeg: 255, uncertaintyRadiusMeters: 325 },
    { hourOffset: -8, timestampUtc: "2026-09-11T02:30:00Z", latitude: 21.89, longitude: 69.2028, currentSpeed: 0.54, currentDirectionDeg: 232, windSpeed: 6.1, windDirectionDeg: 250, uncertaintyRadiusMeters: 350 },
    { hourOffset: -9, timestampUtc: "2026-09-11T01:30:00Z", latitude: 21.8956, longitude: 69.2141, currentSpeed: 0.52, currentDirectionDeg: 230, windSpeed: 6.2, windDirectionDeg: 247, uncertaintyRadiusMeters: 375 },
    { hourOffset: -10, timestampUtc: "2026-09-11T00:30:00Z", latitude: 21.9012, longitude: 69.2254, currentSpeed: 0.55, currentDirectionDeg: 236, windSpeed: 6.3, windDirectionDeg: 252, uncertaintyRadiusMeters: 400 },
    { hourOffset: -11, timestampUtc: "2026-09-10T23:30:00Z", latitude: 21.9068, longitude: 69.2367, currentSpeed: 0.53, currentDirectionDeg: 233, windSpeed: 6.1, windDirectionDeg: 250, uncertaintyRadiusMeters: 425 },
    { hourOffset: -12, timestampUtc: "2026-09-10T22:30:00Z", latitude: 21.912, longitude: 69.248, currentSpeed: 0.54, currentDirectionDeg: 235, windSpeed: 6.1, windDirectionDeg: 252, uncertaintyRadiusMeters: 450 },
  ],
};

/* ─────────────────────────────────────────────────────────────
   CANDIDATE VESSELS
   ───────────────────────────────────────────────────────────── */

const TANKER_TELEMETRY = suspectTelemetry();

export const MOCK_CANDIDATE_VESSELS: CandidateVessel[] = [
  {
    mmsi: 419001234,
    imo: 9123456,
    vesselName: "MT OCEAN MERIDIAN",
    flag: "India",
    vesselType: "CRUDE_TANKER",
    latitude: 21.9142,
    longitude: 69.251,
    speedOverGround: 6.1,
    courseOverGround: 248,
    heading: 248,
    aisStatus: "ACTIVE",
    attributionScore: 0.914,
    attributionRank: 1,
    factorBreakdown: {
      backtrackProximityScore: 0.962,
      trajectoryCollinearityScore: 0.918,
      vesselPriorScore: 1.0,
      kineticAnomalyScore: 0.885,
      temporalPlausibilityScore: 1.0,
    },
    closestApproachMeters: 340,
    headingAlignmentDeg: 4.2,
    timeOverlapMinutes: 58,
    aisAnomaly: "42 min transponder gap",
    riskBadge: "PRIMARY",
    reasons: [
      "340 m closest approach to reconstructed origin at 02:14 UTC",
      "Heading 248° within 4.2° of slick skeleton axis (91.8% collinearity)",
      "Crude oil tanker — high MARPOL Annex I discharge prior (100%)",
      "Nocturnal speed drop 14.2 kn → 4.7 kn in tank-washing window",
      "42-minute intentional AIS gap recorded 15 nm upstream",
      "Transit precedes SAR observation by 3.8 h — strict causality",
    ],
    kinematicProfile: [
      { time: "06:00", speed: 14.2, status: "Cruise" },
      { time: "07:00", speed: 14.0, status: "Cruise" },
      { time: "08:00", speed: 6.2, status: "Slowing" },
      { time: "08:20", speed: 5.8, status: "Suspicious" },
      { time: "08:40", speed: 4.7, status: "Tank wash" },
      { time: "09:00", speed: 4.1, status: "Tank wash" },
      { time: "09:20", speed: 7.1, status: "Accelerating" },
      { time: "10:00", speed: 13.8, status: "Cruise" },
    ],
    enforcementAction: "PRIMARY SUSPECT",
    dwt: 105400,
    lengthMeters: 244.5,
    beamMeters: 42.0,
    draughtMeters: 14.8,
    yearBuilt: 2017,
    owner: "Meridian Ocean Tankers Ltd.",
    callSign: "ATXB2",
    historicalIncidents: [
      {
        date: "2024-11-14",
        port: "Sikka Terminal (Vadinar)",
        incidentType: "OWS bypass sensor fault",
        outcome: "Detained 48 h by DG Shipping surveyor",
      },
      {
        date: "2022-04-09",
        port: "Fujairah anchorage",
        incidentType: "Bunkering transfer overflow",
        outcome: "Written MARPOL admonition",
      },
    ],
    telemetry: TANKER_TELEMETRY,
    aisTimeline: suspectAisTimeline(),
  },
  {
    mmsi: 636019876,
    imo: 9456789,
    vesselName: "MV EASTERN STAR",
    flag: "Liberia",
    vesselType: "BULK_CARRIER",
    latitude: 21.942,
    longitude: 69.31,
    speedOverGround: 13.8,
    courseOverGround: 260,
    heading: 260,
    aisStatus: "ACTIVE",
    attributionScore: 0.648,
    attributionRank: 2,
    factorBreakdown: {
      backtrackProximityScore: 0.62,
      trajectoryCollinearityScore: 0.75,
      vesselPriorScore: 0.5,
      kineticAnomalyScore: 0.22,
      temporalPlausibilityScore: 1.0,
    },
    closestApproachMeters: 4210,
    headingAlignmentDeg: 11.5,
    timeOverlapMinutes: 22,
    aisAnomaly: "None detected",
    riskBadge: "WATCH",
    reasons: [
      "4.21 km from origin at nearest transit point",
      "Heading 260° — 11.5° angular offset from slick axis",
      "Dry bulk profile → low baseline discharge volume",
      "Steady 13.8 kn cruise, no tank-washing slowdown",
      "Continuous, uninterrupted AIS broadcast",
    ],
    kinematicProfile: [
      { time: "06:00", speed: 13.9, status: "Cruise" },
      { time: "08:00", speed: 13.8, status: "Cruise" },
      { time: "10:00", speed: 13.9, status: "Cruise" },
    ],
    enforcementAction: "SECONDARY — MONITOR",
    dwt: 74200,
    lengthMeters: 225.0,
    beamMeters: 32.2,
    draughtMeters: 12.1,
    yearBuilt: 2014,
    owner: "Star Bulk Carriers Inc.",
    callSign: "ELZX9",
    historicalIncidents: [],
    telemetry: steadyTelemetry(13.8),
    aisTimeline: [
      { time: "06:00", kind: "FIX", note: "Regular 6 min interval" },
      { time: "10:00", kind: "FIX", note: "Continuous throughout window" },
    ],
  },
  {
    mmsi: 419002345,
    imo: 9345670,
    vesselName: "MT ARABIAN PEARL",
    flag: "Panama",
    vesselType: "CHEMICAL_TANKER",
    latitude: 22.02,
    longitude: 69.38,
    speedOverGround: 12.1,
    courseOverGround: 235,
    heading: 236,
    aisStatus: "ACTIVE",
    attributionScore: 0.512,
    attributionRank: 3,
    factorBreakdown: {
      backtrackProximityScore: 0.38,
      trajectoryCollinearityScore: 0.82,
      vesselPriorScore: 0.9,
      kineticAnomalyScore: 0.15,
      temporalPlausibilityScore: 1.0,
    },
    closestApproachMeters: 8900,
    headingAlignmentDeg: 8.9,
    timeOverlapMinutes: 38,
    aisAnomaly: "None detected",
    riskBadge: "WATCH",
    reasons: [
      "8.9 km from origin — outside turbulent diffusion envelope",
      "Heading 236° aligns with corridor traffic",
      "Chemical tanker carries high hazard prior but excessive lateral offset",
      "Speed steady, standard navigation throughout",
    ],
    kinematicProfile: [
      { time: "06:00", speed: 12.2, status: "Cruise" },
      { time: "08:00", speed: 12.1, status: "Cruise" },
      { time: "10:00", speed: 12.0, status: "Cruise" },
    ],
    enforcementAction: "EXCLUDED FROM ENFORCEMENT",
    dwt: 45000,
    lengthMeters: 182.0,
    beamMeters: 27.4,
    draughtMeters: 11.2,
    yearBuilt: 2019,
    owner: "Gulf Chemical Shipping Corp.",
    callSign: "3EYK8",
    historicalIncidents: [],
    telemetry: steadyTelemetry(12.1).map((p) => ({
      ...p,
      cog: 235,
      heading: 236,
    })),
    aisTimeline: [
      { time: "06:00", kind: "FIX", note: "Regular interval" },
      { time: "10:00", kind: "FIX", note: "Continuous throughout" },
    ],
  },
  {
    mmsi: 512001122,
    imo: 8923411,
    vesselName: "MV COASTAL TRADER",
    flag: "India",
    vesselType: "CONTAINER_SHIP",
    latitude: 21.72,
    longitude: 69.05,
    speedOverGround: 16.2,
    courseOverGround: 110,
    heading: 110,
    aisStatus: "ACTIVE",
    attributionScore: 0.317,
    attributionRank: 4,
    factorBreakdown: {
      backtrackProximityScore: 0.21,
      trajectoryCollinearityScore: 0.15,
      vesselPriorScore: 0.6,
      kineticAnomalyScore: 0.1,
      temporalPlausibilityScore: 0.8,
    },
    closestApproachMeters: 14200,
    headingAlignmentDeg: 61.2,
    timeOverlapMinutes: 0,
    aisAnomaly: "None detected",
    riskBadge: "CLEAR",
    reasons: [
      "14.2 km from origin — incompatible with drift trajectory",
      "Heading 110° opposing slick skeleton (61° offset)",
      "16.2 kn fast transit incompatible with bilge discharge",
    ],
    kinematicProfile: [
      { time: "06:00", speed: 16.1, status: "Fast transit" },
      { time: "08:00", speed: 16.2, status: "Fast transit" },
      { time: "10:00", speed: 16.3, status: "Fast transit" },
    ],
    enforcementAction: "EXCLUDED",
    dwt: 32000,
    lengthMeters: 168.0,
    beamMeters: 25.0,
    draughtMeters: 9.8,
    yearBuilt: 2008,
    owner: "Coastal Feeder Lines Ltd.",
    callSign: "AWQP3",
    historicalIncidents: [],
    telemetry: steadyTelemetry(16.2).map((p) => ({ ...p, cog: 110, heading: 110 })),
    aisTimeline: [
      { time: "06:00", kind: "FIX", note: "Regular interval" },
      { time: "10:00", kind: "FIX", note: "Continuous throughout" },
    ],
  },
  {
    mmsi: 419005678,
    imo: 9900112,
    vesselName: "MFV SAMUDRA RANI",
    flag: "India",
    vesselType: "FISHING_VESSEL",
    latitude: 21.6045,
    longitude: 69.1487,
    speedOverGround: 3.2,
    courseOverGround: 148,
    heading: 152,
    aisStatus: "CLASS-B",
    attributionScore: 0.119,
    attributionRank: 5,
    factorBreakdown: {
      backtrackProximityScore: 0.19,
      trajectoryCollinearityScore: 0.31,
      vesselPriorScore: 0.1,
      kineticAnomalyScore: 0.11,
      temporalPlausibilityScore: 0.5,
    },
    closestApproachMeters: 18600,
    headingAlignmentDeg: 8.4,
    timeOverlapMinutes: 105,
    aisAnomaly: "Class-B loitering",
    riskBadge: "CLEAR",
    reasons: [
      "18.6 km from origin — outside search envelope",
      "Loitering pattern consistent with trawling, not discharge",
      "Fishing vessel prior (0.10) — negligible discharge likelihood",
      "No kinematic anomaly; Class-B AIS throughout",
    ],
    kinematicProfile: [
      { time: "06:00", speed: 3.4, status: "Trawling" },
      { time: "08:00", speed: 3.1, status: "Trawling" },
      { time: "10:00", speed: 3.3, status: "Trawling" },
    ],
    enforcementAction: "EXCLUDED",
    dwt: 410,
    lengthMeters: 34.5,
    beamMeters: 8.2,
    draughtMeters: 3.4,
    yearBuilt: 2021,
    owner: "Samudra Cooperative Fisheries",
    callSign: "VT4411",
    historicalIncidents: [],
    telemetry: steadyTelemetry(3.2).map((p) => ({ ...p, cog: 148, heading: 152, status: "Trawling" })),
    aisTimeline: [
      { time: "06:00", kind: "FIX", note: "Class-B reporting" },
      { time: "10:00", kind: "FIX", note: "Loitering in fishing ground" },
    ],
  },
];

/* ─────────────────────────────────────────────────────────────
   OPERATIONAL FEED
   ───────────────────────────────────────────────────────────── */

export const MOCK_OPERATIONAL_ALERTS: OperationalAlert[] = [
  {
    id: "ALT-2026-0819",
    severity: "CRITICAL",
    title: "High-confidence mineral oil slick",
    description:
      "Sentinel-1A IW radar detected 18.6 km² dark formation off Okha, Kutch entrance. 94.2% mineral oil probability.",
    timestamp: "10:30 UTC",
    location: "21.8452° N, 69.1124° E",
    read: false,
    incidentId: "SD-2026-00421",
  },
  {
    id: "ALT-2026-0818",
    severity: "SUSPICIOUS",
    title: "Nocturnal tank-washing slowdown",
    description:
      "MT OCEAN MERIDIAN reduced from 14.2 kn to 4.7 kn with a 42-minute AIS gap upstream of the detection.",
    timestamp: "08:40 UTC",
    location: "Kutch outer corridor",
    read: false,
    vesselImo: 9123456,
  },
  {
    id: "ALT-2026-0817",
    severity: "VERIFIED",
    title: "Evidence ledger block #4 sealed",
    description:
      "SHA-256 Merkle root e78f0b12… anchored and signed with the ICG node Ed25519 key.",
    timestamp: "07:15 UTC",
    location: "ICG node 01",
    read: true,
    incidentId: "SD-2026-00421",
  },
];

/* ─────────────────────────────────────────────────────────────
   SATELLITE PASS FORECAST
   ───────────────────────────────────────────────────────────── */

export const MOCK_SAT_PASSES: SatPass[] = [
  {
    id: "S1A-118",
    mission: "Sentinel-1A",
    mode: "SAR",
    nextUtc: "2026-09-12T04:18:00Z",
    etaMinutes: 118,
    swath: "IW · 250 km",
    operational: true,
  },
  {
    id: "RISAT-1A-114",
    mission: "RISAT-1A",
    mode: "SAR",
    nextUtc: "2026-09-11T18:42:00Z",
    etaMinutes: 138,
    swath: "MRS · 240 km",
    operational: true,
  },
];

/* ─────────────────────────────────────────────────────────────
   EVIDENCE LEDGER
   ───────────────────────────────────────────────────────────── */

export const MOCK_EVIDENCE_CHECKS: EvidenceCheck[] = [
  {
    tier: "SAR Image",
    artifact: "Sentinel-1A IW_GRDH_1SDV_20260911T103000 (VV+VH)",
    hash: "3a7b8e519c2f6d0a4b8e7c1f9d2a5b6c7e8f0a1b2c3d4e5f6a7b8c9d0e1f2a3b",
    algorithm: "SHA-256",
    verified: true,
    status: "VALID_AUTHENTIC",
  },
  {
    tier: "AIS Data",
    artifact: "AIVDM stream slice · MMSI 419001234 · 18,420 pings",
    hash: "f4d19c8e2b5a6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d",
    algorithm: "SHA-256",
    verified: true,
    status: "VALID_AUTHENTIC",
  },
  {
    tier: "Weather Data",
    artifact: "INCOIS currents + ECMWF ERA5 10 m wind, GRIB2 slice",
    hash: "8e50b2c1d3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
    algorithm: "SHA-256",
    verified: true,
    status: "VALID_AUTHENTIC",
  },
  {
    tier: "Attribution Matrix",
    artifact: "Bayesian 5-factor solution tensor · SD-2026-00421",
    hash: "e78f0b12a9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0",
    algorithm: "Merkle tree hash",
    verified: true,
    status: "CHAIN_OF_CUSTODY_INTACT",
  },
  {
    tier: "Merkle Root",
    artifact: "Root digest of evidence ledger #1042",
    hash: "c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1",
    algorithm: "SHA-256",
    verified: true,
    status: "ROOT_ANCHORED",
  },
  {
    tier: "Ed25519 Signature",
    artifact: "ICG surveillance authority key",
    hash: "4f8a1c9e2d3b4a5c6d7e8f90123456789abcdef0123456789abcdef0123456789a4b5c6d7e8f90123456789abcdef",
    algorithm: "Ed25519 RFC 8032",
    verified: true,
    status: "SIGNATURE_VALID_CERTIFIED",
  },
];

export const MOCK_EVIDENCE_LEDGER: EvidenceLedgerResponse = {
  status: "success",
  nodeId: "icg-sagar-drishti-node-01",
  chainLength: 6,
  chainValid: true,
  merkleRoot: "e78f0b12a9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0",
  signatureEd25519:
    "4f8a1c9e2d3b4a5c6d7e8f90123456789abcdef0123456789abcdef0123456789a4b5c6d7e8f90123456789abcdef",
  blocks: [
    {
      index: 0,
      timestamp: "2026-09-11T10:30:00Z",
      merkle_root:
        "0000000000000000000000000000000000000000000000000000000000000000",
      attribution_matrix: {},
      prev_block_hash:
        "0000000000000000000000000000000000000000000000000000000000000000",
      block_hash: "00003f8a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789",
      nonce: 1048576,
    },
    {
      index: 1,
      timestamp: "2026-09-11T10:35:12Z",
      merkle_root:
        "3a7b8e519c2f6d0a4b8e7c1f9d2a5b6c7e8f0a1b2c3d4e5f6a7b8c9d0e1f2a3b",
      attribution_matrix: { sarCalibrationVerified: 1, speckleLeeFilterApplied: 1 },
      prev_block_hash:
        "00003f8a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789",
      block_hash: "00009e4a2b1c3d5f60718293a4b5c6d7e8f90123456789abcdef0123456789ab",
      nonce: 2097152,
    },
    {
      index: 2,
      timestamp: "2026-09-11T10:38:44Z",
      merkle_root:
        "f4d19c8e2b5a6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d",
      attribution_matrix: { aisDeduplicated: 1, kalmanFiltered: 1 },
      prev_block_hash:
        "00009e4a2b1c3d5f60718293a4b5c6d7e8f90123456789abcdef0123456789ab",
      block_hash: "00008b1c2d3e4f5a60718293a4b5c6d7e8f90123456789abcdef0123456789cd",
      nonce: 3145728,
    },
    {
      index: 3,
      timestamp: "2026-09-11T10:41:09Z",
      merkle_root:
        "8e50b2c1d3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
      attribution_matrix: { incoisCurrentsValidated: 1, ecmwfWindsInterpolated: 1 },
      prev_block_hash:
        "00008b1c2d3e4f5a60718293a4b5c6d7e8f90123456789abcdef0123456789cd",
      block_hash: "00007c2d3e4f5a6b70819203a4b5c6d7e8f90123456789abcdef0123456789ef",
      nonce: 4194304,
    },
    {
      index: 4,
      timestamp: "2026-09-11T10:45:30Z",
      merkle_root:
        "c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1",
      attribution_matrix: {
        backtrackProximityScore: 0.962,
        trajectoryCollinearityScore: 0.918,
        vesselPriorScore: 1.0,
        kineticAnomalyScore: 0.885,
        temporalPlausibilityScore: 1.0,
      },
      prev_block_hash:
        "00007c2d3e4f5a6b70819203a4b5c6d7e8f90123456789abcdef0123456789ef",
      block_hash: "00004a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d80",
      nonce: 5242880,
    },
    {
      index: 5,
      timestamp: "2026-09-11T10:48:02Z",
      merkle_root:
        "e78f0b12a9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0",
      attribution_matrix: { sealed: 1 },
      prev_block_hash:
        "00004a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d80",
      block_hash: "0000e78f0b12a9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e",
      nonce: 6291456,
    },
  ],
};

export const MOCK_EVIDENCE_MANIFEST: EvidenceManifestResponse = {
  status: "success",
  manifestVersion: "1.0",
  packageId: "SD-2026-00421:evidence-package",
  eventId: "SD-2026-00421",
  generatedAtUtc: "2026-09-11T10:51:02Z",
  generatedBy: "icg-sagar-drishti-node-01",
  dataMode: "sample",
  hashAlgorithm: "SHA-256",
  signatureAlgorithm: "Ed25519",
  merkleRoot: "e78f0b12a9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0",
  signatureEd25519:
    "4f8a1c9e2d3b4a5c6d7e8f90123456789abcdef0123456789abcdef0123456789a4b5c6d7e8f90123456789abcdef",
  artifactCount: 4,
  artifacts: [
    {
      artifactId: "SD-2026-00421:sar-scene",
      type: "SAR_CAPTURE",
      source: "SENTINEL-1A",
      timestampUtc: "2026-09-11T10:30:20Z",
      sha256:
        "3a7b8e519c2f6d0a4b8e7c1f9d2a5b6c7e8f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c",
      classification: "MINERAL_OIL",
      confidence: 0.942,
      metadata: {
        sensor: "C-Band SAR (IW Mode)",
        productType: "GRD-IW",
        polarization: ["VV", "VH"],
        relativeOrbit: 118,
        resolutionMeters: 10,
      },
    },
    {
      artifactId: "SD-2026-00421:ais-track",
      type: "AIS_HISTORY",
      source: "SAMPLE_AIS_PROVIDER",
      timestampUtc: "2026-09-11T10:30:20Z",
      sha256:
        "f4d19c8e2b5a6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e",
      classification: "VESSEL_TELEMETRY",
      confidence: 1.0,
      metadata: { vesselCount: 25 },
    },
    {
      artifactId: "SD-2026-00421:metocean",
      type: "METOCEAN_SNAPSHOT",
      source: "SAMPLE_METOCEAN_PROVIDER",
      timestampUtc: "2026-09-11T10:30:20Z",
      sha256:
        "8e50b2c1d3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1",
      classification: "WIND_CURRENT_GRID",
      confidence: 1.0,
      metadata: { providerMode: "sample" },
    },
    {
      artifactId: "SD-2026-00421:attribution",
      type: "ATTRIBUTION_MATRIX",
      source: "icg-sagar-drishti-node-01",
      timestampUtc: "2026-09-11T10:51:02Z",
      sha256:
        "c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1",
      classification: "MODEL_OUTPUT",
      confidence: 0.935,
      metadata: {
        features: {
          backtrackProximityScore: 0.962,
          trajectoryCollinearityScore: 0.918,
          vesselPriorScore: 1.0,
          kineticAnomalyScore: 0.885,
          temporalPlausibilityScore: 1.0,
        },
      },
    },
  ],
};