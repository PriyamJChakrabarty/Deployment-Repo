import os
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.getenv("BACKEND_DATA_DIR", BACKEND_ROOT))
DATA_DIR.mkdir(parents=True, exist_ok=True)


def backend_path(filename: str) -> Path:
    return BACKEND_ROOT / filename


def data_path(filename: str) -> Path:
    return DATA_DIR / filename
