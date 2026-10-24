"""Layer-by-layer attention heatmaps for one detection."""
from __future__ import annotations

from pathlib import Path

import cv2
import matplotlib

matplotlib.use("Agg")
import matplotlib.patches as patches
import matplotlib.pyplot as plt
import numpy as np
from PIL import Image

from ..attention import DecoderAttentionCapture, nearest_query, pad_aware_scale


def attention_heatmap(loc, w, q_idx, width, height, x_max, y_max, blur=51) -> np.ndarray:
    """Un-normalised heatmap at original-image resolution for one query."""
    xy = np.clip(loc[q_idx], 0, 1)
    xs, ys, ws = xy[..., 0].ravel(), xy[..., 1].ravel(), w[q_idx].ravel()
    ok = (xs <= x_max) & (ys <= y_max)
    px = np.clip((xs[ok] / x_max * (width - 1)).astype(int), 0, width - 1)
    py = np.clip((ys[ok] / y_max * (height - 1)).astype(int), 0, height - 1)
    hm = np.zeros((height, width), dtype=np.float32)
    np.add.at(hm, (py, px), ws[ok].astype(np.float32))
    k = blur if blur % 2 == 1 else blur + 1
    return cv2.GaussianBlur(hm, (k, k), 0)


def _overlay(img_np, heat, alpha=0.55):
    colored = (matplotlib.colormaps["jet"](heat)[:, :, :3] * 255).astype(np.uint8)
    return (img_np * (1 - alpha) + colored * alpha).astype(np.uint8)


def render_layer_evolution(backend, image_path, detection_idx, out_path: Path, cfg, dpi=300) -> bool:
    """Re-run one image and save: original | layer 1 | ... | layer N (heatmaps share one colour scale)."""
    import torch

    image = Image.open(image_path).convert("RGB")
    W, H = image.size
    with DecoderAttentionCapture(backend.torch_module()) as cap, torch.no_grad():
        det = backend.predict(image, cfg.det_threshold)
    if not cap.fired or detection_idx >= len(det):
        return False

    layers, ref_xy = cap.layers(), cap.reference_xy()
    x_max, y_max = pad_aware_scale(W, H, cfg.input_size, cfg.letterbox)
    box = det.xyxy[detection_idx]
    q = nearest_query(ref_xy, box, W, H, x_max, y_max)

    raw = {ln: attention_heatmap(la.loc, la.w, q, W, H, x_max, y_max) for ln, la in layers.items()}
    shared_max = max(h.max() for h in raw.values()) + 1e-8   # shared scale -> comparable brightness
    img_np = np.array(image)
    x1, y1, x2, y2 = box

    fig, axes = plt.subplots(1, len(raw) + 1, figsize=(5 * (len(raw) + 1), 5))
    axes[0].imshow(image)
    axes[0].add_patch(patches.Rectangle((x1, y1), x2 - x1, y2 - y1, lw=2, ec="red", fc="none"))
    axes[0].set_title("Original")
    for ax, ln in zip(axes[1:], sorted(raw)):
        ax.imshow(_overlay(img_np, raw[ln] / shared_max))
        ax.add_patch(patches.Rectangle((x1, y1), x2 - x1, y2 - y1, lw=2, ec="white", fc="none"))
        ax.set_title(f"Layer {ln}\n(raw peak: {raw[ln].max():.3f})")
    for ax in axes:
        ax.axis("off")
    fig.suptitle("Layer-wise decoder cross-attention", fontweight="bold")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out_path, dpi=dpi, bbox_inches="tight")
    plt.close(fig)
    return True
