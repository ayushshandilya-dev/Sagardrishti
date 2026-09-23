<<<<<<< HEAD
"""4th-Order Runge-Kutta (RK4) Reverse Lagrangian Drift Advection Engine.

Models oil slick trajectory backtracking under hydrodynamic ocean currents (INCOIS)
and surface wind leeway (ECMWF/ERA5). Includes Monte Carlo stochastic ensemble
simulation for origin probability density and 95% confidence ellipses.
"""

from __future__ import annotations

import math
from typing import Any, Callable, Dict, List, Tuple
=======
"""
4th-Order Runge-Kutta (RK4) Two-Way Hydrodynamic Advection Engine.

Capabilities:
1. Dynamic Coriolis deflection angle as a function of latitude:
   theta_c(phi) = 15° * sin(phi) (Northern Hemisphere rightward, Southern Hemisphere leftward).
2. Wave Stokes Drift:
   Adds 1.2% of wind velocity aligned with dominant surface wind-waves.
3. Two-Way Integration:
   - rk4_backtrack(): Reverse-time advection to locate discharge origin (x0, y0, t0).
   - rk4_forward_forecast(): Forward-time forecasting (+12h, +24h, +48h, +72h)
     with turbulent diffusion uncertainty envelopes and coastal collision detection.
"""

from dataclasses import dataclass, field
from typing import Callable, Dict, List, Optional, Tuple
>>>>>>> 9b2760a50f3580bb19095db474a776860413101b
import numpy as np

METERS_PER_DEGREE_LAT = 111139.0
DEFAULT_DIFFUSION_COEFF_M2_S = 10.0  # Horizontal oceanic eddy diffusion Kh (m²/s)


<<<<<<< HEAD
=======
@dataclass
class TrajectoryPoint:
    """Waypoint along a drift trajectory."""
    time_offset_hours: float
    latitude: float
    longitude: float
    uncertainty_radius_meters: float
    drift_speed_knots: float


@dataclass
class ForecastResult:
    """Results of future flow trajectory forecast."""
    trajectory: List[TrajectoryPoint]
    coastal_impact_predicted: bool
    earliest_impact_hours: Optional[float]
    impact_coordinate: Optional[Tuple[float, float]]
    total_distance_km: float


def compute_coriolis_deflection_angle(latitude_deg: float) -> float:
    """
    Compute latitude-dependent wind deflection angle in radians.

    Citations & Physics Basis:
    - Allen & Plourde (1999), 'Review of Leeway: Field Experiments and
      Implementation', USCG R&D Center Technical Report CG-D-08-99:
      Establishes empirical leeway windage (3.0-3.5%) and divergence/deflection
      angles across maritime objects and surface slicks.
    - Samuels, Huang & Amstutz (1982), 'An oilspill trajectory analysis model
      with a variable wind deflection angle', Ocean Engineering:
      Pioneered the principle that deflection angle should not be locked to a
      fixed constant. While Samuels et al. parameterized variation with wind speed,
      our model adapts this core variable-deflection philosophy to vary with latitude
      governed by the Coriolis acceleration parameter f = 2*Omega*sin(phi).
    - Observational Note: Classical infinite-depth laminar Ekman theory predicts
      a constant 45° surface deflection. Real-world ocean observations (e.g. post-Torrey
      Canyon drift analyses; Allen & Plourde 1999) observe much smaller surface
      deflection (10° to 20° to the right of the wind in the Northern Hemisphere).
    - Formulation Note: This is an engineered/calibrated parameterization
      theta(phi) = 16° * sin(phi). The amplitude coefficient of 16° was chosen
      such that at mid-latitudes where reference leeway studies were conducted
      (~45°-50°N, sin(phi) ~ 0.71-0.77), the deflection evaluates to ~11.3°-12.3°,
      aligning with the lower-to-middle baseline of observed mid-latitude drift.
      Operational Nuance: In India's tropical EEZ (6°N to 23°N), sin(phi) is
      small (~0.10 to ~0.39), producing an operational deflection of ~1.7° to 6.3°.
      This smaller deflection correctly captures the tropical hydrodynamics of
      near-equatorial waters rather than forcing mid-latitude deflection onto them.
    """
    phi_rad = np.radians(latitude_deg)
    # Calibrated parameterization scaling toward ~16° at high latitudes, ~2°-6° in Indian EEZ, 0° at equator
    deflection_deg = 16.0 * np.sin(phi_rad)
    return float(np.radians(deflection_deg))


