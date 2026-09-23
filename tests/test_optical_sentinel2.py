"""
Unit and integration tests for Sentinel-2 EO multispectral verification engine.
"""

import numpy as np
import pytest

from core.optical.sentinel2 import (
    Sentinel2EOVerifier,
    OpticalScene,
    OpticalAppearanceCode,
)


@pytest.fixture
def sample_optical_scenes():
    # 100x100 synthetic scenes
    h, w = 100, 100

    # Clear ocean background: low reflectance across all bands
    b2_clear = np.full((h, w), 0.08, dtype=np.float32)
    b3_clear = np.full((h, w), 0.06, dtype=np.float32)
    b4_clear = np.full((h, w), 0.04, dtype=np.float32)
    b8_clear = np.full((h, w), 0.03, dtype=np.float32)
    b11_clear = np.full((h, w), 0.02, dtype=np.float32)

    # 1. Clear scene with oil slick in center (30:70, 30:70) with sunglint reflection
    b8_oil = b8_clear.copy()
    b8_oil[30:70, 30:70] = 0.09  # Significant NIR specular contrast

    clear_scene = OpticalScene(
        b2_blue=b2_clear,
        b3_green=b3_clear,
        b4_red=b4_clear,
        b8_nir=b8_oil,
        b11_swir1=b11_clear,
    )

    # 2. Cloudy scene: high Blue & NIR reflectance (> 0.25)
    b2_cloud = np.full((h, w), 0.35, dtype=np.float32)
    b8_cloud = np.full((h, w), 0.30, dtype=np.float32)
    cloudy_scene = OpticalScene(
        b2_blue=b2_cloud,
        b3_green=b3_clear,
        b4_red=b4_clear,
        b8_nir=b8_cloud,
        b11_swir1=b11_clear,
    )

    slick_mask = np.zeros((h, w), dtype=bool)
    slick_mask[30:70, 30:70] = True

    return clear_scene, cloudy_scene, slick_mask


def test_cloud_masking(sample_optical_scenes):
    clear_scene, cloudy_scene, slick_mask = sample_optical_scenes
    verifier = Sentinel2EOVerifier()

    # Clear scene should have minimal/zero cloud pixels
    clear_cloud_mask = verifier.compute_cloud_mask(clear_scene)
    assert np.count_nonzero(clear_cloud_mask) == 0

    # Cloudy scene should have heavy cloud detection
    cloud_mask = verifier.compute_cloud_mask(cloudy_scene)
    assert np.count_nonzero(cloud_mask) == 100 * 100


def test_clear_sky_oil_verification(sample_optical_scenes):
    clear_scene, _, slick_mask = sample_optical_scenes
    verifier = Sentinel2EOVerifier()

    res = verifier.verify_sar_detection(clear_scene, slick_mask)
    assert res.is_confirmed is True
    assert res.cloud_cover_percent < 5.0
    assert res.confidence >= 0.70
    assert res.sunglint_contrast > 0.0
    assert res.appearance_code != OpticalAppearanceCode.UNRESOLVED


def test_monsoon_cloud_obstruction_fallback(sample_optical_scenes):
    _, cloudy_scene, slick_mask = sample_optical_scenes
    verifier = Sentinel2EOVerifier(cloud_threshold_percent=60.0)

    res = verifier.verify_sar_detection(cloudy_scene, slick_mask)
    # Cloud blocked: optical should gracefully report inconclusive / cloud blocked
    assert res.is_confirmed is False
    assert res.cloud_cover_percent > 90.0
    assert res.appearance_code == OpticalAppearanceCode.UNRESOLVED
    assert res.details["status"] == "CLOUD_BLOCKED"


def test_fai_calculation(sample_optical_scenes):
    clear_scene, _, _ = sample_optical_scenes
    verifier = Sentinel2EOVerifier()

    fai = verifier.compute_fai(clear_scene)
    assert fai.shape == clear_scene.b8_nir.shape
    # Oil area (30:70, 30:70) should have elevated FAI
    assert np.mean(fai[30:70, 30:70]) > np.mean(fai[0:20, 0:20])
