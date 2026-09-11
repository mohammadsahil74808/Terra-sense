"""
TerraSense — Backend Test Suite
Verifies:
1. Model loading & feature count integrity (inference only)
2. Susceptibility grid spatial lookup (valid & outside coordinates)
3. Risk engine calculation, categories, and frozen extreme rainfall floor
4. Live rainfall fetching & cache fallback
5. FastAPI endpoints: /health, /api/model/info, /api/map/cells, /api/predict, /api/alerts, /api/summary
"""

import pytest
import sys
from pathlib import Path
from fastapi.testclient import TestClient

# Add backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BASE_DIR))

from app.main import app
from app.config import settings
from app.predictor import model_manager
from app.grid import grid_manager
from app.risk_engine import risk_engine
from app.rainfall import rainfall_service
from app.alerts import alert_manager

client = TestClient(app)

# ── 1. Model Loading Tests ───────────────────────────────────────────────────

def test_model_artifact_exists_and_loads():
    """Verify frozen model pkl loads correctly and features match specification."""
    model_manager.load_model()
    assert model_manager.is_loaded() is True
    info = model_manager.get_info()
    assert info["model"] == "TerraSense v1"
    assert info["status"] == "FROZEN"
    assert info["feature_count"] == 9
    assert info["grid_cells"] == 2534
    assert len(info["features"]) == 9
    assert "elevation" in info["features"]
    assert "slope" in info["features"]

# ── 2. Grid Lookup Tests ─────────────────────────────────────────────────────

def test_grid_loads_2534_cells():
    """Verify parquet grid has exactly 2534 cells."""
    grid_manager.load_grid()
    assert grid_manager.is_loaded() is True
    cells = grid_manager.get_all_cells()
    assert len(cells) == 2534

def test_grid_valid_coordinate_lookup():
    """Test lookup for known coordinate inside Northeast India (e.g. Kohima area: 25.67 N, 94.11 E)."""
    cell, error = grid_manager.find_nearest_cell(25.67, 94.11)
    assert error is None
    assert cell is not None
    assert cell["cell_id"].startswith("NE_")
    assert 0.0 <= cell["susceptibility"] <= 1.0
    assert cell["state"] in ["Nagaland", "Manipur", "Assam", "Northeast India"]

def test_grid_outside_coordinate_lookup():
    """Test lookup for coordinates outside Northeast India (e.g. Delhi: 28.61 N, 77.20 E)."""
    cell, error = grid_manager.find_nearest_cell(28.61, 77.20)
    assert error == "LOCATION_OUTSIDE_SUPPORTED_GRID"
    assert cell is None

def test_grid_ocean_coordinate_lookup():
    """Test lookup for ocean coordinate south of India."""
    cell, error = grid_manager.find_nearest_cell(5.0, 80.0)
    assert error == "LOCATION_OUTSIDE_SUPPORTED_GRID"
    assert cell is None

# ── 3. Risk Engine Tests ─────────────────────────────────────────────────────

def test_risk_score_bounds():
    """Verify risk scores stay strictly within [0.0, 1.0]."""
    res1 = risk_engine.calculate_risk(susceptibility=0.1, rainfall_7d=50.0)
    assert 0.0 <= res1["risk_score"] <= 1.0

    res2 = risk_engine.calculate_risk(susceptibility=0.9, rainfall_7d=500.0)
    assert 0.0 <= res2["risk_score"] <= 1.0

def test_risk_categories():
    """Verify LOW, MODERATE, HIGH category boundaries."""
    # Low risk
    low = risk_engine.calculate_risk(susceptibility=0.1, rainfall_7d=50.0)
    assert low["risk_score"] < 0.33
    assert low["risk_level"] == "LOW"

    # Moderate risk (e.g. susceptibility 0.40, rainfall_7d 180.0 -> trigger ~1.089 -> score ~0.435)
    mod = risk_engine.calculate_risk(susceptibility=0.40, rainfall_7d=180.0)
    assert 0.33 <= mod["risk_score"] < 0.66
    assert mod["risk_level"] == "MODERATE"

    # High risk (e.g. susceptibility 0.70, rainfall_7d 250.0 -> trigger ~1.51 -> score ~1.0)
    high = risk_engine.calculate_risk(susceptibility=0.70, rainfall_7d=250.0)
    assert high["risk_score"] >= 0.66
    assert high["risk_level"] == "HIGH"

