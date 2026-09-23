"""
Hydrodynamic Drift and Weathering Package for Sagar-Drishti.
"""

from core.drift.rk4 import (
    rk4_backtrack,
    rk4_forward_forecast,
    rk4_ensemble_backtrack,
    compute_drift_vector,
    compute_coriolis_deflection_angle,
    METERS_PER_DEGREE_LAT,
    TrajectoryPoint,
    ForecastResult,
)
from core.drift.weathering import (
    FayMackayWeatheringEngine,
    WeatheringState,
)

__all__ = [
    "rk4_backtrack",
    "rk4_forward_forecast",
    "rk4_ensemble_backtrack",
    "compute_drift_vector",
    "compute_coriolis_deflection_angle",
    "METERS_PER_DEGREE_LAT",
    "TrajectoryPoint",
    "ForecastResult",
    "FayMackayWeatheringEngine",
    "WeatheringState",
]
