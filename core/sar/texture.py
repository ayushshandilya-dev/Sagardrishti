"""
Haralick Texture Features for Oil Slick Look-Alike Discrimination
Computes GLCM-based texture features to distinguish mineral oil from biogenic slicks, low-wind areas, and ship wakes.
"""

import numpy as np
from skimage.feature import graycomatrix, graycoprops
from skimage import img_as_ubyte
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class TextureFeatures:
    """Container for Haralick texture features."""
    contrast: np.ndarray
    dissimilarity: np.ndarray
    homogeneity: np.ndarray
    energy: np.ndarray
    correlation: np.ndarray
    asm: np.ndarray
    entropy: np.ndarray
    mean: np.ndarray
    variance: np.ndarray
    std_dev: np.ndarray


def compute_glcm(
    image: np.ndarray,
    distances: List[int] = [1, 3, 5],
    angles: List[float] = [0, np.pi/4, np.pi/2, 3*np.pi/4],
    levels: int = 256
) -> np.ndarray:
    """
    Compute Gray Level Co-occurrence Matrix (GLCM).
    
    Args:
        image: Input image (normalized to 0-255)
        distances: Pixel pair distances
        angles: Angles in radians
        levels: Number of gray levels
        
    Returns:
        GLCM matrix of shape (levels, levels, len(distances), len(angles))
    """
    image_ubyte = img_as_ubyte(normalize_image(image))
    
    glcm = graycomatrix(
        image_ubyte,
        distances=distances,
        angles=angles,
        levels=levels,
        symmetric=True,
        normed=True
    )
    
    return glcm


def normalize_image(image: np.ndarray, percentiles: Tuple[float, float] = (2, 98)) -> np.ndarray:
    """Normalize image to 0-1 range using percentile clipping."""
    p_low, p_high = np.percentile(image, percentiles)
    clipped = np.clip(image, p_low, p_high)
    normalized = (clipped - p_low) / (p_high - p_low + 1e-10)
    return normalized


def extract_haralick_features(
    image: np.ndarray,
    window_size: int = 15,
    distances: List[int] = [1, 3],
    angles: List[float] = [0, np.pi/4, np.pi/2, 3*np.pi/4]
) -> TextureFeatures:
    """
    Extract Haralick texture features using sliding window.
    
    Features computed:
    - Contrast: Local intensity variation
    - Dissimilarity: Difference between adjacent pixels
    - Homogeneity: Closeness of GLCM elements to diagonal
    - Energy: Sum of squared GLCM elements (uniformity)
    - Correlation: Linear dependency of gray levels
    - ASM: Angular Second Moment (same as energy)
    - Entropy: Randomness measure
    """
    h, w = image.shape
    half_win = window_size // 2
    
    pad_h = half_win
    pad_w = half_win
    padded = np.pad(image, ((pad_h, pad_h), (pad_w, pad_w)), mode="reflect")
    
    features = {
        "contrast": np.zeros((h, w), dtype=np.float32),
        "dissimilarity": np.zeros((h, w), dtype=np.float32),
        "homogeneity": np.zeros((h, w), dtype=np.float32),
        "energy": np.zeros((h, w), dtype=np.float32),
        "correlation": np.zeros((h, w), dtype=np.float32),
        "asm": np.zeros((h, w), dtype=np.float32),
        "entropy": np.zeros((h, w), dtype=np.float32),
        "mean": np.zeros((h, w), dtype=np.float32),
        "variance": np.zeros((h, w), dtype=np.float32),
        "std_dev": np.zeros((h, w), dtype=np.float32),
    }
    
    for i in range(h):
        for j in range(w):
            window = padded[i:i + window_size, j:j + window_size]
            window_norm = normalize_image(window)
            
            try:
                glcm = compute_glcm(window_norm, distances, angles)
                
                features["contrast"][i, j] = np.mean(graycoprops(glcm, "contrast"))
                features["dissimilarity"][i, j] = np.mean(graycoprops(glcm, "dissimilarity"))
                features["homogeneity"][i, j] = np.mean(graycoprops(glcm, "homogeneity"))
                features["energy"][i, j] = np.mean(graycoprops(glcm, "energy"))
                features["correlation"][i, j] = np.mean(graycoprops(glcm, "correlation"))
                features["asm"][i, j] = np.mean(graycoprops(glcm, "ASM"))
                
                entropy = -np.sum(glcm * np.log2(glcm + 1e-10))
                features["entropy"][i, j] = entropy
                
                features["mean"][i, j] = np.mean(window)
                features["variance"][i, j] = np.var(window)
                features["std_dev"][i, j] = np.std(window)
                
            except Exception as e:
                logger.debug(f"GLCM computation failed at ({i},{j}): {e}")
                continue
    
    return TextureFeatures(**features)


