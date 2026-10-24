"""Reads `.env` (Roboflow credentials, folder locations) once, in one place."""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

from .paths import PROJECT_ROOT, resolve

load_dotenv(PROJECT_ROOT / ".env")


def _dir(env_name: str, default: str) -> Path:
    return resolve(os.environ.get(env_name) or default)


def datasets_dir() -> Path:
    return _dir("DATASETS_DIR", "datasets")


def weights_dir() -> Path:
    return _dir("WEIGHTS_DIR", "weights")


def runs_dir() -> Path:
    return _dir("RUNS_DIR", "runs")


def outputs_dir() -> Path:
    return _dir("OUTPUTS_DIR", "outputs")


@dataclass(frozen=True)
class RoboflowSettings:
    api_key: str
    workspace: str
    project: str
    version: int
    yolo_format: str = "yolov8"

    @classmethod
    def from_env(cls) -> "RoboflowSettings":
        missing = [k for k in ("ROBOFLOW_API_KEY", "ROBOFLOW_WORKSPACE", "ROBOFLOW_PROJECT")
                   if not os.environ.get(k)]
        if missing:
            raise EnvironmentError(
                f"Missing {', '.join(missing)}. Copy `.env.example` to `.env` in the project "
                f"root and fill it in (or pass --dataset <folder> to use a local dataset)."
            )
        return cls(
            api_key=os.environ["ROBOFLOW_API_KEY"],
            workspace=os.environ["ROBOFLOW_WORKSPACE"],
            project=os.environ["ROBOFLOW_PROJECT"],
            version=int(os.environ.get("ROBOFLOW_VERSION", "1")),
            yolo_format=os.environ.get("ROBOFLOW_YOLO_FORMAT", "yolov8"),
        )


def default_placeholder_class(family: str) -> str | None:
    """Name of Roboflow's pseudo-class (COCO exports only) that metrics should ignore."""
    explicit = os.environ.get("PLACEHOLDER_CLASS")
    if explicit:
        return explicit
    if family == "rfdetr":
        return os.environ.get("ROBOFLOW_PROJECT") or None
    return None
