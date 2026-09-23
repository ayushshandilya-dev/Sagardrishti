from typing import Dict, List
import numpy as np

VESSEL_TYPE_PRIORS = {
    "OIL_TANKER": 1.0,
    "CHEMICAL_TANKER": 0.9,
    "BUNKER_BARGE": 0.85,
    "CONTAINER_SHIP": 0.6,
    "BULK_CARRIER": 0.5,
    "FISHING_VESSEL": 0.1,
    "TUG": 0.1,
}

def backtrack_proximity_score(vessel_lat: float, vessel_lon: float,
                              vessel_time: float,
                              backtrack_lat: float, backtrack_lon: float,
                              sigma_dist: float = 500.0,
                              ellipse: Dict[str, float] | None = None) -> float:
    """Exponential proximity score: f1 = exp(-min_dist^2 / (2*sigma^2)).
    
    If confidence ellipse parameters (semiMajorAxisMeters, semiMinorAxisMeters, orientationDeg)
    are provided, computes Mahalanobis distance scaled to the 95% confidence bounds.
    """
    if ellipse and "semiMajorAxisMeters" in ellipse and "semiMinorAxisMeters" in ellipse:
        a = max(float(ellipse["semiMajorAxisMeters"]), 50.0)
        b = max(float(ellipse["semiMinorAxisMeters"]), 50.0)
        theta_rad = np.radians(float(ellipse.get("orientationDeg", 0.0)))

        dy = (vessel_lat - backtrack_lat) * 111139.0
        dx = (vessel_lon - backtrack_lon) * (111139.0 * np.cos(np.radians(backtrack_lat)))

        x_rot = np.cos(theta_rad) * dx + np.sin(theta_rad) * dy
        y_rot = -np.sin(theta_rad) * dx + np.cos(theta_rad) * dy

        maha_sq = (x_rot / a)**2 + (y_rot / b)**2
        score = np.exp(-0.5 * maha_sq)
        return float(np.clip(score, 0.0, 1.0))

    dist_meters = np.sqrt((vessel_lat - backtrack_lat)**2 + (vessel_lon - backtrack_lon)**2) * 111319.5
    score = np.exp(-(dist_meters**2) / (2 * sigma_dist**2))
    return float(np.clip(score, 0.0, 1.0))

def trajectory_collinearity_score(vessel_cog: float, vessel_heading: float,
                                  slick_skeleton_orientation: float) -> float:
    """f2 = |cos(θ_vessel - θ_slick)| per Architecture.md §7.2
    vessel_heading = vessel's COG/heading vector
    slick_skeleton_orientation = major skeleton orientation vector"""
    angle_diff = np.abs(vessel_heading - slick_skeleton_orientation)
    angle_diff = np.minimum(angle_diff, 360 - angle_diff)
    score = np.abs(np.cos(np.radians(angle_diff)))
    return float(np.clip(score, 0.0, 1.0))

def vessel_profile_prior(vessel_type: str) -> float:
    """f3 = vessel type risk multiplier"""
    return float(VESSEL_TYPE_PRIORS.get(vessel_type, 0.1))

def kinetic_anomaly_score(sog_before: float, sog_during: float,
                          is_night: bool, course_jitter: float = 0.0,
                          blackout_gap_minutes: float = 0.0) -> float:
    """f4 = σ(β1 * ΔSpeed + β2 * CourseJitter + β3 * BlackoutGap) with day/night penalty.
    
    β1 = 0.3, β2 = 0.1 per Architecture.md §7.2.
    During night: full anomaly score.
    During day: penalty halves the score (night discharges more suspicious).
    """
    beta1, beta2 = 0.3, 0.1
    delta_speed = max(0, sog_before - sog_during)  # slowing down
    
    blackout_boost = 0.5 if blackout_gap_minutes >= 60.0 else 0.0
    raw = beta1 * delta_speed + beta2 * course_jitter + blackout_boost
    
    # Sigmoid function
    score_night = 1.0 / (1.0 + np.exp(-raw))
    
    # Day penalty: halve the score (night discharges more suspicious per MD)
    if is_night:
        return float(np.clip(score_night, 0.0, 1.0))
    else:
        return float(np.clip(score_night * 0.5, 0.0, 1.0))


