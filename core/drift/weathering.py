"""
Hybrid Fay-Mackay Slick Age & Weathering Engine.

Combines:
1. Fay's Three-Regime Spreading Theory (1971):
   - Regime 1: Gravity-Inertia (minutes)
   - Regime 2: Gravity-Viscous (hours)
   - Regime 3: Surface Tension-Viscous (dominant for mature slicks > 2-3 hours)
   Inverts observed satellite slick area and major-axis elongation to compute
   the physical spreading time elapsed since discharge (T_spread).

2. Mackay's Evaporation & Emulsification Model (1980 / 1982):
   - Evaporative exposure factor theta = K_evap * t / h_0
   - Mass transfer coefficient K_evap = 0.0025 * U10^0.78
   - Water-in-oil emulsification uptake Y_w leading to mousse formation.

3. Reconciled Slick Age Estimate:
   Solves for estimated discharge age (hours) to drive dynamic reverse backtracking.
"""

from dataclasses import dataclass
from typing import Dict, Optional, Tuple
import numpy as np


# Physical constants for seawater and standard crude oil
RHO_SEAWATER = 1025.0       # Seawater density (kg/m³)
RHO_OIL_DEFAULT = 880.0     # Medium crude oil density (kg/m³)
NU_WATER = 1.05e-6          # Kinematic viscosity of seawater (m²/s)
MU_WATER = 1.08e-3          # Dynamic viscosity of seawater (Pa·s)
SIGMA_NET = 0.025           # Net spreading coefficient (N/m)


@dataclass
class WeatheringState:
    """State of oil weathering at a given age."""
    age_hours: float
    age_confidence_interval: Tuple[float, float]
    evaporated_fraction: float      # Fraction of initial mass lost to atmosphere (0 to 0.70)
    water_content_fraction: float   # Fraction of water emulsified in oil (0 to 0.85)
    viscosity_cp: float             # Emulsion dynamic viscosity in centipoise
    remaining_volume_ratio: float   # Ratio of current floating emulsion volume to original spilled volume
    details: Dict[str, float]


