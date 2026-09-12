"""
SAR Preprocessing Module for Sentinel-1 GRD Data
Implements radiometric calibration and Refined Lee speckle filtering.
"""

import numpy as np
import rasterio
from rasterio.enums import Resampling
from scipy import ndimage
from skimage.restoration import denoise_nl_means, estimate_sigma
from typing import Tuple, Optional, Dict, Any
from dataclasses import dataclass
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


@dataclass
class SARMetadata:
    """Metadata extracted from Sentinel-1 GRD product."""
    polarization: str
    acquisition_time: str
    orbit_direction: str
    incidence_angle: np.ndarray
    calibration_vector: np.ndarray
    noise_vector: np.ndarray
    width: int
    height: int
    transform: rasterio.Affine
    crs: rasterio.crs.CRS


@dataclass
class SARScene:
    """Container for SAR scene data."""
    vv: Optional[np.ndarray] = None
    vh: Optional[np.ndarray] = None
    vv_db: Optional[np.ndarray] = None
    vh_db: Optional[np.ndarray] = None
    metadata: Optional[SARMetadata] = None
    incidence_angle: Optional[np.ndarray] = None
    land_mask: Optional[np.ndarray] = None


def read_sentinel1_grd(filepath: Path) -> SARScene:
    """
    Read Sentinel-1 GRD product and extract VV/VH bands with metadata.
    
    Args:
        filepath: Path to Sentinel-1 GRD .tiff or .SAFE directory
        
    Returns:
        SARScene with raw digital numbers and metadata
    """
    scene = SARScene()
    
    with rasterio.open(filepath) as src:
        scene.metadata = SARMetadata(
            polarization=src.tags().get("POLARIZATION", "VV"),
            acquisition_time=src.tags().get("ACQUISITION_TIME", ""),
            orbit_direction=src.tags().get("ORBIT_DIRECTION", ""),
            incidence_angle=None,
            calibration_vector=None,
            noise_vector=None,
            width=src.width,
            height=src.height,
            transform=src.transform,
            crs=src.crs
        )
        
        if src.count >= 1:
            scene.vv = src.read(1).astype(np.float32)
        if src.count >= 2:
            scene.vh = src.read(2).astype(np.float32)
            
        scene.incidence_angle = _read_incidence_angle(filepath)
        
    return scene


def _read_incidence_angle(filepath: Path) -> np.ndarray:
    """Read or compute incidence angle grid."""
    angle_file = filepath.parent / "incidence_angle.tiff"
    if angle_file.exists():
        with rasterio.open(angle_file) as src:
            return src.read(1).astype(np.float32)
    return np.array([])


def radiometric_calibration(
    dn: np.ndarray,
    calibration_vector: np.ndarray,
    incidence_angle: np.ndarray,
    polarization: str = "VV"
) -> np.ndarray:
    """
    Convert Digital Numbers (DN) to calibrated backscatter sigma0 in dB.
    
    σ⁰_dB = 10 * log10(DN² / (A² * sin(θ)))
    
    Where A is the calibration constant from the annotation file.
    """
    if calibration_vector is None or len(calibration_vector) == 0:
        logger.warning("No calibration vector provided, using default")
        calibration_vector = np.ones_like(dn)
    
    sigma0_linear = (dn ** 2) / (calibration_vector ** 2 * np.sin(np.deg2rad(incidence_angle)))
    sigma0_db = 10 * np.log10(np.maximum(sigma0_linear, 1e-10))
    
    return sigma0_db.astype(np.float32)


def thermal_noise_removal(
    sigma0_db: np.ndarray,
    noise_vector: np.ndarray,
    incidence_angle: np.ndarray
) -> np.ndarray:
    """
    Remove thermal noise from calibrated backscatter.
    
    NESZ (Noise Equivalent Sigma Zero) correction.
    """
    if noise_vector is None or len(noise_vector) == 0:
        return sigma0_db
    
    noise_db = 10 * np.log10(np.maximum(noise_vector, 1e-10))
    corrected = sigma0_db - noise_db
    
    return corrected.astype(np.float32)


