"""
Unit tests for FocalLoss, LovaszSoftmaxLoss, and CompoundOilSpillLoss.
"""

import numpy as np
import pytest

from core.sar.losses import FocalLoss, LovaszSoftmaxLoss, CompoundOilSpillLoss


def test_focal_loss_extreme_imbalance():
    # Simulate extreme class imbalance (99.8% background class 0, 0.2% oil class 1)
    n_samples = 1000
    targets = np.zeros(n_samples, dtype=np.int64)
    targets[:2] = 1  # 2 pixels of oil spill

    # Model predicts background with high confidence (pt ~ 0.99 for class 0)
    probs = np.zeros((n_samples, 2), dtype=np.float32)
    probs[:, 0] = 0.99
    probs[:, 1] = 0.01

    focal = FocalLoss(alpha=0.25, gamma=2.0)
    loss = focal.forward(probs, targets)

    # Focal loss should be non-zero and finite
    assert loss > 0.0
    assert not np.isnan(loss)
    assert not np.isinf(loss)


def test_lovasz_softmax_jaccard_optimization():
    # 2 classes: 0 background, 1 oil
    labels = np.array([0, 0, 1, 1], dtype=np.int64)

    # Perfect prediction
    probs_perfect = np.array([
        [0.99, 0.01],
        [0.98, 0.02],
        [0.02, 0.98],
        [0.01, 0.99],
    ], dtype=np.float32).T

    lovasz = LovaszSoftmaxLoss(classes=[0, 1])
    loss_perfect = lovasz.forward(probs_perfect, labels)

    # Bad prediction
    probs_bad = np.array([
        [0.05, 0.95],
        [0.10, 0.90],
        [0.90, 0.10],
        [0.95, 0.05],
    ], dtype=np.float32).T
    loss_bad = lovasz.forward(probs_bad, labels)

    # Bad predictions must have strictly higher Lovasz surrogate loss than perfect predictions
    assert loss_bad > loss_perfect
    assert loss_perfect < 0.20


def test_compound_loss_execution():
    logits = np.random.randn(10, 4).astype(np.float32)
    targets = np.random.randint(0, 4, size=10).astype(np.int64)

    compound = CompoundOilSpillLoss(lambda_lovasz=0.75, classes=[0, 1, 2, 3])
    total_loss = compound.forward(logits, targets)

    assert total_loss > 0.0
    assert not np.isnan(total_loss)
