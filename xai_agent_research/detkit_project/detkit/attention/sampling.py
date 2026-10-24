"""Capture RF-DETR decoder cross-attention and recompute sampling locations / weights.

This is the one place that knows how RF-DETR's deformable attention is laid out, so the
training loss and the ACS analysis share the same code (it used to be copy-pasted 5 times).
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np


def recompute_attention(module, inputs):
    """Differentiable recompute of (sampling_locations, attention_weights) from the
    inputs captured by a forward hook on a deformable cross-attention module."""
    import torch
    import torch.nn.functional as F

    query, reference_points, _input_flatten, spatial_shapes, _level_start, _padding_mask = inputs
    N, Len_q, _ = query.shape

    offsets = module.sampling_offsets(query).view(
        N, Len_q, module.n_heads, module.n_levels, module.n_points, 2)
    attn = module.attention_weights(query).view(
        N, Len_q, module.n_heads, module.n_levels * module.n_points)
    weights = F.softmax(attn, -1).view(N, Len_q, module.n_heads, module.n_levels, module.n_points)

    if reference_points.shape[-1] == 2:
        normalizer = torch.stack([spatial_shapes[..., 1], spatial_shapes[..., 0]], -1)
        locations = reference_points[:, :, None, :, None, :] + offsets / normalizer[None, None, None, :, None, :]
    elif reference_points.shape[-1] == 4:
        locations = (reference_points[:, :, None, :, None, :2]
                     + offsets / module.n_points * reference_points[:, :, None, :, None, 2:] * 0.5)
    else:
        raise RuntimeError(f"Unexpected reference_points shape: {reference_points.shape}")
    return locations, weights


@dataclass
class LayerAttention:
    """Attention of one decoder layer for one image (numpy, batch dim removed)."""
    loc: np.ndarray   # (queries, heads, levels, points, 2), normalised 0-1
    w: np.ndarray     # (queries, heads, levels, points)


class DecoderAttentionCapture:
    """Context manager: hooks every decoder cross-attention layer during a forward pass.

        with DecoderAttentionCapture(nn_module) as cap:
            detections = backend.predict(image, 0.5)
        layers = cap.layers()          # {1: LayerAttention, 2: ..., N: ...}
        ref_xy = cap.reference_xy()    # (queries, 2) from the last layer
    """

    def __init__(self, nn_module):
        self.decoder_layers = nn_module.transformer.decoder.layers
        self._cache: dict[int, dict] = {}
        self._handles: list = []

    @property
    def num_layers(self) -> int:
        return len(self.decoder_layers)

    def __enter__(self):
        for i, layer in enumerate(self.decoder_layers, start=1):
            def hook(module, inputs, output, _i=i):
                self._cache[_i] = {"module": module, "inputs": inputs}
            self._handles.append(layer.cross_attn.register_forward_hook(hook))
        return self

    def __exit__(self, *exc):
        for h in self._handles:
            h.remove()
        self._handles.clear()

    @property
    def fired(self) -> bool:
        return bool(self._cache)

    def layers(self) -> dict[int, LayerAttention]:
        out = {}
        for ln, c in self._cache.items():
            loc, w = recompute_attention(c["module"], c["inputs"])
            out[ln] = LayerAttention(loc[0].detach().cpu().numpy(), w[0].detach().cpu().numpy())
        return out

    def reference_xy(self) -> np.ndarray:
        """Per-query reference point (x, y), normalised - used to map a box to its query."""
        ref = self._cache[self.num_layers]["inputs"][1][0].detach().cpu()
        if ref.dim() == 3:
            ref = ref.mean(dim=1)
        elif not (ref.dim() == 2 and ref.shape[-1] >= 2):
            ref = ref.reshape(ref.shape[0], -1)
        return ref[:, :2].numpy()


def pad_aware_scale(width: int, height: int, input_size: int = 640, letterbox: bool = True):
    """Fraction of the model input that holds real image content (x_max_norm, y_max_norm)."""
    if not letterbox:
        return 1.0, 1.0
    scale = input_size / max(height, width)
    return round(width * scale) / input_size, round(height * scale) / input_size


def nearest_query(ref_xy: np.ndarray, box_xyxy, width: int, height: int, x_max: float, y_max: float) -> int:
    """Spatial-proximity heuristic: the query whose reference point is closest to the box centre."""
    x1, y1, x2, y2 = box_xyxy
    cx = ((x1 + x2) / 2) / width * x_max
    cy = ((y1 + y2) / 2) / height * y_max
    return int(((ref_xy[:, 0] - cx) ** 2 + (ref_xy[:, 1] - cy) ** 2).argmin())
