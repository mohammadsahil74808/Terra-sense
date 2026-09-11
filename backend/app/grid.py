"""
TerraSense — Grid Management & Spatial Lookup
Loads the frozen 2534-cell susceptibility grid from parquet.
Provides sub-millisecond nearest-cell spatial lookup using KD-Tree.
"""

import logging
from typing import Optional, List, Dict, Any, Tuple
import pandas as pd
import numpy as np
from scipy.spatial import cKDTree

from .config import settings
from .utils import get_state_for_coordinates, haversine_distance_km
from .settlements import settlement_locator

logger = logging.getLogger(__name__)

class GridManager:
    _instance: Optional["GridManager"] = None

    def __init__(self):
        self.df: Optional[pd.DataFrame] = None
        self.tree: Optional[cKDTree] = None
        self.cells_cache: List[Dict[str, Any]] = []
        self._loaded = False

    @classmethod
    def get_instance(cls) -> "GridManager":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def load_grid(self) -> None:
        """Loads the parquet file once into memory and constructs the KD-Tree index."""
        if self._loaded:
            return

        parquet_path = settings.PARQUET_PATH
        if not parquet_path.exists():
            raise FileNotFoundError(
                f"Frozen susceptibility grid not found at: {parquet_path}"
            )

        logger.info(f"Loading susceptibility grid from {parquet_path}...")
        df = pd.read_parquet(parquet_path)
        
        # Validate expected columns: cell_id, latitude, longitude, susceptibility_score
        required_cols = {"cell_id", "latitude", "longitude", "susceptibility_score"}
        missing = required_cols - set(df.columns)
        if missing:
            raise ValueError(f"Parquet file missing required columns: {missing}")

        self.df = df
        coords = np.column_stack([df["latitude"].values, df["longitude"].values])
        self.tree = cKDTree(coords)

        # Pre-build list of cell dicts with state and nearest settlement for fast /api/map/cells serialization
        self.cells_cache = []
        for _, row in df.iterrows():
            lat = float(row["latitude"])
            lon = float(row["longitude"])
            score = float(row["susceptibility_score"])
            cell_state = get_state_for_coordinates(lat, lon)
            settlement = settlement_locator.find_nearest_settlement(lat, lon, cell_state)
            self.cells_cache.append({
                "cell_id": int(row["cell_id"]),
                "latitude": round(lat, 4),
                "longitude": round(lon, 4),
                "susceptibility": round(score, 4),
                "state": cell_state,
                "district": settlement["district"],
                "subdivision": settlement["subdivision"],
                "village": settlement["village"],
                "pincode": settlement["pincode"],
                "full_address": settlement["full_address"],
                "short_address": settlement["short_address"],
                "place_type": settlement["place_type"],
                "nearest_place": settlement["nearest_place"],
                "place_distance_km": settlement["place_distance_km"],
                "location_name": settlement["location_name"],
            })

        self._loaded = True
        logger.info(f"Loaded {len(self.cells_cache)} grid cells successfully.")

    def is_loaded(self) -> bool:
        return self._loaded

    def get_all_cells(self) -> List[Dict[str, Any]]:
        """Returns all 2534 cells for the map susceptibility layer."""
        if not self._loaded:
            self.load_grid()
        return self.cells_cache

    def find_nearest_cell(self, lat: float, lon: float) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """
        Finds the nearest grid cell for given coordinates.
        Returns (cell_dict, None) on success.
        Returns (None, error_code) if outside supported monitoring area.
        """
        if not self._loaded:
            self.load_grid()

        # 1. Bounding box check for Northeast India
        if (lat < settings.MIN_LAT or lat > settings.MAX_LAT or
            lon < settings.MIN_LON or lon > settings.MAX_LON):
            return None, "LOCATION_OUTSIDE_SUPPORTED_GRID"

        # 2. Nearest neighbor search using KD-tree
        dist, idx = self.tree.query([lat, lon])

        # If closest cell is too far (> 0.25 degrees approx 27km)
        if dist > settings.MAX_CELL_DISTANCE_DEG:
            return None, "LOCATION_OUTSIDE_SUPPORTED_GRID"

        row = self.df.iloc[idx]
        cell_lat = float(row["latitude"])
        cell_lon = float(row["longitude"])
        cell_id = int(row["cell_id"])
        score = float(row["susceptibility_score"])
        cell_state = get_state_for_coordinates(cell_lat, cell_lon)
        settlement = settlement_locator.find_nearest_settlement(cell_lat, cell_lon, cell_state)

        return {
            "cell_id": f"NE_{cell_id:04d}",
            "raw_cell_id": cell_id,
            "latitude": round(cell_lat, 4),
            "longitude": round(cell_lon, 4),
            "susceptibility": round(score, 4),
            "state": cell_state,
            "district": settlement["district"],
            "subdivision": settlement["subdivision"],
            "village": settlement["village"],
            "pincode": settlement["pincode"],
            "full_address": settlement["full_address"],
            "short_address": settlement["short_address"],
            "place_type": settlement["place_type"],
            "nearest_place": settlement["nearest_place"],
            "place_distance_km": settlement["place_distance_km"],
            "location_name": settlement["location_name"],
            "distance_km": round(haversine_distance_km(lat, lon, cell_lat, cell_lon), 2)
        }, None

    def get_susceptibility_summary(self) -> Dict[str, int]:
        """Calculates static susceptibility distribution for dashboard overview."""
        if not self._loaded:
            self.load_grid()

        scores = self.df["susceptibility_score"].values
        low = int(np.sum(scores < settings.LOW_LIMIT))
        mod = int(np.sum((scores >= settings.LOW_LIMIT) & (scores < settings.HIGH_LIMIT)))
        high = int(np.sum(scores >= settings.HIGH_LIMIT))

        return {
            "monitored_cells": len(self.df),
            "low_risk": low,
            "moderate_risk": mod,
            "high_risk": high,
        }

grid_manager = GridManager.get_instance()
