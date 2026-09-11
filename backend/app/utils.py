"""
TerraSense — Spatial and Geocoding Utilities
Helper functions for Northeast India coordinate boundaries, distance calculations,
and approximate state identification.
"""

import math
from datetime import datetime, timezone
from typing import Optional

# Bounding approximations for 8 Northeast states
STATE_BOUNDS = [
    # Sikkim: ~27.05 - 28.15 N, 88.0 - 88.95 E
    {"state": "Sikkim", "min_lat": 27.0, "max_lat": 28.2, "min_lon": 88.0, "max_lon": 89.0},
    # Tripura: ~22.9 - 24.55 N, 91.1 - 92.4 E
    {"state": "Tripura", "min_lat": 22.8, "max_lat": 24.6, "min_lon": 91.1, "max_lon": 92.4},
    # Mizoram: ~21.9 - 24.5 N, 92.25 - 93.45 E
    {"state": "Mizoram", "min_lat": 21.8, "max_lat": 24.6, "min_lon": 92.2, "max_lon": 93.6},
    # Meghalaya: ~25.0 - 26.15 N, 89.7 - 92.85 E
    {"state": "Meghalaya", "min_lat": 25.0, "max_lat": 26.2, "min_lon": 89.6, "max_lon": 92.9},
    # Manipur: ~23.8 - 25.7 N, 92.95 - 94.75 E
    {"state": "Manipur", "min_lat": 23.8, "max_lat": 25.7, "min_lon": 92.9, "max_lon": 94.8},
    # Nagaland: ~25.1 - 27.05 N, 93.3 - 95.3 E
    {"state": "Nagaland", "min_lat": 25.1, "max_lat": 27.1, "min_lon": 93.3, "max_lon": 95.3},
    # Arunachal Pradesh: ~26.5 - 29.5 N, 91.5 - 97.5 E (upper north & east)
    {"state": "Arunachal Pradesh", "min_lat": 26.6, "max_lat": 29.6, "min_lon": 91.5, "max_lon": 97.6},
    # Assam: Valley in the middle ~24.1 - 28.0 N, 89.7 - 96.0 E
    {"state": "Assam", "min_lat": 24.0, "max_lat": 28.0, "min_lon": 89.6, "max_lon": 96.1},
]

def get_state_for_coordinates(lat: float, lon: float) -> str:
    """
    Returns the estimated Northeast Indian state for the given coordinates.
    Prioritizes specific distinct regions (Sikkim, Tripura, Mizoram, Meghalaya, Manipur, Nagaland, Arunachal)
    before fallback to Assam or Northeast India.
    """
    for entry in STATE_BOUNDS:
        if (entry["min_lat"] <= lat <= entry["max_lat"] and 
            entry["min_lon"] <= lon <= entry["max_lon"]):
            # For overlapping borders, refine based on center proximity
            return entry["state"]
    return "Northeast India"

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance in kilometers between two points
    on the earth (specified in decimal degrees).
    """
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat / 2.0)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2.0)**2
    c = 2.0 * math.asin(math.sqrt(a))
    r = 6371.0 # Radius of earth in kilometers
    return c * r

def utc_now_iso() -> str:
    """Returns current UTC timestamp in ISO 8601 format."""
    return datetime.now(timezone.utc).isoformat()