class FayMackayWeatheringEngine:
    """
    Physicochemical model for estimating slick age and tracking weathering evolution.
    """

    def __init__(
        self,
        oil_density: float = RHO_OIL_DEFAULT,
        initial_viscosity_cp: float = 25.0,
        fay_k3: float = 1.45  # Fay empirical constant for surface-tension viscous spreading
    ):
        self.oil_density = oil_density
        self.initial_viscosity_cp = initial_viscosity_cp
        self.fay_k3 = fay_k3

    def estimate_slick_age_from_geometry(
        self,
        area_m2: float,
        major_axis_m: float,
        minor_axis_m: float,
        wind_speed_ms: float = 6.0,
        sst_celsius: float = 28.0
    ) -> float:
        """
        Invert Fay's Surface Tension-Viscous Spreading regime to find slick age in hours:
        
        Radius r(t) = k3 * [ (sigma_net^2) / (rho_w * mu_w) ]^(1/6) * t^(3/4)
        Area A(t) = pi * r(t)^2 = pi * k3^2 * [ sigma_net^2 / (rho_w * mu_w) ]^(1/3) * t^(3/2)
        
        Solving for t:
        t_seconds = [ A(t) / (pi * k3^2 * C_spread) ]^(2/3)
        where C_spread = [ sigma_net^2 / (rho_w * mu_w) ]^(1/3)
        """
        if area_m2 <= 0:
            return 0.0

        # Equivalent circular spreading area corrected for wind-induced elongation
        elongation = max(1.0, major_axis_m / max(minor_axis_m, 1.0))
        # Wind elongates the slick along the wind axis without necessarily meaning greater age
        equivalent_isotropic_area = area_m2 / np.sqrt(elongation)

        c_spread = (SIGMA_NET ** 2 / (RHO_SEAWATER * MU_WATER)) ** (1.0 / 3.0)
        denom = np.pi * (self.fay_k3 ** 2) * c_spread
        
        t_seconds = (equivalent_isotropic_area / denom) ** (2.0 / 3.0)
        t_hours = t_seconds / 3600.0

        # Wind accelerate spreading: empirical correction factor
        # Higher wind accelerates shear dispersion
        wind_factor = 1.0 + 0.08 * max(0.0, wind_speed_ms - 3.0)
        reconciled_hours = t_hours / wind_factor

        # Physically realistic maritime bounds: 0.5 hours to 72 hours
        return float(np.clip(reconciled_hours, 0.5, 72.0))

    def compute_evaporation_fraction(
        self,
        age_hours: float,
        wind_speed_ms: float = 6.0,
        sst_celsius: float = 28.0,
        initial_thickness_mm: float = 0.20
    ) -> float:
        """
        Mackay's analytical evaporative exposure model.
        K_evap = 0.0025 * U10^0.78 (m/h)
        theta = K_evap * t / h_0
        F_evap = (T_k / B) * ln(1 + (B * theta / T_k) * exp(A' - B * T0 / T_k))
        Simplified empirical form for typical Arabian Sea light/medium crude:
        """
        sst_k = sst_celsius + 273.15
        t_hours = max(0.05, age_hours)
        
        # Mass transfer coefficient (m/hr)
        k_evap = 0.0025 * (max(1.0, wind_speed_ms) ** 0.78)
        h0_m = max(1e-4, initial_thickness_mm * 1e-3)
        theta = (k_evap * t_hours) / h0_m

        # Empirical evaporation fraction (logarithmic asymptotic curve)
        # Heavy crude tops out at 40-50% evaporative loss, light crude at 65-75%
        f_evap = 0.18 * np.log10(1.0 + 8.5 * theta) * (sst_k / 295.0)
        return float(np.clip(f_evap, 0.0, 0.65))

    def compute_emulsification(
        self,
        age_hours: float,
        wind_speed_ms: float = 6.0,
        max_water_content: float = 0.75
    ) -> float:
        """
        Mackay's water-in-oil emulsification rate:
        dY_w / dt = 2.0e-6 * (U10 + 1)^2 * (1 - Y_w / Y_max)
        Integrated analytically:
        Y_w(t) = Y_max * [ 1 - exp( - (2.0e-6 * (U10 + 1)^2 / Y_max) * t_seconds ) ]
        """
        t_sec = age_hours * 3600.0
        rate_k = (2.0e-6 * ((wind_speed_ms + 1.0) ** 2)) / max_water_content
        y_w = max_water_content * (1.0 - np.exp(-rate_k * t_sec))
        return float(np.clip(y_w, 0.0, max_water_content))

    def assess_slick_weathering(
        self,
        area_m2: float,
        major_axis_m: float,
        minor_axis_m: float,
        wind_speed_ms: float = 6.0,
        sst_celsius: float = 28.0,
        initial_volume_m3: Optional[float] = None
    ) -> WeatheringState:
        """
        Complete weathering analysis: solves for age, evaporative loss, water content,
        and current-to-original volume ratio.
        """
        age = self.estimate_slick_age_from_geometry(
            area_m2=area_m2,
            major_axis_m=major_axis_m,
            minor_axis_m=minor_axis_m,
            wind_speed_ms=wind_speed_ms,
            sst_celsius=sst_celsius
        )

        f_evap = self.compute_evaporation_fraction(age, wind_speed_ms, sst_celsius)
        y_water = self.compute_emulsification(age, wind_speed_ms)

        # Emulsion viscosity increase (Mooney equation)
        # mu = mu_0 * exp( 2.5 * Y_w / (1 - 0.65 * Y_w) )
        visc_cp = self.initial_viscosity_cp * np.exp((2.5 * y_water) / max(0.1, 1.0 - 0.65 * y_water))

        # Volume balance:
        # V_floating = V_orig * (1 - F_evap) / (1 - Y_water)
        vol_ratio = (1.0 - f_evap) / max(0.05, 1.0 - y_water)

        # Confidence interval: ±25% of estimated age
        age_ci = (round(age * 0.75, 1), round(age * 1.25, 1))

        return WeatheringState(
            age_hours=round(age, 1),
            age_confidence_interval=age_ci,
            evaporated_fraction=round(f_evap, 3),
            water_content_fraction=round(y_water, 3),
            viscosity_cp=round(float(visc_cp), 1),
            remaining_volume_ratio=round(float(vol_ratio), 2),
            details={
                "sst_celsius": sst_celsius,
                "wind_speed_ms": wind_speed_ms,
                "fay_isotropic_area_m2": area_m2,
            }
        )
