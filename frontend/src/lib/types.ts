/* SAGAR-DRISHTI V5 — Domain Model */

export interface SarMetadata {
  mission: string;
  sensor: string;
  productType: string;
  polarization: string[];
  relativeOrbit: number;
  passDirection: "ASCENDING" | "DESCENDING";
  incidenceAngleDeg: number;
  acquisitionUtc: string;
  rawSceneSha256: string;
  resolutionMeters?: number;
}

export interface DetectionScores {
  textureScore: number; // Haralick GLCM homogeneity / contrast
  vvVhAgreement: number; // dual-pol damping ratio agreement
  morphologyAgreement: number;
  thresholdScore: number; // adaptive Otsu discriminant
  segmentationAgreement: number; // SegFormer IoU consensus
}

export interface SpillGeometry {
  centroid: { latitude: number; longitude: number };
  areaKm2: number;
  perimeterKm: number;
  lengthKm: number;
  widthKm: number;
  skeletonOrientationDeg: number;
  boundingBox: {
    lowerLeft: { latitude: number; longitude: number };
    upperRight: { latitude: number; longitude: number };
  };
  polygonGeoJson: {
    type: "Polygon";
    coordinates: number[][][];
  };
}

export interface Incident {
  eventId: string;
  timestampUtc: string;
  severity: "CRITICAL" | "MAJOR" | "WATCH";
  sarMetadata: SarMetadata;
  spillGeometry: SpillGeometry;
  classification: {
    classLabel: "MINERAL_OIL" | "BIOGENIC" | "LOW_WIND" | "SHIP_WAKE";
    confidence: number;
    lookAlikeProbs: {
      mineralOil: number;
      biogenicSlick: number;
      lowWindArea: number;
      shipWake: number;
    };
  };
  detectionScores: DetectionScores;
  evidenceChips: string[]; // e.g. ["VV Verified", "VH Verified", "Texture Verified"]
  radarBrief: string;
}

export interface DriftTrajectoryPoint {
  hourOffset: number; // 0 = observation, negative = hours prior
  timestampUtc: string;
  latitude: number;
  longitude: number;
  currentSpeed: number; // m/s
  currentDirectionDeg: number;
  windSpeed: number; // m/s
  windDirectionDeg: number;
  uncertaintyRadiusMeters: number;
}

export interface DriftResult {
  status: string;
  provenance: {
    driftModel: string;
    currentSource: string;
    windSource: string;
    leewayFactor: string;
    stepSeconds: number;
  };
  observedCentroid: {
    latitude: number;
    longitude: number;
    timestampUtc: string;
  };
  reconstructedOrigin: {
    latitude: number;
    longitude: number;
    timestampUtc: string;
    hoursBeforeObservation: number;
    uncertaintyRadiusMeters: number;
    rk4Confidence: number;
  };
  trajectory: DriftTrajectoryPoint[];
}

export interface FactorBreakdown {
  backtrackProximityScore: number;
  trajectoryCollinearityScore: number;
  vesselPriorScore: number;
  kineticAnomalyScore: number;
  temporalPlausibilityScore: number;
}

export interface VesselHistoryRecord {
  date: string;
  port: string;
  incidentType: string;
  outcome: string;
}

export interface AisTelemetryPoint {
  time: string; // ISO or HH:MM UTC
  sog: number;
  cog: number;
  heading: number;
  status: string;
}

export interface AisEvent {
  time: string;
  kind: "FIX" | "GAP" | "MANEUVER" | "ANOMALY";
  note: string;
}

export type RiskBadge = "PRIMARY" | "WATCH" | "CLEAR";

export interface CandidateVessel {
  mmsi: number;
  imo: number;
  vesselName: string;
  flag: string;
  vesselType: string;
  latitude: number;
  longitude: number;
  speedOverGround: number;
  courseOverGround: number;
  heading: number;
  aisStatus: string;
  attributionScore: number;
  attributionRank?: number;
  factorBreakdown: FactorBreakdown;
  closestApproachMeters: number;
  headingAlignmentDeg: number; // angular offset from slick axis
  timeOverlapMinutes: number; // temporal overlap with drift window
  aisAnomaly: string; // e.g. "42 min gap", "None detected"
  riskBadge: RiskBadge;
  reasons: string[];
  kinematicProfile: { time: string; speed: number; status: string }[];
  enforcementAction: string;
  dwt?: number;
  lengthMeters?: number;
  beamMeters?: number;
  draughtMeters?: number;
  yearBuilt?: number;
  owner?: string;
  callSign?: string;
  historicalIncidents?: VesselHistoryRecord[];
  telemetry?: AisTelemetryPoint[];
  aisTimeline?: AisEvent[];
}

export interface EvidenceCheck {
  tier: string;
  artifact: string;
  hash: string;
  algorithm: string;
  verified: boolean;
  status: string;
}

export interface MerkleBlock {
  index: number;
  timestamp: string;
  merkle_root: string;
  attribution_matrix: Record<string, number>;
  prev_block_hash: string;
  block_hash: string;
  nonce: number;
}

export interface EvidenceLedgerResponse {
  status: string;
  nodeId: string;
  chainLength: number;
  chainValid: boolean;
  merkleRoot: string;
  signatureEd25519: string;
  blocks: MerkleBlock[];
}

export type AlertSeverity = "CRITICAL" | "SUSPICIOUS" | "VERIFIED";

export interface OperationalAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  timestamp: string;
  location: string;
  read: boolean;
  incidentId?: string;
  vesselImo?: number;
}

export interface MapLayersState {
  eez: boolean;
  shipping: boolean;
  ais: boolean;
  oil: boolean;
  drift: boolean;
  weather: boolean;
  currents: boolean;
  bathy: boolean;
  coast: boolean;
  sentinel: boolean;
}

export interface SatPass {
  id: string;
  mission: string;
  mode: "SAR" | "OPTICAL";
  nextUtc: string;
  etaMinutes: number;
  swath: string;
  operational: boolean;
}