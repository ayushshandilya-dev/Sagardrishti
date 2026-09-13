/* SAGAR-DRISHTI V13 — Explainability Gallery Types */

export type ComparisonViewingMode =
  | "SLIDER"
  | "FADE"
  | "SWIPE"
  | "SPLIT_ZOOM"
  | "REPLAY";

export type CategoryTag =
  | "Detection"
  | "Preprocessing"
  | "Polarimetry"
  | "Multi-Sensor"
  | "Classification"
  | "Risk Heatmap"
  | "Physics"
  | "AIS"
  | "Telemetry"
  | "COP"
  | "Evidence"
  | "Legal Dossier";

export interface AnnotationItem {
  id: string;
  type: "arrow" | "callout" | "box" | "ruler" | "polygon_label";
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  label: string;
  detail?: string;
  color?: "amber" | "aqua" | "teal" | "red" | "green";
}

export interface PixelTelemetry {
  lat: string;
  lon: string;
  vvDb: number;
  vhDb: number;
  textureEntropy: number;
  confidence: number;
  classification: string;
  backscatterSigma0: number;
}

export interface MetricItem {
  label: string;
  value: string;
  unit?: string;
  subtext?: string;
  trend?: "up" | "down" | "neutral";
}

export interface ComparisonData {
  id: string;
  stageNumber: number; // 1 to 20
  title: string;
  subtitle: string;
  category: CategoryTag;
  confidence: number; // e.g. 94.2
  timestampUtc: string;
  satelliteSensor: string;
  resolution: string;
  areaKm2?: number;
  gpuProcessingMs?: number;

  // Scientific Explanation
  whatChanged: string;
  whyItChanged: string;
  aiReasoning: string;
  scientificInterpretation: string;
  judgeTakeaway: string;

  // Key metrics
  metrics: MetricItem[];

  // Render presets
  beforeLabel: string;
  afterLabel: string;
  beforeDescription: string;
  afterDescription: string;
  renderType:
    | "sar_seg"
    | "speckle"
    | "polarization"
    | "rgb_sar"
    | "sheen"
    | "heatmap"
    | "rk4"
    | "currents"
    | "wind"
    | "ais_ranking"
    | "blackout"
    | "speed_profile"
    | "heading"
    | "current_drift"
    | "confidence_build"
    | "intelligence_map"
    | "evidence_proof"
    | "tamper_sim"
    | "timeline_build"
    | "final_dossier";

  // Annotations
  annotations: AnnotationItem[];

  // Pixel Inspector Sample Base
  basePixel: PixelTelemetry;
}

export interface JudgeNote {
  comparisonId: string;
  noteText: string;
  rating: number; // 1-5
  starred: boolean;
  verifiedByJudge: boolean;
  updatedAt: string;
}

export type ExportFormat =
  | "PNG_SNAPSHOT"
  | "PDF_SLIDE"
  | "GEOJSON_OVERLAY"
  | "EVIDENCE_SCREENSHOT"
  | "JUDGE_CAPTION";