>>>>>>> 9b2760a50f3580bb19095db474a776860413101b
def compute_drift_vector(
    lat: float,
    lon: float,
    t_utc: float,
    current_u: float,
    current_v: float,
    wind_u: float,
    wind_v: float,
<<<<<<< HEAD
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

=======
    include_stokes_drift: bool = True
) -> np.ndarray:
    """
    Compute total surface drift velocity vector in meters per second (m/s):
    v_total = v_current + v_leeway(Coriolis) + v_stokes
    """
    leeway_factor = 0.025  # 2.5% direct wind leeway
    coriolis_rad = compute_coriolis_deflection_angle(lat)
    cos_def = np.cos(coriolis_rad)
    sin_def = np.sin(coriolis_rad)

    # Wind leeway with dynamic latitude Coriolis deflection
    wind_leeway_u = leeway_factor * (cos_def * wind_u - sin_def * wind_v)
    wind_leeway_v = leeway_factor * (sin_def * wind_u + cos_def * wind_v)

    # Wave-induced Stokes drift (1.0% in wind direction, matching standard 3.5% total leeway)
    stokes_u = 0.010 * wind_u if include_stokes_drift else 0.0
    stokes_v = 0.010 * wind_v if include_stokes_drift else 0.0

    total_u = current_u + wind_leeway_u + stokes_u
    total_v = current_v + wind_leeway_v + stokes_v

    return np.array([total_u, total_v], dtype=np.float64)


>>>>>>> 9b2760a50f3580bb19095db474a776860413101b

def _get_velocity_in_degrees(
    lat: float,
    lon: float,
    t_utc: float,
<<<<<<< HEAD
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

=======
    current_func: Callable,
    wind_func: Callable
) -> np.ndarray:
    """Convert drift velocity (m/s) to rate of change in degrees per second (dlat/dt, dlon/dt)."""
    cu, cv = current_func(lon, lat, t_utc)
    wu, wv = wind_func(lon, lat, t_utc)

    v_ms = compute_drift_vector(lat, lon, t_utc, cu, cv, wu, wv)
>>>>>>> 9b2760a50f3580bb19095db474a776860413101b
    meters_per_deg_lon = METERS_PER_DEGREE_LAT * max(np.cos(np.radians(lat)), 0.01)

    dlat_dt = v_ms[1] / METERS_PER_DEGREE_LAT
    dlon_dt = v_ms[0] / meters_per_deg_lon
<<<<<<< HEAD

    return np.array([dlat_dt, dlon_dt])

=======

    return np.array([dlat_dt, dlon_dt], dtype=np.float64)

>>>>>>> 9b2760a50f3580bb19095db474a776860413101b

def rk4_backtrack(
    lat0: float,
    lon0: float,
    t_sar: float,
<<<<<<< HEAD
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
=======
    current_func: Callable,
    wind_func: Callable,
    t_max_hours: float = 12.0,
    dt_seconds: int = 300
) -> Tuple[float, float, float]:
    """
    4th-Order Runge-Kutta reverse advection backtracking.
    Integrates backward in time from t_SAR to (t_SAR - T_max) to reconstruct discharge origin.
    Returns (estimated_lat, estimated_lon, hours_backtracked).
>>>>>>> 9b2760a50f3580bb19095db474a776860413101b
    """
    if t_max_hours <= 0:
        return float(lat0), float(lon0), 0.0

    dt = float(dt_seconds)
    lat = float(lat0)
    lon = float(lon0)

    total_seconds = t_max_hours * 3600.0
    steps = int(total_seconds / dt)
<<<<<<< HEAD
    if steps <= 0:
        steps = 1
        dt = total_seconds
=======
>>>>>>> 9b2760a50f3580bb19095db474a776860413101b

    for step in range(steps):
        t_curr = t_sar - step * dt

<<<<<<< HEAD
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
=======
        k1 = _get_velocity_in_degrees(lat, lon, t_curr, current_func, wind_func)
        lat_half1 = lat - 0.5 * dt * k1[0]
        lon_half1 = lon - 0.5 * dt * k1[1]

        k2 = _get_velocity_in_degrees(lat_half1, lon_half1, t_curr - 0.5 * dt, current_func, wind_func)
        lat_half2 = lat - 0.5 * dt * k2[0]
        lon_half2 = lon - 0.5 * dt * k2[1]

        k3 = _get_velocity_in_degrees(lat_half2, lon_half2, t_curr - 0.5 * dt, current_func, wind_func)
        lat_end = lat - dt * k3[0]
        lon_end = lon - dt * k3[1]

        k4 = _get_velocity_in_degrees(lat_end, lon_end, t_curr - dt, current_func, wind_func)
>>>>>>> 9b2760a50f3580bb19095db474a776860413101b

        # Update backward step: X_{n+1} = X_n - dt/6 * (k1 + 2*k2 + 2*k3 + k4)
        lat -= (dt / 6.0) * (k1[0] + 2.0 * k2[0] + 2.0 * k3[0] + k4[0])
        lon -= (dt / 6.0) * (k1[1] + 2.0 * k2[1] + 2.0 * k3[1] + k4[1])