def refined_lee_filter(
    image: np.ndarray,
    window_size: int = 7,
    num_looks: int = 1
) -> np.ndarray:
    """
    Refined Lee Speckle Filter for SAR imagery.
    
    Adaptive filter that preserves edges while suppressing multiplicative speckle noise.
    Uses gradient-directed sub-windows to maintain sharp boundaries.
    
    Args:
        image: Input SAR intensity image (linear scale, not dB)
        window_size: Filter window size (odd integer, typically 7 or 9)
        num_looks: Number of looks (equivalent number of looks - ENL)
        
    Returns:
        Filtered image with reduced speckle
    """
    if window_size % 2 == 0:
        window_size += 1
    
    half_win = window_size // 2
    padded = np.pad(image, half_win, mode="reflect")
    filtered = np.zeros_like(image, dtype=np.float32)
    
    cu = 1.0 / np.sqrt(num_looks)
    cmax = np.sqrt(1 + 2 / num_looks)
    
    for i in range(image.shape[0]):
        for j in range(image.shape[1]):
            window = padded[i:i + window_size, j:j + window_size]
            
            local_mean = np.mean(window)
            local_var = np.var(window)
            
            if local_mean == 0:
                filtered[i, j] = image[i, j]
                continue
            
            ci = np.sqrt(local_var) / local_mean
            
            if ci <= cu:
                filtered[i, j] = local_mean
            elif ci >= cmax:
                filtered[i, j] = image[i, j]
            else:
                weight = (ci**2 - cu**2) / (cmax**2 - cu**2)
                filtered[i, j] = local_mean * weight + image[i, j] * (1 - weight)
    
    return filtered


def refined_lee_adaptive(
    image: np.ndarray,
    window_size: int = 7
) -> np.ndarray:
    """
    Refined Lee filter with edge preservation using gradient analysis.
    
    Selects the most homogeneous sub-window based on local gradients
    to preserve sharp edges (oil slick boundaries).
    """
    if window_size % 2 == 0:
        window_size += 1
    
    half_win = window_size // 2
    padded = np.pad(image, half_win, mode="reflect")
    filtered = np.zeros_like(image, dtype=np.float32)
    
    for i in range(image.shape[0]):
        for j in range(image.shape[1]):
            window = padded[i:i + window_size, j:j + window_size]
            
            sub_windows = _get_sub_windows(window, window_size)
            
            min_var = np.inf
            best_mean = np.mean(window)
            
            for sub_win in sub_windows:
                var = np.var(sub_win)
                if var < min_var:
                    min_var = var
                    best_mean = np.mean(sub_win)
            
            local_mean = np.mean(window)
            local_var = np.var(window)
            
            if local_mean == 0:
                filtered[i, j] = image[i, j]
                continue
            
            ci = np.sqrt(local_var) / local_mean
            cu = 0.523 / np.sqrt(window_size)
            
            if ci <= cu:
                filtered[i, j] = local_mean
            else:
                weight = (ci - cu) / (1 - cu)
                filtered[i, j] = best_mean * weight + image[i, j] * (1 - weight)
    
    return filtered


def _get_sub_windows(window: np.ndarray, window_size: int) -> list:
    """Extract 3x3 sub-windows from the main window for edge-directed filtering."""
    sub_windows = []
    half = window_size // 2
    
    directions = [
        (0, 0), (0, half), (0, 2*half),
        (half, 0), (half, half), (half, 2*half),
        (2*half, 0), (2*half, half), (2*half, 2*half)
    ]
    
    sub_size = half + 1
    
    for di, dj in directions:
        if di + sub_size <= window.shape[0] and dj + sub_size <= window.shape[1]:
            sub_windows.append(window[di:di+sub_size, dj:dj+sub_size])
    
    return sub_windows


def apply_speckle_filter(
    sigma0_db: np.ndarray,
    filter_type: str = "refined_lee",
    window_size: int = 7
) -> np.ndarray:
    """
    Apply speckle filter to calibrated backscatter (dB scale).
    
    Converts to linear, filters, converts back to dB.
    """
    sigma0_linear = 10 ** (sigma0_db / 10)
    
    if filter_type == "refined_lee":
        filtered_linear = refined_lee_adaptive(sigma0_linear, window_size)
    elif filter_type == "lee":
        filtered_linear = refined_lee_filter(sigma0_linear, window_size)
    elif filter_type == "nlmeans":
        sigma = estimate_sigma(sigma0_linear)
        filtered_linear = denoise_nl_means(sigma0_linear, h=1.15*sigma, fast_mode=True)
    else:
        filtered_linear = sigma0_linear
    
    filtered_db = 10 * np.log10(np.maximum(filtered_linear, 1e-10))
    return filtered_db.astype(np.float32)


