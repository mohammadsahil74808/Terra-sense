# TerraSense — Firebase Cloud Messaging (FCM) Backend Setup Guide

This guide explains how to connect the existing TerraSense FastAPI backend to Firebase Cloud Messaging to dispatch real-time heads-up push notifications to authorized responder Android devices.

---

## 1. Important Architecture & Security Distinction

| Component | Credential File | Purpose | Location |
| :--- | :--- | :--- | :--- |
| **Android Client** | `google-services.json` | Identifies client app to Firebase | `android/app/google-services.json` |
| **FastAPI Backend** | `firebase-service-account.json` | Server-side private key to send push messages | `backend/` (Ignored by `.gitignore`) |

> [!CAUTION]
> **Zero Secret Rule**:
> NEVER copy the Firebase Admin service account key into the Android app or frontend code.
> Keep it strictly on the backend server.
> The root `.gitignore` already protects `*service-account*.json`, `*firebase-adminsdk*.json`, and `serviceAccountKey.json`.

---

## 2. Generating Firebase Admin Credentials

1. Open the [Firebase Console](https://console.firebase.google.com/) and navigate to project:
   **`teraa-sense`**
2. Click the **Gear icon (⚙️)** next to *Project Overview* -> **Project settings**.
3. Select the **Service accounts** tab.
4. Verify that **Firebase Admin SDK** is selected (Python snippet is shown).
5. Click **Generate new private key** -> **Generate key**.
6. A JSON file will download (e.g. `teraa-sense-firebase-adminsdk-xxxxx.json`).
7. Rename the downloaded file to:
   `firebase-service-account.json`
8. Place it in the backend folder:
   `c:\Projects\TerraSense\backend\firebase-service-account.json`

---

## 3. Environment Variables

Create or edit `c:\Projects\TerraSense\backend\.env`:

```env
FIREBASE_PROJECT_ID=teraa-sense
FIREBASE_SERVICE_ACCOUNT_PATH=firebase-service-account.json
```

*(Alternatively, in production environments like Docker or Kubernetes, you can provide the entire JSON key as a raw string using `FIREBASE_SERVICE_ACCOUNT_JSON`.)*

---

## 4. Running the Backend Locally

Open a PowerShell terminal in `c:\Projects\TerraSense\backend`:

```powershell
cd c:\Projects\TerraSense\backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

When started with the service account in place, the backend log will confirm:
```text
[INFO] app.fcm_service: [FCM] Loaded credentials from file: firebase-service-account.json
[INFO] app.fcm_service: [FCM] Firebase Admin SDK successfully initialized for project 'teraa-sense'.
```

*(If started without credentials, the backend will safely fall back to dry-run mode and log simulated notifications without crashing the API or dashboard).*

---

## 5. Registering an Authorized Responder Device

Once the **TerraSense Alerts** Android app (`com.terrasense.alerts`) is launched on your phone, copy the token displayed on the screen and register it via HTTP `POST`:

```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/alerts/register-device" `
  -Method POST `
  -ContentType "application/json" `
  -Body (@{
      fcm_token = "<PASTE_YOUR_FCM_TOKEN_HERE>"
      device_name = "Sahil OnePlus"
      role = "responder"
  } | ConvertTo-Json)
```

**Expected Response (`200 OK`)**:
```json
{
  "status": "success",
  "message": "Device registered successfully",
  "device_name": "Sahil OnePlus",
  "role": "responder",
  "registered_at": "2026-09-07T15:45:00+00:00"
}
```

---

## 6. Sending a Safe Demo Push Notification

To trigger a developer test notification on your registered device:

```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/alerts/test-push" `
  -Method POST `
  -ContentType "application/json" `
  -Body (@{
      title = "🚨 TerraSense Demo Alert"
      message = "Test notification from TerraSense alert system."
  } | ConvertTo-Json)
```

**What happens on your phone**:
- A heads-up banner notification appears with title `🚨 TerraSense Demo Alert`.
- Tapping it opens the TerraSense Alerts app showing the test alert payload details.

---

## 7. Automatic Live HIGH-Risk Alert Flow

When the TerraSense risk engine evaluates an active cell and determines `risk_level == "HIGH"`:
1. `alert_manager.create_alert(...)` generates an operational alert (e.g. `ALT-B7281A`).
2. `NotificationService.send(...)` is automatically called.
3. `fcm_service.send_high_risk_alert(...)` dispatches a high-priority push message to all registered responder devices.
4. If a dashboard refresh triggers evaluation for the same cell while an alert is already active, `duplicate alert skipped` is logged and no spam notification is sent.
