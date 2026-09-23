"""
Unit tests for Fay-Mackay weathering engine and 2-way RK4 hydrodynamic advection.
"""

import numpy as np
import pytest

from core.drift.weathering import FayMackayWeatheringEngine, WeatheringState
from core.drift.rk4 import (
    rk4_backtrack,
    rk4_forward_forecast,
    compute_coriolis_deflection_angle,
    compute_drift_vector,
)


def test_fay_mackay_weathering_age():
    engine = FayMackayWeatheringEngine()

    # Observed slick: 500,000 m² (~0.5 km²), length 1200m, width 400m
    area_m2 = 500000.0
    major_axis = 1200.0
    minor_axis = 400.0

    state = engine.assess_slick_weathering(
        area_m2=area_m2,
        major_axis_m=major_axis,
        minor_axis_m=minor_axis,
        wind_speed_ms=6.5,
        sst_celsius=28.0
    )

    assert isinstance(state, WeatheringState)
    # Physically expected age for ~0.5 km² slick in tropical sea: 1 to 24 hours
    assert 1.0 <= state.age_hours <= 24.0
    assert 0.05 <= state.evaporated_fraction <= 0.60
    assert 0.05 <= state.water_content_fraction <= 0.80
    assert state.viscosity_cp > 25.0  # Emulsification increases viscosity


def test_dynamic_coriolis_and_stokes_drift():
    # Equator: Coriolis should be zero
    assert compute_coriolis_deflection_angle(0.0) == 0.0

    # Mumbai High / Arabian Sea latitude (~19°N): deflection should be ~5° to 6°
    angle_19 = np.degrees(compute_coriolis_deflection_angle(19.0))
    assert 4.0 <= angle_19 <= 7.0

    # Drift vector should include Stokes drift along wind direction
    v_stokes = compute_drift_vector(
        lat=20.0, lon=70.0, t_utc=0.0,
        current_u=0.2, current_v=0.0,
        wind_u=10.0, wind_v=0.0,
        include_stokes_drift=True
    )
    v_no_stokes = compute_drift_vector(
        lat=20.0, lon=70.0, t_utc=0.0,
        current_u=0.2, current_v=0.0,
        wind_u=10.0, wind_v=0.0,
        include_stokes_drift=False
    )
    # Stokes drift adds forward component along wind_u
    assert v_stokes[0] > v_no_stokes[0]


def test_rk4_forward_forecast_with_diffusion():
    current_func = lambda lon, lat, t: (0.15, -0.05)
    wind_func = lambda lon, lat, t: (5.0, 3.0)

    res = rk4_forward_forecast(
        lat0=21.5,
        lon0=69.0,
        t_start=0.0,
        current_func=current_func,
        wind_func=wind_func,
        forecast_hours=24.0,
        dt_seconds=600
    )

    assert len(res.trajectory) == 25  # t=0 plus 24 hourly waypoints
    assert res.total_distance_km > 5.0
    # Uncertainty envelope should grow over time with diffusion
    assert res.trajectory[-1].uncertainty_radius_meters > res.trajectory[0].uncertainty_radius_meters