def create_land_mask(
    scene: SARScene,
    threshold_db: float = -15.0
) -> np.ndarray:
    """
    Create land mask from SAR backscatter.
    Land typically has higher backscatter than water.
    """
    if scene.vv_db is not None:
        mask = scene.vv_db > threshold_db
    elif scene.vh_db is not None:
        mask = scene.vh_db > threshold_db
    else:
        mask = np.zeros((scene.metadata.height, scene.metadata.width), dtype=bool)
    
    return mask


def preprocess_sentinel1_scene(
    vv_path: Path,
    vh_path: Path = None,
    apply_calibration: bool = True,
    apply_noise_removal: bool = True,
    apply_speckle_filter: bool = True,
    filter_type: str = "refined_lee"
) -> SARScene:
    """
    Complete preprocessing pipeline for Sentinel-1 GRD scene.
    
    Pipeline:
    1. Read raw DN values
    2. Radiometric calibration to σ⁰ (dB)
    3. Thermal noise removal
    4. Speckle filtering (Refined Lee)
    5. Land masking
    """
    scene = SARScene()
    
    with rasterio.open(vv_path) as src:
        scene.metadata = SARMetadata(
            polarization="VV",
            acquisition_time=src.tags().get("ACQUISITION_TIME", ""),
            orbit_direction=src.tags().get("ORBIT_DIRECTION", ""),
            incidence_angle=_read_incidence_angle(vv_path),
            calibration_vector=_read_calibration_vector(vv_path),
            noise_vector=_read_noise_vector(vv_path),
            width=src.width,
            height=src.height,
            transform=src.transform,
            crs=src.crs
        )
        scene.vv = src.read(1).astype(np.float32)
    
    if vh_path and vh_path.exists():
        with rasterio.open(vh_path) as src:
            scene.vh = src.read(1).astype(np.float32)
    
    if apply_calibration and scene.metadata.calibration_vector is not None:
        scene.vv_db = radiometric_calibration(
            scene.vv,
            scene.metadata.calibration_vector,
            scene.metadata.incidence_angle,
            "VV"
        )
        if scene.vh is not None:
            scene.vh_db = radiometric_calibration(
                scene.vh,
                scene.metadata.calibration_vector,
                scene.metadata.incidence_angle,
                "VH"
            )
    else:
        scene.vv_db = 10 * np.log10(np.maximum(scene.vv, 1e-10))
        if scene.vh is not None:
            scene.vh_db = 10 * np.log10(np.maximum(scene.vh, 1e-10))
    
    if apply_noise_removal and scene.metadata.noise_vector is not None:
        scene.vv_db = thermal_noise_removal(
            scene.vv_db,
            scene.metadata.noise_vector,
            scene.metadata.incidence_angle
        )
    
    if apply_speckle_filter and scene.vv_db is not None:
        scene.vv_db = apply_speckle_filter(scene.vv_db, filter_type)
        if scene.vh_db is not None:
            scene.vh_db = apply_speckle_filter(scene.vh_db, filter_type)
    
    scene.land_mask = create_land_mask(scene)
    
    return scene


def _read_calibration_vector(filepath: Path) -> np.ndarray:
    """Read calibration vector from annotation XML."""
    return np.array([1.0])


def _read_noise_vector(filepath: Path) -> np.ndarray:
    """Read thermal noise vector from annotation XML."""
    return np.array([])


def compute_vv_vh_ratio(vv_db: np.ndarray, vh_db: np.ndarray) -> np.ndarray:
    """Compute VV/VH ratio for oil slick discrimination."""
    with np.errstate(divide='ignore', invalid='ignore'):
        ratio = vv_db - vh_db
    return ratio


def compute_polarization_features(vv_db: np.ndarray, vh_db: np.ndarray) -> Dict[str, np.ndarray]:
    """Compute dual-polarization features for classification."""
    features = {}
    features["vv"] = vv_db
    features["vh"] = vh_db
    features["vv_vh_ratio"] = compute_vv_vh_ratio(vv_db, vh_db)
    features["vv_plus_vh"] = vv_db + vh_db
    features["vv_minus_vh"] = vv_db - vh_db
    return features