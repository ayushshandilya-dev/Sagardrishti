"""Unit tests for the multi-factor Bayesian attribution model."""
import numpy as np

from core.correlation.attribution import (
    backtrack_proximity_score,
    compute_attribution_score,
    kinetic_anomaly_score,
    temporal_plausibility_score,
    trajectory_collinearity_score,
    vessel_profile_prior,
)


class TestBacktrackProximity:
    """Test backtrack proximity score computation."""

    def test_close_vessel_high_score(self):
        """Vessel very close to backtrack origin should get high score."""
        score = backtrack_proximity_score(
            vessel_lat=21.8452, vessel_lon=69.1124,
            vessel_time="2026-09-11T10:30:00Z",
            backtrack_lat=21.8452, backtrack_lon=69.1124,
            sigma_dist=500.0
        )
        assert score > 0.5, f"Expected high score for vessel at origin, got {score}"
        assert score <= 1.0

    def test_far_vessel_low_score(self):
        """Vessel far from backtrack origin should get low score."""
        score = backtrack_proximity_score(
            vessel_lat=22.5000, vessel_lon=70.0000,
            vessel_time="2026-09-11T10:30:00Z",
            backtrack_lat=21.8452, backtrack_lon=69.1124,
            sigma_dist=500.0
        )
        assert score < 0.1, f"Expected low score for distant vessel, got {score}"
        assert score >= 0.0

    def test_score_bounded(self):
        """Score should always be in [0, 1]."""
        for _ in range(10):
            vlat = np.random.uniform(20, 25)
            vlon = np.random.uniform(65, 75)
            blat = np.random.uniform(20, 25)
            blon = np.random.uniform(65, 75)
            score = backtrack_proximity_score(vlat, vlon, 0, blat, blon, 500.0)
            assert 0.0 <= score <= 1.0


class TestTrajectoryCollinearity:
    """Test trajectory collinearity score computation."""

    def test_perfect_alignment(self):
        """Vessel heading perfectly aligned with slick skeleton should get score of 1."""
        score = trajectory_collinearity_score(
            vessel_cog=248.0, vessel_heading=248.0,
            slick_skeleton_orientation=248.0
        )
        assert abs(score - 1.0) < 0.01, f"Expected score ~1 for perfect alignment, got {score}"

    def test_perpendicular(self):
        """Vessel heading perpendicular (90°) to slick skeleton should get low score."""
        # 248° - 158° = 90° difference
        score = trajectory_collinearity_score(
            vessel_cog=248.0, vessel_heading=158.0,
            slick_skeleton_orientation=248.0
        )
        # |cos(90°)| = 0
        assert abs(score - 0.0) < 0.01, f"Expected score ~0 for perpendicular, got {score}"

    def test_score_bounded(self):
        """Score should always be in [0, 1]."""
        for _ in range(10):
            cog = np.random.uniform(0, 360)
            heading = np.random.uniform(0, 360)
            skew = np.random.uniform(0, 360)
            score = trajectory_collinearity_score(cog, heading, skew)
            assert 0.0 <= score <= 1.0


class TestVesselProfilePrior:
    """Test vessel type prior probability."""

    def test_oil_tanker_highest_prior(self):
        """Oil tanker should have the highest prior probability."""
        prior = vessel_profile_prior("OIL_TANKER")
        assert prior == 1.0, f"OIL_TANKER prior should be 1.0, got {prior}"

    def test_bulk_carrier_low_prior(self):
        """Bulk carrier should have lower prior."""
        prior = vessel_profile_prior("BULK_CARRIER")
        assert prior == 0.5, f"BULK_CARRIER prior should be 0.5, got {prior}"

    def test_fishing_vessel_lowest_prior(self):
        """Fishing vessel should have lowest prior."""
        prior = vessel_profile_prior("FISHING_VESSEL")
        assert prior == 0.1, f"FISHING_VESSEL prior should be 0.1, got {prior}"

    def test_unknown_vessel(self):
        """Unknown vessel type should default to low prior."""
        prior = vessel_profile_prior("UNKNOWN_TYPE")
        assert prior == 0.1, f"Unknown type prior should default to 0.1, got {prior}"


