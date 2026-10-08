import base64
import os
import threading
import time
import traceback
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np
import torch
import torch.nn.functional as F
from rfdetr import RFDETRSmall

from ..common import load_rgb_image, make_detection, make_result

# class_id from RF-DETR -> name (0 is the dataset placeholder)
CLASS_NAMES = {
    1: "Comminuted",
    2: "Greenstick",
    3: "Healthy",
    4: "Linear",
    5: "Oblique Displaced",
    6: "Oblique",
    7: "Segmental",
    8: "Spiral",
    9: "Transverse Displaced",
    10: "Transverse",
}

# name -> FractureType value (None means not a fracture, so it is dropped)
NAME_TO_FRACTURE_TYPE = {
    "Comminuted": "comminuted",
    "Greenstick": "greenstick",
    "Healthy": None,
    "Linear": "linear",
    "Oblique Displaced": "oblique",
    "Oblique": "oblique",
    "Segmental": "segmental",
    "Spiral": "spiral",
    "Transverse Displaced": "transverse",
    "Transverse": "transverse",
}

_CROSS_ATTN_ARGS = (
    "query", "reference_points", "input_flatten",
    "spatial_shapes", "level_start_index", "input_padding_mask",
)


def match_query(ref_xy: np.ndarray, box_xyxy, W: int, H: int, x_max: float, y_max: float) -> int:
    """Index of the query whose reference point is closest to the box center."""
    x1, y1, x2, y2 = box_xyxy
    cx = ((x1 + x2) / 2) / W * x_max
    cy = ((y1 + y2) / 2) / H * y_max
    return int(((ref_xy[:, 0] - cx) ** 2 + (ref_xy[:, 1] - cy) ** 2).argmin())


def build_query_heatmap(
    loc: np.ndarray, weights: np.ndarray, query_id: int,
    W: int, H: int, x_max: float, y_max: float, blur_kernel: int,
) -> np.ndarray:
    """Full-resolution (H, W) heatmap in [0, 1] for one query."""
    pts = np.clip(loc[query_id].reshape(-1, 2), 0.0, 1.0)
    wts = weights[query_id].reshape(-1)

    keep = (pts[:, 0] <= x_max) & (pts[:, 1] <= y_max)
    pts, wts = pts[keep], wts[keep]

    xs = np.clip((pts[:, 0] / x_max * (W - 1)).astype(int), 0, W - 1)
    ys = np.clip((pts[:, 1] / y_max * (H - 1)).astype(int), 0, H - 1)

    heat = np.zeros((H, W), dtype=np.float32)
    np.add.at(heat, (ys, xs), wts)

    k = blur_kernel if blur_kernel % 2 == 1 else blur_kernel + 1
    heat = cv2.GaussianBlur(heat, (k, k), 0)
    if heat.max() > 0:
        heat /= heat.max()
    return heat


def heatmap_to_attention(heat: np.ndarray, grid_long_side: int) -> Dict[str, Any]:
    """Downsample a heatmap to a small uint8 grid packed as base64."""
    H, W = heat.shape
    scale = grid_long_side / max(H, W)
    gw, gh = max(1, round(W * scale)), max(1, round(H * scale))

    small = cv2.resize(heat, (gw, gh), interpolation=cv2.INTER_AREA)
    if small.max() > 0:
        small = small / small.max()
    grid = np.clip(np.rint(small * 255), 0, 255).astype(np.uint8)

    return {
        "layer": "decoder_last",
        "width": gw,
        "height": gh,
        "encoding": "uint8_base64",
        "data": base64.b64encode(grid.tobytes()).decode("ascii"),
    }