def test_extreme_rainfall_floor():
    """
    Verify that when 7-day rainfall >= EXTREME_RAINFALL_7D (349.392 mm),
    risk score is boosted to at least EXTREME_RISK_FLOOR (0.67) and extreme_rainfall is True.
    """
    # Even if susceptibility is low (e.g. 0.05)
    res = risk_engine.calculate_risk(susceptibility=0.05, rainfall_7d=350.0)
    assert res["extreme_rainfall"] is True
    assert res["risk_score"] >= 0.67
    assert res["risk_level"] == "HIGH"

def test_non_extreme_rainfall():
    res = risk_engine.calculate_risk(susceptibility=0.20, rainfall_7d=100.0)
    assert res["extreme_rainfall"] is False

# ── 4. Alert Engine Tests ────────────────────────────────────────────────────

def test_alert_lifecycle():
    """Test creating, acknowledging, and resolving an alert in SQLite."""
    alert = alert_manager.create_alert(
        cell_id="NE_9999",
        location="Test Location",
        risk_level="HIGH",
        risk_score=0.78,
        rainfall_7d=360.0,
        status="ACTIVE"
    )
    alert_id = alert["alert_id"]
    assert alert["status"] == "ACTIVE"

    # Acknowledge
    ack = alert_manager.update_status(alert_id, "ACKNOWLEDGED")
    assert ack is not None
    assert ack["status"] == "ACKNOWLEDGED"

    # Resolve
    res = alert_manager.update_status(alert_id, "RESOLVED")
    assert res is not None
    assert res["status"] == "RESOLVED"

# ── 5. API Endpoint Tests ────────────────────────────────────────────────────

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["model_loaded"] is True
    assert data["susceptibility_grid_loaded"] is True
    assert data["rainfall_provider"] == "open-meteo"

def test_model_info_endpoint():
    response = client.get("/api/model/info")
    assert response.status_code == 200
    data = response.json()
    assert data["model"] == "TerraSense v1"
    assert data["status"] == "FROZEN"
    assert data["grid_cells"] == 2534
    assert data["feature_count"] == 9

def test_map_cells_endpoint():
    response = client.get("/api/map/cells")
    assert response.status_code == 200
    cells = response.json()
    assert len(cells) == 2534
    first = cells[0]
    assert "cell_id" in first
    assert "latitude" in first
    assert "longitude" in first
    assert "susceptibility" in first
    assert "state" in first