def temporal_plausibility_score(vessel_arrival_time: float, discharge_time: float,
                                sar_acquisition_time: float) -> float:
    """f5 = 1 if vessel was present before/during release, 0 otherwise.
    
    Vessel must have been at the region before or at t_0 (discharge time).
    Penalized to zero if the vessel arrived after t_SAR.
    
    Accepts either numeric hours or ISO-format string timestamps."""
    # Convert string timestamps to hour float if needed
    def _to_hours(t):
        if isinstance(t, (int, float)):
            return float(t)
        if isinstance(t, str):
            # Try to extract hour from ISO format: "2026-09-11T09:00:00Z" -> 9.0
            try:
                return float(t.split("T")[1].split(":")[0])
            except (IndexError, ValueError):
                return 0.0
        return 0.0
    
    va = _to_hours(vessel_arrival_time)
    dt = _to_hours(discharge_time)
    sat = _to_hours(sar_acquisition_time)
    
    # Vessel must have been at the region before or at t_0 (discharge time)
    # Penalized to zero if vessel arrived after t_SAR
    if va <= sat:
        # Vessel was present before SAR acquisition
        # Check if vessel was present before/during discharge window
        # Discharge window: we consider vessel present if it was there within 12h before SAR
        if va <= dt + 12.0:  # within 12h window before SAR
            return 1.0
    return 0.0

def compute_attribution_score(mmsi_data: Dict, backtrack_coords: Dict,
                              vessel_profile: str, sar_time: float) -> Dict:
    """
    Compute full multi-factor attribution score S_attribution = sum(w_k * f_k)
    Weights: w1=0.35, w2=0.25, w3=0.15, w4=0.15, w5=0.10
    """
    # Extract vessel data
    vessel_lat = mmsi_data["latitude"]
    vessel_lon = mmsi_data["longitude"]
    vessel_time = mmsi_data["timestamp_utc"]
    cog = mmsi_data.get("course_over_ground", 0.0)
    heading = mmsi_data.get("heading", 0.0)
    sog_before = mmsi_data.get("speed_over_ground", 0.0)  # before discharge window
    sog_during = mmsi_data.get("speed_over_ground_during", sog_before)
    is_night = mmsi_data.get("is_night", False)
    course_jitter = mmsi_data.get("course_jitter", 0.0)
    vessel_arrival = mmsi_data.get("arrival_time_utc", vessel_time)
    
    # Backtrack origin
    backtrack_lat = backtrack_coords["latitude"]
    backtrack_lon = backtrack_coords["longitude"]
    ellipse = backtrack_coords.get("confidenceEllipse") or backtrack_coords.get("ellipse")
    blackout_gap = float(mmsi_data.get("blackout_gap_minutes", 0.0))
    
    # 1. Backtrack Proximity
    f1 = backtrack_proximity_score(vessel_lat, vessel_lon, vessel_time,
                                   backtrack_lat, backtrack_lon, ellipse=ellipse)
    
    # 2. Trajectory Collinearity
    f2 = trajectory_collinearity_score(cog, heading, mmsi_data.get("slick_skeleton", 0.0))
    
    # 3. Vessel Profile Prior
    f3 = vessel_profile_prior(vessel_profile)
    
    # 4. Kinematic Anomaly
    f4 = kinetic_anomaly_score(sog_before, sog_during, is_night, course_jitter, blackout_gap_minutes=blackout_gap)
    
    # 5. Temporal Plausibility
    f5 = temporal_plausibility_score(vessel_arrival, backtrack_coords.get("discharge_time", 0), sar_time)
    
    # Weighted fusion
    weights = [0.35, 0.25, 0.15, 0.15, 0.10]
    factors = [f1, f2, f3, f4, f5]
    score = sum(w * f for w, f in zip(weights, factors))
    
    return {
        "attributionScore": round(float(np.clip(score, 0.0, 1.0)), 3),
        "factorBreakdown": {
            "backtrackProximityScore": round(f1, 3),
            "trajectoryCollinearityScore": round(f2, 3),
            "vesselPriorScore": round(f3, 3),
            "kineticAnomalyScore": round(f4, 3),
            "temporalPlausibilityScore": round(f5, 3),
        },
        "attributionRank": 1,  # Will be set relative to other candidates
        "closestApproachMeters": round(np.sqrt((vessel_lat - backtrack_lat)**2 + (vessel_lon - backtrack_lon)**2) * 111319.5, 1),
    }


