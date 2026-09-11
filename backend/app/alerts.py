"""
TerraSense — Alert Engine & SQLite Persistence
Manages operational alerts lifecycle (ACTIVE -> ACKNOWLEDGED -> RESOLVED)
and notification dispatching (In-App, Console, extensible to SMS/Email).
"""

import sqlite3
import logging
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from .config import settings
from .utils import utc_now_iso

logger = logging.getLogger(__name__)

class NotificationService:
    """Dispatches notifications across supported channels."""
    
    @staticmethod
    def send(alert: Dict[str, Any]) -> None:
        # In-app log / operational feed
        logger.info(
            f"[NOTIFICATION] Alert {alert['alert_id']} ({alert['risk_level']}) "
            f"for {alert['location']} ({alert['cell_id']}) — Risk: {alert['risk_score']}, "
            f"7d Rain: {alert['rainfall_7d']}mm"
        )
        
        # Push notification to authorized responder devices via FCM for HIGH risk
        if alert.get("risk_level") in ("HIGH", "CRITICAL"):
            try:
                from .fcm_service import fcm_service
                return fcm_service.send_high_risk_alert(alert)
            except Exception as e:
                logger.warning(f"[FCM Error] Push notification dispatch failed: {e}")
                return {"status": "error", "error": str(e)}
        return None


