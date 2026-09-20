import { create } from "zustand";
import {
  Incident,
  CandidateVessel,
  DriftResult,
  OperationalAlert,
  MapLayersState,
  EvidenceCheck,
  EvidenceLedgerResponse,
  AlertSeverity,
} from "./types";
import {
  MOCK_INCIDENTS,
  MOCK_CANDIDATE_VESSELS,
  MOCK_DRIFT_RESULT,
  MOCK_OPERATIONAL_ALERTS,
  MOCK_EVIDENCE_CHECKS,
} from "./mockData";

interface CommandStore {
  // Incident (detection → SAR investigation)
  incidents: Incident[];
  selectedIncidentId: string;
  setSelectedIncidentId: (id: string) => void;
  getSelectedIncident: () => Incident;

  // Vessel candidates (attribution → investigation)
  candidateVessels: CandidateVessel[];
  selectedVesselImo: number;
  setSelectedVesselImo: (imo: number) => void;
  getSelectedVessel: () => CandidateVessel | null;
  setCandidateVessels: (vessels: CandidateVessel[]) => void;

  // Map layers (COP)
  layers: MapLayersState;
  toggleLayer: (layer: keyof MapLayersState) => void;
  setLayer: (layer: keyof MapLayersState, value: boolean) => void;
  resetLayers: () => void;

  // Reverse drift timeline
  currentDriftHour: number;
  isDriftPlaying: boolean;
  playbackSpeed: number;
  setCurrentDriftHour: (hour: number) => void;
  togglePlayDrift: () => void;
  setPlaybackSpeed: (spd: number) => void;
  resetDrift: () => void;

  // Operational alerts
  alerts: OperationalAlert[];
  alertFilter: AlertSeverity | "ALL";
  setAlertFilter: (filter: AlertSeverity | "ALL") => void;
  markAlertRead: (id: string) => void;

  // Evidence verification
  isVerifying: boolean;
  hasVerified: boolean;
  evidenceChecks: EvidenceCheck[];
  evidenceLedger: EvidenceLedgerResponse | null;
  setVerifying: (v: boolean) => void;
  setVerified: (v: boolean) => void;
  setEvidenceChecks: (c: EvidenceCheck[]) => void;
  setEvidenceLedger: (l: EvidenceLedgerResponse | null) => void;

  // Data source (live backend vs offline simulation)
  dataSource: "LIVE" | "SIMULATED";
  lastSyncAt: string | null;
  setDataSource: (s: "LIVE" | "SIMULATED") => void;
  setLastSyncAt: (t: string) => void;

  // Drift result
  driftResult: DriftResult | null;
  setDriftResult: (result: DriftResult) => void;

  // Demo choreography (SIH walkthrough)
  isDemoRunning: boolean;
  isDemoPaused: boolean;
  demoStep: number;
  isSpeechEnabled: boolean;
  startDemo: () => void;
  resetDemo: () => void;
  togglePauseDemo: () => void;
  toggleSpeech: () => void;
  setDemoStep: (step: number) => void;
  setDemoPaused: (paused: boolean) => void;
  toggleDemoPause: () => void;

  // Stage-2 "Sentinel-1 Detection Event" timeline cursor (ms since start, null when inactive)
  detectionMs: number | null;
  setDetectionMs: (ms: number | null) => void;
}

const DEFAULT_LAYERS: MapLayersState = {
  eez: true,
  shipping: true,
  ais: true,
  oil: true,
  drift: false,
  weather: true,
  currents: true,
  bathy: false,
  coast: true,
  sentinel: true,
};

export const useCommandStore = create<CommandStore>((set, get) => ({
  incidents: MOCK_INCIDENTS,
  selectedIncidentId: MOCK_INCIDENTS[0].eventId,
  setSelectedIncidentId: (id) => set({ selectedIncidentId: id }),
  getSelectedIncident: () =>
    get().incidents.find((i) => i.eventId === get().selectedIncidentId) ??
    get().incidents[0],

  candidateVessels: MOCK_CANDIDATE_VESSELS,
  selectedVesselImo: MOCK_CANDIDATE_VESSELS[0].imo,
  setSelectedVesselImo: (imo) => set({ selectedVesselImo: imo }),
  getSelectedVessel: () =>
    get().candidateVessels.find((v) => v.imo === get().selectedVesselImo) ?? null,
  setCandidateVessels: (vessels) => set({ candidateVessels: vessels }),

  layers: DEFAULT_LAYERS,
  toggleLayer: (layer) =>
    set((state) => ({
      layers: { ...state.layers, [layer]: !state.layers[layer] },
    })),
  setLayer: (layer, value) =>
    set((state) => ({ layers: { ...state.layers, [layer]: value } })),
  resetLayers: () => set({ layers: DEFAULT_LAYERS }),

  currentDriftHour: 0,
  isDriftPlaying: false,
  playbackSpeed: 1,
  setCurrentDriftHour: (hour) => set({ currentDriftHour: hour }),
  togglePlayDrift: () => set((state) => ({ isDriftPlaying: !state.isDriftPlaying })),
  setPlaybackSpeed: (spd) => set({ playbackSpeed: spd }),
  resetDrift: () => set({ currentDriftHour: 0, isDriftPlaying: false }),

  alerts: MOCK_OPERATIONAL_ALERTS,
  alertFilter: "ALL",
  setAlertFilter: (filter) => set({ alertFilter: filter }),
  markAlertRead: (id) =>
    set((state) => ({
      alerts: state.alerts.map((a) => (a.id === id ? { ...a, read: true } : a)),
    })),

  isVerifying: false,
  hasVerified: false,
  evidenceChecks: MOCK_EVIDENCE_CHECKS,
  evidenceLedger: null,
  setVerifying: (v) => set({ isVerifying: v }),
  setVerified: (v) => set({ hasVerified: v }),
  setEvidenceChecks: (c) => set({ evidenceChecks: c }),
  setEvidenceLedger: (l) => set({ evidenceLedger: l }),

  dataSource: "SIMULATED",
  lastSyncAt: null,
  setDataSource: (s) => set({ dataSource: s }),
  setLastSyncAt: (t) => set({ lastSyncAt: t }),

  driftResult: MOCK_DRIFT_RESULT,
  setDriftResult: (result) => set({ driftResult: result }),

  isDemoRunning: false,
  isDemoPaused: false,
  demoStep: 0,
  isSpeechEnabled: false,
  detectionMs: null,
  startDemo: () => set({ isDemoRunning: true, isDemoPaused: false, demoStep: 1 }),
  resetDemo: () =>
    set({
      isDemoRunning: false,
      isDemoPaused: false,
      demoStep: 0,
      detectionMs: null,
      currentDriftHour: 0,
      isDriftPlaying: false,
      hasVerified: false,
    }),
  togglePauseDemo: () => set((state) => ({ isDemoPaused: !state.isDemoPaused })),
  toggleSpeech: () => set((state) => ({ isSpeechEnabled: !state.isSpeechEnabled })),
  setDemoStep: (step) => set({ demoStep: step }),
  setDemoPaused: (paused) => set({ isDemoPaused: paused }),
  toggleDemoPause: () => set((state) => ({ isDemoPaused: !state.isDemoPaused })),
  setDetectionMs: (ms) => set({ detectionMs: ms }),
}));