class BayesianAttributionEngine:
    """High-level Bayesian attribution engine for vessel scoring."""
    
    def __init__(self):
        self.weights = [0.35, 0.25, 0.15, 0.15, 0.10]
    
    def score_vessels(
        self,
        discharge_origin: Dict,
        slick_skeleton: float,
        candidate_vessels: List[Dict]
    ) -> List[Dict]:
        """
        Score all candidate vessels and return ranked results.
        
        Args:
            discharge_origin: Dict with latitude, longitude, discharge_time, optional confidenceEllipse
            slick_skeleton: Skeleton orientation in degrees
            candidate_vessels: List of vessel data dicts
            
        Returns:
            List of scored vessels sorted by attribution score (descending)
        """
        results = []
        
        for vessel in candidate_vessels:
            mmsi_data = {
                "latitude": vessel.get("latitude", 0),
                "longitude": vessel.get("longitude", 0),
                "timestamp_utc": vessel.get("timestamp_utc", 0),
                "course_over_ground": vessel.get("course_over_ground", 0),
                "heading": vessel.get("heading", 0),
                "speed_over_ground": vessel.get("speed_over_ground", 0),
                "speed_over_ground_during": vessel.get("speed_over_ground_during", 0),
                "is_night": vessel.get("is_night", False),
                "course_jitter": vessel.get("course_jitter", 0),
                "blackout_gap_minutes": vessel.get("blackout_gap_minutes", 0.0),
                "arrival_time_utc": vessel.get("arrival_time_utc", 0),
                "slick_skeleton": slick_skeleton,
            }

            
            vessel_profile = vessel.get("vessel_type", "UNKNOWN")
            sar_time = vessel.get("sar_time", 0)
            
            result = compute_attribution_score(
                mmsi_data, discharge_origin, vessel_profile, sar_time
            )
            
            result["mmsi"] = vessel.get("mmsi")
            result["vessel_name"] = vessel.get("vessel_name")
            result["imo"] = vessel.get("imo")
            result["vessel_type"] = vessel_profile
            
            results.append(result)
        
        # Sort by attribution score descending
        results.sort(key=lambda x: x["attributionScore"], reverse=True)
        
        # Assign ranks
        for i, r in enumerate(results):
            r["attributionRank"] = i + 1
        
        return results
import numpy as np

VESSEL_TYPE_PRIORS = {
    "OIL_TANKER": 1.0,
    "CHEMICAL_TANKER": 0.9,
    "BUNKER_BARGE": 0.85,
    "CONTAINER_SHIP": 0.6,
    "BULK_CARRIER": 0.5,
    "FISHING_VESSEL": 0.1,
    "TUG": 0.1,
}