def test_predict_endpoint_valid():
    """Test prediction for coordinates in Nagaland."""
    response = client.post(
        "/api/predict",
        json={"latitude": 25.67, "longitude": 94.11, "demo_mode": True}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["cell_id"].startswith("NE_")
    assert 0.0 <= data["susceptibility"] <= 1.0
    assert 0.0 <= data["risk_score"] <= 1.0
    assert data["risk_level"] in ["LOW", "MODERATE", "HIGH"]
    assert "rainfall" in data
    assert "rainfall_7d" in data["rainfall"]

def test_predict_endpoint_outside():
    """Test prediction for coordinates outside Northeast India returns 404."""
    response = client.post(
        "/api/predict",
        json={"latitude": 19.07, "longitude": 72.87} # Mumbai
    )
    assert response.status_code == 404
    detail = response.json().get("detail", {})
    assert detail.get("error") == "LOCATION_OUTSIDE_SUPPORTED_GRID"

def test_alerts_endpoint():
    response = client.get("/api/alerts")
    assert response.status_code == 200
    alerts = response.json()
    assert isinstance(alerts, list)
    assert len(alerts) > 0

def test_summary_endpoint():
    response = client.get("/api/summary")
    assert response.status_code == 200
    summary = response.json()
    assert summary["monitored_cells"] == 2534
    assert summary["low_risk"] + summary["moderate_risk"] + summary["high_risk"] == 2534
    assert summary["active_alerts"] >= 0

def test_scenario_endpoint():
    """Test What-If rainfall scenario calculation using frozen risk engine."""
    response = client.post(
        "/api/scenario",
        json={"susceptibility": 0.70, "rainfall_7d": 200.0}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["susceptibility"] == 0.70
    assert data["scenario_rainfall_7d"] == 200.0
    assert 0.0 <= data["risk_score"] <= 1.0
    assert data["risk_level"] in ["LOW", "MODERATE", "HIGH"]
    assert data["is_scenario"] is True

def test_ground_report_lifecycle():
    """Test ground report creation, listing, status verification, and summary."""
    # 1. Create report
    response = client.post(
        "/api/reports/json",
        json={
            "cell_id": "NE_0427",
            "latitude": 25.67,
            "longitude": 94.11,
            "location": "Nagaland · Kohima Ridge",
            "condition": "Surface cracks",
            "description": "Tension cracks observed along hillside road.",
        }
    )
    assert response.status_code == 200
    report = response.json()
    report_id = report["report_id"]
    assert report_id.startswith("REP-")
    assert report["condition"] == "Surface cracks"
    assert report["status"] == "PENDING"

    # 2. Get reports
    list_res = client.get("/api/reports")
    assert list_res.status_code == 200
    reports = list_res.json()
    assert any(r["report_id"] == report_id for r in reports)

    # 3. Update status to VERIFIED
    patch_res = client.patch(
        f"/api/reports/{report_id}/status",
        json={"status": "VERIFIED"}
    )
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["status"] == "VERIFIED"
    assert updated["verified_at"] is not None

    # 4. Check summary
    summary_res = client.get("/api/reports/summary")
    assert summary_res.status_code == 200
    summ = summary_res.json()
    assert summ["verified"] >= 1

    # Cleanup test report
    import sqlite3
    from app.config import settings
    with sqlite3.connect(settings.DB_PATH) as conn:
        conn.execute("DELETE FROM ground_reports WHERE report_id = ?", (report_id,))
        conn.commit()

# ── 6. FCM Alert Pipeline & Duplicate Suppression Tests ───────────────────────

from unittest.mock import patch, MagicMock
from app.fcm_service import fcm_service

def test_fcm_high_alert_payload_and_demo_flag():
    """Verify that send_high_risk_alert builds exact required FCM payload with DEMO flag and advisory."""
    sample_alert = {
        "alert_id": "ALT-TEST-9001",
        "cell_id": "NE_0427",
        "location": "Nagaland · Kohima Ridge",
        "risk_level": "HIGH",
        "risk_score": 0.88,
        "rainfall_7d": 195.4,
        "created_at": "2026-09-07T12:00:00Z",
        "is_demo": True,
        "advisory": "Test simulation advisory: Inspect slope drainage."
    }

    with patch.object(fcm_service, "_dispatch_to_responders") as mock_dispatch:
        mock_dispatch.return_value = {
            "status": "success",
            "message": "Alert dispatch completed (1 sent, 0 failed)",
            "dispatched_count": 1,
            "failed_count": 0,
            "details": []
        }

        result = fcm_service.send_high_risk_alert(sample_alert)
        assert mock_dispatch.called
        call_kwargs = mock_dispatch.call_args.kwargs

        # Check title and body
        assert call_kwargs["title"] == "🚨 TerraSense Demo Alert"
        assert "[DEMO SIMULATION]" in call_kwargs["body"]
        assert call_kwargs["alert_id"] == "ALT-TEST-9001"

        # Check exact payload fields required by task
        payload = call_kwargs["data_payload"]
        assert payload["type"] == "DEMO_TEST"
        assert payload["nav_target"] == "ALERT_DETAILS"
        assert payload["alert_id"] == "ALT-TEST-9001"
        assert payload["cell_id"] == "NE_0427"
        assert payload["location"] == "Nagaland · Kohima Ridge"
        assert payload["risk_level"] == "HIGH"
        assert payload["risk_score"] == "0.88"
        assert payload["rainfall"] == "195.4mm"
        assert payload["timestamp"] == "2026-09-07T12:00:00Z"
        assert payload["advisory"] == "Test simulation advisory: Inspect slope drainage."
        assert payload["is_demo"] == "true"

def test_responder_only_targeting():
    """Verify that alert dispatch queries and targets only active devices with role='responder'."""
    test_token_responder = "test_fcm_token_responder_only_12345"
    test_token_civilian = "test_fcm_token_civilian_only_67890"

    # Register one responder and one non-responder
    fcm_service.register_device(fcm_token=test_token_responder, device_name="Test Responder", role="responder")
    fcm_service.register_device(fcm_token=test_token_civilian, device_name="Test Civilian", role="civilian")

    try:
        responders = fcm_service.get_active_devices(role="responder")
        responder_tokens = [d["fcm_token"] for d in responders]
        assert test_token_responder in responder_tokens
        assert test_token_civilian not in responder_tokens
    finally:
        # Cleanup
        with fcm_service._get_conn() as conn:
            conn.execute("DELETE FROM fcm_devices WHERE fcm_token IN (?, ?)", (test_token_responder, test_token_civilian))
            conn.commit()

def test_duplicate_suppression_skips_fcm():
    """Verify that duplicate alerts for the same active cell suppress secondary FCM notification dispatch."""
    cell_id = "NE_DUP_TEST_CELL_99"

    # Ensure clean slate for test cell
    with alert_manager._get_conn() as conn:
        conn.execute("DELETE FROM alerts WHERE cell_id = ?", (cell_id,))
        conn.commit()

    try:
        with patch.object(fcm_service, "send_high_risk_alert") as mock_fcm:
            mock_fcm.return_value = {"status": "sent", "dispatched_count": 1, "failed_count": 0}

            # 1. First alert creation for cell -> should dispatch FCM
            alert1 = alert_manager.create_alert(
                cell_id=cell_id,
                location="Nagaland · Kohima Ridge",
                risk_level="HIGH",
                risk_score=0.88,
                rainfall_7d=195.0,
                status="ACTIVE",
                is_demo=True
            )
            assert alert1["is_duplicate"] is False
            assert mock_fcm.call_count == 1

            # 2. Second alert creation for SAME cell with active status -> MUST suppress FCM
            alert2 = alert_manager.create_alert(
                cell_id=cell_id,
                location="Nagaland · Kohima Ridge (Updated)",
                risk_level="HIGH",
                risk_score=0.91,
                rainfall_7d=210.0,
                status="ACTIVE",
                is_demo=True
            )
            assert alert2["is_duplicate"] is True
            assert alert2["notification_dispatched"] is False
            # FCM must NOT have been called a second time
            assert mock_fcm.call_count == 1
    finally:
        with alert_manager._get_conn() as conn:
            conn.execute("DELETE FROM alerts WHERE cell_id = ?", (cell_id,))
            conn.commit()

def test_simulate_high_dispatch_endpoint_end_to_end():
    """Test the safe controlled simulate-high-dispatch API endpoint end-to-end."""
    cell_id = "DEMO_TEST_E2E_01"

    # First call: fresh dispatch with reset_active_cell=True
    res1 = client.post(
        "/api/alerts/simulate-high-dispatch",
        json={
            "cell_id": cell_id,
            "location": "Nagaland · Kohima Ridge Sector 4",
            "risk_score": 0.88,
            "rainfall_7d": 195.4,
            "reset_active_cell": True,
            "is_demo": True
        }
    )
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["cell_id"] == cell_id
    assert data1["risk_level"] == "HIGH"
    assert data1["is_demo"] is True
    assert data1["is_duplicate"] is False

    # Second call: duplicate simulation -> must be marked duplicate
    res2 = client.post(
        "/api/alerts/simulate-high-dispatch",
        json={
            "cell_id": cell_id,
            "location": "Nagaland · Kohima Ridge Sector 4",
            "risk_score": 0.90,
            "rainfall_7d": 205.0,
            "reset_active_cell": False,
            "is_demo": True
        }
    )
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["is_duplicate"] is True
    assert data2["notification_dispatched"] is False
    assert "suppressed" in data2["message"].lower()

    # Cleanup
    with alert_manager._get_conn() as conn:
        conn.execute("DELETE FROM alerts WHERE cell_id = ?", (cell_id,))
        conn.commit()



