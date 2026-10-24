"""End-to-end smoke tests with a fake detector (no torch / rfdetr / GPU required)."""
import contextlib
import sys
import types

import numpy as np
import pytest
import supervision as sv
from PIL import Image

from detkit.attention.sampling import LayerAttention

N_LAYERS, Q = 3, 20


class FakeBackend:
    family, low_conf = "rfdetr", 0.0

    def __init__(self, gt_by_name):
        self.gt = gt_by_name
        self._current = None

    def torch_module(self):
        return object()

    def predict(self, image, threshold):
        self._current = image
        return self._dets[threshold >= 0.5]

    def set_dets(self, full, filtered):
        self._dets = {False: full, True: filtered}


@pytest.fixture
def dataset(tmp_path):
    paths, anns = [], {}
    for i in range(6):
        p = tmp_path / f"img{i}.jpg"
        Image.fromarray(np.random.default_rng(i).integers(0, 255, (120, 160, 3), dtype=np.uint8)).save(p)
        paths.append(str(p))
        anns[str(p)] = sv.Detections(xyxy=np.array([[20., 20, 80, 80]]), class_id=np.array([1]))
    return sv.DetectionDataset(classes=["proj", "fracture", "healthy"], images=paths, annotations=anns)


def _fake_capture_factory():
    class FakeCapture:
        def __init__(self, module):
            pass
        def __enter__(self): return self
        def __exit__(self, *a): return False
        fired, num_layers = True, N_LAYERS
        def layers(self):
            rng = np.random.default_rng(0)
            out = {}
            for ln in range(1, N_LAYERS + 1):
                loc = np.clip(rng.normal([0.35, 0.4], 0.08 * (N_LAYERS - ln + 1), (Q, 2, 2, 2, 2)), 0, 1)
                out[ln] = LayerAttention(loc.astype(np.float32), rng.random((Q, 2, 2, 2)).astype(np.float32))
            return out
        def reference_xy(self):
            return np.tile([[0.35, 0.4]], (Q, 1)) + np.arange(Q)[:, None] * 0.01
    return FakeCapture


@pytest.fixture
def stub_torch(monkeypatch):
    t = types.ModuleType("torch")
    t.no_grad = contextlib.nullcontext
    t.Tensor = type("Tensor", (), {})          # keeps scipy's array-API detection happy
    t.__spec__ = None
    monkeypatch.setitem(sys.modules, "torch", t)


def test_evaluation_end_to_end(dataset, tmp_path):
    from detkit.evaluation import evaluate_detector, plot_confusion_matrix

    be = FakeBackend({})
    det = sv.Detections(xyxy=np.array([[22., 22, 80, 80], [100, 10, 140, 50]]),
                        class_id=np.array([1, 2]), confidence=np.array([0.9, 0.2]))
    be.set_dets(det, det[det.confidence >= 0.5])
    res = evaluate_detector(be, dataset, conf=0.5, iou=0.5, placeholder="proj", class_map={"fracture": "Fracture"})
    assert res.classes == ["Fracture", "healthy"]
    row = res.per_class.iloc[0]
    assert row["class"] == "Fracture" and row["TP"] == 6 and row["FN"] == 0 and row["recall"] == 1.0
    res.save(tmp_path / "eval")
    plot_confusion_matrix(res, tmp_path / "eval")
    assert (tmp_path / "eval" / "confusion_matrix.png").exists()
    assert (tmp_path / "eval" / "per_class_metrics.csv").exists()


def test_acs_pipeline_end_to_end(dataset, tmp_path, monkeypatch, stub_torch):
    from detkit.analysis import AcsConfig, AnalysisOptions, run_acs_analysis
    import detkit.analysis.collect as collect
    import detkit.analysis.visualize as visualize

    cap = _fake_capture_factory()
    monkeypatch.setattr(collect, "DecoderAttentionCapture", cap)
    monkeypatch.setattr(visualize, "DecoderAttentionCapture", cap)

    be = FakeBackend({})
    det = sv.Detections(xyxy=np.array([[22., 22, 80, 80], [100, 10, 140, 50]]),
                        class_id=np.array([1, 2]), confidence=np.array([0.9, 0.8]))
    be.set_dets(det, det)

    out = tmp_path / "acs_out"
    opts = AnalysisOptions(acs=AcsConfig(), n_shuffles=20, n_figures=1,
                           class_pairs=[("fracture", "healthy")], healthy_class="healthy")
    summary = run_acs_analysis(be, dataset, out, opts)

    for f in ("attention_analysis.csv", "statistical_results.csv", "null_baseline_acs.csv",
              "null_baseline_statistical_results.csv", "acs_by_layer_and_status.csv", "run_summary.json"):
        assert (out / f).exists(), f
    assert list((out / "figures").glob("*.png"))
    assert summary["n_TP"] == 6 and summary["n_FP"] == 6 and summary["decoder_layers"] == N_LAYERS

    import pandas as pd
    df = pd.read_csv(out / "attention_analysis.csv")
    tp = df[(df.status == "TP")]
    # attention narrows with depth in the fake data -> ACS should not decrease from layer 1 to last
    assert tp[tp.layer == N_LAYERS].acs.mean() >= tp[tp.layer == 1].acs.mean()
