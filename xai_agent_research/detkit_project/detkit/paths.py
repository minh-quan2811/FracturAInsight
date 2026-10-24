"""Project-relative path handling.

Every relative path given by the user (CLI, YAML config, .env) is resolved against
the project root, so scripts behave the same no matter where they are launched from.
"""
from __future__ import annotations

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]


def resolve(path: str | Path, base: Path | None = None) -> Path:
    """Absolute paths are kept; relative paths are resolved against the project root."""
    p = Path(path).expanduser()
    return p if p.is_absolute() else (base or PROJECT_ROOT) / p


def display(path: str | Path) -> str:
    """Shorter, project-relative string for logging."""
    p = Path(path)
    try:
        return str(p.resolve().relative_to(PROJECT_ROOT))
    except ValueError:
        return str(p)