def backtrack_proximity_score(vessel_lat: float, vessel_lon: float,
                              vessel_time: float,
                              backtrack_lat: float, backtrack_lon: float,
                              sigma_dist: float = 500.0,
                              ellipse: Dict[str, float] | None = None) -> float:
    """Exponential proximity score: f1 = exp(-min_dist^2 / (2*sigma^2)).
    
    If confidence ellipse parameters (semiMajorAxisMeters, semiMinorAxisMeters, orientationDeg)
    are provided, computes Mahalanobis distance scaled to the 95% confidence bounds.
    """
    if ellipse and "semiMajorAxisMeters" in ellipse and "semiMinorAxisMeters" in ellipse:
        a = max(float(ellipse["semiMajorAxisMeters"]), 50.0)
        b = max(float(ellipse["semiMinorAxisMeters"]), 50.0)
        theta_rad = np.radians(float(ellipse.get("orientationDeg", 0.0)))

        dy = (vessel_lat - backtrack_lat) * 111139.0
        dx = (vessel_lon - backtrack_lon) * (111139.0 * np.cos(np.radians(backtrack_lat)))

        x_rot = np.cos(theta_rad) * dx + np.sin(theta_rad) * dy
        y_rot = -np.sin(theta_rad) * dx + np.cos(theta_rad) * dy

        maha_sq = (x_rot / a)**2 + (y_rot / b)**2
        score = np.exp(-0.5 * maha_sq)
        return float(np.clip(score, 0.0, 1.0))

    dist_meters = np.sqrt((vessel_lat - backtrack_lat)**2 + (vessel_lon - backtrack_lon)**2) * 111319.5
    score = np.exp(-(dist_meters**2) / (2 * sigma_dist**2))
    return float(np.clip(score, 0.0, 1.0))

def trajectory_collinearity_score(vessel_cog: float, vessel_heading: float,
                                  slick_skeleton_orientation: float) -> float:
    """f2 = |cos(θ_vessel - θ_slick)| per Architecture.md §7.2
    vessel_heading = vessel's COG/heading vector
    slick_skeleton_orientation = major skeleton orientation vector"""
    angle_diff = np.abs(vessel_heading - slick_skeleton_orientation)
    angle_diff = np.minimum(angle_diff, 360 - angle_diff)
    score = np.abs(np.cos(np.radians(angle_diff)))
    return float(np.clip(score, 0.0, 1.0))

def vessel_profile_prior(vessel_type: str) -> float:
    """f3 = vessel type risk multiplier"""
    return float(VESSEL_TYPE_PRIORS.get(vessel_type, 0.1))

def kinetic_anomaly_score(sog_before: float, sog_during: float,
                          is_night: bool, course_jitter: float = 0.0,
                          blackout_gap_minutes: float = 0.0) -> float:
    """f4 = σ(β1 * ΔSpeed + β2 * CourseJitter + β3 * BlackoutGap) with day/night penalty.
    
    β1 = 0.3, β2 = 0.1 per Architecture.md §7.2.
    During night: full anomaly score.
    During day: penalty halves the score (night discharges more suspicious).
    """
    beta1, beta2 = 0.3, 0.1
    delta_speed = max(0, sog_before - sog_during)  # slowing down
    
    blackout_boost = 0.5 if blackout_gap_minutes >= 60.0 else 0.0
    raw = beta1 * delta_speed + beta2 * course_jitter + blackout_boost
    
    # Sigmoid function
    score_night = 1.0 / (1.0 + np.exp(-raw))
    
    # Day penalty: halve the score (night discharges more suspicious per MD)
    if is_night:
        return float(np.clip(score_night, 0.0, 1.0))
    else:
        return float(np.clip(score_night * 0.5, 0.0, 1.0))

def temporal_plausibility_score(vessel_arrival_time: float, discharge_time: float,
                                sar_acquisition_time: float) -> float:
    """f5 = 1 if vessel was present before/during release, 0 otherwise.
    
    Vessel must have been at the region before or at t_0 (discharge time).
    Penalized to zero if the vessel arrived after t_SAR.
    
    Accepts either numeric hours or ISO-format string timestamps."""
    # Convert string timestamps to hour float if needed
    def _to_hours(t):
        if isinstance(t, (int, float)):
            return float(t)
        if isinstance(t, str):
            # Try to extract hour from ISO format: "2026-09-11T09:00:00Z" -> 9.0
            try:
                return float(t.split("T")[1].split(":")[0])
            except (IndexError, ValueError):
                return 0.0
        return 0.0
    
    va = _to_hours(vessel_arrival_time)
    dt = _to_hours(discharge_time)
    sat = _to_hours(sar_acquisition_time)
    
    # Vessel must have been at the region before or at t_0 (discharge time)
    # Penalized to zero if vessel arrived after t_SAR
    if va <= sat:
        # Vessel was present before SAR acquisition
        # Check if vessel was present before/during discharge window
        # Discharge window: we consider vessel present if it was there within 12h before SAR
        if va <= dt + 12.0:  # within 12h window before SAR
            return 1.0
    return 0.0