def extract_haralick_fast(
    image: np.ndarray,
    window_size: int = 15,
    distances: List[int] = [1],
    angles: List[float] = [0, np.pi/4]
) -> TextureFeatures:
    """
    Fast Haralick feature extraction using integral images for mean/var
    and reduced GLCM computation.
    """
    h, w = image.shape
    half_win = window_size // 2
    
    padded = np.pad(image, half_win, mode="reflect")
    normalized = normalize_image(padded)
    normalized_ubyte = img_as_ubyte(normalized)
    
    features = {
        "contrast": np.zeros((h, w), dtype=np.float32),
        "dissimilarity": np.zeros((h, w), dtype=np.float32),
        "homogeneity": np.zeros((h, w), dtype=np.float32),
        "energy": np.zeros((h, w), dtype=np.float32),
        "correlation": np.zeros((h, w), dtype=np.float32),
        "asm": np.zeros((h, w), dtype=np.float32),
        "entropy": np.zeros((h, w), dtype=np.float32),
        "mean": np.zeros((h, w), dtype=np.float32),
        "variance": np.zeros((h, w), dtype=np.float32),
        "std_dev": np.zeros((h, w), dtype=np.float32),
    }
    
    for i in range(h):
        for j in range(w):
            window = normalized_ubyte[i:i + window_size, j:j + window_size]
            
            try:
                glcm = graycomatrix(
                    window,
                    distances=distances,
                    angles=angles,
                    levels=256,
                    symmetric=True,
                    normed=True
                )
                
                features["contrast"][i, j] = np.mean(graycoprops(glcm, "contrast"))
                features["dissimilarity"][i, j] = np.mean(graycoprops(glcm, "dissimilarity"))
                features["homogeneity"][i, j] = np.mean(graycoprops(glcm, "homogeneity"))
                features["energy"][i, j] = np.mean(graycoprops(glcm, "energy"))
                features["correlation"][i, j] = np.mean(graycoprops(glcm, "correlation"))
                features["asm"][i, j] = np.mean(graycoprops(glcm, "ASM"))
                
                entropy = -np.sum(glcm * np.log2(glcm + 1e-10))
                features["entropy"][i, j] = entropy
                
            except Exception:
                pass
            
            orig_window = padded[i:i + window_size, j:j + window_size]
            features["mean"][i, j] = np.mean(orig_window)
            features["variance"][i, j] = np.var(orig_window)
            features["std_dev"][i, j] = np.std(orig_window)
    
    return TextureFeatures(**features)


def compute_texture_feature_vector(features: TextureFeatures, window_size: int = 15) -> np.ndarray:
    """
    Combine texture features into a feature vector for each pixel.
    Returns array of shape (H, W, n_features).
    """
    feature_names = [
        "contrast", "dissimilarity", "homogeneity", "energy",
        "correlation", "asm", "entropy", "mean", "variance", "std_dev"
    ]
    
    h, w = features.contrast.shape
    feature_vector = np.zeros((h, w, len(feature_names)), dtype=np.float32)
    
    for idx, name in enumerate(feature_names):
        feature_vector[:, :, idx] = getattr(features, name)
    
    return feature_vector


