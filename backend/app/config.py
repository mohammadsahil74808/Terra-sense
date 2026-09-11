"""
TerraSense — Configuration and Environment Settings
Loads configuration from environment variables (.env) with safe defaults.
Enforces frozen production model constants.
"""

from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

# Base backend directory
BACKEND_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    # Application
    APP_NAME: str = "TerraSense API"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "production"
    DEBUG: bool = False
    
    # Model and Grid artifact paths (supports backend/model and backend/models)
    MODEL_DIR: Path = Field(
        default_factory=lambda: (
            BACKEND_DIR / "models" if (BACKEND_DIR / "models").exists() else BACKEND_DIR / "model"
        )
    )
    
    @property
    def MODEL_PATH(self) -> Path:
        return self.MODEL_DIR / "terrasense_model_v1.pkl"
        
    @property
    def PARQUET_PATH(self) -> Path:
        return self.MODEL_DIR / "terrasense_susceptibility_2534_cells.parquet"
        
    @property
    def METADATA_PATH(self) -> Path:
        return self.MODEL_DIR / "terrasense_model_metadata.json"
        
    @property
    def TRAINING_CELLS_PATH(self) -> Path:
        return self.MODEL_DIR / "terrasense_training_positive_cells.csv"

    # Frozen Risk Engine Constants (DO NOT MODIFY)
    RAINFALL_SCALE: float = 165.22
    EXTREME_RAINFALL_7D: float = 349.392
    EXTREME_RISK_FLOOR: float = 0.67
    LOW_LIMIT: float = 0.33
    HIGH_LIMIT: float = 0.66
    
    # Rainfall Provider Configuration
    RAINFALL_PROVIDER: str = "open-meteo"  # open-meteo, mock, etc.
    RAINFALL_API_KEY: str = ""
    CACHE_TTL_SECONDS: int = 900  # 15 minutes cache
    RAINFALL_CACHE_DIR: Path = BACKEND_DIR / "data" / "rainfall"

    # SQLite Database for Alerts and Ground Reports
    DB_PATH: Path = BACKEND_DIR / "data" / "terrasense.db"
    UPLOADS_DIR: Path = BACKEND_DIR / "data" / "uploads"
    
    # Firebase Cloud Messaging (Server-Side Only - Private Credentials)
    FIREBASE_SERVICE_ACCOUNT_PATH: Optional[str] = None
    FIREBASE_SERVICE_ACCOUNT_JSON: Optional[str] = None
    FIREBASE_PROJECT_ID: str = "teraa-sense"
    
    # Grid coordinate boundaries for Northeast India (8 states)
    # Latitude approx 21.5°N - 30.0°N, Longitude approx 88.0°E - 97.5°E
    MIN_LAT: float = 21.0
    MAX_LAT: float = 30.0
    MIN_LON: float = 87.5
    MAX_LON: float = 98.0
    MAX_CELL_DISTANCE_DEG: float = 0.25  # ~27km maximum distance to nearest cell

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
