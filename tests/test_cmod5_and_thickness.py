"""
Unit tests for CMOD5.N GMF wind inversion and Bonn/Hollinger volume quantification.
"""

import numpy as np
import pytest

from core.sar.cmod5 import invert_cmod5n_wind, assess_wind_lookalike, cmod5n_forward
from core.sar.thickness import quantify_spill_volume, estimate_thickness_from_damping


def test_cmod5n_forward_and_inverse():
    # Forward calculation
    wind_input = 8.0  # m/s
    inc_deg = 35.0
    sig_db = cmod5n_forward(wind_input, inc_deg, phi_deg=45.0)

    assert -25.0 < sig_db < -5.0

    # Invert back
    wind_inverted = invert_cmod5n_wind(sig_db, inc_deg, relative_wind_dir_deg=45.0)
    assert np.isclose(wind_inverted, wind_input, atol=1.5)


def test_cmod5n_low_wind_screening():
    # Very dark backscatter (calm sea): -24 dB at 35 deg incidence corresponds to low wind (< 3 m/s)
    assessment_calm = assess_wind_lookalike(ambient_sea_vv_db=-24.0, incidence_deg=35.0)
    assert assessment_calm.is_low_wind_lookalike is True
    assert assessment_calm.wind_speed_ms < 3.0
    assert assessment_calm.status_label == "LOW_WIND_LOOKALIKE"

    # Moderate sea: -10 dB at 35 deg incidence corresponds to robust wind (~6-10 m/s)
    assessment_sea = assess_wind_lookalike(ambient_sea_vv_db=-10.0, incidence_deg=35.0)
    assert assessment_sea.is_low_wind_lookalike is False
    assert assessment_sea.wind_speed_ms >= 3.0
    assert assessment_sea.status_label == "SUITABLE_WIND_FOR_OIL_DETECTION"



def test_oil_thickness_and_volume_quantification():
    # 200 x 200 grid with 50x50 slick
    h, w = 200, 200
    slick_mask = np.zeros((h, w), dtype=bool)
    slick_mask[50:100, 50:100] = True  # 2500 pixels

    # 10m pixels -> 2500 * 100m² = 250,000 m² = 0.25 km²
    damping_grid = np.zeros((h, w), dtype=np.float32)
    damping_grid[50:100, 50:100] = 7.0  # 7 dB strong damping (thick oil)

    vol_est = quantify_spill_volume(
        slick_mask=slick_mask,
        damping_grid_db=damping_grid,
        pixel_resolution_m=10.0,
        oil_density_kg_m3=880.0
    )

    assert np.isclose(vol_est.area_km2, 0.25, atol=0.01)
    assert vol_est.volume_nominal_m3 > 10.0  # Physical oil volume
    assert vol_est.mass_nominal_tonnes > 5.0
    assert vol_est.thickness_mean_microns > 50.0  # Strong damping corresponds to thick layer
    assert vol_est.dominant_bonn_code in ["CODE_4", "CODE_5"]
