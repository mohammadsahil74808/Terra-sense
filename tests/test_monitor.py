"""
TerraSense — Monitoring Worker & Automation Unit Tests
Tests required per specification:
- Test A: Monitoring worker starts and stops cleanly
- Test B: Risk update triggers alert creation for HIGH cells
- Test C: Duplicate HIGH suppresses repeat notifications
- Test D: Different cells produce distinct alerts
- Test E: FCM failure does not crash worker or lose SQLite alert
- Test F: Weather failure isolation (worker survives Open-Meteo failure)
- Test G: Clean worker cancellation
- Test H: No duplicate workers created
"""

import pytest
import sys
import asyncio
from unittest.mock import patch, MagicMock
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BASE_DIR))

from app.monitor import AlertMonitoringWorker
from app.alerts import alert_manager
from app.weather_service import weather_service


@pytest.mark.asyncio
async def test_monitor_worker_starts_and_stops_cleanly():
    """Test A: Worker can start and stop gracefully without leaking tasks."""
    worker = AlertMonitoringWorker(interval_seconds=3600)
    assert not worker.is_running
    worker.start()
    assert worker.is_running
    await worker.stop()
    assert not worker.is_running


@pytest.mark.asyncio
async def test_no_duplicate_monitoring_tasks():
    """Test H: Repeated start calls do not create duplicate background loops."""
    worker = AlertMonitoringWorker(interval_seconds=3600)
    worker.start()
    task1 = worker._task
    worker.start()  # second call
    task2 = worker._task
    assert task1 is task2
    await worker.stop()


@pytest.mark.asyncio
async def test_worker_cancellation_is_clean():
    """Test G: Cancellation handles CancelledError properly."""
    worker = AlertMonitoringWorker(interval_seconds=3600)
    worker.start()
    assert worker.is_running
    # Cancel task directly
    worker._task.cancel()
    await asyncio.sleep(0.05)
    await worker.stop()
    assert not worker.is_running


@pytest.mark.asyncio
async def test_risk_update_triggers_alert_only_for_high():
    """Test B: Simulated cells -> Only HIGH cells trigger alert_manager.create_alert()."""
    worker = AlertMonitoringWorker(interval_seconds=3600)

    mock_cells = [
        {"cell_id": 9901, "risk_level": "LOW", "risk_score": 0.15, "rainfall_7d": 20.0, "state": "Assam", "extreme_rainfall": False},
        {"cell_id": 9902, "risk_level": "MODERATE", "risk_score": 0.45, "rainfall_7d": 120.0, "state": "Meghalaya", "extreme_rainfall": False},
        {"cell_id": 9903, "risk_level": "HIGH", "risk_score": 0.85, "rainfall_7d": 240.0, "state": "Nagaland", "extreme_rainfall": False},
    ]

    with patch.object(weather_service, "fetch_weather_batch", return_value=True), \
         patch.object(weather_service, "cached_cells_weather", mock_cells), \
         patch.object(alert_manager, "create_alert") as mock_create_alert:
        
        mock_create_alert.return_value = {
            "alert_id": "ALT-TEST-01",
            "is_duplicate": False,
            "notification_dispatched": True
        }

        stats = await worker.run_cycle(force_weather_fetch=False)

        assert stats["cells_evaluated"] == 3
        assert stats["high_detected"] == 1
        assert stats["alerts_created"] == 1
        assert mock_create_alert.call_count == 1
        # Called with cell 9903
        call_kwargs = mock_create_alert.call_args.kwargs
        assert "9903" in call_kwargs["cell_id"]
        assert call_kwargs["risk_level"] == "HIGH"


@pytest.mark.asyncio
async def test_duplicate_high_cell_suppresses_repeat_notification():
    """Test C: First detection sends notification, second suppresses repeat notification."""
    worker = AlertMonitoringWorker(interval_seconds=3600)
    test_cell_id = "NE_8888"

    try:
        # Clear any preexisting alert for this test cell
        with alert_manager._get_conn() as conn:
            conn.execute("DELETE FROM alerts WHERE cell_id = ?", (test_cell_id,))
            conn.commit()

        mock_cells = [
            {"cell_id": 8888, "risk_level": "HIGH", "risk_score": 0.82, "rainfall_7d": 220.0, "state": "Nagaland", "extreme_rainfall": False}
        ]

        with patch.object(weather_service, "fetch_weather_batch", return_value=True), \
             patch.object(weather_service, "cached_cells_weather", mock_cells), \
             patch("app.fcm_service.fcm_service.send_high_risk_alert") as mock_fcm:
            
            mock_fcm.return_value = {"status": "success", "sent_count": 1}

            # Cycle 1: First detection -> New alert and notification dispatched
            cycle1 = await worker.run_cycle()
            assert cycle1["alerts_created"] == 1
            assert cycle1["duplicates_suppressed"] == 0
            assert mock_fcm.call_count == 1

            # Cycle 2: Same cell still HIGH -> Alert updated, duplicate suppressed, NO new FCM
            cycle2 = await worker.run_cycle()
            assert cycle2["alerts_created"] == 0
            assert cycle2["duplicates_suppressed"] == 1
            # mock_fcm must still be 1 (never called on cycle 2)
            assert mock_fcm.call_count == 1

    finally:
        with alert_manager._get_conn() as conn:
            conn.execute("DELETE FROM alerts WHERE cell_id = ?", (test_cell_id,))
            conn.commit()


