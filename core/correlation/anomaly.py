"""
AIS Dark Ship & Behavioral Anomaly Engine.

Detects evasion patterns used by polluting vessels:
1. AIS "Dark Ship" Transponder Gaps:
   - Intentional shut-off of Class-A AIS transponders during nighttime discharge operations.
   - Computes gap duration Delta_t_gap. Gaps > 45 minutes near the discharge origin are flagged.
2. Kinematic Loitering / Pumping Slowdown:
   - Significant speed drop (e.g. from 14 knots cruising down to 3-5 knots for bilge pumping).
3. Evasive Zigzag Course Jitter:
   - Erratic heading deviations while maintaining low forward speed.
"""

from dataclasses import dataclass
from typing import Dict, List, Optional
import numpy as np


@dataclass
class AnomalyProfile:
    """Behavioral anomaly profile for a vessel."""
    has_ais_gap: bool
    gap_duration_hours: float
    speed_drop_knots: float
    course_jitter_deg: float
    is_night_discharge: bool
    composite_anomaly_score: float  # In [0.0, 1.0]
    anomaly_flags: List[str]


class AISAnomalyDetector:
    """
    Detector for maritime behavioral anomalies and illicit discharge indicators.
    """

    def __init__(
        self,
        min_gap_alert_hours: float = 0.75,  # 45 minutes of silence
        suspicious_speed_drop_knots: float = 4.0
    ):
        self.min_gap_alert_hours = min_gap_alert_hours
        self.suspicious_speed_drop_knots = suspicious_speed_drop_knots

    def evaluate_vessel_behavior(
        self,
        sog_cruise: float,
        sog_during: float,
        is_night: bool,
        course_jitter_deg: float = 0.0,
        ais_ping_gap_hours: float = 0.0,
        is_inside_spatiotemporal_cone: bool = True
    ) -> AnomalyProfile:
        """
        Evaluate vessel behavioral anomalies.
        Note: AIS transponder silence is only penalized when the vessel is plausibly
        within the discharge spatiotemporal cone (preventing false accusations from offshore receiver range limits).
        """
        flags = []
        delta_speed = max(0.0, sog_cruise - sog_during)

        # 1. AIS Dark Ship detection: penalized ONLY if inside the spatiotemporal cone
        has_gap = (ais_ping_gap_hours >= self.min_gap_alert_hours) and is_inside_spatiotemporal_cone
        if has_gap:
            flags.append(f"AIS_TRANSPONDER_SILENCE ({ais_ping_gap_hours:.1f}h gap inside discharge window)")
        elif ais_ping_gap_hours >= self.min_gap_alert_hours and not is_inside_spatiotemporal_cone:
            flags.append(f"EXONERATED_AIS_GAP ({ais_ping_gap_hours:.1f}h gap outside discharge window/range)")


        # 2. Speed drop (pumping / slop tank flushing)
        if delta_speed >= self.suspicious_speed_drop_knots:
            flags.append(f"SIGNIFICANT_SPEED_DROP ({sog_cruise:.1f}kt -> {sog_during:.1f}kt)")

        # 3. Nighttime flag
        if is_night:
            flags.append("NIGHTTIME_DISCHARGE_WINDOW")

        # 4. Course jitter
        if course_jitter_deg > 25.0:
            flags.append(f"ERRATIC_HEADING_JITTER ({course_jitter_deg:.1f}°)")

        # Composite score calculation (sigmoid combination)
        # Base terms:
        # speed drop weight = 0.35, gap weight = 0.40, jitter weight = 0.15
        raw_anomaly = (
            0.35 * (delta_speed / 8.0) +
            0.40 * min(2.0, ais_ping_gap_hours / 2.0) +
            0.15 * min(1.0, course_jitter_deg / 45.0)
        )

        score = float(np.clip(1.0 / (1.0 + np.exp(-3.0 * (raw_anomaly - 0.4))), 0.05, 0.98))

        # Night penalty boost
        if is_night:
            score = float(min(1.0, score * 1.25))
        else:
            score = float(score * 0.70)

        return AnomalyProfile(
            has_ais_gap=has_gap,
            gap_duration_hours=round(ais_ping_gap_hours, 2),
            speed_drop_knots=round(delta_speed, 2),
            course_jitter_deg=round(course_jitter_deg, 2),
            is_night_discharge=is_night,
            composite_anomaly_score=round(score, 3),
            anomaly_flags=flags
        )
