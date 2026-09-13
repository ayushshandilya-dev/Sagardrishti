export {
  shipSilhouette,
  shipMetrics,
  generateVesselWake,
  randomJitter,
} from "./silhouettes";

export {
  createOilSheenLayer,
  type SheenLayerHandle,
  type ContaminationMode,
} from "./sheen";

export {
  mercatorScale,
  mixHex,
  merc,
  type LivingHandle,
  type LonLat,
} from "./gl";

export {
  createBathymetryLayer,
  createParticleLayer,
  createLaneFlowLayer,
  createPortLightLayer,
  createBloomLayer,
  createSwathSweepLayer,
  createEnvironmentalHeatmapLayer,
  type BloomHandle,
  type BloomPoint,
  type SwathHandle,
} from "./living";

export {
  INFRASTRUCTURE_NODES,
  SUBSEA_PIPELINES,
  ENVIRONMENTAL_ZONES,
  DREDGED_CHANNELS,
  type InfrastructureNode,
  type PipelineRoute,
  type EnvironmentalZone,
} from "./infrastructure";

export {
  SST_FIELD,
  CHLOROPHYLL_FIELD,
  WAVE_FIELD,
  SALINITY_FIELD,
  type EnvironmentalField,
  type EnvironmentalContour,
} from "./environment";

export {
  calculateHudPlacement,
  HudLeaderLine,
  FloatingGlassHud,
  IncidentIntelligenceHud,
  VesselInvestigationHud,
  PortInfrastructureHud,
  type HudPlacement,
  type HudAnchorPoint,
} from "./huds";

export {
  flyToPose,
  focusOnVessel,
  focusOnSpill,
  THEATRE_OVERVIEW,
  DEMO_STAGE_POSES,
  type CameraPose,
} from "./camera";