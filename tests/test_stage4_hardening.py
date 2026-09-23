"""
Unit tests for Stage 4 Hardening:
- Spatiotemporal Traffic Funnel
- AIS Dark Ship Anomaly Detection
- Forensic Explainability Engine
"""

import pytest

from core.correlation.traffic_filter import SpatiotemporalTrafficFilter, FilterConfig
from core.correlation.anomaly import AISAnomalyDetector, AnomalyProfile
from core.correlation.explainability import AttributionExplainer, ForensicReport


def test_traffic_funnel_filtering():
    filter_engine = SpatiotemporalTrafficFilter(FilterConfig(max_search_radius_km=20.0, time_window_hours=3.0))

    discharge_lat = 21.85
    discharge_lon = 69.10
    discharge_time = 8.0

    candidates = [
        # 1. Close suspect: within 2 km, at 8.2h, cruising at 12 knots -> PASS
        {"mmsi": 111, "latitude": 21.86, "longitude": 69.11, "arrival_time_utc": 8.2, "speedOverGround": 12.0, "vesselType": "OIL_TANKER"},
        # 2. Far vessel: 50 km away -> REJECT (radius)
        {"mmsi": 222, "latitude": 22.30, "longitude": 69.10, "arrival_time_utc": 8.1, "speedOverGround": 14.0, "vesselType": "CARGO"},
        # 3. Out-of-window vessel: within 3 km, but passed 8 hours later -> REJECT (time)
        {"mmsi": 333, "latitude": 21.85, "longitude": 69.12, "arrival_time_utc": 16.0, "speedOverGround": 11.0, "vesselType": "TANKER"},
        # 4. Stationary anchored tug: SOG = 0.1 knots -> REJECT (stationary)
        {"mmsi": 444, "latitude": 21.85, "longitude": 69.10, "arrival_time_utc": 8.0, "speedOverGround": 0.1, "vesselType": "TUG"},
        # 5. Pleasure boat: excluded type -> REJECT
        {"mmsi": 555, "latitude": 21.85, "longitude": 69.10, "arrival_time_utc": 8.0, "speedOverGround": 8.0, "vesselType": "PLEASURE_CRAFT"},
    ]

    res = filter_engine.filter_traffic(candidates, discharge_lat, discharge_lon, discharge_time)

    assert res.initial_vessel_count == 5
    assert res.retained_vessel_count == 1
    assert res.rejected_count == 4
    assert res.filtered_vessels[0]["mmsi"] == 111


def test_ais_dark_ship_and_anomaly_detection():
    detector = AISAnomalyDetector()

    # Normal innocent transit: cruise 12kt, no speed drop, no AIS gap, daytime
    normal = detector.evaluate_vessel_behavior(
        sog_cruise=12.0, sog_during=11.8, is_night=False, course_jitter_deg=2.0, ais_ping_gap_hours=0.0
    )
    assert normal.has_ais_gap is False
    assert normal.composite_anomaly_score < 0.40

    # Polluting culprit: cruise 14kt -> drops to 4kt, 2.0h AIS transponder gap, nighttime
    culprit = detector.evaluate_vessel_behavior(
        sog_cruise=14.0, sog_during=4.0, is_night=True, course_jitter_deg=28.0, ais_ping_gap_hours=2.0
    )
    assert culprit.has_ais_gap is True
    assert culprit.speed_drop_knots == 10.0
    assert culprit.composite_anomaly_score > 0.80
    assert any("AIS_TRANSPONDER_SILENCE" in f for f in culprit.anomaly_flags)
    assert any("SIGNIFICANT_SPEED_DROP" in f for f in culprit.anomaly_flags)



def test_forensic_explainability_narrative():
    report = AttributionExplainer.generate_narrative(
        vessel_name="MT Arabian Trader",
        mmsi=419001234,
        imo=9234567,
        score=0.885,
        breakdown={
            "backtrackProximityScore": 0.95,
            "trajectoryCollinearityScore": 0.90,
            "vesselPriorScore": 1.0,
            "kineticAnomalyScore": 0.85,
            "temporalPlausibilityScore": 1.0,
        },
        closest_dist_m=280.0,
        vessel_type="OIL_TANKER",
        anomaly_flags=["AIS_TRANSPONDER_SILENCE (1.8h gap)", "SIGNIFICANT_SPEED_DROP"]
    )

    assert isinstance(report, ForensicReport)
    assert report.primary_culprit is True
    assert report.verdict == "PRIMA_FACIE_CULPRIT"
    assert "MT Arabian Trader" in report.legal_narrative
    assert "280 meters" in report.legal_narrative
    assert "Section 65B" in report.court_admissibility_summary
    assert report.factor_percentages["Spatial Proximity (35%)"] > 30.0
