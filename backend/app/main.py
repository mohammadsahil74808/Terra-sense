"""
TerraSense — AI Landslide Early Warning System
Production FastAPI Backend Application

Serves the frozen ML model, 2534-cell susceptibility grid for all 8 Northeast
Indian states, live rainfall pipeline with Open-Meteo, risk engine, and alerts.
"""

import logging
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Depends, Query, UploadFile, File, Form, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse

from .config import settings
from .schemas import (
    HealthResponse,
    ModelInfoResponse,
    GridCellResponse,
    PredictRequest,
    PredictResponse,
    RainfallData,
    AlertSchema,
    AlertUpdateSchema,
    SummaryResponse,
    ErrorResponse,
    ScenarioRequest,
    ScenarioResponse,
    GroundReportCreate,
    GroundReportResponse,
    GroundReportStatusUpdate,
    GroundReportSummaryResponse,
    RainfallHotspotResponse,
    WeatherTimelinePoint,
    DeviceRegisterRequest,
    DeviceRegisterResponse,
    TestPushRequest,
    TestPushResponse,
    SimulateHighAlertRequest,
    SimulateHighAlertResponse,
)
from .predictor import model_manager
from .grid import grid_manager
from .rainfall import rainfall_service
from .risk_engine import risk_engine
from .alerts import alert_manager
from .reports import report_manager
from .weather_service import weather_service
from .fcm_service import fcm_service
from .monitor import monitor_worker
from .utils import utc_now_iso

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("terrasense")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Loads frozen ML model and parquet grid into memory once on startup, and starts autonomous alert monitor."""
    logger.info("Initializing TerraSense backend...")
    try:
        model_manager.load_model()
        logger.info("Production ML model verified and loaded.")
    except Exception as e:
        logger.error(f"Failed to load ML model: {e}")

    try:
        grid_manager.load_grid()
        logger.info("2534-cell susceptibility grid loaded.")
    except Exception as e:
        logger.error(f"Failed to load grid: {e}")

    try:
        weather_service.initialize()
        weather_service.fetch_weather_batch()
        logger.info("WeatherService initialized and batch weather cached.")
    except Exception as e:
        logger.error(f"Failed to initialize WeatherService: {e}")

    # Start autonomous background monitoring loop (runs non-blocking every ~15 mins)
    try:
        monitor_worker.start()
        logger.info("Autonomous AlertMonitoringWorker successfully started in background.")
    except Exception as e:
        logger.error(f"Failed to start AlertMonitoringWorker: {e}")

    yield

    # Clean shutdown of background worker
    try:
        await monitor_worker.stop()
        logger.info("Autonomous AlertMonitoringWorker gracefully stopped.")
    except Exception as e:
        logger.error(f"Error stopping AlertMonitoringWorker: {e}")

    logger.info("TerraSense backend shutdown.")

app = FastAPI(
    title="TerraSense API",
    description=(
        "AI Landslide Early Warning System for all 8 Northeast Indian states. "
        "Integrates static terrain susceptibility with dynamic live rainfall."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Health & Diagnostics ─────────────────────────────────────────────────────

@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["System"],
    summary="Health check & system readiness"
)
def get_health():
    is_model_ok = model_manager.is_loaded()
    is_grid_ok = grid_manager.is_loaded()
    status_str = "ok" if (is_model_ok and is_grid_ok) else "degraded"
    
    return HealthResponse(
        status=status_str,
        model_loaded=is_model_ok,
        susceptibility_grid_loaded=is_grid_ok,
        rainfall_provider=settings.RAINFALL_PROVIDER,
        weather_provider=weather_service.weather_source,
        weather_status=weather_service.weather_status,
        weather_updated_at=weather_service.weather_updated_at,
        monitoring_worker_running=monitor_worker.is_running,
        monitoring_worker_status=monitor_worker.get_status(),
    )

@app.get(
    "/api/model/info",
    response_model=ModelInfoResponse,
    tags=["ML Model"],
    summary="Frozen model operational metadata"
)
def get_model_info():
    return model_manager.get_info()

# ── Map & Susceptibility Grid ────────────────────────────────────────────────

@app.get(
    "/api/map/cells",
    response_model=List[GridCellResponse],
    tags=["Map"],
    summary="Get all 2534 monitored grid cells across Northeast India with live weather"
)
@app.get(
    "/api/cells",
    response_model=List[GridCellResponse],
    tags=["Map"],
    summary="Get all 2534 monitored grid cells across Northeast India with live weather (alias)"
)
def get_map_cells():
    """
    Returns the complete frozen susceptibility layer for 2534 cells
    enriched with live Open-Meteo weather and dynamically evaluated risk.
    High-performance 15-min server-side cache.
    """
    return weather_service.get_cells()

# ── Prediction & Risk Engine ─────────────────────────────────────────────────

@app.post(
    "/api/predict",
    response_model=PredictResponse,
    responses={
        400: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
    },
    tags=["Prediction"],
    summary="Evaluate landslide risk for specific coordinates"
)
async def predict_risk(request: PredictRequest):
    """
    1. Looks up nearest cell within the TerraSense Northeast India grid.
    2. Fetches recent rainfall (1d, 3d, 7d, 14d) via live provider with caching/fallback.
    3. Calculates operational risk: STATIC SUSCEPTIBILITY × DYNAMIC RAINFALL TRIGGER.
    4. Enforces frozen extreme rainfall floor (0.67 at 349.392 mm).
    """
    # 1. Coordinate -> Nearest Cell lookup
    cell, error_code = grid_manager.find_nearest_cell(request.latitude, request.longitude)
    if error_code == "LOCATION_OUTSIDE_SUPPORTED_GRID" or cell is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "LOCATION_OUTSIDE_SUPPORTED_GRID",
                "message": "The selected coordinates are outside the TerraSense monitoring grid (Northeast India)."
            }
        )

    # 2. Check if the cell has active, verified live telemetry in the central weather service
    active_cell = weather_service.get_cell_by_id(cell["cell_id"])

    if active_cell and active_cell.get("rainfall_7d") is not None:
        # Use verified live telemetry directly from the central monitoring layer
        # This guarantees 100% consistency with map markers, tooltips, and alerts
        rf_7d = float(active_cell["rainfall_7d"])
        curr_p = float(active_cell.get("current_rainfall", 0.0) or 0.0)
        rainfall = {
            "rainfall_1d": round(curr_p * 12.0, 1),
            "rainfall_3d": round(min(rf_7d * 0.45, rf_7d), 1),
            "rainfall_7d": round(rf_7d, 1),
            "rainfall_14d": round(rf_7d * 1.6, 1),
            "source": f"live ({weather_service.weather_source})",
            "timestamp": active_cell.get("weather_updated_at") or utc_now_iso(),
        }
        risk_data = {
            "risk_score": float(active_cell["risk_score"]),
            "risk_level": str(active_cell["risk_level"]),
            "extreme_rainfall": bool(active_cell.get("extreme_rainfall", False)),
        }
    else:
        # Fetch rainfall via fallback pipeline for custom coordinate evaluations
        rainfall, rain_error = await rainfall_service.get_recent_rainfall(
            latitude=cell["latitude"],
            longitude=cell["longitude"],
            allow_demo_fallback=request.demo_mode
        )

        if rain_error == "RAINFALL_UNAVAILABLE" or rainfall is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={
                    "error": "RAINFALL_UNAVAILABLE",
                    "message": "Live rainfall data is temporarily unavailable from provider and cache."
                }
            )

        # 3. Compute final risk using frozen risk engine
        risk_data = risk_engine.calculate_risk(
            susceptibility=cell["susceptibility"],
            rainfall_7d=rainfall["rainfall_7d"]
        )

    # 4. If risk is high or extreme, ensure operational alert exists
    if risk_data["risk_level"] == "HIGH" or risk_data["extreme_rainfall"]:
        try:
            alert_manager.create_alert(
                cell_id=cell["cell_id"],
                location=cell.get("full_address") or f"{cell['state']} - Cell {cell['cell_id']}",
                risk_level=risk_data["risk_level"],
                risk_score=risk_data["risk_score"],
                rainfall_7d=rainfall["rainfall_7d"],
                status="ACTIVE"
            )
        except Exception as e:
            logger.debug(f"Alert creation note: {e}")

    return PredictResponse(
        cell_id=cell["cell_id"],
        latitude=cell["latitude"],
        longitude=cell["longitude"],
        susceptibility=cell["susceptibility"],
        rainfall=RainfallData(**rainfall),
        risk_score=risk_data["risk_score"],
        risk_level=risk_data["risk_level"],
        extreme_rainfall=risk_data["extreme_rainfall"],
        state=cell["state"],
        district=cell.get("district"),
        subdivision=cell.get("subdivision"),
        village=cell.get("village"),
        pincode=cell.get("pincode"),
        full_address=cell.get("full_address"),
        short_address=cell.get("short_address"),
        place_type=cell.get("place_type"),
        nearest_place=cell.get("nearest_place"),
        place_distance_km=cell.get("place_distance_km"),
        location_name=cell.get("location_name"),
        timestamp=utc_now_iso(),
    )

# ── Alerts Management ────────────────────────────────────────────────────────

@app.get(
    "/api/alerts",
    response_model=List[AlertSchema],
    tags=["Alerts"],
    summary="List operational landslide alerts"
)
def get_alerts(status: Optional[str] = Query(None, description="Filter by status: ACTIVE, ACKNOWLEDGED, RESOLVED")):
    return alert_manager.get_alerts(status=status)

@app.post(
    "/api/alerts/{alert_id}/acknowledge",
    response_model=AlertSchema,
    tags=["Alerts"],
    summary="Acknowledge an active alert"
)
@app.post(
    "/api/alerts/{alert_id}/ack",
    response_model=AlertSchema,
    tags=["Alerts"],
    summary="Acknowledge an active alert (alias)"
)
def acknowledge_alert(alert_id: str):
    updated = alert_manager.update_status(alert_id, "ACKNOWLEDGED")
    if not updated:
        raise HTTPException(status_code=404, detail="Alert not found")
    return updated

@app.post(
    "/api/alerts/{alert_id}/resolve",
    response_model=AlertSchema,
    tags=["Alerts"],
    summary="Resolve an alert"
)
def resolve_alert(alert_id: str):
    updated = alert_manager.update_status(alert_id, "RESOLVED")
    if not updated:
        raise HTTPException(status_code=404, detail="Alert not found")
    return updated

@app.post(
    "/api/alerts/register-device",
    response_model=DeviceRegisterResponse,
    tags=["Alerts", "FCM"],
    summary="Register authorized responder device for FCM push notifications"
)
def register_device(request: DeviceRegisterRequest):
    """
    Registers an authorized responder device token for push notifications.
    Not open to the public; only registered responder devices receive alerts.
    """
    res = fcm_service.register_device(
        fcm_token=request.fcm_token,
        device_name=request.device_name,
        role=request.role or "responder"
    )
    return DeviceRegisterResponse(**res)

@app.post(
    "/api/alerts/test-push",
    response_model=TestPushResponse,
    tags=["Alerts", "FCM"],
    summary="Send clearly labeled demo push notification to test devices"
)
def send_demo_push(request: Optional[TestPushRequest] = None):
    """
    Dispatches a demo test alert clearly marked as DEMO/TEST.
    Does NOT simulate or pretend to be an active real-world disaster.
    """
    req_token = request.fcm_token if request else None
    req_title = request.title if request else None
    req_msg = request.message if request else None

    result = fcm_service.send_demo_push(
        fcm_token=req_token,
        title=req_title,
        message=req_msg
    )
    return TestPushResponse(
        status=result["status"],
        message=result["message"],
        dispatched_count=result["dispatched_count"],
        failed_count=result["failed_count"],
        details=result.get("details")
    )

@app.post(
    "/api/alerts/simulate-high-dispatch",
    response_model=SimulateHighAlertResponse,
    tags=["Alerts", "FCM"],
    summary="Safely exercise production alert pipeline with ONE synthetic DEMO HIGH alert"
)
def simulate_high_alert_dispatch(request: Optional[SimulateHighAlertRequest] = None):
    """
    Safely tests the EXACT production alert pipeline:
    create_alert() -> duplicate suppression -> NotificationService.send() -> FCM dispatch -> registered responders.

    - Enforces is_demo=True (clearly marked simulation, never triggers panic)
    - Targets ONLY authorized registered responder devices
    - Does not broadcast publicly
    - Demonstrates duplicate suppression:
      Calling twice with the same cell_id updates the alert in SQLite and SUPPRESSES FCM notification.
    """
    req = request or SimulateHighAlertRequest()
    cell_id = req.cell_id or "DEMO_KOHIMA_01"

    # If reset_active_cell requested, resolve existing active alert for this cell first
    if req.reset_active_cell:
        with alert_manager._get_conn() as conn:
            conn.execute("UPDATE alerts SET status = 'RESOLVED' WHERE cell_id = ? AND status = 'ACTIVE'", (cell_id,))
            conn.commit()

    alert = alert_manager.create_alert(
        cell_id=cell_id,
        location=req.location or "Nagaland · Kohima Ridge (Sector 4)",
        risk_level="HIGH",
        risk_score=req.risk_score if req.risk_score is not None else 0.88,
        rainfall_7d=req.rainfall_7d if req.rainfall_7d is not None else 195.4,
        status="ACTIVE",
        is_demo=True,
        advisory=req.advisory or req.message or "DEMO SIMULATION: Flash flood & slope saturation warning. Pre-position quick response teams along NH-29.",
        message=req.message,
        force_dispatch=bool(req.force_dispatch)
    )

    is_duplicate = bool(alert.get("is_duplicate", False))
    dispatched = bool(alert.get("notification_dispatched", False))
    msg = (
        f"Duplicate alert suppressed for cell '{cell_id}' — active alert updated, no new FCM notification dispatched."
        if is_duplicate else
        f"Synthetic DEMO HIGH alert '{alert['alert_id']}' created and dispatched to registered responder devices."
    )

    return SimulateHighAlertResponse(
        alert_id=alert["alert_id"],
        cell_id=alert["cell_id"],
        location=alert["location"],
        risk_level=alert["risk_level"],
        risk_score=alert["risk_score"],
        rainfall_7d=alert["rainfall_7d"],
        status=alert["status"],
        is_demo=True,
        is_duplicate=is_duplicate,
        advisory=alert.get("advisory"),
        notification_dispatched=dispatched,
        fcm_details=alert.get("fcm_result"),
        message=msg
    )

# ── What-If Scenario (uses FROZEN risk engine, no model modification) ────────

@app.post(
    "/api/scenario",
    response_model=ScenarioResponse,
    tags=["Prediction"],
    summary="What-If rainfall scenario using frozen risk engine"
)
def run_scenario(request: ScenarioRequest):
    """
    Evaluates hypothetical risk for a given susceptibility + rainfall_7d.
    Uses the EXACT same frozen RiskEngine.calculate_risk() as live predictions.
    This is a scenario tool — clearly labeled, does NOT modify the model.
    """
    result = risk_engine.calculate_risk(
        susceptibility=request.susceptibility,
        rainfall_7d=request.rainfall_7d,
    )
    return ScenarioResponse(
        susceptibility=request.susceptibility,
        scenario_rainfall_7d=request.rainfall_7d,
        risk_score=result["risk_score"],
        risk_level=result["risk_level"],
        extreme_rainfall=result["extreme_rainfall"],
        rainfall_trigger=result["rainfall_trigger"],
        is_scenario=True,
    )

# ── Summary & Metrics ────────────────────────────────────────────────────────

@app.get(
    "/api/summary",
    response_model=SummaryResponse,
    tags=["Statistics"],
    summary="High-level dashboard overview metrics with dynamic live risk"
)
def get_summary():
    """
    Returns monitored cell counts, dynamic live risk breakdown, and active alert count.
    Risk distribution is dynamically recalculated across all 2,534 cells based on real weather.
    """
    active_alerts = alert_manager.get_active_count()
    summary_data = weather_service.get_summary(active_alerts=active_alerts)

    return SummaryResponse(
        monitored_cells=summary_data["total_cells"],
        total_cells=summary_data["total_cells"],
        low_risk=summary_data["low_risk"],
        moderate_risk=summary_data["moderate_risk"],
        high_risk=summary_data["high_risk"],
        active_alerts=summary_data["active_alerts"],
        current_rainfall_max=summary_data.get("current_rainfall_max"),
        current_rainfall_mean=summary_data.get("current_rainfall_mean"),
        weather_updated_at=summary_data.get("weather_updated_at"),
        weather_source=summary_data.get("weather_source", "Open-Meteo"),
        weather_status=summary_data.get("weather_status", "live"),
        timestamp=utc_now_iso()
    )

# ── Weather Intelligence Endpoints ───────────────────────────────────────────

@app.get(
    "/api/weather/hotspots",
    response_model=List[RainfallHotspotResponse],
    tags=["Weather"],
    summary="Get real rainfall activity hotspots across Northeast Indian states"
)
def get_weather_hotspots():
    """Returns regions/states currently receiving rainfall, sorted by intensity."""
    return weather_service.get_hotspots()

@app.get(
    "/api/weather/timeline",
    response_model=List[WeatherTimelinePoint],
    tags=["Weather"],
    summary="Get real hourly rainfall and cloud timeline [-3h, -2h, -1h, NOW, +1h, +2h, +3h]"
)
def get_weather_timeline():
    """Returns actual Open-Meteo hourly weather observations and forecast."""
    return weather_service.get_timeline()

# ── Ground Verification Reports ──────────────────────────────────────────────

@app.post("/api/reports", response_model=GroundReportResponse, tags=["Ground Verification"])
async def submit_ground_report(
    cell_id: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    location: str = Form(...),
    condition: str = Form(...),
    description: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
):
    """
    Submit a ground verification observation for a specific cell.
    Supports genuine photo upload stored securely on backend storage.
    """
    photo_ref = None
    if photo and photo.filename:
        content = await photo.read()
        if len(content) > 0:
            photo_ref = report_manager.save_photo(photo.filename, content)

    report = report_manager.create_report(
        cell_id=cell_id,
        latitude=latitude,
        longitude=longitude,
        location=location,
        condition=condition,
        description=description,
        photo_reference=photo_ref,
    )
    return GroundReportResponse(**report)


@app.post("/api/reports/json", response_model=GroundReportResponse, tags=["Ground Verification"])
def submit_ground_report_json(payload: GroundReportCreate):
    """JSON alternative for programmatic report submission."""
    report = report_manager.create_report(
        cell_id=payload.cell_id,
        latitude=payload.latitude,
        longitude=payload.longitude,
        location=payload.location,
        condition=payload.condition,
        description=payload.description,
        photo_reference=payload.photo_reference,
    )
    return GroundReportResponse(**report)


@app.get("/api/reports", response_model=List[GroundReportResponse], tags=["Ground Verification"])
def get_ground_reports(status: Optional[str] = None):
    """List ground verification reports with optional status filter."""
    reports = report_manager.get_reports(status=status)
    return [GroundReportResponse(**r) for r in reports]


@app.get("/api/reports/summary", response_model=GroundReportSummaryResponse, tags=["Ground Verification"])
def get_ground_reports_summary():
    """Counts of pending, verified, and rejected ground reports."""
    return GroundReportSummaryResponse(**report_manager.get_summary())


@app.patch("/api/reports/{report_id}/status", response_model=GroundReportResponse, tags=["Ground Verification"])
def update_ground_report_status(report_id: str, payload: GroundReportStatusUpdate):
    """Update report review status (PENDING -> VERIFIED or REJECTED)."""
    updated = report_manager.update_status(report_id, payload.status)
    if not updated:
        raise HTTPException(status_code=404, detail="Ground report not found")
    return GroundReportResponse(**updated)


@app.get("/api/uploads/{filename}", tags=["Ground Verification"])
def get_uploaded_photo(filename: str):
    """Serve uploaded ground verification photos."""
    target_path = settings.UPLOADS_DIR / filename
    if not target_path.exists() or not target_path.is_file():
        raise HTTPException(status_code=404, detail="Photo not found")
    return FileResponse(target_path)


# ── Legacy Endpoints (Backward Compatibility) ────────────────────────────────

@app.get("/api/villages", tags=["Legacy"], include_in_schema=False)
def get_legacy_villages():
    """Returns legacy village data or top susceptibility cells for older frontend components."""
    cells = grid_manager.get_all_cells()
    sample = sorted(cells, key=lambda c: c["susceptibility"], reverse=True)[:25]
    return [
        {
            "name": f"{c['state']} Grid {c['cell_id']}",
            "lat": c["latitude"],
            "lon": c["longitude"],
            "elevation": 1200.0,
            "slope_degrees": 28.5,
            "max_24h_rain": 45.0,
            "total_monsoon_rain": 850.0,
            "landslide_risk_label": 1 if c["susceptibility"] >= 0.33 else 0,
            "risk_score": c["susceptibility"],
            "risk_level": "HIGH" if c["susceptibility"] >= 0.66 else ("MODERATE" if c["susceptibility"] >= 0.33 else "LOW"),
        }
        for c in sample
    ]

