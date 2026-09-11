"""
TerraSense — Pydantic Schemas
Defines request and response data contracts for all API endpoints.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class HealthResponse(BaseModel):
    status: str = "ok"
    model_loaded: bool
    susceptibility_grid_loaded: bool
    rainfall_provider: str
    weather_provider: str = "Open-Meteo"
    weather_status: str = "live"
    weather_updated_at: Optional[str] = None
    monitoring_worker_running: Optional[bool] = None
    monitoring_worker_status: Optional[Dict[str, Any]] = None

class ModelInfoResponse(BaseModel):
    model: str = "TerraSense v1"
    status: str = "FROZEN"
    feature_count: int = 9
    grid_cells: int = 2534
    features: Optional[List[str]] = None
    rainfall_config: Optional[Dict[str, Any]] = None

class GridCellResponse(BaseModel):
    cell_id: int
    latitude: float
    longitude: float
    susceptibility: float
    state: Optional[str] = None
    district: Optional[str] = None
    subdivision: Optional[str] = None
    village: Optional[str] = None
    pincode: Optional[str] = None
    full_address: Optional[str] = None
    short_address: Optional[str] = None
    place_type: Optional[str] = None
    nearest_place: Optional[str] = None
    place_distance_km: Optional[float] = None
    location_name: Optional[str] = None
    current_rainfall: Optional[float] = None
    current_rain: Optional[float] = None
    cloud_cover: Optional[float] = None
    cloud_cover_low: Optional[float] = None
    cloud_cover_mid: Optional[float] = None
    cloud_cover_high: Optional[float] = None
    weather_code: Optional[int] = None
    weather_condition: Optional[str] = None
    weather_icon: Optional[str] = None
    rainfall_7d: Optional[float] = None
    temperature: Optional[float] = None
    wind_speed: Optional[float] = None
    wind_direction: Optional[float] = None
    humidity: Optional[float] = None
    risk_score: Optional[float] = None
    risk_level: Optional[str] = None
    extreme_rainfall: Optional[bool] = None
    weather_updated_at: Optional[str] = None

class RainfallData(BaseModel):
    rainfall_1d: float = Field(..., description="1-day rainfall accumulation in mm")
    rainfall_3d: float = Field(..., description="3-day rainfall accumulation in mm")
    rainfall_7d: float = Field(..., description="7-day rainfall accumulation in mm")
    rainfall_14d: float = Field(..., description="14-day rainfall accumulation in mm")
    source: str = Field(..., description="'live' or 'DEMO DATA'")
    timestamp: str

class PredictRequest(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude in decimal degrees")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude in decimal degrees")
    demo_mode: Optional[bool] = Field(False, description="Whether to allow demo fallback if live provider fails")

class PredictResponse(BaseModel):
    cell_id: str
    latitude: float
    longitude: float
    susceptibility: float
    rainfall: RainfallData
    risk_score: float = Field(..., ge=0.0, le=1.0, description="Final combined landslide risk score [0.0 - 1.0]")
    risk_level: str = Field(..., description="'LOW' | 'MODERATE' | 'HIGH'")
    extreme_rainfall: bool
    state: Optional[str] = None
    district: Optional[str] = None
    subdivision: Optional[str] = None
    village: Optional[str] = None
    pincode: Optional[str] = None
    full_address: Optional[str] = None
    short_address: Optional[str] = None
    place_type: Optional[str] = None
    nearest_place: Optional[str] = None
    place_distance_km: Optional[float] = None
    location_name: Optional[str] = None
    timestamp: str

class AlertSchema(BaseModel):
    alert_id: str
    cell_id: str
    location: str
    risk_level: str  # LOW, MODERATE, HIGH, CRITICAL
    risk_score: float
    rainfall_7d: float
    created_at: str
    status: str      # ACTIVE, ACKNOWLEDGED, RESOLVED

class AlertUpdateSchema(BaseModel):
    status: str      # ACKNOWLEDGED or RESOLVED

class SummaryResponse(BaseModel):
    monitored_cells: int = 2534
    total_cells: int = 2534
    low_risk: int
    moderate_risk: int
    high_risk: int
    active_alerts: int
    current_rainfall_max: Optional[float] = None
    current_rainfall_mean: Optional[float] = None
    weather_updated_at: Optional[str] = None
    weather_source: str = "Open-Meteo"
    weather_status: str = "live"
    timestamp: str

class RainfallHotspotResponse(BaseModel):
    state: str
    mean_rainfall_mmh: float
    max_rainfall_mmh: float
    temperature: Optional[float] = 24.0
    humidity: Optional[float] = 70.0
    is_raining: bool

class WeatherTimelinePoint(BaseModel):
    offset_hours: int
    label: str
    time: str
    precipitation: float
    cloud_cover: float
    precipitation_probability: float
    weather_code: int
    weather_condition: str
    weather_icon: str
    is_forecast: bool

class ErrorResponse(BaseModel):
    error: str
    message: str

class ScenarioRequest(BaseModel):
    susceptibility: float = Field(..., ge=0.0, le=1.0, description="Terrain susceptibility score")
    rainfall_7d: float = Field(..., ge=0.0, description="Hypothetical 7-day rainfall in mm")

class ScenarioResponse(BaseModel):
    susceptibility: float
    scenario_rainfall_7d: float
    risk_score: float
    risk_level: str
    extreme_rainfall: bool
    rainfall_trigger: float
    is_scenario: bool = True

class GroundReportCreate(BaseModel):
    cell_id: str
    latitude: float
    longitude: float
    location: str
    condition: str
    description: Optional[str] = None
    photo_reference: Optional[str] = None

class GroundReportResponse(BaseModel):
    report_id: str
    cell_id: str
    latitude: float
    longitude: float
    location: str
    timestamp: str
    condition: str
    description: Optional[str] = None
    photo_reference: Optional[str] = None
    status: str
    verified_at: Optional[str] = None

class GroundReportStatusUpdate(BaseModel):
    status: str = Field(..., description="'VERIFIED' | 'REJECTED' | 'PENDING'")

class GroundReportSummaryResponse(BaseModel):
    pending: int
    verified: int
    rejected: int
    total: int


# ── Firebase Cloud Messaging (FCM) Schemas ────────────────────────────────────

class DeviceRegisterRequest(BaseModel):
    fcm_token: str = Field(..., min_length=10, description="FCM registration token from Android app")
    device_name: str = Field("Android Device", description="Human-readable device name")
    role: Optional[str] = Field("responder", description="Device role (e.g., responder, ddma, sdma, control_room)")

class DeviceRegisterResponse(BaseModel):
    status: str
    message: str
    device_name: str
    role: str
    registered_at: str

class TestPushRequest(BaseModel):
    fcm_token: Optional[str] = Field(None, description="Optional target token; if omitted, sends to all registered responder devices")
    device_name: Optional[str] = Field(None, description="Optional target device filter")
    title: Optional[str] = Field("🚨 TerraSense Demo Alert", description="Notification title")
    message: Optional[str] = Field("Test notification from TerraSense alert system.", description="Notification body")

class TestPushResponse(BaseModel):
    status: str
    message: str
    dispatched_count: int
    failed_count: int
    details: Optional[List[Dict[str, Any]]] = None

class SimulateHighAlertRequest(BaseModel):
    cell_id: Optional[str] = Field("DEMO_KOHIMA_01", description="Monitored cell ID for simulation")
    location: Optional[str] = Field("Nagaland · Kohima Ridge (Sector 4)", description="Location description")
    risk_score: Optional[float] = Field(0.88, ge=0.0, le=1.0, description="Risk score [0.0 - 1.0]")
    rainfall_7d: Optional[float] = Field(195.4, ge=0.0, description="7-day cumulative rainfall in mm")
    advisory: Optional[str] = Field(
        "DEMO SIMULATION: Flash flood & slope saturation warning. Pre-position quick response teams along NH-29.",
        description="Incident advisory text"
    )
    message: Optional[str] = Field(None, description="Custom broadcast / alert message")
    is_demo: Optional[bool] = Field(True, description="Always true for safe test simulation")
    reset_active_cell: Optional[bool] = Field(False, description="If true, clears existing active alert for cell to force a fresh dispatch")
    force_dispatch: Optional[bool] = Field(False, description="If true, dispatches FCM even if active cell exists")

class SimulateHighAlertResponse(BaseModel):
    alert_id: str
    cell_id: str
    location: str
    risk_level: str
    risk_score: float
    rainfall_7d: float
    status: str
    is_demo: bool
    is_duplicate: bool
    advisory: Optional[str] = None
    notification_dispatched: bool
    fcm_details: Optional[Dict[str, Any]] = None
    message: str



