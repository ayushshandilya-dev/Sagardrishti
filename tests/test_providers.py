"""Tests for Phase 3 (Telemetry Providers) & Phase 4 (Ensemble Drift & Attribution Hardening)."""

import asyncio
from datetime import datetime, timezone
import pytest

from api.routes.attribution import (
    EvaluateRequest,
    evaluate_attributions,
    get_candidate_attributions,
)
from api.routes.drift import DriftRequest, calculate_backtrack
from core.ais.parser import (
    AIVDMParser,
    LiveAISStreamProvider,
    SampleAISProvider,
    VesselPosition,
    VesselTrajectory,
)
from core.correlation.attribution import (
    backtrack_proximity_score,
    compute_attribution_score,
    kinetic_anomaly_score,
)
from core.drift.rk4 import rk4_ensemble_backtrack
from core.metocean.fetchers import (
    SampleMetOceanProvider,
    create_metocean_provider,
)
from core.sar.cdse_client import (
    CDSEClient,
    INDIAN_EEZ_CORRIDORS,
    SentinelProduct,
)


class TestCDSEClient:
    """Validate CDSE SAR catalog queries and fallback behavior."""

    def test_fallback_returns_valid_sentinel1_product(self):
        client = CDSEClient()
        bbox = INDIAN_EEZ_CORRIDORS["GULF_OF_KUTCH"]
        start_date = datetime(2026, 9, 10, 0, 0, tzinfo=timezone.utc)
        end_date = datetime(2026, 9, 12, 0, 0, tzinfo=timezone.utc)

        products = client.search_scenes(bbox=bbox, start_date=start_date, end_date=end_date)
        assert len(products) > 0
        prod = products[0]
        assert isinstance(prod, SentinelProduct)
        assert prod.product_type == "GRD"
        assert prod.sensor_mode == "IW"
        assert "VV" in prod.polarization
        assert prod.orbit_direction == "DESCENDING"
        assert len(prod.checksum_sha256) == 64

        d = prod.to_dict()
        assert d["productType"] == "GRD"
        assert "footprint" in d


class TestAISProvidersAndParsers:
    """Validate AIS parsing, AIVDM bit decoding, and provider behavior."""

    def test_aivdm_single_sentence_decoding(self):
        # Canonical type 1 position report:
        # !AIVDM,1,1,,B,13u?etPv2;0n:nvK>QAUAlnr0051,0*53
        sentence = "!AIVDM,1,1,,B,13u?etPv2;0n:nvK>QAUAlnr0051,0*53"
        pos = AIVDMParser.parse_sentence(sentence)
        assert pos is not None
        assert pos.mmsi > 0
        assert -90.0 <= pos.lat <= 90.0
        assert -180.0 <= pos.lon <= 180.0
        assert pos.sog >= 0.0

    def test_live_stream_provider_ingest(self):
        provider = LiveAISStreamProvider()
        sentence = "!AIVDM,1,1,,B,13u?etPv2;0n:nvK>QAUAlnr0051,0*53"
        pos = provider.ingest_line(sentence)
        assert pos is not None
        vessel = provider.get_vessel(pos.mmsi)
        assert vessel is not None
        assert len(vessel.positions) == 1

    def test_sample_ais_provider_returns_trajectories(self):
        provider = SampleAISProvider()
        now = datetime(2026, 9, 11, 10, 30)
        bbox = (21.0, 68.0, 23.0, 71.0)
        vessels = provider.get_vessels_in_area(now, bbox)
        assert len(vessels) > 0
        mmsis = [v.mmsi for v in vessels]
        assert 419001234 in mmsis

    def test_blackout_gap_detection(self):
        traj = VesselTrajectory(mmsi=123456789)
        t0 = datetime(2026, 9, 11, 2, 0)
        # Position 1
        traj.add_position(VesselPosition(
            mmsi=123456789, timestamp=t0, lat=21.8, lon=69.1,
            sog=14.0, cog=240.0, heading=240.0, nav_status=0, vessel_type=80
        ))
        # Position 2 after 45 minutes (intentional blackout gap >= 30m)
        t1 = datetime(2026, 9, 11, 2, 45)
        traj.add_position(VesselPosition(
            mmsi=123456789, timestamp=t1, lat=21.9, lon=69.2,
            sog=4.5, cog=240.0, heading=240.0, nav_status=0, vessel_type=80
        ))
        gaps = traj.detect_blackout_gaps(min_gap_seconds=1800)
        assert len(gaps) == 1
        assert gaps[0]["durationMinutes"] == 45.0
        assert gaps[0]["isNocturnal"] is True


