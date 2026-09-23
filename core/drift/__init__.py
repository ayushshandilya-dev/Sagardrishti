"""
Hydrodynamic Drift and Weathering Package for Sagar-Drishti.
"""

from core.drift.rk4 import (
    rk4_backtrack,
    rk4_forward_forecast,
    compute_drift_vector,
    compute_coriolis_deflection_angle,
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
    "compute_drift_vector",
    "compute_coriolis_deflection_angle",
    "TrajectoryPoint",
    "ForecastResult",
    "FayMackayWeatheringEngine",
    "WeatheringState",
]
