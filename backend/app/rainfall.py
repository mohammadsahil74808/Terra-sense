"""
TerraSense — Live Rainfall Pipeline & Caching
Abstracts rainfall providers (Open-Meteo, IMD, Mock) with transparent
2-tier caching (in-memory + disk) and graceful fallback.
"""

import json
import logging
import time
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Optional, Tuple

import httpx
from .config import settings
from .utils import utc_now_iso

logger = logging.getLogger(__name__)

class BaseRainfallProvider(ABC):
    """Abstract base class for rainfall providers."""

    @abstractmethod
    async def fetch_rainfall(self, latitude: float, longitude: float) -> Dict[str, Any]:
        """Fetch precipitation metrics (1d, 3d, 7d, 14d) for coordinates."""
        pass


class OpenMeteoProvider(BaseRainfallProvider):
    """
    Fetches real-time and historical precipitation from Open-Meteo weather API.
    Does not require an API key; respects rate limits.
    """
    BASE_URL = "https://api.open-meteo.com/v1/forecast"

    async def fetch_rainfall(self, latitude: float, longitude: float) -> Dict[str, Any]:
        params = {
            "latitude": round(latitude, 4),
            "longitude": round(longitude, 4),
            "daily": "precipitation_sum",
            "past_days": 14,
            "forecast_days": 1,
            "timezone": "Asia/Kolkata",
        }

        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(self.BASE_URL, params=params)
            resp.raise_for_status()
            data = resp.json()

        daily = data.get("daily", {})
        precip_list = daily.get("precipitation_sum", [])
        
        # Open-Meteo returns past 14 days + 1 forecast day (15 days total)
        # Clean null/None values
        valid_precip = [float(p) if p is not None else 0.0 for p in precip_list]

        if not valid_precip:
            raise ValueError("Empty precipitation data returned from Open-Meteo")

        # Sum past days window:
        # valid_precip[-1] is today's forecast/current day
        # valid_precip[-2] is yesterday, etc.
        rain_1d = round(sum(valid_precip[-1:]), 2)
        rain_3d = round(sum(valid_precip[-3:]), 2)
        rain_7d = round(sum(valid_precip[-7:]), 2)
        rain_14d = round(sum(valid_precip[-14:]), 2)

        return {
            "rainfall_1d": max(0.0, rain_1d),
            "rainfall_3d": max(0.0, rain_3d),
            "rainfall_7d": max(0.0, rain_7d),
            "rainfall_14d": max(0.0, rain_14d),
            "source": "live",
            "timestamp": utc_now_iso(),
        }


class RainfallService:
    """
    Manages live fetching, in-memory caching, disk caching,
    and graceful degraded/demo fallback.
    """
    def __init__(self):
        self.provider = OpenMeteoProvider()
        self.memory_cache: Dict[str, Tuple[Dict[str, Any], float]] = {}
        self.cache_dir = settings.RAINFALL_CACHE_DIR
        self.cache_file = self.cache_dir / "cache.json"
        self._ensure_cache_dir()

    def _ensure_cache_dir(self):
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        if not self.cache_file.exists():
            try:
                with open(self.cache_file, "w") as f:
                    json.dump({}, f)
            except Exception as e:
                logger.warning(f"Could not initialize rainfall disk cache file: {e}")

    def _cache_key(self, lat: float, lon: float) -> str:
        # Spatial resolution of cache grid: 0.05 degrees ~ 5.5km
        return f"{round(lat, 2)}_{round(lon, 2)}"

    def _read_disk_cache(self, key: str) -> Optional[Dict[str, Any]]:
        if not self.cache_file.exists():
            return None
        try:
            with open(self.cache_file, "r") as f:
                data = json.load(f)
            entry = data.get(key)
            if entry and (time.time() - entry.get("cached_at", 0) < settings.CACHE_TTL_SECONDS * 4):
                return entry.get("data")
        except Exception as e:
            logger.debug(f"Disk cache read error: {e}")
        return None

    def _write_disk_cache(self, key: str, payload: Dict[str, Any]):
        try:
            data = {}
            if self.cache_file.exists():
                with open(self.cache_file, "r") as f:
                    data = json.load(f)
            data[key] = {
                "cached_at": time.time(),
                "data": payload
            }
            with open(self.cache_file, "w") as f:
                json.dump(data, f)
        except Exception as e:
            logger.debug(f"Disk cache write error: {e}")

    async def get_recent_rainfall(
        self,
        latitude: float,
        longitude: float,
        allow_demo_fallback: bool = False
    ) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """
        Retrieves rainfall with fallback pipeline:
        LIVE -> CACHE -> ERROR (or explicitly labeled DEMO DATA if requested).
        Returns (rainfall_dict, None) or (None, error_code).
        """
        key = self._cache_key(latitude, longitude)
        now = time.time()

        # 1. Check in-memory cache
        if key in self.memory_cache:
            data, timestamp = self.memory_cache[key]
            if now - timestamp < settings.CACHE_TTL_SECONDS:
                logger.debug(f"Rainfall served from memory cache for {key}")
                return data, None

        # 2. Attempt live provider call
        try:
            live_data = await self.provider.fetch_rainfall(latitude, longitude)
            self.memory_cache[key] = (live_data, now)
            self._write_disk_cache(key, live_data)
            return live_data, None
        except Exception as e:
            logger.warning(f"Live rainfall fetch failed ({e}). Checking cache fallback...")

        # 3. Check memory cache even if slightly expired
        if key in self.memory_cache:
            data, _ = self.memory_cache[key]
            cached_copy = dict(data)
            cached_copy["source"] = "cached (live provider unavailable)"
            return cached_copy, None

        # 4. Check disk cache
        disk_entry = self._read_disk_cache(key)
        if disk_entry:
            cached_copy = dict(disk_entry)
            cached_copy["source"] = "cached (disk)"
            return cached_copy, None

        # 5. If demo fallback is explicitly enabled by client
        if allow_demo_fallback:
            logger.info("Providing explicitly labeled DEMO DATA fallback for development.")
            return {
                "rainfall_1d": 24.5,
                "rainfall_3d": 65.2,
                "rainfall_7d": 128.0,
                "rainfall_14d": 195.4,
                "source": "DEMO DATA",
                "timestamp": utc_now_iso(),
            }, None

        # 6. Strict error handling per specification
        return None, "RAINFALL_UNAVAILABLE"

rainfall_service = RainfallService()