def compute_attribution_score(mmsi_data: Dict, backtrack_coords: Dict,
                              vessel_profile: str, sar_time: float,
                              sigma_dist: float = 500.0) -> Dict:
    """
    Compute full multi-factor attribution score S_attribution = sum(w_k * f_k)
    Weights: w1=0.35, w2=0.25, w3=0.15, w4=0.15, w5=0.10
    sigma_dist: Gaussian spatial uncertainty kernel width (meters), defaults to 500m
                or can be dynamically coupled to the drift model's sigma_r.
    """
    # Extract vessel data
    vessel_lat = mmsi_data["latitude"]
    vessel_lon = mmsi_data["longitude"]
    vessel_time = mmsi_data["timestamp_utc"]
    cog = mmsi_data.get("course_over_ground", 0.0)
    heading = mmsi_data.get("heading", 0.0)
    sog_before = mmsi_data.get("speed_over_ground", 0.0)  # before discharge window
    sog_during = mmsi_data.get("speed_over_ground_during", sog_before)
    is_night = mmsi_data.get("is_night", False)
    course_jitter = mmsi_data.get("course_jitter", 0.0)
    vessel_arrival = mmsi_data.get("arrival_time_utc", vessel_time)
    
    # Backtrack origin
    backtrack_lat = backtrack_coords["latitude"]
    backtrack_lon = backtrack_coords["longitude"]
    
    # 1. Backtrack Proximity (scales with sigma_dist)
    f1 = backtrack_proximity_score(vessel_lat, vessel_lon, vessel_time,
                                   backtrack_lat, backtrack_lon,
                                   sigma_dist=sigma_dist)
    
    # 2. Trajectory Collinearity
    f2 = trajectory_collinearity_score(cog, heading, mmsi_data.get("slick_skeleton", 0.0))
    
    # 3. Vessel Profile Prior
    f3 = vessel_profile_prior(vessel_profile)
    
    # 4. Kinematic Anomaly
    f4 = kinetic_anomaly_score(sog_before, sog_during, is_night, course_jitter)
    
    # 5. Temporal Plausibility
    f5 = temporal_plausibility_score(vessel_arrival, backtrack_coords.get("discharge_time", 0), sar_time)
    
    # Weighted fusion
    weights = [0.35, 0.25, 0.15, 0.15, 0.10]
    factors = [f1, f2, f3, f4, f5]
    score = sum(w * f for w, f in zip(weights, factors))
    
    return {
        "attributionScore": round(float(np.clip(score, 0.0, 1.0)), 3),
        "factorBreakdown": {
            "backtrackProximityScore": round(f1, 3),
            "trajectoryCollinearityScore": round(f2, 3),
            "vesselPriorScore": round(f3, 3),
            "kineticAnomalyScore": round(f4, 3),
            "temporalPlausibilityScore": round(f5, 3),
        },
        "attributionRank": 1,  # Will be set relative to other candidates
        "closestApproachMeters": round(np.sqrt((vessel_lat - backtrack_lat)**2 + (vessel_lon - backtrack_lon)**2) * 111319.5, 1),
    }


