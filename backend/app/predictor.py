"""
TerraSense — Frozen Model Predictor
Loads the frozen production ML model (terrasense_model_v1.pkl) once at startup.
Strictly inference-only. Model is never retrained or modified.
"""

import json
import logging
import pickle
import warnings
from typing import Optional, Dict, Any, List
from pathlib import Path

from .config import settings

# Suppress sklearn version mismatch warnings for clean operational logs
warnings.filterwarnings("ignore", category=UserWarning, module="sklearn")

logger = logging.getLogger(__name__)

class ModelManager:
    _instance: Optional["ModelManager"] = None

    def __init__(self):
        self.model = None
        self.imputer = None
        self.feature_names: List[str] = []
        self.metadata: Dict[str, Any] = {}
        self.config: Dict[str, Any] = {}
        self._loaded = False

    @classmethod
    def get_instance(cls) -> "ModelManager":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def load_model(self) -> None:
        """Loads the frozen model artifact and metadata into memory once."""
        if self._loaded:
            return

        model_path = settings.MODEL_PATH
        if not model_path.exists():
            raise FileNotFoundError(
                f"Frozen model artifact not found at: {model_path}"
            )

        logger.info(f"Loading frozen production model from {model_path}...")
        with open(model_path, "rb") as f:
            artifact = pickle.load(f)

        if isinstance(artifact, dict):
            self.model = artifact.get("model")
            self.imputer = artifact.get("imputer")
            self.feature_names = artifact.get("feature_names", [])
            self.config = artifact.get("config", {})
        else:
            self.model = artifact
            self.feature_names = getattr(self.model, "feature_names_in_", []).tolist() if hasattr(self.model, "feature_names_in_") else []

        # Load metadata JSON if present
        metadata_path = settings.METADATA_PATH
        if metadata_path.exists():
            try:
                with open(metadata_path, "r") as f:
                    self.metadata = json.load(f)
            except Exception as e:
                logger.warning(f"Could not load metadata JSON: {e}")

        self._loaded = True
        logger.info("Frozen model loaded successfully.")

    def is_loaded(self) -> bool:
        return self._loaded

    def get_info(self) -> Dict[str, Any]:
        """Returns safe operational metadata for /api/model/info."""
        if not self._loaded:
            self.load_model()

        feature_count = len(self.feature_names) if self.feature_names else 9
        return {
            "model": "TerraSense v1",
            "status": "FROZEN",
            "feature_count": feature_count,
            "grid_cells": 2534,
            "features": self.feature_names or [
                "lulc_dominant_percentage",
                "clay_0_30_pct",
                "sand_0_30_pct",
                "bulk_density_0_30_kg_dm3",
                "distance_to_river_km",
                "distance_to_road_km",
                "elevation",
                "slope",
                "lulc_class"
            ],
            "rainfall_config": {
                "rainfall_scale": settings.RAINFALL_SCALE,
                "extreme_rain_p95_mm": settings.EXTREME_RAINFALL_7D,
                "extreme_risk_floor": settings.EXTREME_RISK_FLOOR,
                "low_limit": settings.LOW_LIMIT,
                "high_limit": settings.HIGH_LIMIT,
            }
        }

model_manager = ModelManager.get_instance()