class TestMetOceanProvider:
    """Validate sample and hybrid MetOcean provider resolution."""

    def test_sample_metocean_provider(self):
        provider = create_metocean_provider("sample")
        assert isinstance(provider, SampleMetOceanProvider)
        bbox = (21.0, 68.0, 23.0, 71.0)
        t = datetime.now()

        currents = provider.get_currents(t, bbox)
        winds = provider.get_winds(t, bbox)

        u_c, v_c = currents.interpolate(21.84, 69.11)
        assert abs(u_c - (-0.32)) < 0.05
        assert abs(v_c - (-0.18)) < 0.05

        u_w, v_w = winds.interpolate(21.84, 69.11)
        assert abs(u_w - (-4.5)) < 0.05
        assert abs(v_w - (-3.2)) < 0.05


class TestRK4EnsembleAndEllipses:
    """Validate Monte Carlo ensemble drift backtracking and uncertainty statistics."""

    def test_ensemble_backtrack_dispersion_and_ellipse(self):
        current_func = lambda lon, lat, t: (-0.32, -0.18)
        wind_func = lambda lon, lat, t: (-4.5, -3.2)

        res = rk4_ensemble_backtrack(
            lat0=21.8452,
            lon0=69.1124,
            t_sar=0.0,
            current_func=current_func,
            wind_func=wind_func,
            t_max_hours=4.0,
            dt_seconds=300,
            num_particles=40,
            random_seed=123,
        )

        assert res["numParticles"] == 40
        assert len(res["particles"]) == 40
        ellipse = res["confidenceEllipse"]
        assert ellipse["semiMajorAxisMeters"] >= ellipse["semiMinorAxisMeters"]
        assert ellipse["confidenceLevel"] == 0.95
        assert res["dispersionRadiusMeters"] > 0.0

        # Centroid should be within plausible range
        centroid = res["originCentroid"]
        assert 21.0 < centroid["latitude"] < 23.0
        assert 68.5 < centroid["longitude"] < 70.0


class TestAttributionConfidenceEllipse:
    """Validate Mahalanobis distance scoring under confidence ellipses."""

    def test_proximity_score_with_ellipse(self):
        ellipse = {
            "semiMajorAxisMeters": 1000.0,
            "semiMinorAxisMeters": 500.0,
            "orientationDeg": 45.0,
        }
        # Vessel at exact origin
        score_origin = backtrack_proximity_score(
            vessel_lat=21.85, vessel_lon=69.11,
            vessel_time=0.0, backtrack_lat=21.85, backtrack_lon=69.11,
            ellipse=ellipse,
        )
        assert score_origin == 1.0

        # Vessel 400m away should have positive score inside the ellipse
        score_near = backtrack_proximity_score(
            vessel_lat=21.853, vessel_lon=69.113,
            vessel_time=0.0, backtrack_lat=21.85, backtrack_lon=69.11,
            ellipse=ellipse,
        )
        assert score_near > 0.3

    def test_kinetic_anomaly_with_blackout_gap(self):
        # Tanker slowing down with a 72-min AIS blackout (above 1.0-hour threshold)
        score_with_blackout = kinetic_anomaly_score(
            sog_before=14.0, sog_during=4.5,
            is_night=True, course_jitter=2.0, blackout_gap_minutes=72.0,
        )
        score_without_blackout = kinetic_anomaly_score(
            sog_before=14.0, sog_during=4.5,
            is_night=True, course_jitter=2.0, blackout_gap_minutes=0.0,
        )
        assert score_with_blackout >= score_without_blackout


class TestAPIRoutesIntegration:
    """Validate FastAPI drift and attribution route outputs via direct async calls."""

    def test_drift_backtrack_returns_ensemble(self):
        req = DriftRequest(
            latitude=21.8452,
            longitude=69.1124,
            max_hours=3.0,
            ensemble_particles=20,
            data_source="sample",
        )
        data = asyncio.run(calculate_backtrack(req))
        assert data["status"] == "success"
        origin = data["reconstructedOrigin"]
        assert "confidenceEllipse" in origin
        assert origin["confidenceEllipse"]["semiMajorAxisMeters"] > 0
        assert "ensembleParticles" in origin
        assert len(origin["ensembleParticles"]) > 0

    def test_attribution_evaluate_post_route(self):
        req = EvaluateRequest(
            backtrack_lat=21.9142,
            backtrack_lon=69.2510,
            slick_orientation=248.5,
            confidence_ellipse={
                "semiMajorAxisMeters": 800.0,
                "semiMinorAxisMeters": 400.0,
                "orientationDeg": 60.0,
            }
        )
        data = asyncio.run(evaluate_attributions(req))
        assert data["status"] == "success"
        assert len(data["candidates"]) > 0
        top = data["candidates"][0]
        assert top["attributionRank"] == 1
        assert top["riskBadge"] == "PRIMARY"
        assert "closestApproachMeters" in top

    def test_attribution_candidates_get_route(self):
        data = asyncio.run(get_candidate_attributions(
            backtrack_lat=21.9142,
            backtrack_lon=69.2510,
            slick_orientation=248.5,
            semi_major_m=800.0,
            semi_minor_m=400.0,
            orientation_deg=60.0,
        ))
        assert data["status"] == "success"
        assert len(data["candidates"]) > 0
        assert data["candidates"][0]["mmsi"] == 419001234
