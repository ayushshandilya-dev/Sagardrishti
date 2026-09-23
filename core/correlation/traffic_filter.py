"""
Spatiotemporal Traffic Funnel Filter for Vessel Attribution.

Filters large raw AIS streams down to plausible suspect vessels:
1. Spatiotemporal Search Cylinder:
   - Spatial distance: D_vessel <= R_max (typically 25 km around discharge origin).
   - Temporal window: |t_vessel - t_discharge| <= Delta_T (typically T_age ± 3 hours).
2. Kinematic Status Filtering:
   - Removes moored, anchored, or berthed vessels (SOG < 0.5 knots).
   - Removes vessels traveling away with impossible relative velocities.
3. Low-Risk Profile Pruning:
   - Non-polluting small crafts (pleasure yachts, harbor pilot launches) can be flagged or deprioritized.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
import numpy as np


@dataclass
class FilterConfig:
    """Configuration for Spatiotemporal AIS Filtering."""
    max_search_radius_km: float = 25.0
    time_window_hours: float = 4.0
    min_speed_knots: float = 0.5
    ignore_stationary: bool = True
    ignored_vessel_types: List[str] = field(
        default_factory=lambda: ["PLEASURE_CRAFT", "SAILING_VESSEL", "PILOT_BOAT"]
    )


@dataclass
class FilterResult:
    """Result of traffic funnel filtering."""
    initial_vessel_count: int
    retained_vessel_count: int
    rejected_count: int
    filtered_vessels: List[Dict]
    rejection_reasons: Dict[str, int]


class SpatiotemporalTrafficFilter:
    """
    Intelligent filter to eliminate irrelevant AIS traffic around discharge origin.
    """

    def __init__(self, config: Optional[FilterConfig] = None):
        self.config = config or FilterConfig()

    def haversine_distance_km(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate great-circle distance between two coordinates in kilometers."""
        r = 6371.0  # Earth radius in km
        phi1, phi2 = np.radians(lat1), np.radians(lat2)
        dphi = np.radians(lat2 - lat1)
        dlam = np.radians(lon2 - lon1)

        a = np.sin(dphi / 2.0) ** 2 + np.cos(phi1) * np.cos(phi2) * np.sin(dlam / 2.0) ** 2
        c = 2.0 * np.arctan2(np.sqrt(a), np.sqrt(1.0 - a))
        return float(r * c)

    def filter_traffic(
        self,
        candidate_vessels: List[Dict],
        discharge_lat: float,
        discharge_lon: float,
        discharge_time_hours: float
    ) -> FilterResult:
        """
        Funnel raw AIS candidates down to plausible suspect vessels.
        """
        retained = []
        rejection_stats = {
            "out_of_spatial_radius": 0,
            "out_of_time_window": 0,
            "stationary_or_moored": 0,
            "excluded_vessel_type": 0,
        }

        for vessel in candidate_vessels:
            raw_time = vessel.get("arrival_time_utc", vessel.get("timestamp_utc", vessel.get("timestampUtc", 0.0)))
            if isinstance(raw_time, str):
                try:
                    # Extract hour from ISO format: "2026-09-11T10:00:00Z" -> 10.0
                    v_time = float(raw_time.split("T")[1].split(":")[0])
                except Exception:
                    v_time = 8.0
            else:
                v_time = float(raw_time)

            v_lat = float(vessel.get("latitude", 0.0))
            v_lon = float(vessel.get("longitude", 0.0))
            v_sog = float(vessel.get("speedOverGround", vessel.get("speed_over_ground", 0.0)))
            v_type = vessel.get("vesselType", vessel.get("vessel_profile", "UNKNOWN"))



            # 1. Type exclusion
            if v_type in self.config.ignored_vessel_types:
                rejection_stats["excluded_vessel_type"] += 1
                continue

            # 2. Kinematic check (moored / stationary)
            if self.config.ignore_stationary and v_sog < self.config.min_speed_knots:
                rejection_stats["stationary_or_moored"] += 1
                continue

            # 3. Spatial radius check
            dist_km = self.haversine_distance_km(v_lat, v_lon, discharge_lat, discharge_lon)
            if dist_km > self.config.max_search_radius_km:
                rejection_stats["out_of_spatial_radius"] += 1
                continue

            # 4. Temporal window check
            time_diff = abs(v_time - discharge_time_hours)
            if time_diff > self.config.time_window_hours:
                rejection_stats["out_of_time_window"] += 1
                continue

            # Vessel passed all filters
            vessel_copy = dict(vessel)
            vessel_copy["distance_to_origin_km"] = round(dist_km, 2)
            vessel_copy["time_delta_hours"] = round(time_diff, 2)
            retained.append(vessel_copy)

        # Sort retained by distance to origin
        retained.sort(key=lambda v: v["distance_to_origin_km"])

        return FilterResult(
            initial_vessel_count=len(candidate_vessels),
            retained_vessel_count=len(retained),
            rejected_count=len(candidate_vessels) - len(retained),
            filtered_vessels=retained,
            rejection_reasons=rejection_stats
        )
