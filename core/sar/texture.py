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


def _expand_grid(grid_arr: np.ndarray, target_shape: Tuple[int, int]) -> np.ndarray:
    """Expand sampled grid back to target (H, W) array."""
    if grid_arr.shape == target_shape:
        return grid_arr.astype(np.float32)
    th, tw = target_shape
    gh, gw = grid_arr.shape
    if gh <= 1 or gw <= 1:
        return np.full(target_shape, grid_arr[0, 0] if grid_arr.size > 0 else 0.0, dtype=np.float32)
    from scipy.ndimage import zoom
    zh = th / gh
    zw = tw / gw
    expanded = zoom(grid_arr, (zh, zw), order=1)
    res = np.zeros(target_shape, dtype=np.float32)
    eh = min(expanded.shape[0], th)
    ew = min(expanded.shape[1], tw)
    res[:eh, :ew] = expanded[:eh, :ew]
    if eh < th:
        res[eh:, :] = res[eh-1:eh, :]
    if ew < tw:
        res[:, ew:] = res[:, ew-1:ew]
    return res


def extract_haralick_features(
    image: np.ndarray,
    window_size: int = 15,
    distances: List[int] = [1, 3],
    angles: List[float] = [0, np.pi/4, np.pi/2, 3*np.pi/4],
    stride: Optional[int] = None
) -> TextureFeatures:
    """
    Extract Haralick texture features using vectorized moment filters and strided GLCM.
    
    Features computed:
    - Contrast: Local intensity variation
    - Dissimilarity: Difference between adjacent pixels
    - Homogeneity: Closeness of GLCM elements to diagonal
    - Energy: Sum of squared GLCM elements (uniformity)
    - Correlation: Linear dependency of gray levels
    - ASM: Angular Second Moment (same as energy)
    - Entropy: Randomness measure
    """
    from scipy import ndimage
    h, w = image.shape
    half_win = window_size // 2

    # Fast vectorized calculation of local mean, variance, and standard deviation (O(1) per pixel)
    img_f32 = image.astype(np.float32)
    mean_map = ndimage.uniform_filter(img_f32, size=window_size)
    mean_sq = ndimage.uniform_filter(img_f32**2, size=window_size)
    var_map = np.maximum(0.0, mean_sq - mean_map**2)
    std_map = np.sqrt(var_map)

    # Grid sampling for GLCM to avoid quadratic per-pixel computation
    step = stride if stride is not None else max(8, window_size // 2)
    if min(h, w) <= 32:
        step = max(2, window_size // 4)

    sample_r = list(range(0, h, step))
    sample_c = list(range(0, w, step))
    if not sample_r or sample_r[-1] != h - 1:
        sample_r.append(max(0, h - 1))
    if not sample_c or sample_c[-1] != w - 1:
        sample_c.append(max(0, w - 1))

    grid_h = len(sample_r)
    grid_w = len(sample_c)

    g_contrast = np.zeros((grid_h, grid_w), dtype=np.float32)
    g_dissimilarity = np.zeros((grid_h, grid_w), dtype=np.float32)
    g_homogeneity = np.zeros((grid_h, grid_w), dtype=np.float32)
    g_energy = np.zeros((grid_h, grid_w), dtype=np.float32)
    g_correlation = np.zeros((grid_h, grid_w), dtype=np.float32)
    g_asm = np.zeros((grid_h, grid_w), dtype=np.float32)
    g_entropy = np.zeros((grid_h, grid_w), dtype=np.float32)

    pad_h = half_win
    pad_w = half_win
    padded = np.pad(image, ((pad_h, pad_h), (pad_w, pad_w)), mode="reflect")
    normalized = normalize_image(padded)
    quantized_ubyte = (normalized * 63).astype(np.uint8)

    for gi, i in enumerate(sample_r):
        for gj, j in enumerate(sample_c):
            window = quantized_ubyte[i:i + window_size, j:j + window_size]
            try:
                glcm = graycomatrix(
                    window,
                    distances=distances,
                    angles=angles,
                    levels=64,
                    symmetric=True,
                    normed=True
                )
                g_contrast[gi, gj] = float(np.mean(graycoprops(glcm, "contrast")))
                g_dissimilarity[gi, gj] = float(np.mean(graycoprops(glcm, "dissimilarity")))
                g_homogeneity[gi, gj] = float(np.mean(graycoprops(glcm, "homogeneity")))
                g_energy[gi, gj] = float(np.mean(graycoprops(glcm, "energy")))
                g_correlation[gi, gj] = float(np.mean(graycoprops(glcm, "correlation")))
                g_asm[gi, gj] = float(np.mean(graycoprops(glcm, "ASM")))

                nonzero_p = glcm[glcm > 0]
                g_entropy[gi, gj] = float(-np.sum(nonzero_p * np.log2(nonzero_p + 1e-10)))
            except Exception:
                pass

    return TextureFeatures(
        contrast=_expand_grid(g_contrast, (h, w)),
        dissimilarity=_expand_grid(g_dissimilarity, (h, w)),
        homogeneity=_expand_grid(g_homogeneity, (h, w)),
        energy=_expand_grid(g_energy, (h, w)),
        correlation=_expand_grid(g_correlation, (h, w)),
        asm=_expand_grid(g_asm, (h, w)),
        entropy=_expand_grid(g_entropy, (h, w)),
        mean=mean_map,
        variance=var_map,
        std_dev=std_map
    )


def extract_haralick_fast(
    image: np.ndarray,
    window_size: int = 15,
    distances: List[int] = [1],
    angles: List[float] = [0, np.pi/4],
    stride: Optional[int] = None
) -> TextureFeatures:
    """
    Ultra-fast Haralick feature extraction using integral images for mean/var
    and reduced GLCM computation with strided grid sampling.
    """
    step = stride if stride is not None else max(8, window_size // 2)
    return extract_haralick_features(
        image=image,
        window_size=window_size,
        distances=distances,
        angles=angles,
        stride=step
    )



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
        """Classify entire image patch by patch using vectorized array operations."""
        h, w = features.contrast.shape
        num_classes = len(self.feature_stats)
        scores_stack = np.zeros((num_classes, h, w), dtype=np.float32)

        feat_arrays = {
            "contrast": features.contrast,
            "homogeneity": features.homogeneity,
            "entropy": features.entropy,
            "correlation": features.correlation,
        }

        for class_id, stats in self.feature_stats.items():
            class_score = np.zeros((h, w), dtype=np.float32)
            for feat_name, (low, high) in stats.items():
                arr = feat_arrays.get(feat_name)
                if arr is not None:
                    class_score += ((arr >= low) & (arr <= high)).astype(np.float32)
            scores_stack[class_id] = class_score / max(1, len(stats))

        class_map = np.argmax(scores_stack, axis=0).astype(np.uint8)
        confidence_map = np.max(scores_stack, axis=0).astype(np.float32)

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
    
    # skimage moments_normalized requires moments of order >= 3 (shape >= 4x4)
    mu = moments_central(skeleton.astype(np.float64), order=3)
    nu = moments_normalized(mu, order=2)
    
    denom = nu[2, 0] - nu[0, 2]
    if abs(denom) < 1e-12:
        return 0.0
    theta = 0.5 * np.arctan2(2 * nu[1, 1], denom)
    
    return float(theta)



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