<<<<<<< HEAD
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
=======
    return round(lat, 5), round(lon, 5), round(t_max_hours, 1)


def rk4_forward_forecast(
    lat0: float,
    lon0: float,
    t_start: float,
    current_func: Callable,
    wind_func: Callable,
    forecast_hours: float = 48.0,
    dt_seconds: int = 600,
    coastal_mask_func: Optional[Callable[[float, float], bool]] = None,
    diffusion_kh: float = DEFAULT_DIFFUSION_COEFF_M2_S
) -> ForecastResult:
    """
    4th-Order Runge-Kutta forward advection forecasting.
    Predicts future trajectory of the oil slick forward in time (+12h, +24h, +48h, etc.).
    
    Computes expanding turbulent diffusion uncertainty radius:
    r_uncertainty(t) = sqrt(4 * Kh * t)
    
    Args:
        coastal_mask_func: Optional callback (lon, lat) -> True if coordinate is on land/shore
    """
    dt = float(dt_seconds)
    lat = float(lat0)
    lon = float(lon0)

    total_seconds = forecast_hours * 3600.0
    steps = int(total_seconds / dt)

    waypoints: List[TrajectoryPoint] = []
    coastal_hit = False
    earliest_hit_hour: Optional[float] = None
    hit_coord: Optional[Tuple[float, float]] = None
    total_dist_meters = 0.0

    # Initial waypoint at t=0
    waypoints.append(
        TrajectoryPoint(
            time_offset_hours=0.0,
            latitude=round(lat, 5),
            longitude=round(lon, 5),
            uncertainty_radius_meters=100.0,
            drift_speed_knots=0.0
        )
    )

    prev_lat, prev_lon = lat, lon

    for step in range(1, steps + 1):
        elapsed_sec = step * dt
        t_curr = t_start + elapsed_sec

        # Standard forward RK4
        k1 = _get_velocity_in_degrees(lat, lon, t_curr, current_func, wind_func)
        lat_half1 = lat + 0.5 * dt * k1[0]
        lon_half1 = lon + 0.5 * dt * k1[1]

        k2 = _get_velocity_in_degrees(lat_half1, lon_half1, t_curr + 0.5 * dt, current_func, wind_func)
        lat_half2 = lat + 0.5 * dt * k2[0]
        lon_half2 = lon + 0.5 * dt * k2[1]

        k3 = _get_velocity_in_degrees(lat_half2, lon_half2, t_curr + 0.5 * dt, current_func, wind_func)
        lat_end = lat + dt * k3[0]
        lon_end = lon + dt * k3[1]

        k4 = _get_velocity_in_degrees(lat_end, lon_end, t_curr + dt, current_func, wind_func)

        # Forward update: X_{n+1} = X_n + dt/6 * (k1 + 2*k2 + 2*k3 + k4)
        lat += (dt / 6.0) * (k1[0] + 2.0 * k2[0] + 2.0 * k3[0] + k4[0])
        lon += (dt / 6.0) * (k1[1] + 2.0 * k2[1] + 2.0 * k3[1] + k4[1])

        # Step distance in meters
        dlat_m = (lat - prev_lat) * METERS_PER_DEGREE_LAT
        dlon_m = (lon - prev_lon) * (METERS_PER_DEGREE_LAT * np.cos(np.radians(lat)))
        step_dist = np.sqrt(dlat_m ** 2 + dlon_m ** 2)
        total_dist_meters += step_dist
        step_speed_knots = (step_dist / dt) * 1.94384

        prev_lat, prev_lon = lat, lon

        # Check coastal intersection
        if coastal_mask_func and not coastal_hit:
            if coastal_mask_func(lon, lat):
                coastal_hit = True
                earliest_hit_hour = round(elapsed_sec / 3600.0, 1)
                hit_coord = (round(lat, 5), round(lon, 5))

        # Record waypoint every 1 hour (or 3600s)
        if elapsed_sec % 3600 == 0:
            unc_radius = np.sqrt(4.0 * diffusion_kh * elapsed_sec)
            waypoints.append(
                TrajectoryPoint(
                    time_offset_hours=round(elapsed_sec / 3600.0, 1),
                    latitude=round(lat, 5),
                    longitude=round(lon, 5),
                    uncertainty_radius_meters=round(float(unc_radius), 1),
                    drift_speed_knots=round(float(step_speed_knots), 2)
                )
            )

    return ForecastResult(
        trajectory=waypoints,
        coastal_impact_predicted=coastal_hit,
        earliest_impact_hours=earliest_hit_hour,
        impact_coordinate=hit_coord,
        total_distance_km=round(total_dist_meters / 1000.0, 2)
    )
>>>>>>> 9b2760a50f3580bb19095db474a776860413101b
