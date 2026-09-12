"""
SAR Oil Slick Detection Module
Integrates SegFormer-B3 and DeepLabV3+ for semantic segmentation of oil spills.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import transforms
from segmentation_models_pytorch import Unet, DeepLabV3Plus
import timm
from typing import Dict, List, Tuple, Optional, Union
from dataclasses import dataclass
import numpy as np
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


@dataclass
class DetectionConfig:
    """Configuration for detection model."""
    model_type: str = "segformer"  # segformer, deeplab, unet
    encoder_name: str = "mit_b3"  # for segformer
    encoder_weights: str = "imagenet"
    in_channels: int = 2  # VV + VH
    num_classes: int = 4  # background, oil, biogenic, low-wind, wake
    input_size: Tuple[int, int] = (512, 512)
    device: str = "cuda" if torch.cuda.is_available() else "cpu"


class SegFormerDetector(nn.Module):
    """SegFormer-B3 based oil slick detector."""
    
    def __init__(self, config: DetectionConfig):
        super().__init__()
        self.config = config
        
        self.model = timm.create_model(
            "segformer_b3",
            pretrained=config.encoder_weights == "imagenet",
            num_classes=config.num_classes,
            in_chans=config.in_channels
        )
        
        self.to(config.device)
        self.eval()
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.model(x)
    
    def predict(self, vv: np.ndarray, vh: np.ndarray) -> Dict[str, np.ndarray]:
        """Run inference on VV/VH pair."""
        input_tensor = self._preprocess(vv, vh)
        
        with torch.no_grad():
            logits = self.forward(input_tensor)
            probs = F.softmax(logits, dim=1)
            pred = torch.argmax(probs, dim=1)
        
        return {
            "logits": logits.cpu().numpy(),
            "probabilities": probs.cpu().numpy(),
            "prediction": pred.cpu().numpy().squeeze()
        }
    
    def _preprocess(self, vv: np.ndarray, vh: np.ndarray) -> torch.Tensor:
        """Preprocess VV/VH to model input."""
        h, w = self.config.input_size
        
        vv_resized = resize_with_padding(vv, (h, w))
        vh_resized = resize_with_padding(vh, (h, w))
        
        vv_norm = (vv_resized - vv_resized.mean()) / (vv_resized.std() + 1e-6)
        vh_norm = (vh_resized - vh_resized.mean()) / (vh_resized.std() + 1e-6)
        
        stacked = np.stack([vv_norm, vh_norm], axis=0)
        tensor = torch.from_numpy(stacked).float().unsqueeze(0).to(self.config.device)
        
        return tensor


class DeepLabDetector(nn.Module):
    """DeepLabV3+ based oil slick detector."""
    
    def __init__(self, config: DetectionConfig):
        super().__init__()
        self.config = config
        
        self.model = DeepLabV3Plus(
            encoder_name="resnet50",
            encoder_weights=config.encoder_weights,
            in_channels=config.in_channels,
            classes=config.num_classes
        )
        
        self.to(config.device)
        self.eval()
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.model(x)
    
    def predict(self, vv: np.ndarray, vh: np.ndarray) -> Dict[str, np.ndarray]:
        input_tensor = self._preprocess(vv, vh)
        
        with torch.no_grad():
            logits = self.forward(input_tensor)
            probs = F.softmax(logits, dim=1)
            pred = torch.argmax(probs, dim=1)
        
        return {
            "logits": logits.cpu().numpy(),
            "probabilities": probs.cpu().numpy(),
            "prediction": pred.cpu().numpy().squeeze()
        }
    
    def _preprocess(self, vv: np.ndarray, vh: np.ndarray) -> torch.Tensor:
        h, w = self.config.input_size
        
        vv_resized = resize_with_padding(vv, (h, w))
        vh_resized = resize_with_padding(vh, (h, w))
        
        vv_norm = (vv_resized - vv_resized.mean()) / (vv_resized.std() + 1e-6)
        vh_norm = (vh_resized - vh_resized.mean()) / (vh_resized.std() + 1e-6)
        
        stacked = np.stack([vv_norm, vh_norm], axis=0)
        tensor = torch.from_numpy(stacked).float().unsqueeze(0).to(self.config.device)
        
        return tensor


class UNetDetector(nn.Module):
    """U-Net based oil slick detector (lightweight alternative)."""
    
    def __init__(self, config: DetectionConfig):
        super().__init__()
        self.config = config
        
        self.model = Unet(
            encoder_name="efficientnet-b3",
            encoder_weights=config.encoder_weights,
            in_channels=config.in_channels,
            classes=config.num_classes
        )
        
        self.to(config.device)
        self.eval()
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.model(x)
    
    def predict(self, vv: np.ndarray, vh: np.ndarray) -> Dict[str, np.ndarray]:
        input_tensor = self._preprocess(vv, vh)
        
        with torch.no_grad():
            logits = self.forward(input_tensor)
            probs = F.softmax(logits, dim=1)
            pred = torch.argmax(probs, dim=1)
        
        return {
            "logits": logits.cpu().numpy(),
            "probabilities": probs.cpu().numpy(),
            "prediction": pred.cpu().numpy().squeeze()
        }
    
    def _preprocess(self, vv: np.ndarray, vh: np.ndarray) -> torch.Tensor:
        h, w = self.config.input_size
        
        vv_resized = resize_with_padding(vv, (h, w))
        vh_resized = resize_with_padding(vh, (h, w))
        
        vv_norm = (vv_resized - vv_resized.mean()) / (vv_resized.std() + 1e-6)
        vh_norm = (vh_resized - vh_resized.std() + 1e-6)
        
        stacked = np.stack([vv_norm, vh_norm], axis=0)
        tensor = torch.from_numpy(stacked).float().unsqueeze(0).to(self.config.device)
        
        return tensor


def resize_with_padding(image: np.ndarray, target_size: Tuple[int, int]) -> np.ndarray:
    """Resize image maintaining aspect ratio with padding."""
    from skimage.transform import resize
    
    h, w = image.shape
    th, tw = target_size
    
    scale = min(th / h, tw / w)
    new_h, new_w = int(h * scale), int(w * scale)
    
    resized = resize(image, (new_h, new_w), preserve_range=True, anti_aliasing=True)
    
    padded = np.zeros(target_size, dtype=image.dtype)
    y_offset = (th - new_h) // 2
    x_offset = (tw - new_w) // 2
    padded[y_offset:y_offset + new_h, x_offset:x_offset + new_w] = resized
    
    return padded


def create_detector(config: DetectionConfig) -> nn.Module:
    """Factory function to create detector based on config."""
    detectors = {
        "segformer": SegFormerDetector,
        "deeplab": DeepLabDetector,
        "unet": UNetDetector,
    }
    
    detector_class = detectors.get(config.model_type.lower())
    if detector_class is None:
        raise ValueError(f"Unknown model type: {config.model_type}")
    
    return detector_class(config)


class OilSlickDetector:
    """
    High-level oil slick detection pipeline combining:
    1. Deep learning segmentation (SegFormer/DeepLab/U-Net)
    2. Haralick texture-based look-alike discrimination
    3. Geometric filtering
    """
    
    CLASS_NAMES = {
        0: "Background",
        1: "Mineral Oil Spill",
        2: "Biogenic Slick",
        3: "Low-Wind Calm",
        4: "Ship Wake"
    }
    
    def __init__(self, config: DetectionConfig):
        self.config = config
        self.model = create_detector(config)
        self.texture_discriminator = None  # Will be initialized when needed
    
    def detect(self, vv: np.ndarray, vh: np.ndarray) -> Dict:
        """Run complete detection pipeline."""
        # Step 1: Deep learning segmentation
        dl_result = self.model.predict(vv, vh)
        prediction = dl_result["prediction"]
        probabilities = dl_result["probabilities"]
        
        # Step 2: Extract oil slick candidates (class 1)
        oil_mask = (prediction == 1).astype(np.uint8)
        
        # Step 3: Connected components to get individual slicks
        from skimage.measure import label, regionprops
        labeled = label(oil_mask)
        slicks = []
        
        for region in regionprops(labeled):
            if region.area < 100:  # Filter small noise
                continue
            
            slick_info = {
                "bbox": region.bbox,
                "centroid": region.centroid,
                "area": region.area,
                "perimeter": region.perimeter,
                "orientation": region.orientation,
                "major_axis": region.major_axis_length,
                "minor_axis": region.minor_axis_length,
                "eccentricity": region.eccentricity,
                "mask": (labeled == region.label)
            }
            slicks.append(slick_info)
        
        # Step 4: Texture-based verification for each slick
        verified_slicks = []
        for slick in slicks:
            verified = self._verify_slick(vv, vh, slick)
            if verified["is_oil"]:
                verified_slicks.append(verified)
        
        return {
            "raw_prediction": prediction,
            "probabilities": probabilities,
            "slicks": verified_slicks,
            "num_slicks": len(verified_slicks)
        }
    
    def _verify_slick(self, vv: np.ndarray, vh: np.ndarray, slick: Dict) -> Dict:
        """Verify slick using texture analysis."""
        mask = slick["mask"]
        
        # Extract region
        y_min, x_min, y_max, x_max = slick["bbox"]
        vv_patch = vv[y_min:y_max, x_min:x_max]
        vh_patch = vh[y_min:y_max, x_min:x_max]
        mask_patch = mask[y_min:y_max, x_min:x_max]
        
        # Compute texture features on VV channel
        from core.sar.texture import extract_haralick_fast, LookAlikeDiscriminator
        
        if self.texture_discriminator is None:
            self.texture_discriminator = LookAlikeDiscriminator()
        
        features = extract_haralick_fast(vv_patch)
        class_map, confidence_map = self.texture_discriminator.classify_image(features)
        
        # Average confidence over slick pixels
        oil_confidence = confidence_map[mask_patch > 0].mean() if mask_patch.any() else 0
        
        slick["texture_class"] = class_map[mask_patch > 0].tolist() if mask_patch.any() else []
        slick["oil_confidence"] = float(oil_confidence)
        slick["is_oil"] = oil_confidence > 0.5
        
        return slick
    
    def get_slick_polygons(self, slicks: List[Dict]) -> List:
        """Convert slick masks to shapely polygons."""
        from shapely.geometry import Polygon
        from shapely.ops import unary_union
        from skimage.measure import find_contours
        
        polygons = []
        for slick in slicks:
            mask = slick["mask"]
            contours = find_contours(mask, 0.5)
            if contours:
                contour = max(contours, key=len)
                if len(contour) >= 3:
                    poly = Polygon(contour[:, ::-1])  # (x, y) format
                    if poly.is_valid:
                        polygons.append(poly)
        
        return polygons


def load_pretrained_model(model_path: Path, config: DetectionConfig) -> nn.Module:
    """Load pretrained model weights."""
    model = create_detector(config)
    checkpoint = torch.load(model_path, map_location=config.device)
    model.load_state_dict(checkpoint.get("model_state_dict", checkpoint))
    model.eval()
    return model