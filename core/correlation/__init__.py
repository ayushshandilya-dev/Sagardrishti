"""
AIS Correlation and Forensic Attribution Package for Sagar-Drishti.
"""

from core.correlation.attribution import (
    compute_attribution_score,
    backtrack_proximity_score,
    trajectory_collinearity_score,
    vessel_profile_prior,
    kinetic_anomaly_score,
    temporal_plausibility_score,
    BayesianAttributionEngine,
    VESSEL_TYPE_PRIORS,
)
from core.correlation.traffic_filter import (
    SpatiotemporalTrafficFilter,
    FilterConfig,
    FilterResult,
)
from core.correlation.anomaly import (
    AISAnomalyDetector,
    AnomalyProfile,
)
from core.correlation.explainability import (
    AttributionExplainer,
    ForensicReport,
)

__all__ = [
    "compute_attribution_score",
    "backtrack_proximity_score",
    "trajectory_collinearity_score",
    "vessel_profile_prior",
    "kinetic_anomaly_score",
    "temporal_plausibility_score",
    "BayesianAttributionEngine",
    "VESSEL_TYPE_PRIORS",
    "SpatiotemporalTrafficFilter",
    "FilterConfig",
    "FilterResult",
    "AISAnomalyDetector",
    "AnomalyProfile",
    "AttributionExplainer",
    "ForensicReport",
]