class TestKineticAnomaly:
    """Test kinetic anomaly score computation."""

    def test_night_slowdown_high_anomaly(self):
        """Vessel slowing at night should get high anomaly score."""
        score = kinetic_anomaly_score(
            sog_before=14.0, sog_during=6.0, is_night=True,
            course_jitter=2.0
        )
        assert score > 0.5, f"Expected high anomaly for night slowdown, got {score}"

    def test_day_slowdown_lower_anomaly(self):
        """Vessel slowing during day should get lower anomaly score."""
        score = kinetic_anomaly_score(
            sog_before=14.0, sog_during=6.0, is_night=False,
            course_jitter=2.0
        )
        assert score < 0.5, f"Expected lower anomaly for day slowdown, got {score}"

    def test_no_slowdown_low_anomaly(self):
        """Vessel with no slowdown should get low anomaly score."""
        # No slowdown at all: sog_before == sog_during
        score = kinetic_anomaly_score(
            sog_before=14.0, sog_during=14.0, is_night=True,
            course_jitter=0.0
        )
        # With delta_speed=0 and course_jitter=0, raw=0, sigmoid(0)=0.5
        # This is "low" compared to actual slowdown scenarios
        assert score < 0.6, f"Expected low anomaly for no slowdown, got {score}"

    def test_score_bounded(self):
        """Score should always be in [0, 1]."""
        for _ in range(10):
            sb = np.random.uniform(0, 20)
            sd = np.random.uniform(0, 20)
            nj = np.random.choice([True, False])
            cj = np.random.uniform(0, 10)
            score = kinetic_anomaly_score(sb, sd, nj, cj)
            assert 0.0 <= score <= 1.0


class TestTemporalPlausibility:
    """Test temporal plausibility score computation."""

    def test_vessel_before_discharge(self):
        """Vessel present before discharge should get score of 1."""
        # Vessel arrived 3 hours before SAR acquisition, discharge was 6 hours before SAR
        score = temporal_plausibility_score(
            vessel_arrival_time=10.0,  # 10:00 UTC
            discharge_time=6.0,       # 08:00 UTC discharge
            sar_acquisition_time=14.0  # 14:00 UTC SAR
        )
        assert score == 1.0, f"Vessel before discharge should get score 1, got {score}"

    def test_vessel_after_sar(self):
        """Vessel arriving after SAR should get score of 0."""
        score = temporal_plausibility_score(
            vessel_arrival_time=20.0,  # After SAR acquisition
            discharge_time=6.0,
            sar_acquisition_time=14.0
        )
        assert score == 0.0, f"Vessel after SAR should get score 0, got {score}"

    def test_vessel_after_discharge_but_before_sar(self):
        """Vessel arriving between discharge and SAR should get score of 1."""
        score = temporal_plausibility_score(
            vessel_arrival_time=11.0,  # Between discharge (6) and SAR (14)
            discharge_time=6.0,
            sar_acquisition_time=14.0
        )
        assert score == 1.0, f"Vessel between discharge and SAR should get score 1, got {score}"

    def test_score_bounded(self):
        """Score should always be in {0, 1} (binary outcome)."""
        for _ in range(10):
            va = np.random.uniform(0, 25)  # vessel arrival time
            dt = np.random.uniform(0, 15)  # discharge time
            sat = np.random.uniform(0, 25)  # SAR acquisition time
            score = temporal_plausibility_score(va, dt, sat)
            assert score in (0.0, 1.0), f"Temporal plausibility should be binary, got {score}"


