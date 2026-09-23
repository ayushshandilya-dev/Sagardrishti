"""
Loss Functions for Oil Spill Semantic Segmentation.

Implements the compound loss specified in Architecture.md and dashboard/app.py:
L_total = L_focal + lambda * L_lovasz

1. Focal Loss (Lin et al.):
   L_focal = -alpha_t * (1 - p_t)^gamma * log(p_t)
   (gamma=2.0, alpha=0.25)
   Addresses extreme maritime class imbalance (<0.5% oil slick pixels vs >99.5% clean ocean).

2. Lovász-Softmax Loss (Berman, Triki, Blaschko):
   Direct surrogate optimization of the submodular Jaccard / Intersection-over-Union (IoU) metric.
   Prevents fragmented and hollow slick boundary segmentations.
"""

from typing import Optional, Union, List, Any
import numpy as np

try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    HAS_TORCH = True
except ImportError:
    torch = None
    nn = None
    F = None
    HAS_TORCH = False


# =========================================================================
# Lovász-Softmax Core (PyTorch & NumPy Fallback)
# =========================================================================

def lovasz_grad(gt_sorted: np.ndarray) -> np.ndarray:
    """Computes gradient of the Lovász extension w.r.t sorted errors."""
    p = len(gt_sorted)
    gts = gt_sorted.sum()
    intersection = gts - gt_sorted.cumsum()
    union = gts + (1 - gt_sorted).cumsum()
    jaccard = 1.0 - intersection / np.maximum(union, 1e-7)
    if p > 1:
        jaccard[1:p] = jaccard[1:p] - jaccard[0:-1]
    return jaccard


def lovasz_softmax_flat(probas: np.ndarray, labels: np.ndarray, classes: List[int]) -> float:
    """
    Multi-class Lovász-Softmax loss for 1D flattened probabilities and labels.
    Supports probas of shape (C, N) or (N, C).
    """
    # Ensure probas is (C, N)
    if probas.shape[0] == len(labels) and probas.shape[1] == len(classes):
        p_c_first = probas.T
    else:
        p_c_first = probas

    total_loss = 0.0
    for c in classes:
        fg = (labels == c).astype(np.float32)
        if fg.sum() == 0 and len(classes) > 1:
            # Foreground class absent in batch
            continue
        prob_c = p_c_first[c]
        errors = np.abs(fg - prob_c)
        perm = np.argsort(-errors)
        errors_sorted = errors[perm]
        fg_sorted = fg[perm]
        grad = lovasz_grad(fg_sorted)
        total_loss += float(np.dot(errors_sorted, grad))
    return total_loss / max(1, len(classes))



# =========================================================================
# PyTorch Modules
# =========================================================================

BaseLoss = nn.Module if (HAS_TORCH and nn is not None) else object


class FocalLoss(BaseLoss):
    """
    Multi-class Focal Loss for addressing extreme foreground/background class imbalance.
    """

    def __init__(self, alpha: float = 0.25, gamma: float = 2.0, reduction: str = "mean"):
        if HAS_TORCH:
            super().__init__()
        self.alpha = alpha
        self.gamma = gamma
        self.reduction = reduction

    def forward(self, inputs: Any, targets: Any) -> Any:
        if not HAS_TORCH or inputs is None:
            # NumPy fallback computation
            probs = np.clip(inputs, 1e-7, 1.0 - 1e-7)
            one_hot = np.eye(probs.shape[1])[targets]
            pt = (probs * one_hot).sum(axis=1)
            loss = -self.alpha * ((1.0 - pt) ** self.gamma) * np.log(pt)
            return float(np.mean(loss))

        ce_loss = F.cross_entropy(inputs, targets, reduction="none")
        pt = torch.exp(-ce_loss)
        focal_loss = self.alpha * ((1.0 - pt) ** self.gamma) * ce_loss

        if self.reduction == "mean":
            return focal_loss.mean()
        elif self.reduction == "sum":
            return focal_loss.sum()
        return focal_loss


class LovaszSoftmaxLoss(BaseLoss):
    """
    Lovász-Softmax Jaccard surrogate loss for semantic segmentation.
    """

    def __init__(self, classes: Optional[List[int]] = None):
        if HAS_TORCH:
            super().__init__()
        self.classes = classes or [0, 1, 2, 3]

    def forward(self, probas: Any, labels: Any) -> Any:
        if not HAS_TORCH or probas is None or not isinstance(probas, torch.Tensor):
            # NumPy evaluation
            return lovasz_softmax_flat(probas, labels, self.classes)

        # PyTorch Tensor evaluation
        if probas.dim() == 4:
            # (B, C, H, W) -> (C, B*H*W)
            b, c, h, w = probas.size()
            probas_flat = probas.permute(1, 0, 2, 3).contiguous().view(c, -1)
            labels_flat = labels.view(-1)
        else:
            probas_flat = probas
            labels_flat = labels

        probas_np = probas_flat.detach().cpu().numpy()
        labels_np = labels_flat.detach().cpu().numpy()
        loss_val = lovasz_softmax_flat(probas_np, labels_np, self.classes)

        return torch.tensor(loss_val, dtype=torch.float32, device=probas.device, requires_grad=True)


class CompoundOilSpillLoss(BaseLoss):
    """
    Production compound loss function for Sagardrishti:
    L_total = L_focal + lambda_lovasz * L_lovasz
    """

    def __init__(
        self,
        alpha: float = 0.25,
        gamma: float = 2.0,
        lambda_lovasz: float = 0.75,
        classes: Optional[List[int]] = None
    ):
        if HAS_TORCH:
            super().__init__()
        self.focal = FocalLoss(alpha=alpha, gamma=gamma)
        self.lovasz = LovaszSoftmaxLoss(classes=classes)
        self.lambda_lovasz = lambda_lovasz

    def forward(self, logits: Any, targets: Any) -> Any:
        if HAS_TORCH and isinstance(logits, torch.Tensor):
            probs = F.softmax(logits, dim=1)
            l_foc = self.focal(logits, targets)
            l_lov = self.lovasz(probs, targets)
            return l_foc + self.lambda_lovasz * l_lov

        # NumPy fallback
        probs = np.exp(logits) / np.sum(np.exp(logits), axis=1, keepdims=True)
        l_foc = self.focal.forward(probs, targets)
        l_lov = self.lovasz.forward(probs, targets)
        return float(l_foc + self.lambda_lovasz * l_lov)
