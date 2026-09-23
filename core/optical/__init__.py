"""
Optical Remote Sensing Package for Sagar-Drishti.
Contains Sentinel-2 EO multispectral analysis and cross-sensor fusion.
"""

from core.optical.sentinel2 import (
    Sentinel2EOVerifier,
    OpticalScene,
    OpticalVerificationResult,
    OpticalAppearanceCode,
)

__all__ = [
    "Sentinel2EOVerifier",
    "OpticalScene",
    "OpticalVerificationResult",
    "OpticalAppearanceCode",
]
