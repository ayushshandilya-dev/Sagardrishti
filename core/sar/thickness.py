"""
Oil Spill Thickness & Volume Quantification Engine.

Combines:
1. International Bonn Agreement Oil Appearance Codes (BAOAC):
   - Code 1: Sheen / Silver (<0.3 µm, nominal 0.1 µm)
   - Code 2: Rainbow (0.3 - 5.0 µm, nominal 2.0 µm)
   - Code 3: Metallic (5.0 - 50.0 µm, nominal 25.0 µm)
   - Code 4: Discontinuous True Oil (50.0 - 200.0 µm, nominal 100.0 µm)
   - Code 5: Continuous True Oil / Emulsion (>200.0 µm, nominal 400.0 µm)
2. Hollinger's Microwave & Damping Depth Model:
   Deep SAR backscatter damping (> 6-10 dB) correlates with thick oil damping (> 50-100 µm),
   while moderate damping (2-5 dB) corresponds to thin sheens (< 1 µm).
3. Total Mass & Volume Integration:
   Computes minimum, nominal, and maximum spilled volume (m³) and mass (metric tons)
   for Coast Guard response, containment boom sizing, and legal claims under MARPOL Annex I.
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
import numpy as np


# Bonn Agreement thickness ranges in micrometers (µm)
BONN_THICKNESS_MICRONS = {
    "CODE_1": {"min": 0.04, "nominal": 0.10, "max": 0.30},
    "CODE_2": {"min": 0.30, "nominal": 2.00, "max": 5.00},
    "CODE_3": {"min": 5.00, "nominal": 25.0, "max": 50.0},
    "CODE_4": {"min": 50.0, "nominal": 100.0, "max": 200.0},
    "CODE_5": {"min": 200.0, "nominal": 400.0, "max": 1000.0},
}

OIL_DEFAULT_DENSITY_KG_M3 = 880.0  # Medium crude oil (~29° API)


@dataclass
class OilSpillVolumeEstimate:
    """Estimated volume and mass of a detected oil slick."""
    area_km2: float
    volume_nominal_m3: float
    volume_min_m3: float
    volume_max_m3: float
    mass_nominal_tonnes: float
    thickness_mean_microns: float
    dominant_bonn_code: str
    breakdown_by_thickness_class: Dict[str, float]


def estimate_thickness_from_damping(damping_depth_db: np.ndarray) -> np.ndarray:
    """
    Estimate oil film thickness (in micrometers) from SAR backscatter damping depth.
    
    Damping physics (Hollinger / Gade / Alpers):
    - Light damping (1.5 - 3 dB): Monomolecular or thin sheen (~0.1 - 1.0 µm)
    - Moderate damping (3 - 6 dB): Intermediate rainbow/metallic layer (~5 - 30 µm)
    - Strong damping (6 - 12+ dB): Thick mineral crude or water-in-oil emulsion (~50 - 500+ µm)
    """
    abs_damping = np.maximum(0.0, np.abs(damping_depth_db))
    thickness_microns = np.zeros_like(abs_damping, dtype=np.float32)

    # Piecewise continuous empirical mapping based on Hollinger consensus
    mask_sheen = abs_damping < 3.0
    mask_mid = (abs_damping >= 3.0) & (abs_damping < 6.0)
    mask_thick = abs_damping >= 6.0

    thickness_microns[mask_sheen] = 0.1 + (abs_damping[mask_sheen] / 3.0) * 0.9
    thickness_microns[mask_mid] = 1.0 + ((abs_damping[mask_mid] - 3.0) / 3.0) * 49.0
    thickness_microns[mask_thick] = 50.0 + ((abs_damping[mask_thick] - 6.0) / 6.0) * 350.0
    thickness_microns = np.clip(thickness_microns, 0.04, 1000.0)

    return thickness_microns


def quantify_spill_volume(
    slick_mask: np.ndarray,
    damping_grid_db: Optional[np.ndarray] = None,
    pixel_resolution_m: float = 10.0,
    oil_density_kg_m3: float = OIL_DEFAULT_DENSITY_KG_M3,
    override_bonn_code: Optional[str] = None
) -> OilSpillVolumeEstimate:
    """
    Compute total volume (m³) and mass (metric tonnes) of an oil slick.
    
    Args:
        slick_mask: Boolean mask of slick pixels
        damping_grid_db: Array of damping depth in dB (if available)
        pixel_resolution_m: Ground resolution in meters (Sentinel-1 default = 10m)
        oil_density_kg_m3: Density of spilled oil in kg/m³
        override_bonn_code: If optical confirmed a specific Bonn code (e.g. CODE_4)
    """
    pixel_area_m2 = pixel_resolution_m ** 2
    slick_pixels = int(np.count_nonzero(slick_mask))
    total_area_m2 = slick_pixels * pixel_area_m2
    total_area_km2 = total_area_m2 / 1e6

    if slick_pixels == 0:
        return OilSpillVolumeEstimate(
            area_km2=0.0, volume_nominal_m3=0.0, volume_min_m3=0.0, volume_max_m3=0.0,
            mass_nominal_tonnes=0.0, thickness_mean_microns=0.0, dominant_bonn_code="NONE",
            breakdown_by_thickness_class={}
        )

    if override_bonn_code and override_bonn_code in BONN_THICKNESS_MICRONS:
        # Uniform assignment based on optical Bonn code
        t_info = BONN_THICKNESS_MICRONS[override_bonn_code]
        mean_thick = t_info["nominal"]
        min_thick = t_info["min"]
        max_thick = t_info["max"]
        
        # Volume = Area (m²) * Thickness (m) [1 µm = 1e-6 m]
        vol_nominal = total_area_m2 * (mean_thick * 1e-6)
        vol_min = total_area_m2 * (min_thick * 1e-6)
        vol_max = total_area_m2 * (max_thick * 1e-6)
        dom_code = override_bonn_code
    else:
        # Pixel-by-pixel integration using SAR damping depth
        if damping_grid_db is None:
            # Default to mixed Bonn Code 3 / 4 for typical detected SAR slick
            damping_grid_db = np.full(slick_mask.shape, 5.5, dtype=np.float32)

        damping_slick = damping_grid_db[slick_mask]
        thickness_map = estimate_thickness_from_damping(damping_slick)
        mean_thick = float(np.mean(thickness_map))
        
        # 1 µm * 1 m² = 1e-6 m³ = 1 milliliter
        vol_nominal = float(np.sum(thickness_map * 1e-6 * pixel_area_m2))
        vol_min = vol_nominal * 0.40
        vol_max = vol_nominal * 2.20

        if mean_thick > 200.0:
            dom_code = "CODE_5"
        elif mean_thick > 50.0:
            dom_code = "CODE_4"
        elif mean_thick > 5.0:
            dom_code = "CODE_3"
        elif mean_thick > 0.3:
            dom_code = "CODE_2"
        else:
            dom_code = "CODE_1"

    mass_tonnes = (vol_nominal * oil_density_kg_m3) / 1000.0

    return OilSpillVolumeEstimate(
        area_km2=round(total_area_km2, 4),
        volume_nominal_m3=round(vol_nominal, 2),
        volume_min_m3=round(vol_min, 2),
        volume_max_m3=round(vol_max, 2),
        mass_nominal_tonnes=round(mass_tonnes, 2),
        thickness_mean_microns=round(mean_thick, 2),
        dominant_bonn_code=dom_code,
        breakdown_by_thickness_class={
            "area_km2": total_area_km2,
            "mean_thickness_microns": mean_thick,
        }
    )
