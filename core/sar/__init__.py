<<<<<<< HEAD
from .cdse_client import CDSEClient, SentinelProduct, INDIAN_EEZ_CORRIDORS

try:
    from .preprocessing import RadiometricCalibrator, SpeckleFilter, SARPreprocessor
    from .detection import OilSpillDetector, SpillGeometry
except ImportError:
    RadiometricCalibrator = None
    SpeckleFilter = None
    SARPreprocessor = None
    OilSpillDetector = None
    SpillGeometry = None

__all__ = [
    "CDSEClient",
    "SentinelProduct",
    "INDIAN_EEZ_CORRIDORS",
    "RadiometricCalibrator",
    "SpeckleFilter",
    "SARPreprocessor",
    "OilSpillDetector",
    "SpillGeometry",
]
=======
"""
SAR Remote Sensing and Processing Package for Sagar-Drishti.
"""

from core.sar.preprocessing import (
    SARScene,
    SARMetadata,
    read_sentinel1_grd,
    radiometric_calibration,
    apply_speckle_filter,
    compute_vv_vh_ratio,
)
from core.sar.detection import (
    OilSlickDetector,
    DetectionConfig,
    SegFormerDetector,
    UNetDetector,
    DeepLabDetector,
    create_detector,
)
from core.sar.cascade import CascadeOilSpillDetector, CascadeConfig
from core.sar.landmask import LandMaskEngine, MaskingConfig
from core.sar.eos04 import EOS04Adapter, CompactPolStokes, read_eos04_scene
from core.sar.cmod5 import invert_cmod5n_wind, assess_wind_lookalike, cmod5n_forward
from core.sar.thickness import quantify_spill_volume, estimate_thickness_from_damping
from core.sar.losses import FocalLoss, LovaszSoftmaxLoss, CompoundOilSpillLoss


__all__ = [
    "SARScene",
    "SARMetadata",
    "read_sentinel1_grd",
    "radiometric_calibration",
    "apply_speckle_filter",
    "compute_vv_vh_ratio",
    "OilSlickDetector",
    "DetectionConfig",
    "SegFormerDetector",
    "UNetDetector",
    "DeepLabDetector",
    "create_detector",
    "CascadeOilSpillDetector",
    "CascadeConfig",
    "LandMaskEngine",
    "MaskingConfig",
    "EOS04Adapter",
    "CompactPolStokes",
    "read_eos04_scene",
    "invert_cmod5n_wind",
    "assess_wind_lookalike",
    "cmod5n_forward",
    "quantify_spill_volume",
    "estimate_thickness_from_damping",
    "FocalLoss",
    "LovaszSoftmaxLoss",
    "CompoundOilSpillLoss",
]



>>>>>>> 9b2760a50f3580bb19095db474a776860413101b
