export interface DemoStageInfo {
  step: number;
  label: string;
  shortLabel: string;
  badge: string;
  route: string;
  dwellSeconds: number;
  alert: string;
  analystLine: string;
  focusHint: string;
}

export const DEMO_STAGES: DemoStageInfo[] = [
  {
    step: 1,
    label: "SAR SATELLITE INGEST",
    shortLabel: "INGEST",
    badge: "SENTINEL-1A",
    route: "/operations",
    dwellSeconds: 6,
    alert: "STAGE 1 · SENTINEL-1A SAR INGEST ACTIVE",
    analystLine:
      "Sentinel-1A C-band IW pass initialized over Gulf of Kutch maritime corridor — orbit #118 ground track locked.",
    focusHint: "Orbit footprint and radar coverage active over Gujarat coastline.",
  },
  {
    step: 2,
    label: "RADAR BEAM ANOMALY SWEEP",
    shortLabel: "SWEEP",
    badge: "C-BAND SAR",
    route: "/operations",
    dwellSeconds: 7,
    alert: "STAGE 2 · RADAR BEAM SWEEP & BACKSCATTER ANOMALY",
    analystLine:
      "Radar beam sweeps Gulf of Kutch; cross-track backscatter suppression isolates an 18.6 km² hydrocarbon anomaly.",
    focusHint: "Real-time radar beam sweep crossing the high-traffic crude corridor.",
  },
  {
    step: 3,
    label: "SAR FORENSICS & AI SEGMENTATION",
    shortLabel: "FORENSICS",
    badge: "AI VISION",
    route: "/sar-investigation",
    dwellSeconds: 9,
    alert: "STAGE 3 · OIL SPILL CLASSIFIED — MINERAL SHEEN (18.6 KM²)",
    analystLine:
      "Multi-spectral neural classifier confirms mineral crude slick (96.8% confidence); 4-tier thickness profile generated.",
    focusHint: "Lee speckle filter and multi-polarization cross-ratio analysis.",
  },
  {
    step: 4,
    label: "INCOIS HYDRODYNAMIC CURRENTS",
    shortLabel: "CURRENTS",
    badge: "INCOIS + ECMWF",
    route: "/drift",
    dwellSeconds: 8,
    alert: "STAGE 4 · HYDRODYNAMIC INCOIS CURRENTS ACTIVATED",
    analystLine:
      "INCOIS surface velocity field active — 1.1 kn ebb stream channeling through Outer Kutch with 14 kn NW winds.",
    focusHint: "High-resolution coastal ocean hydrodynamic current field.",
  },
  {
    step: 5,
    label: "RUNGE-KUTTA 4TH-ORDER REVERSE DRIFT",
    shortLabel: "BACKTRACK",
    badge: "RK4 ADVECTION",
    route: "/drift",
    dwellSeconds: 9,
    alert: "STAGE 5 · RK4 LAGRANGIAN BACKTRACKING UNDERWAY",
    analystLine:
      "4th-Order Runge–Kutta reverse advection computes 12-hour trajectory; origin converged at 21.654°N, 68.892°E.",
    focusHint: "T-12h discharge point isolated with 95% spatial confidence ellipse.",
  },
  {
    step: 6,
    label: "BAYESIAN VESSEL ATTRIBUTION",
    shortLabel: "ATTRIBUTION",
    badge: "BAYESIAN ML",
    route: "/attribution",
    dwellSeconds: 9,
    alert: "STAGE 6 · SUSPECT VESSEL ISOLATED (IMO 9720134)",
    analystLine:
      "5-factor tensor correlates AIS kinematics, collinear heading, and discharge window to pin Crude Tanker IMO 9720134.",
    focusHint: "Attribution ranking isolated suspect tanker with 92.4% probability.",
  },
  {
    step: 7,
    label: "CRYPTOGRAPHIC EVIDENCE LEDGER",
    shortLabel: "LEDGER",
    badge: "SHA-256 MERKLE",
    route: "/evidence",
    dwellSeconds: 8,
    alert: "STAGE 7 · EVIDENCE CHAIN-OF-CUSTODY SEALED",
    analystLine:
      "Raw SAR imagery, AIS telemetry pings, and hydrodynamic matrices sealed into tamper-proof SHA-256 Merkle root.",
    focusHint: "Ed25519 digital signature verified by Coast Guard authority node.",
  },
  {
    step: 8,
    label: "COURT-ADMISSIBLE LEGAL DOSSIER",
    shortLabel: "DOSSIER",
    badge: "SECTION 65B",
    route: "/dossier",
    dwellSeconds: 12,
    alert: "STAGE 8 · COURT DOSSIER READY · MARPOL ANNEX I",
    analystLine:
      "Automated legal dossier certified under Indian Evidence Act Section 65B and MARPOL Annex I ready for port detention.",
    focusHint: "Complete legal case file with Ed25519 signature certificate.",
  },
];
