# 🌍 TerraSense — AI Landslide Early Warning & Real-Time Monitoring System

> **Smart India Hackathon 2026** · Disaster Management · Predictive Geo-Spatial Intelligence  
> Full-Stack Platform: **Machine Learning Pipeline + FastAPI Backend + React 18 Web Dashboard + Android Native App (Kotlin / Jetpack Compose)**

---

## 📌 Overview

**TerraSense** is an end-to-end AI-powered disaster management platform designed to predict, monitor, and alert communities and authorities about imminent landslide threats. 

The system leverages:
- **Trained Machine Learning Model** (`RandomForestClassifier`) evaluated over **2,534 high-resolution spatial grid cells** across vulnerable hill tracts (Western Ghats & Northeast India).
- **Dynamic Risk Engine**: Combines static geological susceptibility (slope, elevation, lithology, drainage) with real-time multi-day rainfall telemetry from the **Open-Meteo API**.
- **Real-Time Web Dashboard**: Built with React 18, TypeScript, Tailwind CSS, and interactive Leaflet maps with live weather radar, what-if simulators, and crowd-sourced ground reporting.
- **Native Android App**: Built with Kotlin and Jetpack Compose, featuring critical heads-up **Firebase Cloud Messaging (FCM)** alerts with dedicated siren audio, offline guidance, and emergency hotlines.

---

## 💻 How to Clone & Run on Your Laptop (Complete Step-by-Step)

Follow these instructions to run the entire TerraSense platform locally on your computer.

### 📋 Prerequisites

Make sure you have installed on your laptop:

