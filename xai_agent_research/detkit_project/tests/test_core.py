import numpy as np
import pytest

from detkit.analysis.acs import acs_from_grid, attention_grid, entropy_from_grid, gaussian_null_grid
from detkit.analysis.matching import box_iou_matrix, match_detections_to_gt
from detkit.analysis.nulls import compute_null_baselines, null_statistics
from detkit.analysis.collect import TPGrid
from detkit.attention.sampling import pad_aware_scale, nearest_query
from detkit.data.datasets import prepare_yolo_yaml
from detkit.models import parse_model_name
from detkit.models.base import DetectorBackend
from detkit.paths import PROJECT_ROOT, resolve
from detkit.training.config import parse_overrides


# ---- models / paths / config -------------------------------------------------------
@pytest.mark.parametrize("name,family,variant", [
    ("rfdetr-small", "rfdetr", "small"), ("RF_DETR_Medium", "rfdetr", "medium"),
    ("rfdetr", "rfdetr", "base"), ("yolo11n", "yolo", "yolo11n"), ("yolov8s", "yolo", "yolov8s"),
    ("custom.pt", "yolo", "custom.pt"),
])
def test_parse_model_name(name, family, variant):
    spec = parse_model_name(name)
    assert (spec.family, spec.variant) == (family, variant)


def test_parse_model_name_errors():
    with pytest.raises(ValueError):
        parse_model_name("rfdetr-huge")
    with pytest.raises(ValueError):
        parse_model_name("resnet50")


def test_resolve_relative_and_absolute(tmp_path):
    assert resolve("weights/a.pth") == PROJECT_ROOT / "weights/a.pth"
    assert resolve(tmp_path) == tmp_path


def test_parse_overrides():
    assert parse_overrides(["a=1", "b=1e-3", "c=cosine", "d=True"]) == {"a": 1, "b": 1e-3, "c": "cosine", "d": True}
    with pytest.raises(ValueError):
        parse_overrides(["oops"])


def test_find_best_weights_prefers_ema(tmp_path):
    from detkit.models.rfdetr_backend import RFDETRBackend
    (tmp_path / "checkpoint_best_total.pth").write_text("x")
    (tmp_path / "checkpoint_best_ema.pth").write_text("x")
    assert RFDETRBackend.find_best_weights(tmp_path).name == "checkpoint_best_ema.pth"
    assert RFDETRBackend.find_best_weights(tmp_path / "missing_dir") is None


def test_prepare_yolo_yaml(tmp_path):
    (tmp_path / "train/images").mkdir(parents=True)
    (tmp_path / "valid/images").mkdir(parents=True)
    (tmp_path / "data.yaml").write_text("train: ../train/images\nval: ../valid/images\nnc: 1\nnames: [a]\n")
    import yaml
    cfg = yaml.safe_load(prepare_yolo_yaml(tmp_path).read_text())
    assert cfg["train"] == "train/images" and cfg["val"] == "valid/images" and "test" not in cfg
    assert cfg["path"] == str(tmp_path.resolve())


# ---- ACS maths ---------------------------------------------------------------------
def _fake_attention(q=3, h=2, l=2, p=2, seed=0):
    rng = np.random.default_rng(seed)
    return rng.random((q, h, l, p, 2)).astype(np.float32), rng.random((q, h, l, p)).astype(np.float32)


def test_attention_grid_mass_is_preserved():
    loc, w = _fake_attention()
    grid = attention_grid(loc, w, 1, 1.0, 1.0, 16)
    assert grid.sum() == pytest.approx(w[1].sum(), rel=1e-5)


def test_padding_points_are_dropped():
    loc = np.full((1, 1, 1, 2, 2), 0.2, dtype=np.float32)
    loc[0, 0, 0, 1] = [0.9, 0.2]            # beyond x_max -> padding
    w = np.array([[[[0.5, 0.5]]]], dtype=np.float32)
    assert attention_grid(loc, w, 0, 0.5, 1.0, 8).sum() == pytest.approx(0.5)


def test_acs_full_box_is_one_and_empty_box_is_zero():
    grid = attention_grid(*_fake_attention(), 0, 1.0, 1.0, 32)
    assert acs_from_grid(grid, (0, 0, 1, 1)) == pytest.approx(1.0)
    assert acs_from_grid(grid, (0.5, 0.5, 0.5, 0.5)) == 0.0
    assert acs_from_grid(np.zeros((8, 8)), (0, 0, 1, 1)) == 0.0


def test_uniform_grid_acs_equals_box_area_and_max_entropy():
    grid = np.ones((64, 64))
    assert acs_from_grid(grid, (0.25, 0.25, 0.75, 0.75)) == pytest.approx(0.25)
    assert entropy_from_grid(grid) == pytest.approx(np.log(64 * 64))


def test_concentrated_attention_inside_box():
    grid = np.zeros((10, 10)); grid[5, 5] = 1.0
    assert acs_from_grid(grid, (0.4, 0.4, 0.7, 0.7)) == 1.0
    assert acs_from_grid(grid, (0.0, 0.0, 0.3, 0.3)) == 0.0
    assert entropy_from_grid(grid) == 0.0


def test_gaussian_grid_normalised():
    assert gaussian_null_grid(32).sum() == pytest.approx(1.0)


# ---- matching ----------------------------------------------------------------------
def test_iou():
    a = np.array([[0, 0, 10, 10.]]); b = np.array([[0, 0, 10, 10.], [5, 0, 15, 10.], [20, 20, 30, 30.]])
    np.testing.assert_allclose(box_iou_matrix(a, b)[0], [1, 1 / 3, 0], atol=1e-6)


def test_matching_tp_fp_fn():
    gt = np.array([[0, 0, 10, 10.], [50, 50, 60, 60.]]); gt_cls = np.array([0, 1])
    pred = np.array([[0, 0, 10, 10.], [0, 0, 10, 10.], [50, 50, 60, 60.]]); pred_cls = np.array([0, 0, 0])
    res, fn = match_detections_to_gt(pred, pred_cls, gt, gt_cls, 0.5)
    assert [r["status"] for r in res] == ["TP", "FP", "FP"]   # duplicate + wrong class
    assert fn == [1]


# ---- geometry ----------------------------------------------------------------------
def test_pad_aware_scale_and_nearest_query():
    assert pad_aware_scale(640, 640) == (1.0, 1.0)
    assert pad_aware_scale(640, 320) == (1.0, 0.5)
    assert pad_aware_scale(640, 320, letterbox=False) == (1.0, 1.0)
    ref = np.array([[0.1, 0.1], [0.5, 0.25], [0.9, 0.9]])
    assert nearest_query(ref, (300, 100, 340, 140), 640, 320, 1.0, 0.5) == 1


# ---- null baselines ----------------------------------------------------------------
def test_null_baselines_focused_attention_beats_nulls():
    rng = np.random.default_rng(1)
    recs = []
    for i in range(30):
        x, y = rng.uniform(0.1, 0.6, 2); s = rng.uniform(0.1, 0.25)
        box = (x, y, x + s, y + s)
        grid = np.zeros((64, 64)); grid[int((y + s / 2) * 64), int((x + s / 2) * 64)] = 1.0  # all mass in own box
        recs.append(TPGrid(i, 0, "c", box, grid))
    nd = compute_null_baselines(recs, 64, n_shuffles=50, seed=0)
    assert (nd["real_acs"] == 1.0).all()
    stats = null_statistics(nd, layer=3)
    assert len(stats) == 3 and (stats["mean_real"] > stats["mean_null"]).all() and (stats["p_value"] < 0.001).all()
