"""
TerraSense — Ground Verification Report Engine & SQLite Persistence
Stores ground condition observations submitted by field operators or citizens:
No visible issue, Surface cracks, Slope movement, Rockfall, Landslide, Other.
Lifecycle: PENDING -> VERIFIED -> REJECTED.
Verified reports form structured future ML ground-truth data (without triggering automatic retrain).
"""

import sqlite3
import logging
import uuid
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from .config import settings
from .utils import utc_now_iso

logger = logging.getLogger(__name__)

ALLOWED_CONDITIONS = {
    "No visible issue",
    "Surface cracks",
    "Slope movement",
    "Rockfall",
    "Landslide",
    "Other",
}

VALID_STATUSES = {"PENDING", "VERIFIED", "REJECTED"}

class ReportManager:
    """SQLite-backed Ground Report manager."""

    def __init__(self):
        self.db_path = settings.DB_PATH
        self.uploads_dir = settings.UPLOADS_DIR
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.uploads_dir.mkdir(parents=True, exist_ok=True)
        with self._get_conn() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS ground_reports (
                    report_id TEXT PRIMARY KEY,
                    cell_id TEXT NOT NULL,
                    latitude REAL NOT NULL,
                    longitude REAL NOT NULL,
                    location TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    condition TEXT NOT NULL,
                    description TEXT,
                    photo_reference TEXT,
                    status TEXT NOT NULL DEFAULT 'PENDING',
                    verified_at TEXT
                )
            """)
            conn.commit()

    def save_photo(self, filename: str, content: bytes) -> str:
        """Saves an uploaded photo to data/uploads with a secure unique name."""
        ext = Path(filename).suffix.lower()
        if ext not in {".jpg", ".jpeg", ".png", ".webp", ".heic"}:
            ext = ".jpg"
        unique_name = f"photo_{uuid.uuid4().hex[:12]}{ext}"
        target_path = self.uploads_dir / unique_name
        with open(target_path, "wb") as f:
            f.write(content)
        return f"/api/uploads/{unique_name}"

    def create_report(
        self,
        cell_id: str,
        latitude: float,
        longitude: float,
        location: str,
        condition: str,
        description: Optional[str] = None,
        photo_reference: Optional[str] = None,
        timestamp: Optional[str] = None,
    ) -> Dict[str, Any]:
        if condition not in ALLOWED_CONDITIONS:
            # Allow fallback if minor casing difference
            matched = next((c for c in ALLOWED_CONDITIONS if c.lower() == condition.lower()), None)
            if matched:
                condition = matched
            else:
                condition = "Other"

        report_id = f"REP-{uuid.uuid4().hex[:6].upper()}"
        ts = timestamp or utc_now_iso()

        with self._get_conn() as conn:
            conn.execute("""
                INSERT INTO ground_reports (
                    report_id, cell_id, latitude, longitude, location,
                    timestamp, condition, description, photo_reference, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
            """, (
                report_id, cell_id, latitude, longitude, location,
                ts, condition, description or "", photo_reference or ""
            ))
            conn.commit()

        report = {
            "report_id": report_id,
            "cell_id": cell_id,
            "latitude": latitude,
            "longitude": longitude,
            "location": location,
            "timestamp": ts,
            "condition": condition,
            "description": description or "",
            "photo_reference": photo_reference or None,
            "status": "PENDING",
            "verified_at": None,
        }
        logger.info(f"Created ground report {report_id} for cell {cell_id}: {condition}")
        return report

    def get_reports(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        query = "SELECT * FROM ground_reports"
        params = []
        if status and status.upper() in VALID_STATUSES:
            query += " WHERE status = ?"
            params.append(status.upper())
        query += " ORDER BY timestamp DESC"

        with self._get_conn() as conn:
            rows = conn.execute(query, params).fetchall()
            return [dict(row) for row in rows]

    def get_report_by_id(self, report_id: str) -> Optional[Dict[str, Any]]:
        with self._get_conn() as conn:
            row = conn.execute("SELECT * FROM ground_reports WHERE report_id = ?", (report_id,)).fetchone()
            return dict(row) if row else None

    def update_status(self, report_id: str, new_status: str) -> Optional[Dict[str, Any]]:
        status = new_status.upper()
        if status not in VALID_STATUSES:
            raise ValueError(f"Invalid status: {status}")

        verified_at = utc_now_iso() if status in {"VERIFIED", "REJECTED"} else None

        with self._get_conn() as conn:
            cur = conn.execute("""
                UPDATE ground_reports
                SET status = ?, verified_at = ?
                WHERE report_id = ?
            """, (status, verified_at, report_id))
            conn.commit()
            if cur.rowcount == 0:
                return None
            row = conn.execute("SELECT * FROM ground_reports WHERE report_id = ?", (report_id,)).fetchone()
            return dict(row) if row else None

    def get_summary(self) -> Dict[str, int]:
        with self._get_conn() as conn:
            rows = conn.execute("""
                SELECT status, COUNT(*) as count FROM ground_reports GROUP BY status
            """).fetchall()
            counts = {row["status"]: row["count"] for row in rows}
            return {
                "pending": counts.get("PENDING", 0),
                "verified": counts.get("VERIFIED", 0),
                "rejected": counts.get("REJECTED", 0),
                "total": sum(counts.values()),
            }

report_manager = ReportManager()