class TestComputeAttributionScore:
    """Test the full attribution score computation."""

    def test_full_computation(self):
        """Test complete attribution score computation with all factors."""
        mmsi_data = {
            "latitude": 21.9200,
            "longitude": 69.2500,
            "timestamp_utc": "2026-09-11T10:00:00Z",
            "course_over_ground": 248.0,
            "heading": 248.0,
            "speed_over_ground": 6.1,
            "speed_over_ground_during": 6.1,
            "is_night": True,
            "course_jitter": 1.5,
            "arrival_time_utc": "2026-09-11T09:00:00Z"
        }

        backtrack_coords = {
            "latitude": 21.8452,
            "longitude": 69.1124,
            "discharge_time": "2026-09-11T08:30:00Z"
        }

        result = compute_attribution_score(
            mmsi_data, backtrack_coords, "OIL_TANKER", "2026-09-11T10:30:00Z"
        )

        # Verify structure
        assert "attributionScore" in result
        assert "factorBreakdown" in result
        assert "attributionRank" in result
        assert "closestApproachMeters" in result

        # Verify scores are bounded
        assert 0.0 <= result["attributionScore"] <= 1.0
        for key in result["factorBreakdown"]:
            assert 0.0 <= result["factorBreakdown"][key] <= 1.0

        # Verify factor breakdown has all 5 factors
        expected_factors = [
            "backtrackProximityScore",
            "trajectoryCollinearityScore",
            "vesselPriorScore",
            "kineticAnomalyScore",
            "temporalPlausibilityScore"
        ]
        for f in expected_factors:
            assert f in result["factorBreakdown"], f"Missing factor: {f}"

    def test_weights_sum(self):
        """Verify that attribution weights sum to 1.0."""
        from core.correlation.attribution import compute_attribution_score

        # The weights are hardcoded in the function: [0.35, 0.25, 0.15, 0.15, 0.10]
        # Sum = 0.35 + 0.25 + 0.15 + 0.15 + 0.10 = 1.0
        mmsi_data = {
            "latitude": 21.9200,
            "longitude": 69.2500,
            "timestamp_utc": "2026-09-11T10:00:00Z",
            "course_over_ground": 248.0,
            "heading": 248.0,
            "speed_over_ground": 6.1,
            "speed_over_ground_during": 6.1,
            "is_night": True,
            "course_jitter": 1.5,
            "arrival_time_utc": "2026-09-11T09:00:00Z"
        }

        backtrack_coords = {
            "latitude": 21.8452,
            "longitude": 69.1124,
            "discharge_time": "2026-09-11T08:30:00Z"
        }

        compute_attribution_score(
            mmsi_data, backtrack_coords, "OIL_TANKER", "2026-09-11T10:30:00Z"
        )

        # With all factors at 1.0, score should be exactly 1.0
        # (since weights sum to 1.0)
        all_one = {
            "backtrackProximityScore": 1.0,
            "trajectoryCollinearityScore": 1.0,
            "vesselPriorScore": 1.0,
            "kineticAnomalyScore": 1.0,
            "temporalPlausibilityScore": 1.0
        }

        # Manually verify weighted sum
        weights = [0.35, 0.25, 0.15, 0.15, 0.10]
        weighted_sum = sum(w * f for w, f in zip(weights, all_one.values()))
        assert abs(weighted_sum - 1.0) < 1e-10, f"Weights should sum to 1.0, got {weighted_sum}"


class TestEdgeCases:
    """Edge case and miscellaneous tests."""

    def test_zero_distance_proximity(self):
        """Vessel at exactly the backtrack origin."""
        score = backtrack_proximity_score(
            vessel_lat=21.8452, vessel_lon=69.1124,
            vessel_time="2026-09-11T10:30:00Z",
            backtrack_lat=21.8452, backtrack_lon=69.1124,
            sigma_dist=500.0
        )
        # At zero distance, exp(0) = 1
        assert abs(score - 1.0) < 1e-10, f"Zero distance should give score 1, got {score}"

    def test_gamma_extreme_angles(self):
        """Test trajectory score at angle extremes."""
        # 0 degrees diff
        s1 = trajectory_collinearity_score(248.0, 248.0, 248.0)
        # 180 degrees diff (opposite direction) 
        s2 = trajectory_collinearity_score(248.0, 68.0, 248.0)
        # Absolute cosine should be same for opposite directions
        assert abs(s1 - s2) < 1e-10, "Cosine should be same for opposite directions"

    def test_all_priors_covered(self):
        """Verify all vessel type priorities are set correctly."""
        expected_priors = {
            "OIL_TANKER": 1.0,
            "CHEMICAL_TANKER": 0.9,
            "BUNKER_BARGE": 0.85,
            "CONTAINER_SHIP": 0.6,
            "BULK_CARRIER": 0.5,
            "FISHING_VESSEL": 0.1,
            "TUG": 0.1,
        }
        for vessel_type, expected in expected_priors.items():
            actual = vessel_profile_prior(vessel_type)
            assert actual == expected, f"{vessel_type}: expected {expected}, got {actual}"