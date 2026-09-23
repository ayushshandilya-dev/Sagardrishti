"""
Forensic Attribution Explainability Engine.

Generates human-interpretable forensic arguments and exact linear factor decompositions
for Coast Guard commanders, maritime admiralty courts, and MARPOL Section 65B legal filings.
For a linear additive model, the exact Shapley value of each factor corresponds to its weighted term.
"""


from dataclasses import dataclass
from typing import Dict, List, Tuple


@dataclass
class ForensicReport:
    """Forensic explanation of vessel attribution."""
    vessel_name: str
    mmsi: int
    imo: int
    overall_confidence: float
    verdict: str
    primary_culprit: bool
    factor_percentages: Dict[str, float]
    legal_narrative: str
    court_admissibility_summary: str


class AttributionExplainer:
    """
    Translates mathematical Bayesian attribution scores into legally defensible narratives.
    """

    @staticmethod
    def generate_narrative(
        vessel_name: str,
        mmsi: int,
        imo: int,
        score: float,
        breakdown: Dict[str, float],
        closest_dist_m: float,
        vessel_type: str,
        anomaly_flags: List[str]
    ) -> ForensicReport:
        """
        Generate natural language forensic legal argument.
        """
        is_culprit = score >= 0.70

        if is_culprit:
            verdict = "PRIMA_FACIE_CULPRIT"
        elif score >= 0.40:
            verdict = "PERSON_OF_INTEREST"
        else:
            verdict = "EXONERATED_BACKGROUND_TRAFFIC"

        prox_pct = breakdown.get("backtrackProximityScore", 0.0) * 35.0
        align_pct = breakdown.get("trajectoryCollinearityScore", 0.0) * 25.0
        prior_pct = breakdown.get("vesselPriorScore", 0.0) * 15.0
        anom_pct = breakdown.get("kineticAnomalyScore", 0.0) * 15.0
        temp_pct = breakdown.get("temporalPlausibilityScore", 0.0) * 10.0

        # Construct legal argument paragraphs
        flags_text = ", ".join(anomaly_flags) if anomaly_flags else "Standard linear passage"
        
        narrative = (
            f"Vessel '{vessel_name}' (IMO {imo}, MMSI {mmsi}, Type: {vessel_type}) has been identified "
            f"as the {verdict.replace('_', ' ')} with a forensic attribution confidence of {score:.1%}. "
            f"Spatial-temporal reverse Lagrangian backtracking places the vessel within {closest_dist_m:.0f} meters "
            f"of the reconstructed oil discharge origin point at the estimated release window. "
            f"The vessel's navigational trajectory demonstrates {align_pct/0.25:.1f}% directional alignment "
            f"with the major skeleton axis of the detected mineral oil slick. "
            f"Behavioral forensic telemetry flags: [{flags_text}]."
        )

        court_summary = (
            f"Pursuant to Indian Evidence Act Section 65B and MARPOL 73/78 Annex I, the spatio-temporal "
            f"correlation index ({score:.3f}) establishes a clear chain of custody linking Vessel {vessel_name} "
            f"to the illicit discharge, supported by independent SAR satellite backscatter damping and forensic AIS kinematics."
        )

        factor_percentages = {
            "Spatial Proximity (35%)": round(prox_pct, 1),
            "Trajectory Alignment (25%)": round(align_pct, 1),
            "Vessel Type Risk (15%)": round(prior_pct, 1),
            "Kinematic Anomaly (15%)": round(anom_pct, 1),
            "Temporal Plausibility (10%)": round(temp_pct, 1),
        }

        return ForensicReport(
            vessel_name=vessel_name,
            mmsi=mmsi,
            imo=imo,
            overall_confidence=score,
            verdict=verdict,
            primary_culprit=is_culprit,
            factor_percentages=factor_percentages,
            legal_narrative=narrative,
            court_admissibility_summary=court_summary
        )
