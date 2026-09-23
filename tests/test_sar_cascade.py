"""Unit tests for LandMaskEngine and CascadeOilSpillDetector."""

import numpy as np
import pytest

from core.sar.landmask import LandMaskEngine, MaskingConfig, BUILTIN_COASTAL_CORRIDORS
from core.sar.cascade import CascadeOilSpillDetector, CascadeConfig, Stage1Scanner
from core.sar.preprocessing import create_land_mask, SARScene


class TestLandMaskEngine:

    def test_builtin_corridors_loaded(self):
        engine = LandMaskEngine(MaskingConfig(use_builtin_fallback=True))
        assert len(engine._gshhg_geoms) >= 4
        assert "GULF_OF_KUTCH" in BUILTIN_COASTAL_CORRIDORS

    def test_point_in_polygon(self):
        engine = LandMaskEngine()
        poly = [(0.0, 0.0), (10.0, 0.0), (10.0, 10.0), (0.0, 10.0), (0.0, 0.0)]
        assert engine.point_in_polygon(5.0, 5.0, poly) is True
        assert engine.point_in_polygon(15.0, 5.0, poly) is False
        assert engine.point_in_polygon(-1.0, -1.0, poly) is False

    def test_vector_land_mask_generation(self):
        engine = LandMaskEngine(MaskingConfig(use_builtin_fallback=True))
        # Gulf of Kutch bounds
        bounds = (68.5, 22.0, 71.0, 23.5)
        shape = (100, 100)
        mask = engine.generate_vector_land_mask(bounds, shape)
        assert mask.shape == (100, 100)
        assert mask.dtype == bool
        assert bool(np.any(mask)) is True  # Some land should be rasterized

    def test_seaward_buffer(self):
        engine = LandMaskEngine(MaskingConfig(seaward_buffer_meters=50.0))
        small_mask = np.zeros((50, 50), dtype=bool)
        small_mask[20:25, 20:25] = True
        buffered = engine.apply_seaward_buffer(small_mask, pixel_size_meters=10.0)
        assert np.count_nonzero(buffered) > np.count_nonzero(small_mask)

    def test_unified_land_mask_with_srtm_and_radiometry(self):
        engine = LandMaskEngine(MaskingConfig(
            radiometric_land_threshold_db=-15.0,
            mudflat_elevation_threshold_m=1.0,
            seaward_buffer_meters=50.0
        ))

        vv_db = np.full((60, 60), -22.0, dtype=np.float32)  # Sea
        vv_db[0:10, 0:10] = -10.0  # Land/Port radiometric signature (> -15 dB)
        dem = np.full((60, 60), -5.0, dtype=np.float32)   # Deep water
        dem[50:60, 50:60] = 3.0   # Land / Island above sea level

        unified = engine.create_unified_land_mask(
            vv_db=vv_db,
            shape=(60, 60),
            dem_elevation=dem,
            pixel_size_meters=10.0
        )
        assert bool(unified[5, 5]) is True   # Caught by radiometric mask
        assert bool(unified[55, 55]) is True # Caught by DEM elevation mask
        assert bool(unified[30, 30]) is False # Open sea remains unmasked



class TestCascadeOilSpillDetector:

    def test_stage1_rejects_clean_sea(self):
        config = CascadeConfig(tile_size=128, tile_stride=128, min_dark_patch_pixels=50)
        scanner = Stage1Scanner(config)

        # Uniform clean sea with normal wind backscatter ~ -18 dB
        np.random.seed(42)
        clean_vv = -18.0 + np.random.normal(0, 0.5, (256, 256)).astype(np.float32)
        rois, telemetry = scanner.scan_scene(clean_vv)

        assert len(rois) == 0
        assert telemetry["clean_sea_skipped"] == 4
        assert telemetry["rejection_rate_percent"] == 100.0

    def test_stage1_flags_dark_oil_patch(self):
        config = CascadeConfig(tile_size=128, tile_stride=128, min_dark_patch_pixels=50, damping_threshold_db=-3.0)
        scanner = Stage1Scanner(config)

        # Clean sea + dark oil patch with -8 dB damping
        np.random.seed(42)
        scene_vv = -18.0 + np.random.normal(0, 0.4, (256, 256)).astype(np.float32)
        # Inject dark patch in top-left tile
        scene_vv[20:70, 20:70] = -26.0

        rois, telemetry = scanner.scan_scene(scene_vv)
        assert len(rois) >= 1
        assert rois[0].bbox[0] == 0
        assert rois[0].bbox[1] == 0
        assert rois[0].dark_pixel_count >= 50
        assert rois[0].mean_damping_db < -4.0

    def test_two_stage_cascade_end_to_end(self):
        detector = CascadeOilSpillDetector(CascadeConfig(tile_size=128, tile_stride=128, min_dark_patch_pixels=40))

        # Synthetic SAR scene with one slick
        np.random.seed(42)
        vv = -18.0 + np.random.normal(0, 0.5, (256, 256)).astype(np.float32)
        # Oil slick formation
        vv[30:80, 40:70] = -26.5
        vh = vv - 6.0

        res = detector.detect(vv, vh)
        assert res["stage1_telemetry"]["total_tiles"] == 4
        assert res["stage1_telemetry"]["flagged_rois"] >= 1
        assert res["scene_status"] == "OIL_SPILL_DETECTED"
        assert len(res["slicks"]) >= 1

        slick = res["slicks"][0]
        assert "pixel_centroid" in slick
        assert "skeleton_orientation_deg" in slick
        assert slick["pixel_area"] >= 40
