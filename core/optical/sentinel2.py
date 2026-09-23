"""
Sentinel-2 Electro-Optical (EO / Multispectral) Oil Spill Verification Engine.

Provides capabilities for:
1. Automated cloud masking (SCL / Blue-SWIR thresholding).
2. Optical Oil Contrast Indices:
   - FAI (Floating Algae / Oil Index)
   - Sunglint Specular Reflectance Ratio
   - Normalized Difference Oil Index (NDOI)
3. Multi-sensor Cross-Verification (SAR + Optical fusion).
4. Bonn Agreement visual appearance code estimation (Sheen, Rainbow, Metallic, Discontinuous True Oil, Continuous True Oil).
"""

from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import numpy as np


class OpticalAppearanceCode(str, Enum):
    """Bonn Agreement Oil Appearance Codes (BAOAC)."""
    CODE_1_SHEEN = "Code 1: Sheen / Silver (<0.0003 mm)"
    CODE_2_RAINBOW = "Code 2: Rainbow (0.0003 - 0.005 mm)"
    CODE_3_METALLIC = "Code 3: Metallic (0.005 - 0.05 mm)"
    CODE_4_DISCONTINUOUS = "Code 4: Discontinuous True Oil (0.05 - 0.2 mm)"
    CODE_5_CONTINUOUS = "Code 5: Continuous True Oil (>0.2 mm)"
    UNRESOLVED = "Unresolved / Cloud Obscured"


@dataclass
class OpticalScene:
    """Container for Sentinel-2 Multispectral Instrument (MSI) bands."""
    b2_blue: np.ndarray      # 490 nm, 10m
    b3_green: np.ndarray     # 560 nm, 10m
    b4_red: np.ndarray       # 665 nm, 10m
    b8_nir: np.ndarray       # 842 nm, 10m
    b11_swir1: np.ndarray    # 1610 nm, 20m (resampled to 10m)
    b12_swir2: Optional[np.ndarray] = None  # 2190 nm
    cloud_mask: Optional[np.ndarray] = None # True for cloud pixels
    timestamp_utc: str = ""
    sun_zenith_deg: float = 30.0
    sun_azimuth_deg: float = 145.0
    view_zenith_deg: float = 5.0
    view_azimuth_deg: float = 100.0


@dataclass
class OpticalVerificationResult:
    """Result of optical cross-verification on a SAR-detected ROI."""
    is_confirmed: bool
    cloud_cover_percent: float
    confidence: float
    fai_mean: float
    sunglint_contrast: float
    appearance_code: OpticalAppearanceCode
    details: Dict[str, Any] = field(default_factory=dict)


