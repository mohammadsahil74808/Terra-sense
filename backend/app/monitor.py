"""
TerraSense — Autonomous Background Monitoring Worker
Periodically executes the full risk-and-alert cycle:
1. Refreshes live Open-Meteo weather (honoring or updating cache).
2. Evaluates all 2,534 cells using the FROZEN ML risk engine.
3. Automatically detects HIGH risk cells (risk_score >= 0.66).
4. Invokes alert_manager.create_alert() for each HIGH cell.
5. Employs AlertManager duplicate suppression to prevent repeat FCM notifications.
6. Robust failure isolation: survives API errors, network drops, and FCM errors.
"""

import asyncio
import logging
import time
from typing import Dict, Any, Optional
from datetime import datetime, timezone

from .weather_service import weather_service
from .alerts import alert_manager

logger = logging.getLogger("terrasense.monitor")


class AlertMonitoringWorker:
    _instance: Optional["AlertMonitoringWorker"] = None

    def __init__(self, interval_seconds: int = 900):
        self.interval_seconds = interval_seconds  # Default ~15 minutes (900s)
        self._task: Optional[asyncio.Task] = None
        self._is_running = False
        self._lock = asyncio.Lock()
        
        # Observability / Health telemetry
        self.last_cycle_started_at: Optional[str] = None
        self.last_cycle_completed_at: Optional[str] = None
        self.total_cycles: int = 0
        self.last_cells_evaluated: int = 0
        self.last_high_cells_detected: int = 0
        self.last_alerts_created: int = 0
        self.last_duplicates_suppressed: int = 0
        self.last_error: Optional[str] = None

    @classmethod
    def get_instance(cls) -> "AlertMonitoringWorker":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    @property
    def is_running(self) -> bool:
        return self._is_running and self._task is not None and not self._task.done()

    def start(self) -> None:
        """Starts the background monitoring loop if not already running."""
        if self._is_running or (self._task is not None and not self._task.done()):
            logger.warning("[TERRASENSE MONITOR] Background worker already active. Skipping duplicate start.")
            return

        self._is_running = True
        self._task = asyncio.create_task(self._run_loop(), name="terrasense_alert_monitor")
        logger.info(f"[TERRASENSE MONITOR] Autonomous monitoring worker started (cycle interval: {self.interval_seconds}s).")

    async def stop(self) -> None:
        """Gracefully stops the background monitoring loop on FastAPI shutdown."""
        self._is_running = False
        if self._task is not None:
            logger.info("[TERRASENSE MONITOR] Stopping autonomous monitoring worker...")
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            except Exception as e:
                logger.error(f"[TERRASENSE MONITOR] Error during worker shutdown: {e}")
            self._task = None
        logger.info("[TERRASENSE MONITOR] Autonomous monitoring worker stopped cleanly.")

    async def run_cycle(self, force_weather_fetch: bool = False) -> Dict[str, Any]:
        """
        Executes a single monitoring cycle with non-overlapping concurrency protection.
        Can be called by the loop or directly in tests.
        """
        if self._lock.locked():
            logger.warning("[TERRASENSE MONITOR] Cycle already in progress. Skipping overlapping execution.")
            return {"status": "skipped", "reason": "in_progress"}

        async with self._lock:
            start_iso = datetime.now(timezone.utc).isoformat()
            self.last_cycle_started_at = start_iso
            logger.info("[TERRASENSE MONITOR] Cycle started.")

            stats = {
                "started_at": start_iso,
                "weather_updated": False,
                "cells_evaluated": 0,
                "high_detected": 0,
                "alerts_created": 0,
                "duplicates_suppressed": 0,
                "fcm_dispatched": 0,
                "status": "success",
                "error": None
            }

            try:
                # 1. Fetch/Update weather & dynamic risk for all 2,534 cells (non-blocking thread pool)
                # fetch_weather_batch internally re-evaluates all 2,534 cells using the FROZEN risk engine
                weather_ok = await asyncio.to_thread(weather_service.fetch_weather_batch, force_weather_fetch)
                stats["weather_updated"] = weather_ok
                logger.info(f"[TERRASENSE MONITOR] Weather & risk evaluation completed (status: {weather_service.weather_status}).")

                # 2. Inspect cells output from the cache
                cells = weather_service.cached_cells_weather
                stats["cells_evaluated"] = len(cells)
                self.last_cells_evaluated = len(cells)

                # 3. Detect HIGH cells & route to AlertManager
                high_cells = [c for c in cells if c.get("risk_level") == "HIGH" or c.get("extreme_rainfall")]
                stats["high_detected"] = len(high_cells)
                self.last_high_cells_detected = len(high_cells)
                logger.info(f"[TERRASENSE MONITOR] 2,534 cells evaluated. HIGH cells detected: {len(high_cells)}")

                for cell in high_cells:
                    try:
                        cell_id_str = f"NE_{cell['cell_id']:04d}" if isinstance(cell["cell_id"], int) else str(cell["cell_id"])
                        location_name = cell.get("full_address") or cell.get("location_name") or f"{cell.get('state', 'Northeast India')} - Cell {cell_id_str}"
                        
                        alert_res = await asyncio.to_thread(
                            alert_manager.create_alert,
                            cell_id=cell_id_str,
                            location=location_name,
                            risk_level=cell.get("risk_level", "HIGH"),
                            risk_score=float(cell.get("risk_score", 0.70)),
                            rainfall_7d=float(cell.get("rainfall_7d", 0.0)),
                            status="ACTIVE",
                            is_demo=False,
                            advisory=f"CRITICAL: High landslide hazard detected at {location_name}. Risk score: {round(cell.get('risk_score', 0.70) * 100, 1)}%."
                        )

                        if alert_res.get("is_duplicate"):
                            stats["duplicates_suppressed"] += 1
                        else:
                            stats["alerts_created"] += 1
                            if alert_res.get("notification_dispatched"):
                                stats["fcm_dispatched"] += 1

                    except Exception as cell_err:
                        logger.error(f"[TERRASENSE MONITOR] Error processing HIGH cell {cell.get('cell_id')}: {cell_err}")

                self.last_alerts_created = stats["alerts_created"]
                self.last_duplicates_suppressed = stats["duplicates_suppressed"]
                self.total_cycles += 1
                self.last_cycle_completed_at = datetime.now(timezone.utc).isoformat()
                self.last_error = None

                logger.info(
                    f"[TERRASENSE MONITOR] Cycle completed successfully: "
                    f"evaluated={stats['cells_evaluated']}, HIGH={stats['high_detected']}, "
                    f"created={stats['alerts_created']}, duplicates_suppressed={stats['duplicates_suppressed']}, "
                    f"fcm_dispatched={stats['fcm_dispatched']}"
                )

            except Exception as e:
                err_msg = str(e)
                self.last_error = err_msg
                stats["status"] = "error"
                stats["error"] = err_msg
                logger.error(f"[TERRASENSE MONITOR] Monitoring cycle encountered an error: {e}", exc_info=True)

            return stats

    async def _run_loop(self) -> None:
        """Internal background loop running every interval_seconds."""
        logger.info("[TERRASENSE MONITOR] Background loop started.")
        while self._is_running:
            try:
                await self.run_cycle()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"[TERRASENSE MONITOR] Unexpected error in monitor loop: {e}", exc_info=True)

            try:
                await asyncio.sleep(self.interval_seconds)
            except asyncio.CancelledError:
                break

        logger.info("[TERRASENSE MONITOR] Background loop terminated.")

    def get_status(self) -> Dict[str, Any]:
        """Returns health and status metrics for system observability."""
        return {
            "worker_running": self.is_running,
            "interval_seconds": self.interval_seconds,
            "total_cycles": self.total_cycles,
            "last_cycle_started_at": self.last_cycle_started_at,
            "last_cycle_completed_at": self.last_cycle_completed_at,
            "last_cells_evaluated": self.last_cells_evaluated,
            "last_high_cells_detected": self.last_high_cells_detected,
            "last_alerts_created": self.last_alerts_created,
            "last_duplicates_suppressed": self.last_duplicates_suppressed,
            "last_error": self.last_error,
        }


monitor_worker = AlertMonitoringWorker.get_instance()
