"""Small helpers shared by evaluation and analysis."""
from __future__ import annotations

import json
from pathlib import Path

from .paths import resolve


def load_class_map(path: str | Path | None) -> dict[str, str]:
    """Optional JSON {raw_class_name: display_name} (see configs/class_names.example.json)."""
    if not path:
        return {}
    return {str(k): v for k, v in json.loads(resolve(path).read_text()).items()}


def display_names(raw_classes: list[str], class_map: dict[str, str] | None = None) -> list[str]:
    class_map = class_map or {}
    return [class_map.get(str(c), str(c)) for c in raw_classes]
