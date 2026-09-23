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