class Sentinel2EOVerifier:
    """
    Multispectral optical validator for oil slicks detected via SAR.
    Uses physics of sunglint reflectance and NIR baseline subtraction.
    """

    def __init__(self, cloud_threshold_percent: float = 60.0):
        self.cloud_threshold_percent = cloud_threshold_percent

    def compute_cloud_mask(self, scene: OpticalScene) -> np.ndarray:
        """
        Derive cloud mask from Sentinel-2 Top-of-Atmosphere (TOA) / BOA reflectance.
        Clouds are characteristically bright in Blue (B2) and NIR (B8) with high Cirrus/SWIR reflectance.
        """
        # Blue > 0.20 and NIR > 0.20 strongly suggests dense cumulus or maritime cloud
        cloud_cond = (scene.b2_blue > 0.22) & (scene.b8_nir > 0.18)
        return cloud_cond

    def compute_fai(self, scene: OpticalScene) -> np.ndarray:
        """
        Floating Algae / Oil Index (FAI) (Hu et al., 2009):
        FAI = R_nir - (R_red + (R_swir - R_red) * (lambda_nir - lambda_red) / (lambda_swir - lambda_red))
        Wavelengths: Red=665nm, NIR=842nm, SWIR=1610nm
        Baseline ratio = (842 - 665) / (1610 - 665) = 177 / 945 ~= 0.1873
        """
        baseline_red_swir = scene.b4_red + (scene.b11_swir1 - scene.b4_red) * 0.1873
        fai = scene.b8_nir - baseline_red_swir
        return fai

    def compute_sunglint_contrast(self, scene: OpticalScene, ocean_background: np.ndarray) -> float:
        """
        Under sunglint angles, thick oil damps capillary waves creating specular mirror-reflection
        or dark anomaly depending on viewing geometry relative to the specular center.
        """
        nir_valid = scene.b8_nir[~ocean_background] if np.any(~ocean_background) else scene.b8_nir
        bg_mean = float(np.mean(scene.b8_nir[ocean_background])) if np.any(ocean_background) else 0.05
        oil_mean = float(np.mean(nir_valid)) if len(nir_valid) > 0 else bg_mean
        
        contrast = (oil_mean - bg_mean) / (bg_mean + 1e-6)
        return float(contrast)

    def estimate_bonn_code(self, fai_value: float, contrast: float) -> OpticalAppearanceCode:
        """
        Estimate Bonn Agreement Oil Appearance Code from multispectral contrast.
        Thin sheens have low optical contrast; thick emulsion/true oil has marked spectral deviation.
        """
        if contrast > 1.2 or fai_value > 0.08:
            return OpticalAppearanceCode.CODE_5_CONTINUOUS
        elif contrast > 0.6 or fai_value > 0.04:
            return OpticalAppearanceCode.CODE_4_DISCONTINUOUS
        elif contrast > 0.2 or fai_value > 0.015:
            return OpticalAppearanceCode.CODE_3_METALLIC
        elif contrast > 0.05 or fai_value > 0.005:
            return OpticalAppearanceCode.CODE_2_RAINBOW
        elif contrast > -0.05:
            return OpticalAppearanceCode.CODE_1_SHEEN
        return OpticalAppearanceCode.UNRESOLVED

    def verify_sar_detection(
        self,
        optical_scene: OpticalScene,
        sar_slick_mask: np.ndarray
    ) -> OpticalVerificationResult:
        """
        Cross-verify a SAR-detected oil slick using corresponding Sentinel-2 optical imagery.
        
        Args:
            optical_scene: Sentinel-2 multispectral scene
            sar_slick_mask: Boolean mask (True where SAR detected an oil slick)
            
        Returns:
            OpticalVerificationResult with confidence, cloud stats, and Bonn code
        """
        if optical_scene.cloud_mask is None:
            optical_scene.cloud_mask = self.compute_cloud_mask(optical_scene)

        # 1. Check cloud coverage over the candidate slick region
        slick_pixels = np.count_nonzero(sar_slick_mask)
        if slick_pixels == 0:
            return OpticalVerificationResult(
                is_confirmed=False,
                cloud_cover_percent=0.0,
                confidence=0.0,
                fai_mean=0.0,
                sunglint_contrast=0.0,
                appearance_code=OpticalAppearanceCode.UNRESOLVED,
                details={"reason": "No SAR slick mask pixels provided"}
            )

        slick_cloud_pixels = np.count_nonzero(sar_slick_mask & optical_scene.cloud_mask)
        cloud_pct = (slick_cloud_pixels / slick_pixels) * 100.0

        if cloud_pct > self.cloud_threshold_percent:
            # Cloud obscured: typical in monsoon India. SAR remains sole authoritative source.
            return OpticalVerificationResult(
                is_confirmed=False,
                cloud_cover_percent=float(cloud_pct),
                confidence=0.10,
                fai_mean=0.0,
                sunglint_contrast=0.0,
                appearance_code=OpticalAppearanceCode.UNRESOLVED,
                details={
                    "status": "CLOUD_BLOCKED",
                    "reason": f"Slick region obscured by {cloud_pct:.1f}% cloud cover. Relying on SAR all-weather detection."
                }
            )

        # 2. Compute FAI index across scene
        fai = self.compute_fai(optical_scene)
        clear_slick_mask = sar_slick_mask & (~optical_scene.cloud_mask)
        clear_ocean_mask = (~sar_slick_mask) & (~optical_scene.cloud_mask)

        slick_fai_mean = float(np.mean(fai[clear_slick_mask])) if np.any(clear_slick_mask) else 0.0
        contrast = self.compute_sunglint_contrast(optical_scene, ocean_background=clear_ocean_mask)

        # 3. Determine confirmation & confidence
        bonn_code = self.estimate_bonn_code(slick_fai_mean, contrast)
        is_confirmed = (abs(contrast) > 0.10) or (slick_fai_mean > 0.01)
        confidence = min(0.98, max(0.50, 0.60 + 0.3 * (1.0 - cloud_pct / 100.0) + 0.1 * min(1.0, abs(contrast))))

        return OpticalVerificationResult(
            is_confirmed=is_confirmed,
            cloud_cover_percent=float(cloud_pct),
            confidence=float(confidence),
            fai_mean=slick_fai_mean,
            sunglint_contrast=contrast,
            appearance_code=bonn_code,
            details={
                "status": "OPTICAL_CONFIRMED" if is_confirmed else "INCONCLUSIVE",
                "clear_pixels_analyzed": int(np.count_nonzero(clear_slick_mask)),
                "cloud_pixels_in_slick": int(slick_cloud_pixels)
            }
        )