class LookAlikeDiscriminator:
    """
    Discriminates mineral oil spills from look-alikes using texture features.
    
    Look-alike classes:
    0: Mineral Oil Spill (target)
    1: Biogenic Algal Slick
    2: Low-Wind Calm Area
    3: Ship Wake
    """
    
    CLASS_NAMES = {
        0: "Mineral Oil Spill",
        1: "Biogenic Algal Slick",
        2: "Low-Wind Calm",
        3: "Ship Wake"
    }
    
    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path
        self.feature_stats = self._get_class_statistics()
    
    def _get_class_statistics(self) -> Dict[int, Dict[str, Tuple[float, float]]]:
        """Typical Haralick feature statistics for each class (from literature)."""
        return {
            0: {  # Mineral Oil
                "contrast": (0.1, 0.8),
                "homogeneity": (0.6, 0.95),
                "entropy": (2.0, 4.5),
                "correlation": (0.3, 0.8),
            },
            1: {  # Biogenic
                "contrast": (0.3, 1.5),
                "homogeneity": (0.4, 0.7),
                "entropy": (4.0, 6.0),
                "correlation": (0.1, 0.5),
            },
            2: {  # Low-Wind
                "contrast": (0.05, 0.3),
                "homogeneity": (0.8, 0.98),
                "entropy": (1.0, 3.0),
                "correlation": (0.5, 0.9),
            },
            3: {  # Ship Wake
                "contrast": (0.5, 2.0),
                "homogeneity": (0.3, 0.6),
                "entropy": (3.5, 5.5),
                "correlation": (0.0, 0.4),
            }
        }
    
    def classify_patch(self, features: TextureFeatures, patch_coords: Tuple[int, int]) -> Tuple[int, float]:
        """Classify a single patch using statistical thresholding."""
        i, j = patch_coords
        
        feat_dict = {
            "contrast": features.contrast[i, j],
            "homogeneity": features.homogeneity[i, j],
            "entropy": features.entropy[i, j],
            "correlation": features.correlation[i, j],
        }
        
        scores = {}
        for class_id, stats in self.feature_stats.items():
            score = 0
            for feat_name, (low, high) in stats.items():
                val = feat_dict.get(feat_name, 0)
                if low <= val <= high:
                    score += 1
            scores[class_id] = score / len(stats)
        
        best_class = max(scores, key=scores.get)
        confidence = scores[best_class]
        
        return best_class, confidence
    
    def classify_image(self, features: TextureFeatures) -> Tuple[np.ndarray, np.ndarray]:
        """Classify entire image patch by patch."""
        h, w = features.contrast.shape
        class_map = np.zeros((h, w), dtype=np.uint8)
        confidence_map = np.zeros((h, w), dtype=np.float32)
        
        for i in range(h):
            for j in range(w):
                class_id, conf = self.classify_patch(features, (i, j))
                class_map[i, j] = class_id
                confidence_map[i, j] = conf
        
        return class_map, confidence_map


def compute_slick_skeleton_orientation(binary_mask: np.ndarray) -> float:
    """
    Compute orientation of slick skeleton using spatial moments.
    Returns angle in radians (0 to pi).
    """
    from skimage.morphology import skeletonize
    from skimage.measure import moments_central, moments_normalized, moments_hu
    
    skeleton = skeletonize(binary_mask > 0)
    coords = np.column_stack(np.where(skeleton))
    
    if len(coords) < 10:
        return 0.0
    
    y_coords = coords[:, 0]
    x_coords = coords[:, 1]
    
    mu = moments_central(skeleton, order=2)
    nu = moments_normalized(mu)
    
    theta = 0.5 * np.arctan2(2 * nu[1, 1], nu[2, 0] - nu[0, 2])
    
    return theta


def extract_slick_geometry(binary_mask: np.ndarray) -> Dict[str, float]:
    """Extract geometric properties of detected slick."""
    from skimage.measure import regionprops
    
    props = regionprops(binary_mask.astype(int))
    if not props:
        return {}
    
    prop = props[0]
    
    return {
        "area": prop.area,
        "perimeter": prop.perimeter,
        "centroid": prop.centroid,
        "bbox": prop.bbox,
        "orientation": prop.orientation,
        "major_axis_length": prop.major_axis_length,
        "minor_axis_length": prop.minor_axis_length,
        "eccentricity": prop.eccentricity,
        "solidity": prop.solidity,
        "extent": prop.extent,
    }