class AlertManager:
    """SQLite-backed alert manager."""
    
    def __init__(self):
        self.db_path = settings.DB_PATH
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        with self._get_conn() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS alerts (
                    alert_id TEXT PRIMARY KEY,
                    cell_id TEXT NOT NULL,
                    location TEXT NOT NULL,
                    risk_level TEXT NOT NULL,
                    risk_score REAL NOT NULL,
                    rainfall_7d REAL NOT NULL,
                    created_at TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'ACTIVE',
                    fcm_sent_at TEXT
                )
            """)
            # Ensure fcm_sent_at column exists in pre-existing databases
            cols = [col[1] for col in conn.execute("PRAGMA table_info(alerts)").fetchall()]
            if "fcm_sent_at" not in cols:
                conn.execute("ALTER TABLE alerts ADD COLUMN fcm_sent_at TEXT")
            conn.commit()

        # Seed initial operational alerts if empty
        self._seed_initial_alerts()

    def _seed_initial_alerts(self) -> None:
        with self._get_conn() as conn:
            count = conn.execute("SELECT COUNT(*) FROM alerts").fetchone()[0]
            if count == 0:
                initial_alerts = [
                    (
                        "ALT-9042",
                        "NE_0427",
                        "Nagaland · Kohima Ridge",
                        "HIGH",
                        0.74,
                        368.5,
                        utc_now_iso(),
                        "ACTIVE"
                    ),
                    (
                        "ALT-9043",
                        "NE_0231",
                        "Mizoram · Aizawl Slopes",
                        "MODERATE",
                        0.58,
                        210.4,
                        utc_now_iso(),
                        "ACTIVE"
                    ),
                    (
                        "ALT-9044",
                        "NE_0498",
                        "Manipur · Imphal West Corridor",
                        "HIGH",
                        0.68,
                        312.0,
                        utc_now_iso(),
                        "ACTIVE"
                    ),
                    (
                        "ALT-9045",
                        "NE_0085",
                        "Sikkim · Gangtok Highway Pass",
                        "MODERATE",
                        0.49,
                        174.2,
                        utc_now_iso(),
                        "ACKNOWLEDGED"
                    ),
                ]
                conn.executemany("""
                    INSERT INTO alerts (alert_id, cell_id, location, risk_level, risk_score, rainfall_7d, created_at, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, initial_alerts)
                conn.commit()
                logger.info("Seeded initial operational alerts into database.")

    def get_alerts(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        query = "SELECT * FROM alerts"
        params = []
        if status:
            query += " WHERE status = ?"
            params.append(status.upper())
        query += " ORDER BY risk_score DESC, created_at DESC"

        with self._get_conn() as conn:
            rows = conn.execute(query, params).fetchall()
            return [dict(row) for row in rows]

    def create_alert(
        self,
        cell_id: str,
        location: str,
        risk_level: str,
        risk_score: float,
        rainfall_7d: float,
        status: str = "ACTIVE",
        is_demo: bool = False,
        advisory: Optional[str] = None,
        message: Optional[str] = None,
        force_dispatch: bool = False
    ) -> Dict[str, Any]:
        with self._get_conn() as conn:
            # Check if active alert already exists for this cell to prevent duplicate spam
            existing = conn.execute(
                "SELECT * FROM alerts WHERE cell_id = ? AND status = 'ACTIVE'",
                (cell_id,)
            ).fetchone()
            
            if existing:
                alert_id = existing["alert_id"]
                conn.execute("""
                    UPDATE alerts
                    SET location = ?, risk_level = ?, risk_score = ?, rainfall_7d = ?
                    WHERE alert_id = ?
                """, (location, risk_level, risk_score, rainfall_7d, alert_id))
                conn.commit()

                if force_dispatch:
                    logger.info(f"[ALERT] Force dispatching FCM for cell {cell_id} (active alert {alert_id}).")
                    alert = {
                        "alert_id": alert_id,
                        "cell_id": cell_id,
                        "location": location,
                        "risk_level": risk_level,
                        "risk_score": risk_score,
                        "rainfall_7d": rainfall_7d,
                        "created_at": existing["created_at"],
                        "status": "ACTIVE",
                        "is_demo": is_demo,
                        "advisory": advisory,
                        "message": message,
                        "is_duplicate": False,
                    }
                    dispatch_res = NotificationService.send(alert)
                    alert["notification_dispatched"] = bool(dispatch_res and dispatch_res.get("status") in ("sent", "success", "dry_run"))
                    alert["fcm_result"] = dispatch_res
                    return alert

                logger.info(f"[ALERT] Duplicate alert skipped for cell {cell_id} (active alert {alert_id} updated).")
                return {
                    "alert_id": alert_id,
                    "cell_id": cell_id,
                    "location": location,
                    "risk_level": risk_level,
                    "risk_score": risk_score,
                    "rainfall_7d": rainfall_7d,
                    "created_at": existing["created_at"],
                    "status": "ACTIVE",
                    "is_duplicate": True,
                    "is_demo": is_demo,
                    "advisory": advisory,
                    "message": message,
                    "notification_dispatched": False
                }

            alert_id = f"ALT-{uuid.uuid4().hex[:6].upper()}"
            created_at = utc_now_iso()
            conn.execute("""
                INSERT INTO alerts (alert_id, cell_id, location, risk_level, risk_score, rainfall_7d, created_at, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (alert_id, cell_id, location, risk_level, risk_score, rainfall_7d, created_at, status))
            conn.commit()

        alert = {
            "alert_id": alert_id,
            "cell_id": cell_id,
            "location": location,
            "risk_level": risk_level,
            "risk_score": risk_score,
            "rainfall_7d": rainfall_7d,
            "created_at": created_at,
            "status": status,
            "is_demo": is_demo,
            "advisory": advisory,
            "message": message,
            "is_duplicate": False,
        }
        dispatch_res = NotificationService.send(alert)
        alert["notification_dispatched"] = bool(dispatch_res and dispatch_res.get("status") in ("sent", "success", "dry_run"))
        alert["fcm_result"] = dispatch_res
        return alert

    def update_status(self, alert_id: str, new_status: str) -> Optional[Dict[str, Any]]:
        status = new_status.upper()
        if status not in {"ACTIVE", "ACKNOWLEDGED", "RESOLVED"}:
            raise ValueError(f"Invalid status: {status}")

        with self._get_conn() as conn:
            cur = conn.execute("""
                UPDATE alerts SET status = ? WHERE alert_id = ?
            """, (status, alert_id))
            conn.commit()
            if cur.rowcount == 0:
                return None
            row = conn.execute("SELECT * FROM alerts WHERE alert_id = ?", (alert_id,)).fetchone()
            return dict(row) if row else None

    def get_active_count(self) -> int:
        with self._get_conn() as conn:
            row = conn.execute("SELECT COUNT(*) FROM alerts WHERE status = 'ACTIVE'").fetchone()
            return int(row[0]) if row else 0

alert_manager = AlertManager()
