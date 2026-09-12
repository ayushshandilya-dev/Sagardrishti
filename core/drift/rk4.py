from typing import Tuple, Callable
import numpy as np

METERS_PER_DEGREE_LAT = 111139.0

def compute_drift_vector(lat: float, lon: float, t_utc: float,
                         current_u: float, current_v: float,
                         wind_u: float, wind_v: float) -> np.ndarray:
    """
    Compute total surface drift velocity vector in meters per second (m/s):
    current + wind leeway (3.5% of 10m wind with 12° Coriolis rightward deflection).
    """
    leeway_factor = 0.035
    coriolis_deflection = np.radians(12.0)
    cos_def = np.cos(coriolis_deflection)
    sin_def = np.sin(coriolis_deflection)
    
    # Wind leeway: 3.5% of wind speed, deflected right by Coriolis in Northern Hemisphere
    wind_leeway_u = leeway_factor * (cos_def * wind_u - sin_def * wind_v)
    wind_leeway_v = leeway_factor * (sin_def * wind_u + cos_def * wind_v)
    
    total_u = current_u + wind_leeway_u  # East-West velocity (m/s)
    total_v = current_v + wind_leeway_v  # North-South velocity (m/s)
    
    return np.array([total_u, total_v])

def _get_velocity_in_degrees(lat: float, lon: float, t_utc: float,
                             current_func: Callable, wind_func: Callable) -> np.ndarray:
    """Convert drift velocity (m/s) to rate of change in geographic degrees per second (dlat/dt, dlon/dt)."""
    cu, cv = current_func(lon, lat, t_utc)
    wu, wv = wind_func(lon, lat, t_utc)
    
    v_ms = compute_drift_vector(lat, lon, t_utc, cu, cv, wu, wv)
    
    meters_per_deg_lon = METERS_PER_DEGREE_LAT * max(np.cos(np.radians(lat)), 0.01)
    
    dlat_dt = v_ms[1] / METERS_PER_DEGREE_LAT
    dlon_dt = v_ms[0] / meters_per_deg_lon
    
    return np.array([dlat_dt, dlon_dt])

def rk4_backtrack(lat0: float, lon0: float, t_sar: float,
                   current_func: Callable, wind_func: Callable,
                   t_max_hours: float = 12.0,
                   dt_seconds: int = 300) -> Tuple[float, float, float]:
    """
    4th-Order Runge-Kutta reverse advection backtracking.
    
    Integrates backward in time from t_SAR to (t_SAR - T_max) to reconstruct the discharge origin.
    Returns (estimated_lat, estimated_lon, hours_backtracked)
    """
    dt = float(dt_seconds)
    lat = float(lat0)
    lon = float(lon0)
    
    total_seconds = t_max_hours * 3600.0
    steps = int(total_seconds / dt)
    
    for step in range(steps):
        t_curr = t_sar - step * dt
        
        # k1 = f(X_n, t_n)
        k1 = _get_velocity_in_degrees(lat, lon, t_curr, current_func, wind_func)
        
        # k2 = f(X_n - 0.5*dt*k1, t_n - 0.5*dt)
        lat_half1 = lat - 0.5 * dt * k1[0]
        lon_half1 = lon - 0.5 * dt * k1[1]
        k2 = _get_velocity_in_degrees(lat_half1, lon_half1, t_curr - 0.5 * dt, current_func, wind_func)
        
        # k3 = f(X_n - 0.5*dt*k2, t_n - 0.5*dt)
        lat_half2 = lat - 0.5 * dt * k2[0]
        lon_half2 = lon - 0.5 * dt * k2[1]
        k3 = _get_velocity_in_degrees(lat_half2, lon_half2, t_curr - 0.5 * dt, current_func, wind_func)
        
        # k4 = f(X_n - dt*k3, t_n - dt)
        lat_end = lat - dt * k3[0]
        lon_end = lon - dt * k3[1]
        k4 = _get_velocity_in_degrees(lat_end, lon_end, t_curr - dt, current_func, wind_func)
        
        # Update backward step: X_{n+1} = X_n - dt/6 * (k1 + 2*k2 + 2*k3 + k4)
        lat -= (dt / 6.0) * (k1[0] + 2.0 * k2[0] + 2.0 * k3[0] + k4[0])
        lon -= (dt / 6.0) * (k1[1] + 2.0 * k2[1] + 2.0 * k3[1] + k4[1])
    
    return lat, lon, t_max_hours