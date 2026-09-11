"""
TerraSense — Firebase Cloud Messaging (FCM) Service
Handles server-side device registration, Firebase Admin SDK lifecycle,
and pushes HIGH-risk landslide alerts to authorized responder devices.
Zero server credentials in git/client apps. Thread-safe SQLite persistence.
"""

import json
import logging
import sqlite3
import threading
import uuid
from pathlib import Path
from typing import List, Dict, Any, Optional

from .config import settings, BACKEND_DIR
from .utils import utc_now_iso

logger = logging.getLogger(__name__)

# Lazy Firebase Admin SDK import handling
try:
    import firebase_admin
    from firebase_admin import credentials, messaging
    from firebase_admin.exceptions import FirebaseError
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False
    logger.warning("[FCM Service] firebase-admin package is not available.")


class FCMService:
    """Manages FCM device tokens and dispatches push notifications."""

    def __init__(self):
        self.db_path: Path = settings.DB_PATH
        self._app: Optional[Any] = None
        self._init_lock = threading.Lock()
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        """Initializes the SQLite fcm_devices table if it doesn't exist."""
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        with self._get_conn() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS fcm_devices (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    fcm_token TEXT UNIQUE NOT NULL,
                    device_name TEXT NOT NULL,
                    role TEXT NOT NULL DEFAULT 'responder',
                    is_active INTEGER NOT NULL DEFAULT 1,
                    registered_at TEXT NOT NULL,
                    last_active_at TEXT NOT NULL
                )
            """)
            conn.commit()

    # ── Firebase Admin SDK Initialization ─────────────────────────────────────

    def _get_app(self) -> Optional[Any]:
        """
        Lazily initializes Firebase Admin SDK with private server credentials.
        Never logs full secrets or private keys.
        """
        if not FIREBASE_AVAILABLE:
            return None

        if self._app is not None:
            return self._app

        with self._init_lock:
            if self._app is not None:
                return self._app

            # Check if default app is already initialized in this process
            try:
                self._app = firebase_admin.get_app()
                logger.info("[FCM] Reusing existing default Firebase App.")
                return self._app
            except ValueError:
                pass

            cred = None

            # 1. Check explicit file path from environment
            if settings.FIREBASE_SERVICE_ACCOUNT_PATH:
                cred_path = Path(settings.FIREBASE_SERVICE_ACCOUNT_PATH)
                if not cred_path.is_absolute():
                    cred_path = BACKEND_DIR / cred_path
                if cred_path.is_file():
                    try:
                        cred = credentials.Certificate(str(cred_path))
                        logger.info(f"[FCM] Loaded credentials from file: {cred_path.name}")
                    except Exception as e:
                        logger.error(f"[FCM Error] Failed to load credentials from {cred_path}: {e}")

            # 2. Check explicit raw JSON string from environment
            if cred is None and settings.FIREBASE_SERVICE_ACCOUNT_JSON:
                try:
                    cred_dict = json.loads(settings.FIREBASE_SERVICE_ACCOUNT_JSON)
                    cred = credentials.Certificate(cred_dict)
                    logger.info("[FCM] Loaded credentials from FIREBASE_SERVICE_ACCOUNT_JSON.")
                except Exception as e:
                    logger.error(f"[FCM Error] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON: {e}")

            # 3. Check standard local files in backend directory
            if cred is None:
                local_candidates = [
                    BACKEND_DIR / "firebase-service-account.json",
                    BACKEND_DIR / "serviceAccountKey.json",
                    BACKEND_DIR / "data" / "firebase-service-account.json",
                ]
                for candidate in local_candidates:
                    if candidate.is_file():
                        try:
                            cred = credentials.Certificate(str(candidate))
                            logger.info(f"[FCM] Loaded local service account from: {candidate.name}")
                            break
                        except Exception as e:
                            logger.error(f"[FCM Error] Failed loading {candidate}: {e}")

            # 4. Fallback to Google Application Default Credentials
            if cred is None:
                try:
                    cred = credentials.ApplicationDefault()
                    logger.info("[FCM] Using Google Application Default Credentials.")
                except Exception:
                    cred = None

            if cred is None:
                logger.warning(
                    "[FCM Config] No Firebase Admin credentials found. "
                    "Push notifications will be logged and simulated in dry-run mode."
                )
                return None

            try:
                options = {"projectId": settings.FIREBASE_PROJECT_ID}
                self._app = firebase_admin.initialize_app(cred, options=options)
                logger.info(f"[FCM] Firebase Admin SDK successfully initialized for project '{settings.FIREBASE_PROJECT_ID}'.")
                return self._app
            except Exception as e:
                logger.error(f"[FCM Error] Failed to initialize Firebase App: {e}")
                return None

    # ── Device Registration & Management ──────────────────────────────────────

    def register_device(
        self,
        fcm_token: str,
        device_name: str = "Android Device",
        role: str = "responder"
    ) -> Dict[str, Any]:
        """
        Stores or updates an authorized device FCM registration token.
        Supports role-based routing (responder, ddma, sdma, control_room).
        """
        now = utc_now_iso()
        masked_token = f"...{fcm_token[-6:]}" if len(fcm_token) > 6 else fcm_token

        with self._get_conn() as conn:
            conn.execute("""
                INSERT INTO fcm_devices (fcm_token, device_name, role, is_active, registered_at, last_active_at)
                VALUES (?, ?, ?, 1, ?, ?)
                ON CONFLICT(fcm_token) DO UPDATE SET
                    device_name = excluded.device_name,
                    role = excluded.role,
                    is_active = 1,
                    last_active_at = excluded.last_active_at
            """, (fcm_token, device_name, role, now, now))
            conn.commit()

        logger.info(f"[FCM] Device registered: {device_name} (role: {role}, token: {masked_token})")

        return {
            "status": "success",
            "message": "Device registered successfully",
            "device_name": device_name,
            "role": role,
            "registered_at": now
        }

    def get_active_devices(self, role: Optional[str] = None) -> List[Dict[str, Any]]:
        """Returns all active authorized responder devices."""
        query = "SELECT * FROM fcm_devices WHERE is_active = 1"
        params: List[Any] = []
        if role:
            query += " AND role = ?"
            params.append(role)
        query += " ORDER BY last_active_at DESC"

        with self._get_conn() as conn:
            rows = conn.execute(query, params).fetchall()
            return [dict(row) for row in rows]

    def deactivate_token(self, fcm_token: str) -> None:
        """Deactivates an expired or invalid registration token."""
        masked_token = f"...{fcm_token[-6:]}" if len(fcm_token) > 6 else fcm_token
        with self._get_conn() as conn:
            conn.execute("UPDATE fcm_devices SET is_active = 0 WHERE fcm_token = ?", (fcm_token,))
            conn.commit()
        logger.info(f"[FCM] Deactivated invalid/expired token: {masked_token}")

    # ── Notification Dispatchers ──────────────────────────────────────────────

    def send_high_risk_alert(self, alert: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sends an official HIGH-risk alert notification to all authorized responder devices.
        Title: '🚨 TerraSense HIGH Risk Alert'
        Body includes location, risk score, and rainfall trigger.
        """
        location = alert.get("location", "Northeast India")
        risk_score = alert.get("risk_score", 0.0)
        rainfall_7d = alert.get("rainfall_7d", 0.0)
        alert_id = alert.get("alert_id", f"ALT-{uuid.uuid4().hex[:6].upper()}")
        cell_id = alert.get("cell_id", "UNKNOWN")

        # Parse State from location string (e.g. 'Nagaland · Kohima Ridge')
        state = location.split("·")[0].strip() if "·" in location else location.split("-")[0].strip()

        # Format scores and triggers
        score_fmt = f"{risk_score:.2f}" if isinstance(risk_score, (int, float)) else str(risk_score)
        rain_fmt = f"{rainfall_7d:.1f}mm" if isinstance(rainfall_7d, (int, float)) else f"{rainfall_7d}mm"

        is_demo = bool(alert.get("is_demo", False))
        is_demo_str = "true" if is_demo else "false"

        title = "🚨 TerraSense Demo Alert" if is_demo else "🚨 TerraSense HIGH Risk Alert"
        prefix = "[DEMO SIMULATION] " if is_demo else ""
        custom_msg = alert.get("message")
        body = custom_msg if custom_msg else f"{prefix}High landslide risk detected in {location}. Risk score: {score_fmt}. Rainfall trigger: {rain_fmt}."
        advisory = alert.get("advisory") or custom_msg or (
            "DEMO ADVISORY: Test simulation. Pre-position quick response teams, monitor local rainfall telemetry, and inspect slope drainage."
            if is_demo else
            "Pre-position quick response teams, activate local siren/SMS protocols, monitor telemetry, and inspect vulnerable slope corridors."
        )

        data_payload = {
            "type": "DEMO_TEST" if is_demo else "LANDSLIDE_HIGH",
            "nav_target": "ALERT_DETAILS",
            "alert_id": str(alert_id),
            "cell_id": str(cell_id),
            "location": str(location),
            "state": str(state),
            "title": title,
            "risk_score": score_fmt,
            "risk_level": str(alert.get("risk_level", "HIGH")),
            "rainfall": rain_fmt,
            "rainfall_7d": str(rainfall_7d),
            "message": body,
            "advisory": advisory,
            "timestamp": alert.get("created_at") or utc_now_iso(),
            "is_demo": is_demo_str,
        }

        return self._dispatch_to_responders(
            title=title,
            body=body,
            data_payload=data_payload,
            alert_id=alert_id
        )

    def send_demo_push(
        self,
        fcm_token: Optional[str] = None,
        title: Optional[str] = None,
        message: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Sends a clearly labeled demo/test push notification for developer verification.
        Does NOT pretend to be a real disaster.
        """
        demo_title = title or "🚨 TerraSense Demo Alert"
        demo_body = message or "Test notification from TerraSense alert system."
        demo_id = f"DEMO-{uuid.uuid4().hex[:6].upper()}"

        data_payload = {
            "type": "DEMO_TEST",
            "nav_target": "ALERT_DETAILS",
            "alert_id": demo_id,
            "cell_id": "DEMO_0001",
            "location": "TerraSense Demo Grid · Test Node",
            "state": "Demo Simulation",
            "title": demo_title,
            "risk_score": "0.85",
            "risk_level": "HIGH",
            "rainfall": "120.0mm",
            "rainfall_7d": "120.0",
            "message": demo_body,
            "timestamp": utc_now_iso(),
            "is_demo": "true",
        }

        # If a specific token is passed, send exclusively to that token
        if fcm_token:
            res = self._send_single(
                fcm_token=fcm_token,
                title=demo_title,
                body=demo_body,
                data_payload=data_payload,
                alert_id=demo_id,
                device_name="Target Device"
            )
            is_sent = (res["status"] == "sent")
            return {
                "status": res["status"],
                "message": f"Demo push dispatch: {res['status']}",
                "dispatched_count": 1 if is_sent else 0,
                "failed_count": 0 if is_sent else 1,
                "details": [res]
            }

        # Otherwise send to all registered responder devices
        return self._dispatch_to_responders(
            title=demo_title,
            body=demo_body,
            data_payload=data_payload,
            alert_id=demo_id
        )

    def _dispatch_to_responders(
        self,
        title: str,
        body: str,
        data_payload: Dict[str, str],
        alert_id: str,
        role: Optional[str] = "responder"
    ) -> Dict[str, Any]:
        """Internal dispatcher: sends notification to all authorized active responder devices."""
        devices = self.get_active_devices(role=role)
        if not devices:
            logger.info(f"[FCM] No registered responder devices found (role={role}). Alert {alert_id} not pushed.")
            return {
                "status": "skipped",
                "message": "No registered responder devices in database",
                "dispatched_count": 0,
                "failed_count": 0,
                "details": []
            }

        dispatched = 0
        failed = 0
        details: List[Dict[str, Any]] = []

        for dev in devices:
            token = dev["fcm_token"]
            device_name = dev["device_name"]
            res = self._send_single(
                fcm_token=token,
                title=title,
                body=body,
                data_payload=data_payload,
                alert_id=alert_id,
                device_name=device_name
            )
            details.append(res)
            if res["status"] == "sent":
                dispatched += 1
            else:
                failed += 1

        logger.info(
            f"[FCM] Alert {alert_id} dispatch completed: "
            f"{dispatched} sent, {failed} failed out of {len(devices)} devices."
        )

        return {
            "status": "success" if dispatched > 0 else ("dry_run" if not self._app else "failed"),
            "message": f"Alert dispatch completed ({dispatched} sent, {failed} failed)",
            "dispatched_count": dispatched,
            "failed_count": failed,
            "details": details
        }

    def _send_single(
        self,
        fcm_token: str,
        title: str,
        body: str,
        data_payload: Dict[str, str],
        alert_id: str,
        device_name: str
    ) -> Dict[str, Any]:
        """Sends an FCM message to a single token with error handling and logging."""
        app = self._get_app()
        masked_token = f"...{fcm_token[-6:]}" if len(fcm_token) > 6 else fcm_token

        # If Firebase is not initialized, run in dry-run mode (never crash FastAPI)
        if not app or not FIREBASE_AVAILABLE:
            logger.info(
                f"[FCM Dry-Run] Would send notification '{title}' to {device_name} "
                f"(token: {masked_token}) — Data: {data_payload.get('alert_id')}"
            )
            return {
                "status": "dry_run",
                "device_name": device_name,
                "token_suffix": masked_token,
                "detail": "Firebase credentials not configured on backend; simulated in dry-run mode."
            }

        try:
            # Build high-priority Android configuration for prompt heads-up alert delivery
            android_config = messaging.AndroidConfig(
                priority="high",
                notification=messaging.AndroidNotification(
                    title=title,
                    body=body,
                    channel_id="terrasense_alerts_high_v2",
                    priority="high",
                    default_sound=True,
                    default_vibrate_timings=True,
                    icon="ic_dialog_alert",
                ),
            )

            msg = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=body,
                ),
                data=data_payload,
                token=fcm_token,
                android=android_config,
            )

            response = messaging.send(msg, app=app)
            logger.info(
                f"[FCM] FCM notification sent: alert {alert_id} to {device_name} "
                f"(token: {masked_token}) — Message ID: {response}"
            )

            # Update last_active_at in database
            with self._get_conn() as conn:
                conn.execute(
                    "UPDATE fcm_devices SET last_active_at = ? WHERE fcm_token = ?",
                    (utc_now_iso(), fcm_token)
                )
                conn.commit()

            return {
                "status": "sent",
                "device_name": device_name,
                "token_suffix": masked_token,
                "message_id": response
            }

        except messaging.UnregisteredError:
            logger.warning(f"[FCM Error] Token unregistered by client: {masked_token}. Deactivating.")
            self.deactivate_token(fcm_token)
            return {
                "status": "unregistered",
                "device_name": device_name,
                "token_suffix": masked_token,
                "detail": "Client unregistered or uninstalled the app. Token deactivated."
            }
        except messaging.SenderIdMismatchError:
            logger.warning(f"[FCM Error] Sender ID mismatch for token: {masked_token}. Deactivating.")
            self.deactivate_token(fcm_token)
            return {
                "status": "mismatch",
                "device_name": device_name,
                "token_suffix": masked_token,
                "detail": "Token was generated with a different Firebase project/sender ID."
            }
        except Exception as e:
            logger.error(f"[FCM Error] FCM notification failed for {device_name} (token: {masked_token}): {e}")
            return {
                "status": "error",
                "device_name": device_name,
                "token_suffix": masked_token,
                "detail": str(e)
            }


fcm_service = FCMService()
