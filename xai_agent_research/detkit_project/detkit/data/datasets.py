"""Load a split of a downloaded dataset as a `supervision.DetectionDataset`."""
from __future__ import annotations

from pathlib import Path

import yaml

_SPLIT_ALIASES = {"val": "valid", "valid": "val"}


def find_split_dir(dataset_dir: Path, split: str) -> Path:
    for name in (split, _SPLIT_ALIASES.get(split)):
        if name and (dataset_dir / name).is_dir():
            return dataset_dir / name
    found = sorted(p.name for p in dataset_dir.iterdir() if p.is_dir())
    raise FileNotFoundError(f"Split '{split}' not found in {dataset_dir} (folders: {found})")


def load_detection_dataset(family: str, dataset_dir: Path, split: str = "test"):
    import supervision as sv

    split_dir = find_split_dir(dataset_dir, split)
    if family == "rfdetr":  # COCO layout
        return sv.DetectionDataset.from_coco(
            images_directory_path=str(split_dir),
            annotations_path=str(split_dir / "_annotations.coco.json"),
        )
    return sv.DetectionDataset.from_yolo(  # YOLO layout
        images_directory_path=str(split_dir / "images"),
        annotations_directory_path=str(split_dir / "labels"),
        data_yaml_path=str(dataset_dir / "data.yaml"),
    )


def get_samples(ds) -> list[tuple[str, "object"]]:
    """[(image_path, sv.Detections)] without decoding images (supervision would load each one)."""
    if hasattr(ds, "image_paths") and hasattr(ds, "annotations"):
        return [(p, ds.annotations[p]) for p in ds.image_paths]
    return [(path, ann) for path, _img, ann in ds]


def prepare_yolo_yaml(dataset_dir: Path) -> Path:
    """Roboflow's data.yaml uses '../train/images'-style paths that Ultralytics resolves
    inconsistently. Write a sibling `data_resolved.yaml` with the dataset folder as `path:`."""
    src = dataset_dir / "data.yaml"
    if not src.exists():
        raise FileNotFoundError(f"{src} not found - is this a YOLO-format dataset?")
    cfg = yaml.safe_load(src.read_text())
    cfg["path"] = str(dataset_dir.resolve())
    for key, aliases in (("train", ("train",)), ("val", ("valid", "val")), ("test", ("test",))):
        folder = next((a for a in aliases if (dataset_dir / a / "images").is_dir()), None)
        if folder:
            cfg[key] = f"{folder}/images"
        else:
            cfg.pop(key, None)
    out = dataset_dir / "data_resolved.yaml"
    out.write_text(yaml.safe_dump(cfg, sort_keys=False))
    return out
