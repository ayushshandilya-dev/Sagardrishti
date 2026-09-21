"""Unit tests for the 4th-order Runge-Kutta reverse drift backtracking."""
import numpy as np

from core.drift.rk4 import (
    compute_drift_vector,
    rk4_backtrack,
)


def _const_current(u=0.45, v=-0.25):
    return lambda lon, lat, t: (u, v)


def _const_wind(u=5.2, v=3.1):
    return lambda lon, lat, t: (u, v)


class TestDriftVector:

    def test_zero_wind_and_current_is_zero(self):
        v = compute_drift_vector(21.8, 69.1, 0.0, 0.0, 0.0, 0.0, 0.0)
        assert np.allclose(v, np.zeros(2))

    def test_current_alone(self):
        v = compute_drift_vector(21.8, 69.1, 0.0, 0.5, 0.0, 0.0, 0.0)
        assert np.allclose(v, [0.5, 0.0])

    def test_wind_leeway_is_fraction_of_wind(self):
        v = compute_drift_vector(21.8, 69.1, 0.0, 0.0, 0.0, 10.0, 0.0)
        magnitude = float(np.hypot(v[0], v[1]))
        assert np.isclose(magnitude, 0.35, atol=0.02)  # 3.5% leeway + Coriolis deflection


class TestRK4Backtrack:

    def test_zero_hours_returns_start(self):
        lat, lon, hours = rk4_backtrack(
            21.8452, 69.1124, 0.0,
            _const_current(), _const_wind(),
            t_max_hours=0.0,
        )
        assert hours == 0
        assert np.isclose(lat, 21.8452, atol=1e-9)
        assert np.isclose(lon, 69.1124, atol=1e-9)

    def test_reverse_integrates_westward(self):
        # Current pushes eastward; reverse advection must move west (longitude down)
        lat, lon, hours = rk4_backtrack(
            21.8452, 69.1124, 0.0,
            _const_current(u=0.5, v=0.0), _const_wind(),
            t_max_hours=2.0,
        )
        assert 1.9 < hours <= 2.0
        assert lon < 69.1124
        assert abs(lat - 21.8452) < 0.5

    def test_longer_backtrack_covers_more_distance(self):
        _, lon_short, _ = rk4_backtrack(
            21.8452, 69.1124, 0.0,
            _const_current(u=0.5, v=0.0), _const_wind(),
            t_max_hours=1.0,
        )
        _, lon_long, _ = rk4_backtrack(
            21.8452, 69.1124, 0.0,
            _const_current(u=0.5, v=0.0), _const_wind(),
            t_max_hours=4.0,
        )
        assert lon_long < lon_short

    def test_hours_backtracked_is_monotonic_with_input(self):
        results = [
            rk4_backtrack(21.8452, 69.1124, 0.0, _const_current(), _const_wind(), t_max_hours=h)
            for h in (3.0, 6.0, 12.0)
        ]
        assert [r[2] for r in results] == sorted(r[2] for r in results)