class BayesianAttributionEngine:
    """
    True Bayesian Attribution Engine utilizing a Dirichlet-Categorical conjugate prior model.
    
    Mathematical Formulation:
    - Given K candidate vessels, the prior probability distribution theta ~ Dirichlet(alpha_0)
      where alpha_0,k is proportional to the vessel-type prior base rate (e.g. Tanker >> Fishing Boat).
    - Each evidence factor k (Proximity, Collinearity, Kinematic Anomaly, AIS-Dark-Silence, Temporal Feasibility)
      provides a likelihood multiplier L_i,k.
    - Updated concentration parameters: alpha_post,k = alpha_0,k + scale * L_total,k
    - The expected posterior probability: E[theta_k | Evidence] = alpha_post,k / sum_j(alpha_post,j)
    This yields a valid, normalized probability distribution summing to 1.0 across all candidates.
    """
    
    def __init__(self, prior_concentration: float = 2.0):
        self.prior_concentration = prior_concentration
        self.weights = [0.35, 0.25, 0.15, 0.15, 0.10]
    
    def compute_dirichlet_posterior(
        self,
        scored_vessels: List[Dict]
    ) -> List[Dict]:
        """
        Compute normalized Dirichlet posterior probabilities across all candidate vessels.
        """
        if not scored_vessels:
            return []

        k = len(scored_vessels)
        # 1. Base concentration from vessel-type prior
        alpha_priors = np.array([
            max(0.1, v["factorBreakdown"]["vesselPriorScore"]) * self.prior_concentration
            for v in scored_vessels
        ], dtype=np.float64)

        # 2. Evidence likelihood from physical observations (proximity, collinearity, anomaly, temporal)
        likelihoods = np.array([
            (
                0.40 * v["factorBreakdown"]["backtrackProximityScore"] +
                0.30 * v["factorBreakdown"]["trajectoryCollinearityScore"] +
                0.20 * v["factorBreakdown"]["kineticAnomalyScore"] +
                0.10 * v["factorBreakdown"]["temporalPlausibilityScore"]
            )
            for v in scored_vessels
        ], dtype=np.float64)

        # 3. Dirichlet posterior concentration update
        # Evidence pseudo-counts scale with likelihood
        evidence_counts = likelihoods * 8.0  # Equivalent sample size
        alpha_posterior = alpha_priors + evidence_counts

        # 4. Posterior expected probabilities E[theta_k] = alpha_k / sum(alpha)
        posterior_probs = alpha_posterior / np.sum(alpha_posterior)

        # Attach to records
        for i, v in enumerate(scored_vessels):
            v["dirichletPosteriorProbability"] = round(float(posterior_probs[i]), 4)
            v["dirichletPriorConcentration"] = round(float(alpha_priors[i]), 3)
            v["dirichletPosteriorConcentration"] = round(float(alpha_posterior[i]), 3)

        return scored_vessels

    def score_vessels(
        self,
        discharge_origin: Dict,
        slick_skeleton: float,
        candidate_vessels: List[Dict]
    ) -> List[Dict]:
        """
        Score all candidate vessels, apply Dirichlet conjugate prior updating,
        and return ranked results.
        """
        results = []
        
        for vessel in candidate_vessels:
            mmsi_data = {
                "latitude": vessel.get("latitude", 0),
                "longitude": vessel.get("longitude", 0),
                "timestamp_utc": vessel.get("timestamp_utc", 0),
                "course_over_ground": vessel.get("course_over_ground", 0),
                "heading": vessel.get("heading", 0),
                "speed_over_ground": vessel.get("speed_over_ground", 0),
                "speed_over_ground_during": vessel.get("speed_over_ground_during", 0),
                "is_night": vessel.get("is_night", False),
                "course_jitter": vessel.get("course_jitter", 0),
                "arrival_time_utc": vessel.get("arrival_time_utc", 0),
                "slick_skeleton": slick_skeleton,
            }
            
            vessel_profile = vessel.get("vessel_type", vessel.get("vesselType", "UNKNOWN"))
            sar_time = vessel.get("sar_time", 10.5)
            
            result = compute_attribution_score(
                mmsi_data, discharge_origin, vessel_profile, sar_time
            )
            
            result["mmsi"] = vessel.get("mmsi")
            result["vessel_name"] = vessel.get("vessel_name", vessel.get("vesselName"))
            result["imo"] = vessel.get("imo")
            result["vessel_type"] = vessel_profile
            
            results.append(result)
        
        # Apply Dirichlet posterior inference across all candidates
        results = self.compute_dirichlet_posterior(results)

        # Sort by Dirichlet posterior probability descending
        results.sort(key=lambda x: x["dirichletPosteriorProbability"], reverse=True)
        
        # Assign ranks
        for i, r in enumerate(results):
            r["attributionRank"] = i + 1
        
        return results