class RFDETRPredictor:
    name = "rfdetr"
    model_version = "RF-DETR-Small"

    def __init__(
        self,
        weights_path: str,
        confidence_threshold: float = 0.5,
        attention_grid_size: int = 48,
        blur_kernel: int = 51,
        model_input_size: int = 640,
        pad_aware: bool = False,
    ):
        # pad_aware is False because uploads are already letterboxed to 640x640.
        self.weights_path = weights_path
        self.confidence_threshold = confidence_threshold
        self.attention_grid_size = attention_grid_size
        self.blur_kernel = blur_kernel
        self.model_input_size = model_input_size
        self.pad_aware = pad_aware

        self._model: Optional[RFDETRSmall] = None
        self._lock = threading.Lock()

    def _ensure_loaded(self) -> RFDETRSmall:
        if self._model is None:
            with self._lock:
                if self._model is None:
                    if not os.path.isfile(self.weights_path):
                        raise RuntimeError(f"RF-DETR weights not found: {self.weights_path}")
                    self._model = RFDETRSmall(pretrain_weights=self.weights_path)
                    self._model.model.model.eval()
                    print(f"RF-DETR model loaded from {self.weights_path}")
        return self._model

    @staticmethod
    def _last_cross_attn(model: RFDETRSmall):
        return model.model.model.transformer.decoder.layers[-1].cross_attn

    @staticmethod
    def _recompute_attention(module, captured: Dict[str, Any]) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """Returns (sampling locations, attention weights, per-query reference xy) as numpy."""
        query = captured["query"]
        reference_points = captured["reference_points"]
        spatial_shapes = captured["spatial_shapes"]
        N, Len_q, _ = query.shape

        offsets = module.sampling_offsets(query).view(
            N, Len_q, module.n_heads, module.n_levels, module.n_points, 2
        )
        weights = module.attention_weights(query).view(
            N, Len_q, module.n_heads, module.n_levels * module.n_points
        )
        weights = F.softmax(weights, -1).view(
            N, Len_q, module.n_heads, module.n_levels, module.n_points
        )

        if reference_points.shape[-1] == 2:
            normalizer = torch.stack([spatial_shapes[..., 1], spatial_shapes[..., 0]], -1)
            locations = (
                reference_points[:, :, None, :, None, :]
                + offsets / normalizer[None, None, None, :, None, :]
            )
        elif reference_points.shape[-1] == 4:
            locations = (
                reference_points[:, :, None, :, None, :2]
                + offsets / module.n_points
                * reference_points[:, :, None, :, None, 2:] * 0.5
            )
        else:
            raise RuntimeError(f"Unexpected reference_points shape: {tuple(reference_points.shape)}")

        ref = reference_points[0]
        if ref.dim() == 3:
            ref = ref.mean(dim=1)

        return (
            locations[0].detach().cpu().numpy(),
            weights[0].detach().cpu().numpy(),
            ref[:, :2].detach().cpu().numpy(),
        )

    def _valid_range(self, W: int, H: int) -> Tuple[float, float]:
        if not self.pad_aware:
            return 1.0, 1.0
        scale = self.model_input_size / max(H, W)
        return (
            round(W * scale) / self.model_input_size,
            round(H * scale) / self.model_input_size,
        )

    def predict(self, image_bytes: bytes, explain: bool = True) -> Dict[str, Any]:
        model = self._ensure_loaded()
        image = load_rgb_image(image_bytes)
        W, H = image.size

        with self._lock:
            captured: Dict[str, Any] = {}
            handle = None
            if explain:
                def hook(module, args, kwargs, output):
                    merged = dict(zip(_CROSS_ATTN_ARGS, args))
                    merged.update(kwargs)
                    captured.update(merged)
                    captured["module"] = module

                handle = self._last_cross_attn(model).register_forward_hook(hook, with_kwargs=True)

            try:
                start = time.perf_counter()
                with torch.no_grad():
                    sv_detections = model.predict(image, threshold=self.confidence_threshold)
                inference_time = time.perf_counter() - start
            finally:
                if handle is not None:
                    handle.remove()

            kept: List[Tuple[int, str, str, float, np.ndarray]] = []
            for xyxy, conf, cls in zip(
                sv_detections.xyxy, sv_detections.confidence, sv_detections.class_id
            ):
                name = CLASS_NAMES.get(int(cls))
                fracture_type = NAME_TO_FRACTURE_TYPE.get(name) if name else None
                if fracture_type is None:
                    continue
                kept.append((int(cls), name, fracture_type, float(conf), xyxy))

            attentions: List[Optional[Dict[str, Any]]] = [None] * len(kept)
            if explain and kept:
                attentions = self._attentions_for(captured, [k[4] for k in kept], W, H)

        detections = [
            make_detection(cls, name, conf, ftype, xyxy, attention=att)
            for (cls, name, ftype, conf, xyxy), att in zip(kept, attentions)
        ]
        return make_result(detections, inference_time)

    def _attentions_for(self, captured: Dict[str, Any], boxes, W: int, H: int):
        """One attention dict per box; on failure returns None so the boxes are still kept."""
        try:
            if "module" not in captured:
                raise RuntimeError("cross-attention hook did not fire")

            with torch.no_grad():
                loc, weights, ref_xy = self._recompute_attention(captured["module"], captured)
            x_max, y_max = self._valid_range(W, H)

            out = []
            for box in boxes:
                q = match_query(ref_xy, box, W, H, x_max, y_max)
                heat = build_query_heatmap(loc, weights, q, W, H, x_max, y_max, self.blur_kernel)
                out.append(heatmap_to_attention(heat, self.attention_grid_size))
            return out
        except Exception:
            print("RF-DETR attention extraction failed; returning boxes only")
            traceback.print_exc()
            return [None] * len(boxes)