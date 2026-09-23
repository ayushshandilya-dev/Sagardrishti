"""4th-Order Runge-Kutta (RK4) Reverse Lagrangian Drift Advection Engine.

Models oil slick trajectory backtracking under hydrodynamic ocean currents (INCOIS)
and surface wind leeway (ECMWF/ERA5). Includes Monte Carlo stochastic ensemble
simulation for origin probability density and 95% confidence ellipses.
"""

from __future__ import annotations

import math
from typing import Any, Callable, Dict, List, Tuple
import numpy as np

METERS_PER_DEGREE_LAT = 111139.0


def compute_drift_vector(
    lat: float,
    lon: float,
    t_utc: float,
    current_u: float,
    current_v: float,
    wind_u: float,
    wind_v: float,
    leeway_factor: float = 0.035,
    coriolis_deflection_deg: float = 12.0,
) -> np.ndarray:
    """Compute total surface drift velocity vector in meters per second (m/s).

    Total drift = Ocean Current + Wind Leeway (typically ~3.5% of 10m wind deflected
    12° clockwise by Coriolis force in Northern Hemisphere waters).
    """
    coriolis_deflection = np.radians(coriolis_deflection_deg)
    cos_def = np.cos(coriolis_deflection)
    sin_def = np.sin(coriolis_deflection)

    # Wind leeway deflected right by Coriolis in Northern Hemisphere
    wind_leeway_u = leeway_factor * (cos_def * wind_u - sin_def * wind_v)
    wind_leeway_v = leeway_factor * (sin_def * wind_u + cos_def * wind_v)

    total_u = current_u + wind_leeway_u  # East-West velocity (m/s)
    total_v = current_v + wind_leeway_v  # North-South velocity (m/s)

    return np.array([total_u, total_v])


def _get_velocity_in_degrees(
    lat: float,
    lon: float,
    t_utc: float,
    current_func: Callable[[float, float, float], Tuple[float, float]],
    wind_func: Callable[[float, float, float], Tuple[float, float]],
    leeway_factor: float = 0.035,
    coriolis_deflection_deg: float = 12.0,
) -> np.ndarray:
    """Convert drift velocity (m/s) to rate of change in geographic degrees per second (dlat/dt, dlon/dt)."""
    cu, cv = current_func(lon, lat, t_utc)
    wu, wv = wind_func(lon, lat, t_utc)

    v_ms = compute_drift_vector(
        lat, lon, t_utc, cu, cv, wu, wv, leeway_factor, coriolis_deflection_deg
    )

    meters_per_deg_lon = METERS_PER_DEGREE_LAT * max(np.cos(np.radians(lat)), 0.01)

    dlat_dt = v_ms[1] / METERS_PER_DEGREE_LAT
    dlon_dt = v_ms[0] / meters_per_deg_lon

    return np.array([dlat_dt, dlon_dt])


def rk4_backtrack(
    lat0: float,
    lon0: float,
    t_sar: float,
    current_func: Callable[[float, float, float], Tuple[float, float]],
    wind_func: Callable[[float, float, float], Tuple[float, float]],
    t_max_hours: float = 12.0,
    dt_seconds: int = 300,
    leeway_factor: float = 0.035,
    coriolis_deflection_deg: float = 12.0,
) -> Tuple[float, float, float]:
    """4th-Order Runge-Kutta reverse advection backtracking.

    Integrates backward in time from t_SAR to (t_SAR - T_max) to reconstruct the discharge origin.
    Returns (estimated_lat, estimated_lon, hours_backtracked)
    """
    if t_max_hours <= 0:
        return float(lat0), float(lon0), 0.0

    dt = float(dt_seconds)
    lat = float(lat0)
    lon = float(lon0)

    total_seconds = t_max_hours * 3600.0
    steps = int(total_seconds / dt)
    if steps <= 0:
        steps = 1
        dt = total_seconds

    for step in range(steps):
        t_curr = t_sar - step * dt

        # k1 = f(X_n, t_n)
        k1 = _get_velocity_in_degrees(
            lat, lon, t_curr, current_func, wind_func, leeway_factor, coriolis_deflection_deg
        )

        # k2 = f(X_n - 0.5*dt*k1, t_n - 0.5*dt)
        lat_half1 = lat - 0.5 * dt * k1[0]
        lon_half1 = lon - 0.5 * dt * k1[1]
        k2 = _get_velocity_in_degrees(
            lat_half1, lon_half1, t_curr - 0.5 * dt, current_func, wind_func, leeway_factor, coriolis_deflection_deg
        )

        # k3 = f(X_n - 0.5*dt*k2, t_n - 0.5*dt)
        lat_half2 = lat - 0.5 * dt * k2[0]
        lon_half2 = lon - 0.5 * dt * k2[1]
        k3 = _get_velocity_in_degrees(
            lat_half2, lon_half2, t_curr - 0.5 * dt, current_func, wind_func, leeway_factor, coriolis_deflection_deg
        )

        # k4 = f(X_n - dt*k3, t_n - dt)
        lat_end = lat - dt * k3[0]
        lon_end = lon - dt * k3[1]
        k4 = _get_velocity_in_degrees(
            lat_end, lon_end, t_curr - dt, current_func, wind_func, leeway_factor, coriolis_deflection_deg
        )

        # Update backward step: X_{n+1} = X_n - dt/6 * (k1 + 2*k2 + 2*k3 + k4)
        lat -= (dt / 6.0) * (k1[0] + 2.0 * k2[0] + 2.0 * k3[0] + k4[0])
        lon -= (dt / 6.0) * (k1[1] + 2.0 * k2[1] + 2.0 * k3[1] + k4[1])

    return lat, lon, t_max_hours


