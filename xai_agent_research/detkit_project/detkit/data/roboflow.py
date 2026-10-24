"""Dataset download / lookup. Credentials come from `.env`."""
from __future__ import annotations

import logging
from pathlib import Path

from ..paths import display, resolve
from ..settings import RoboflowSettings, datasets_dir

log = logging.getLogger(__name__)


def export_format(family: str, rf: RoboflowSettings) -> str:
    return "coco" if family == "rfdetr" else rf.yolo_format


def default_dataset_location(family: str, rf: RoboflowSettings) -> Path:
    return datasets_dir() / f"{rf.project}-v{rf.version}-{export_format(family, rf)}"


def download_dataset(family: str, force: bool = False) -> Path:
    from roboflow import Roboflow  # lazy: only needed when downloading

    rf = RoboflowSettings.from_env()
    location = default_dataset_location(family, rf)
    if location.exists() and not force:
        return location
    fmt = export_format(family, rf)
    log.info("Downloading %s/%s v%s (%s) -> %s",
             rf.workspace, rf.project, rf.version, fmt, display(location))
    version = Roboflow(api_key=rf.api_key).workspace(rf.workspace).project(rf.project).version(rf.version)
    version.download(fmt, location=str(location), overwrite=True)
    return location


def resolve_dataset(family: str, dataset: str | Path | None = None, force_download: bool = False) -> Path:
    """Use `dataset` if given; otherwise use / download the Roboflow dataset from `.env`."""
    if dataset:
        path = resolve(dataset)
        if not path.exists():
            raise FileNotFoundError(f"Dataset folder not found: {display(path)}")
        return path
    return download_dataset(family, force=force_download)
