import json
import os
import re
import hashlib
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
META_FILE = DATA_DIR / "datasets_meta.json"

DEFAULT_DATASET_ID = "anand-corridor-sample"
DEFAULT_DATASET_NAME = "Anand Corridor (Sample)"


class DatasetMetadata(BaseModel):
    dataset_id: str
    name: str
    asset_count: int
    record_count: int
    status: str = "active"  # "active" or "inactive"
    source_file: str
    created_at: str
    assets: List[str] = Field(default_factory=list)


class DatasetManager:
    """
    Manages active dataset selection and metadata persistence for VOLTRA RAG.
    Maintains a single active dataset at a time for operational telemetry queries.
    """

    def __init__(self, meta_path: Path = META_FILE):
        self.meta_path = meta_path
        self._ensure_meta_file()

    def _ensure_meta_file(self) -> None:
        """Initialize metadata JSON if not already created."""
        self.meta_path.parent.mkdir(parents=True, exist_ok=True)
        if not self.meta_path.exists():
            default_meta = {
                "active_dataset_id": DEFAULT_DATASET_ID,
                "datasets": {
                    DEFAULT_DATASET_ID: {
                        "dataset_id": DEFAULT_DATASET_ID,
                        "name": DEFAULT_DATASET_NAME,
                        "asset_count": 18,
                        "record_count": 18,
                        "status": "active",
                        "source_file": "anand_corridor_sample.csv",
                        "created_at": datetime.now().isoformat(),
                        "assets": [f"TX-{101 + i}" for i in range(18)],
                    }
                },
            }
            with open(self.meta_path, "w", encoding="utf-8") as f:
                json.dump(default_meta, f, indent=2)

    def _read_data(self) -> Dict[str, Any]:
        """Read data from the metadata JSON file."""
        self._ensure_meta_file()
        try:
            with open(self.meta_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {"active_dataset_id": DEFAULT_DATASET_ID, "datasets": {}}

    def _write_data(self, data: Dict[str, Any]) -> None:
        """Write data atomically to the metadata JSON file."""
        self.meta_path.parent.mkdir(parents=True, exist_ok=True)
        temp_file = self.meta_path.with_suffix(".tmp")
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        temp_file.replace(self.meta_path)

    @staticmethod
    def derive_dataset_name(filename: str) -> str:
        """
        Derive clean human-readable name from filename.
        e.g. 'ahmedabad_transformers.csv' -> 'Ahmedabad Transformers'
        """
        stem = Path(filename).stem
        # Replace dashes, underscores, and dots with spaces
        clean = re.sub(r"[_\-\.]+", " ", stem)
        # Title case words
        title = " ".join(word.capitalize() for word in clean.split())
        return title or "Custom Dataset"

    @staticmethod
    def derive_dataset_id(filename: str, content_hash: Optional[str] = None) -> str:
        """
        Derive a URL-friendly stable dataset_id from filename and content.
        """
        stem = Path(filename).stem
        slug = re.sub(r"[^a-zA-Z0-9]+", "-", stem).strip("-").lower()
        if not slug:
            slug = "dataset"
        if content_hash:
            short_hash = content_hash[:8]
            return f"{slug}-{short_hash}"
        return slug

    def get_active_dataset_id(self) -> str:
        """Return the current active dataset ID."""
        data = self._read_data()
        return data.get("active_dataset_id", DEFAULT_DATASET_ID)

    def get_active_dataset(self) -> Dict[str, Any]:
        """Return metadata dictionary for the active dataset."""
        data = self._read_data()
        active_id = data.get("active_dataset_id", DEFAULT_DATASET_ID)
        datasets = data.get("datasets", {})
        if active_id in datasets:
            meta = dict(datasets[active_id])
            meta["status"] = "active"
            return meta
        
        # Fallback to default
        return {
            "dataset_id": DEFAULT_DATASET_ID,
            "name": DEFAULT_DATASET_NAME,
            "asset_count": 18,
            "record_count": 18,
            "status": "active",
            "source_file": "anand_corridor_sample.csv",
            "created_at": datetime.now().isoformat(),
            "assets": [f"TX-{101 + i}" for i in range(18)],
        }

    def list_datasets(self) -> List[Dict[str, Any]]:
        """List all registered datasets with their current status."""
        data = self._read_data()
        active_id = data.get("active_dataset_id", DEFAULT_DATASET_ID)
        result = []
        for ds_id, meta in data.get("datasets", {}).items():
            entry = dict(meta)
            entry["status"] = "active" if ds_id == active_id else "inactive"
            result.append(entry)
        return result

    def activate_dataset(self, dataset_id: str) -> Dict[str, Any]:
        """
        Set specified dataset as the active dataset.
        Raises ValueError if dataset_id is not registered.
        """
        data = self._read_data()
        datasets = data.get("datasets", {})
        if dataset_id not in datasets:
            raise ValueError(f"Dataset '{dataset_id}' not found in registry.")

        data["active_dataset_id"] = dataset_id
        for ds_id, meta in datasets.items():
            meta["status"] = "active" if ds_id == dataset_id else "inactive"

        self._write_data(data)
        active_meta = dict(datasets[dataset_id])
        active_meta["status"] = "active"
        return active_meta

    def register_dataset(
        self,
        dataset_id: str,
        name: str,
        asset_count: int,
        record_count: int,
        source_file: str,
        assets: Optional[List[str]] = None,
        set_active: bool = True,
    ) -> Dict[str, Any]:
        """
        Register a newly parsed/indexed dataset into the registry.
        If set_active is True, sets it as the active dataset.
        """
        data = self._read_data()
        datasets = data.get("datasets", {})

        meta = {
            "dataset_id": dataset_id,
            "name": name,
            "asset_count": asset_count,
            "record_count": record_count,
            "status": "active" if set_active else "inactive",
            "source_file": source_file,
            "created_at": datetime.now().isoformat(),
            "assets": sorted(list(set(assets or []))),
        }

        datasets[dataset_id] = meta
        if set_active:
            data["active_dataset_id"] = dataset_id
            for ds_id, d in datasets.items():
                d["status"] = "active" if ds_id == dataset_id else "inactive"

        data["datasets"] = datasets
        self._write_data(data)
        return meta


dataset_manager = DatasetManager()