| Requirement | Minimum Version | Download Link | Verification Command |
|-------------|-----------------|---------------|----------------------|
| **Git** | Any recent | [git-scm.com](https://git-scm.com/) | `git --version` |
| **Python** | 3.10 or higher | [python.org](https://www.python.org/downloads/) | `python --version` |
| **Node.js & npm** | Node >= 18 LTS | [nodejs.org](https://nodejs.org/) | `node -v` and `npm -v` |
| **Android Studio** *(Optional)* | Ladybug or newer | [developer.android.com](https://developer.android.com/studio) | Only needed if running the mobile app |

---

### 🚀 Step 1: Clone the Repository

Open your terminal (PowerShell, Command Prompt, or Bash) and run:

```bash
git clone https://github.com/mohammadsahil74808/Terra-sense.git
cd Terra-sense
```

---

### ⚙️ Step 2: Start the Backend (FastAPI Server)

The backend handles the ML risk engine, spatial grid cells, Open-Meteo live rainfall sync, and SQLite ground reports.

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create a Python Virtual Environment:**
   - **On Windows (PowerShell / Command Prompt):**
     ```powershell
     python -m venv venv
     ```
   - **On macOS / Linux:**
     ```bash
     python3 -m venv venv
     ```

3. **Activate the Virtual Environment:**
   - **On Windows (PowerShell):**
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
     *(If you see a PowerShell execution policy error, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` first).*
   - **On Windows (Command Prompt `cmd`):**
     ```cmd
     venv\Scripts\activate.bat
     ```
   - **On macOS / Linux:**
     ```bash
     source venv/bin/activate
     ```

4. **Install Python Dependencies:**
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

5. **(Optional) Configure Environment Variables:**
   ```bash
   # On Windows
   copy .env.example .env
   # On macOS/Linux
   cp .env.example .env
   ```
   *Note: Default settings work out-of-the-box for local testing. Firebase credentials can be added to `.env` if testing real push notifications.*

6. **Start the FastAPI Server:**
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   *(Alternatively: `python main.py`)*

7. **Verify the Backend is Running:**
   - Open your browser at: **[http://localhost:8000/docs](http://localhost:8000/docs)** (Interactive Swagger UI)
   - Health Check: **[http://localhost:8000/health](http://localhost:8000/health)** (Returns `{"status": "healthy"}`)

> 💡 **Keep this terminal window open.** The backend must stay running.

---

### 🎨 Step 3: Start the Frontend (Web Dashboard)

Open a **NEW terminal window** (do not close the backend terminal).

1. **Navigate to the frontend folder:**
   ```bash
   cd Terra-sense/frontend
   ```

2. **Install Node.js packages:**
   ```bash
   npm install
   ```

3. **Start the Vite development server:**
   ```bash
   npm run dev
   ```

4. **Open the Dashboard in your browser:**
   - Navigate to: **[http://localhost:5173](http://localhost:5173)**
   - The Vite proxy automatically routes all `/api/*` calls directly to your FastAPI backend on port 8000.

---

### 📱 Step 4: Run the Android App (Optional)

If you wish to test the native mobile alert application:

1. Launch **Android Studio**.
2. Click **Open** and select the `Terra-sense/android` directory.
3. Allow Gradle to download dependencies and sync the project.
4. *(Optional for FCM Push)* Place your `google-services.json` inside `android/app/`.
5. Start an Android Virtual Device (AVD) running **Android 8.0 (API 26) or higher**, or connect a physical Android device with USB debugging enabled.
6. Click the **Run ▶** button in Android Studio to build and install the app.
7. The app includes a test alert generator that triggers the high-priority heads-up warning and siren sound even without cloud credentials.

---

### 🧪 Step 5: Run Automated Tests

To ensure everything is working properly on your system:

#### Run Backend Test Suite:
From the root directory or `backend/`:
```bash
pytest tests/ -v
```
This tests:
- Model loading and 9-feature integrity
- Spatial grid resolution across all 2,534 cells
- Dynamic risk engine calculations and extreme rainfall caps
- All FastAPI endpoints (`/health`, `/api/summary`, `/api/map/cells`, `/api/predict`, etc.)

#### Run Frontend Build Verification:
```bash
cd frontend
npm run build
```

---

## 🗂️ Project Structure

```
TerraSense/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application router & lifespan
│   │   ├── config.py            # Pydantic environment configurations
│   │   ├── schemas.py           # API request/response models
│   │   ├── predictor.py         # ModelManager: inference for 9 ML features
│   │   ├── risk_engine.py       # Combines susceptibility + live rainfall
│   │   ├── grid.py              # Manages 2,534 spatial grid cells (.parquet)
│   │   ├── weather_service.py   # Open-Meteo live weather & radar integration
│   │   ├── monitor.py           # Background risk scanning daemon
│   │   ├── fcm_service.py       # Firebase Cloud Messaging push service
│   │   ├── reports.py           # SQLite crowd-sourced citizen reports
│   │   └── settlements.py       # Vulnerable village metadata & coordinates
│   ├── data/                    # SQLite database & local caches
│   ├── models/                  # Pretrained model pkl & parquet grid
│   ├── requirements.txt         # Python dependencies
│   └── main.py                  # Direct entry point (python main.py)
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── RiskMap.tsx                # Interactive Leaflet map with 2,534 cells
│   │   │   ├── LiveWeatherMap.tsx         # Open-Meteo live radar & precipitation
│   │   │   ├── CellInvestigationDrawer.tsx# Drill-down ML SHAP-like feature inspector
│   │   │   ├── WhatIfSimulator.tsx        # Interactive ML slider simulator
│   │   │   ├── WhatIfRainfallSimulator.tsx# Real-time rainfall stress-test
│   │   │   ├── StateRiskExplorer.tsx      # State/regional risk breakdown
│   │   │   ├── GroundReportModal.tsx      # Citizen photo report submission
│   │   │   ├── GroundReportsPanel.tsx     # Citizen report feed & verification
│   │   │   ├── AlertPanel.tsx             # Multi-lingual emergency alert generator
│   │   │   ├── MetricsRow.tsx             # Animated stats & live counts
│   │   │   └── Header.tsx                 # Branding, dark/light theme switch
│   │   ├── api/client.ts        # Typed frontend API client
│   │   ├── types/index.ts       # TypeScript schemas & interfaces
│   │   └── index.css            # Tailwind + Leaflet custom themes
│   ├── package.json
│   └── vite.config.ts
│
├── android/                     # Native Android Kotlin Application
│   ├── app/src/main/java/com/terrasense/alerts/
│   │   ├── MainActivity.kt                # Jetpack Compose UI container
│   │   ├── service/TerraSenseFCM.kt       # High-priority siren alert receiver
│   │   ├── ui/MainScreen.kt               # Alert history & emergency status
│   │   └── ui/AlertDetailsScreen.kt       # Evacuation steps & hotline dialer
│   └── build.gradle.kts
│
├── docs/                        # Technical documentation & summaries
├── tests/                       # Backend test suite (pytest)
└── README.md
```

---

## 🌐 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Server health and ML model status |
| `GET` | `/api/summary` | Aggregate statistics (total cells, high/mod risk counts, active alerts) |
| `GET` | `/api/map/cells` | Returns 2,534 spatial grid cells with live computed risk |
| `GET` | `/api/villages` | All settlements and villages with risk levels |
| `POST` | `/api/predict` | Live ML inference on custom terrain/rainfall inputs |
| `GET` | `/api/weather/live` | Open-Meteo live rainfall, temperature, and wind data |
| `GET` | `/api/reports` | Get crowd-sourced citizen landslide incident reports |
| `POST` | `/api/reports` | Submit a new citizen incident report (with optional photo upload) |
| `POST` | `/api/alerts/broadcast` | Broadcast emergency alert (FCM push + local logs) |

---

## 🛠️ Common Troubleshooting

### 1. PowerShell Script Execution Error (Windows)
**Error:** `cannot be loaded because running scripts is disabled on this system.`  
**Solution:** Open PowerShell as Administrator or in your current terminal run:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```
Then run `.\venv\Scripts\Activate.ps1` again.

### 2. Port Already in Use (`Errno 10048` or `EADDRINUSE`)
- If port **8000** is in use:
  ```bash
  uvicorn main:app --reload --port 8001
  ```
  *(Update `frontend/vite.config.ts` target port if you change the backend port).*
- If port **5173** is in use: Vite will automatically offer port `5174`.

### 3. Node Modules Installation Issues
If `npm install` encounters network or peer dependency conflicts, run:
```bash
npm install --legacy-peer-deps
```

---

## 👥 Team & Attribution

- **Project**: TerraSense AI Early Warning System
- **Theme**: Smart India Hackathon (Disaster Management)
- **Repository**: [https://github.com/mohammadsahil74808/Terra-sense](https://github.com/mohammadsahil74808/Terra-sense)

---
*Built with ❤️ for proactive disaster prevention and community resilience.*