def rk4_ensemble_backtrack(
    lat0: float,
    lon0: float,
    t_sar: float,
    current_func: Callable[[float, float, float], Tuple[float, float]],
    wind_func: Callable[[float, float, float], Tuple[float, float]],
    t_max_hours: float = 12.0,
    dt_seconds: int = 300,
    num_particles: int = 50,
    random_seed: int = 42,
) -> Dict[str, Any]:
    """Execute Monte Carlo stochastic ensemble reverse backtracking.

    Applies physically bounded perturbations to wind leeway, Coriolis angle,
    and velocity fields to estimate dispersion and origin probability density.
    """
    rng = np.random.default_rng(random_seed)
    particles: List[Dict[str, float]] = []

    # Nominal determinist backtrack
    nom_lat, nom_lon, _ = rk4_backtrack(
        lat0, lon0, t_sar, current_func, wind_func, t_max_hours, dt_seconds
    )

    if t_max_hours <= 0:
        return {
            "originCentroid": {"latitude": lat0, "longitude": lon0},
            "numParticles": num_particles,
            "confidenceEllipse": {
                "semiMajorAxisMeters": 50.0,
                "semiMinorAxisMeters": 50.0,
                "orientationDeg": 0.0,
                "confidenceLevel": 0.95,
            },
            "particles": [{"latitude": lat0, "longitude": lon0}],
            "dispersionRadiusMeters": 50.0,
        }

    # Stochastic ensemble runs
    lats = []
    lons = []

    for _ in range(num_particles):
        # Leeway factor perturbed: mean 0.035, std 0.005, clipped [0.02, 0.05]
        leeway = float(np.clip(rng.normal(0.035, 0.005), 0.02, 0.05))
        # Coriolis angle perturbed: mean 12.0 deg, std 2.5 deg
        coriolis = float(rng.normal(12.0, 2.5))
        # Wind velocity jitter: std 0.4 m/s
        wu_jit, wv_jit = rng.normal(0.0, 0.4, 2)
        # Current velocity jitter: std 0.03 m/s
        cu_jit, cv_jit = rng.normal(0.0, 0.03, 2)

        def perturbed_current(x: float, y: float, t: float) -> Tuple[float, float]:
            u, v = current_func(x, y, t)
            return (u + cu_jit, v + cv_jit)

        def perturbed_wind(x: float, y: float, t: float) -> Tuple[float, float]:
            u, v = wind_func(x, y, t)
            return (u + wu_jit, v + wv_jit)

        p_lat, p_lon, _ = rk4_backtrack(
            lat0,
            lon0,
            t_sar,
            perturbed_current,
            perturbed_wind,
            t_max_hours=t_max_hours,
            dt_seconds=dt_seconds,
            leeway_factor=leeway,
            coriolis_deflection_deg=coriolis,
        )
        lats.append(p_lat)
        lons.append(p_lon)
        particles.append({"latitude": round(p_lat, 5), "longitude": round(p_lon, 5)})

    mean_lat = float(np.mean(lats))
    mean_lon = float(np.mean(lons))

    # Convert coordinates to metric displacements relative to mean
    lat_rad = math.radians(mean_lat)
    dy = (np.array(lats) - mean_lat) * METERS_PER_DEGREE_LAT
    dx = (np.array(lons) - mean_lon) * (METERS_PER_DEGREE_LAT * math.cos(lat_rad))

    # 2D Covariance matrix
    coords = np.vstack([dx, dy])
    cov = np.cov(coords)

    # Eigenvalue decomposition for 95% confidence ellipse (chi2 = 5.991, sqrt = 2.4477)
    eigvals, eigvecs = np.linalg.eigh(cov)
    # Ensure positive eigenvalues
    eigvals = np.maximum(eigvals, 1e-4)

    # Order largest first
    order = np.argsort(eigvals)[::-1]
    eigvals = eigvals[order]
    eigvecs = eigvecs[:, order]

    scale_95 = 2.4477
    semi_major = float(scale_95 * np.sqrt(eigvals[0]))
    semi_minor = float(scale_95 * np.sqrt(eigvals[1]))

    # Orientation angle in degrees from East (mathematical angle)
    angle_rad = math.atan2(eigvecs[1, 0], eigvecs[0, 0])
    angle_deg = float(math.degrees(angle_rad) % 360)

    # Mean dispersion radius
    dist_from_mean = np.sqrt(dx**2 + dy**2)
    dispersion_radius = float(np.percentile(dist_from_mean, 95))

    return {
        "originCentroid": {
            "latitude": round(mean_lat, 5),
            "longitude": round(mean_lon, 5),
            "nominalLatitude": round(nom_lat, 5),
            "nominalLongitude": round(nom_lon, 5),
        },
        "numParticles": num_particles,
        "confidenceEllipse": {
            "semiMajorAxisMeters": round(max(semi_major, 100.0), 1),
            "semiMinorAxisMeters": round(max(semi_minor, 50.0), 1),
            "orientationDeg": round(angle_deg, 1),
            "confidenceLevel": 0.95,
        },
        "dispersionRadiusMeters": round(max(dispersion_radius, 150.0), 1),
        "particles": particles,
    }