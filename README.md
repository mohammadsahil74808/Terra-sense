# TerraSense — AI Landslide Early Warning System
### Smart India Hackathon 2026 · Kohima District, Nagaland

A full-stack prototype for real-time landslide risk monitoring using a trained RandomForestClassifier served via FastAPI, visualised on an interactive Leaflet map in a React + TypeScript dashboard.

---

## Project Structure

```
TerraSense/
├── backend/
│   ├── main.py                        ← FastAPI app (all 4 API endpoints)
│   ├── requirements.txt
│   ├── data/
│   │   └── kohima_final_dataset.csv   ← ⭐ DROP YOUR CSV HERE
│   └── models/
│       └── landslide_model.pkl        ← ⭐ DROP YOUR MODEL HERE
│
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── App.tsx                    ← Root dashboard
│       ├── index.css                  ← Global styles + Leaflet overrides
│       ├── types/index.ts             ← TypeScript interfaces
│       ├── api/client.ts              ← Typed API fetch wrappers
│       ├── hooks/useCountUp.ts        ← Animated counter hook
│       ├── utils/riskHelpers.ts       ← Risk color/label utilities
│       └── components/
│           ├── Header.tsx             ← Sticky header + status pill
│           ├── MetricsRow.tsx         ← 4 animated stat cards
│           ├── RiskMap.tsx            ← Leaflet map with risk markers
│           ├── VillageSidePanel.tsx   ← Slide-in village detail panel
│           ├── VillageTable.tsx       ← Sortable/searchable data table
│           ├── WhatIfSimulator.tsx    ← ML live simulation panel
│           ├── AlertPanel.tsx         ← Mock SMS alert + language toggle
│           ├── RoadmapStrip.tsx       ← Honest feature roadmap
│           └── Footer.tsx             ← Credits and attribution
│
└── README.md
```

---

## Prerequisites

| Tool    | Version  | Install                              |
|---------|----------|--------------------------------------|
| Python  | ≥ 3.10   | https://python.org                   |
| Node.js | ≥ 18 LTS | https://nodejs.org                   |
| npm     | ≥ 9      | Bundled with Node.js                 |

---

## Adding Your Data Files

Before running, place your files in the correct locations:

### 1. CSV Dataset
Copy your `kohima_final_dataset.csv` into:
```
backend/data/kohima_final_dataset.csv
```

**Required columns:**
| Column | Type | Description |
|--------|------|-------------|
| `name` | string | Village name |
| `geometry` | string | WKT point, e.g. `POINT (94.10 25.67)` (lon lat) |
| `elevation` | float | Elevation in metres |
| `slope_degrees` | float | Terrain slope in degrees |
| `max_24h_rain` | float | Max 24-hour rainfall in mm |
| `total_monsoon_rain` | float | Total monsoon rainfall in mm |
| `landslide_risk_label` | int | Binary label: 0 or 1 |
| `risk_score` | float | Model probability (0.0 – 1.0) |

A placeholder CSV with 20 sample villages is already included so the app runs immediately.

### 2. Trained Model
Copy your `landslide_model.pkl` into:
```
backend/models/landslide_model.pkl
```

The model must be a scikit-learn classifier with `predict_proba()`.  
**Feature input order:** `[elevation, slope_degrees, max_24h_rain, total_monsoon_rain]`

> ⚠️ If `landslide_model.pkl` is absent, the app still works using a built-in heuristic formula. The `/api/predict` endpoint will note this in the startup logs.

---

## Running the Application

### Step 1 — Start the Backend (FastAPI)

```bash
cd backend

# Create and activate a virtual environment (recommended)
python -m venv venv

# Windows:
venv\Scripts\activate

# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn main:app --reload --port 8000
```

The API will be available at: **http://localhost:8000**  
Interactive docs (Swagger): **http://localhost:8000/docs**

### Step 2 — Start the Frontend (React + Vite)

Open a **new terminal**:

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The dashboard will be available at: **http://localhost:5173**

> The Vite proxy automatically forwards `/api/*` requests to the FastAPI backend — no CORS issues in development.

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/villages` | All villages (map + table data) |
| GET | `/api/villages/{name}` | Single village detail |
| POST | `/api/predict` | What-If Simulator — live ML prediction |
| GET | `/api/summary` | District aggregate statistics |

### POST /api/predict — Example

```bash
curl -X POST http://localhost:8000/api/predict \
  -H "Content-Type: application/json" \
  -d '{"elevation": 1800, "slope_degrees": 32, "max_24h_rain": 160, "total_monsoon_rain": 2000}'
```

**Response:**
```json
{
  "risk_score": 0.847,
  "risk_level": "HIGH"
}
```

---

## Dashboard Sections

| Section | Description |
|---------|-------------|
| **Header** | TerraSense branding, district info, live status pill |
| **Metrics Row** | 4 animated stat cards — total villages, high/moderate risk counts, avg risk score |
| **Risk Map** | Interactive Leaflet map — click any marker to see village details |
| **Village Table** | Sortable by any column · Searchable by name · Risk progress bars |
| **What-If Simulator** | Drag sliders → live ML prediction via `/api/predict` → SVG gauge |
| **Alert Panel** | Mock SMS alert for highest-risk village — toggle EN/HI/Nagamese |
| **Roadmap Strip** | Honest Live / Concept / Planned capability status grid |

---

## Design Decisions

- **Dark theme** (`#0B1120` base) — suitable for field ops and projection screens
- **Risk colors** (`red/orange/green`) are **strictly semantic** — never used decoratively
- **Cyan** (`#22D3EE`) is the only UI accent color
- **Glassmorphism** used only on stat cards (functional depth, not decoration)
- **Responsive** — optimised for 1280px laptop (live demo) and 375px mobile

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| ML Model | scikit-learn RandomForestClassifier |
| Backend | Python 3.10+, FastAPI, pandas, joblib |
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS 3 |
| Map | Leaflet.js + react-leaflet |
| Charts | Recharts, custom SVG gauge |

---

## Data Sources

- **Elevation / Terrain**: NASA SRTM Digital Elevation Model
- **Rainfall**: Open-Meteo historical API
- **Base Map**: OpenStreetMap + CARTO Dark Matter tiles
- **Village coordinates**: Nagaland district GIS records

---

## Team

**Team Name**: [Your Team Name Here]  
**SIH 2026** · Problem Statement: Disaster Management · AI-based Early Warning System

---

*This is a prototype built for Smart India Hackathon 2026. Not intended for operational deployment without further validation.*