@pytest.mark.asyncio
async def test_different_cells_create_separate_alerts():
    """Test D: Cell A and Cell B both HIGH produce two separate alerts."""
    worker = AlertMonitoringWorker(interval_seconds=3600)
    cell_a = "NE_7701"
    cell_b = "NE_7702"

    try:
        with alert_manager._get_conn() as conn:
            conn.execute("DELETE FROM alerts WHERE cell_id IN (?, ?)", (cell_a, cell_b))
            conn.commit()

        mock_cells = [
            {"cell_id": 7701, "risk_level": "HIGH", "risk_score": 0.80, "rainfall_7d": 200.0, "state": "Mizoram", "extreme_rainfall": False},
            {"cell_id": 7702, "risk_level": "HIGH", "risk_score": 0.75, "rainfall_7d": 190.0, "state": "Tripura", "extreme_rainfall": False},
        ]

        with patch.object(weather_service, "fetch_weather_batch", return_value=True), \
             patch.object(weather_service, "cached_cells_weather", mock_cells), \
             patch("app.fcm_service.fcm_service.send_high_risk_alert") as mock_fcm:
            
            mock_fcm.return_value = {"status": "success", "sent_count": 1}

            stats = await worker.run_cycle()
            assert stats["high_detected"] == 2
            assert stats["alerts_created"] == 2
            assert stats["duplicates_suppressed"] == 0
            assert mock_fcm.call_count == 2

    finally:
        with alert_manager._get_conn() as conn:
            conn.execute("DELETE FROM alerts WHERE cell_id IN (?, ?)", (cell_a, cell_b))
            conn.commit()


@pytest.mark.asyncio
async def test_fcm_failure_does_not_crash_worker_or_lose_sqlite_alert():
    """Test E: If FCM network fails, SQLite alert persists and worker completes cycle safely."""
    worker = AlertMonitoringWorker(interval_seconds=3600)
    test_cell_id = "NE_6601"

    try:
        with alert_manager._get_conn() as conn:
            conn.execute("DELETE FROM alerts WHERE cell_id = ?", (test_cell_id,))
            conn.commit()

        mock_cells = [
            {"cell_id": 6601, "risk_level": "HIGH", "risk_score": 0.79, "rainfall_7d": 210.0, "state": "Sikkim", "extreme_rainfall": False}
        ]

        # Simulate FCM throwing an exception
        with patch.object(weather_service, "fetch_weather_batch", return_value=True), \
             patch.object(weather_service, "cached_cells_weather", mock_cells), \
             patch("app.fcm_service.fcm_service.send_high_risk_alert", side_effect=Exception("FCM Network Timeout")):
            
            stats = await worker.run_cycle()
            assert stats["status"] == "success"
            assert stats["alerts_created"] == 1

        # Check SQLite to verify alert was saved despite FCM failure
        with alert_manager._get_conn() as conn:
            row = conn.execute("SELECT * FROM alerts WHERE cell_id = ? AND status = 'ACTIVE'", (test_cell_id,)).fetchone()
            assert row is not None
            assert row["risk_level"] == "HIGH"

    finally:
        with alert_manager._get_conn() as conn:
            conn.execute("DELETE FROM alerts WHERE cell_id = ?", (test_cell_id,))
            conn.commit()


@pytest.mark.asyncio
async def test_weather_failure_does_not_crash_worker():
    """Test F: If Open-Meteo throws an error, the worker catches it, logs, and survives."""
    worker = AlertMonitoringWorker(interval_seconds=3600)

    with patch.object(weather_service, "fetch_weather_batch", side_effect=Exception("Open-Meteo DNS Resolution Failure")):
        stats = await worker.run_cycle()
        assert stats["status"] == "error"
        assert "Open-Meteo" in stats["error"]
        # Worker status tracks error gracefully
        assert worker.last_error is not None
