"""
Unit and integration tests for ISRO EOS-04 (RISAT-1A) SAR adapter.
"""

import numpy as np
import pytest

from core.sar.eos04 import EOS04Adapter, CompactPolStokes
from core.sar.preprocessing import load_sar_scene


def test_eos04_radiometric_calibration():
    adapter = EOS04Adapter(k_cal_db=48.0)
    dn = np.full((50, 50), 100.0, dtype=np.float32)

    # sigma_0 = 10 * log10(100^2) - 48.0 + 10 * log10(sin(35 deg))
    # 10 * 4 - 48.0 + 10 * log10(0.573576) = 40.0 - 48.0 - 2.414 = -10.414 dB
    sigma0 = adapter.calibrate_dn_to_sigma0(dn, incidence_angle_deg=35.0)

    assert sigma0.shape == (50, 50)
    assert np.isclose(sigma0[0, 0], -10.414, atol=0.05)


def test_eos04_compact_polarimetry_stokes():
    adapter = EOS04Adapter()
    
    # Simulate Right Circular Transmit, Linear Receive complex signals
    # RH and RV
    h, w = 40, 40
    rh = np.full((h, w), 0.707 + 0.0j, dtype=np.complex64)
    rv = np.full((h, w), 0.0 + 0.707j, dtype=np.complex64)

    stokes = adapter.compute_compact_polarimetry(rh, rv)
    assert isinstance(stokes, CompactPolStokes)
    assert stokes.s0.shape == (h, w)
    assert np.all(stokes.degree_of_polarization >= 0.0)
    assert np.all(stokes.degree_of_polarization <= 1.0)


def test_eos04_universal_loader_and_cascade_handoff():
    from core.sar.cascade import CascadeOilSpillDetector, CascadeConfig

    adapter = EOS04Adapter()
    # Create raw EOS-04 scene with dark slick patch
    raw_copol = np.full((256, 256), 60.0, dtype=np.float32)
    # Oil damping
    raw_copol[60:120, 60:120] = 15.0

    scene = adapter.load_from_arrays(copol_dn=raw_copol, incidence_angle_deg=35.0)
    assert scene.vv_db is not None
    assert scene.vh_db is not None
    assert "EOS-04" in scene.metadata.polarization or "Hybrid" in scene.metadata.polarization

    # Pass seamlessly into CascadeOilSpillDetector
    cascade = CascadeOilSpillDetector(CascadeConfig(tile_size=128, tile_stride=128, min_dark_patch_pixels=20))
    res = cascade.detect(scene.vv_db, scene.vh_db)

    assert res["num_slicks"] >= 1
    assert "stage1_telemetry" in res

