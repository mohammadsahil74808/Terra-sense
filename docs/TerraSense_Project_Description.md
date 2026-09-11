# TerraSense — AI-Powered Landslide Early Warning & Disaster Intelligence System

## 1. Project Overview

We built TerraSense for Smart India Hackathon 2026 (Problem Statement: SIH26001, Disaster Management) as a team called CTRL FREAKS. The project focuses on the eight states of Northeast India: Arunachal Pradesh, Assam, Manipur, Meghalaya, Mizoram, Nagaland, Sikkim, and Tripura.

The central goal of TerraSense is straightforward: provide practical, earlier warning for rainfall-triggered landslides across the region without requiring physical sensor hardware installed on mountainsides.

Landslide warnings in India have usually worked in one of two ways. Either authorities issue broad, district-wide weather alerts that tell people it will rain heavily without pinpointing which slopes are vulnerable, or researchers test expensive ground sensors (inclinometers, piezometers, wire extensometers) on a single test slope. While physical sensors provide useful localized data, installing and maintaining thousands of wired probes across remote Himalayan ridges is practically impossible. Monsoons wash roads away, rockfalls snap solar cables, and field maintenance becomes dangerous and costly.

TerraSense takes a different approach. We combine two distinct pieces of information:
1. **Static terrain and environmental susceptibility:** Where is the land inherently weak due to its slope, soil characteristics, elevation, and nearby roads or rivers?
2. **Dynamic rainfall trigger:** How much rain has accumulated over the recent 7-day window to saturate that specific area?

By combining these two factors on a standardized 0.1° geographic grid (covering 2,534 monitored cells across all eight states), the system calculates an operational risk score between 0.0 and 1.0, groups it into clear categories (LOW, MODERATE, HIGH), and dispatches automated alerts to authorized emergency responder devices through Firebase Cloud Messaging (FCM).

---

## 2. Problem Context

Monitoring landslide risk across Northeast India is difficult for several clear reasons:

* **Huge geographic scale:** The region covers roughly 262,000 square kilometers, much of it covered by rugged hills and dense forests.
* **Complex, young geology:** The Eastern Himalayas and Indo-Burman ranges consist of tectonically sheared, weathered sedimentary rocks like shale and phyllite. These rock types lose shear strength quickly when water seeps into joints and fractures.
* **Intense monsoon rainfall:** Heavy rainfall driven by the summer monsoon drops huge amounts of water in short periods. Orographic lift against mountain ridges creates localized downpours that can destabilize a slope in hours.
* **Human activity and road cutting:** Major highways such as NH-10 in Sikkim and NH-29 in Nagaland frequently cut into the natural toe of steep slopes. This excavation removes lateral support, making slopes adjacent to transit corridors much more prone to failure.
* **Need for prioritization:** Disaster response teams cannot watch every hill simultaneously. They need a systematic way to know which specific 11 km corridors need immediate attention, which roads should have traffic restricted, and where quick-response teams should be positioned before slopes give way.

---

## 3. What TerraSense Actually Does

It is important to be clear about what the system calculates: **weather is not the landslide risk.**

A heavy rainstorm over a flat alluvial plain causes waterlogging or flooding, not a landslide. Conversely, an extremely steep, unstable slope will not fail in dry weather because there is no water pressure pushing the soil particles apart.

TerraSense keeps these two components distinct:

```
STATIC TERRAIN / ENVIRONMENT
           ↓
    ML SUSCEPTIBILITY (0.0 to 1.0)
           ↓
   LIVE RAINFALL TRIGGER (7-day accumulation vs 165.22 mm)
           ↓
      RISK ENGINE (Susceptibility × Trigger + Extreme Override)
           ↓
     LOW / MODERATE / HIGH
           ↓
       ALERT / RESPONSE
```

The system estimates slope failure likelihood by evaluating whether an inherently fragile slope has received enough multi-day rainfall to cause destabilization.

---

## 4. End-to-End System Flow

The complete operational flow of TerraSense runs through several stages:

```
[NASA SRTM DEM + ISRIC SoilGrids + ESA WorldCover + OSM + HydroRIVERS]
                                ↓
                 Aligned to 0.1° Common Grid (2,534 Cells)
                                ↓
               Trained Random Forest (500 Trees, 9 Features)
                                ↓
                Static Susceptibility Pre-computed
                                ↓
   Open-Meteo Weather Service (7-Day Rolling Rainfall Telemetry)
                                ↓
        FastAPI Autonomous Background Worker (Every 15 Minutes)
                                ↓
    Risk Engine Evaluates All 2,534 Cells (Calculates Risk Score)
                                ↓
     HIGH-Risk Cells Detected (Risk Score >= 0.66)
                                ↓
       SQLite Deduplication Check (Suppresses repeated warnings)
                                ↓
       Alert Saved in SQLite ('ACTIVE' state)
                                ↓
     Firebase Cloud Messaging (FCM) Dispatches High-Priority Push
                                ↓
   Authorized Android Handsets (Custom Alert Sound, Siren Tone, GPS)
                                ↓
 React 18 / Leaflet Web Dashboard (30s Polling, Interactive Investigation)
```

---

## 5. Data Sources and Data Preparation

To train and run the system without ground sensors, we drew from several open geospatial and environmental datasets:

| Dataset | Provider | Role in TerraSense |
|---|---|---|
| **SRTM 30m DEM** | NASA | Elevation and slope calculations |
| **SoilGrids 250m** | ISRIC | Topsoil clay %, sand %, and bulk density (0–30 cm depth) |
| **WorldCover 10m** | ESA | Land use / land cover (LULC) classification and dominance |
| **HydroRIVERS** | HydroSHEDS | Drainage network lines to calculate distance to rivers |
| **Road Vectors** | OpenStreetMap | Highway and road network to calculate distance to roads |
| **GPM IMERG** | NASA | Historical multi-year rainfall for model training and calibration |
| **Bhusanket / Historical Events** | Geological Survey of India (GSI) | Historical landslide occurrence labels across Northeast India |
| **Weather Forecast API** | Open-Meteo | Live and forecast rainfall data for dynamic operational risk scoring |

### The Common 0.1° Grid
A practical difficulty in geospatial machine learning is that different datasets come in different formats, projections, and resolutions. NASA SRTM has a 30-meter resolution, SoilGrids uses 250-meter pixels, and rainfall products like GPM or Open-Meteo are provided on 0.1° grids (~10–11 km).

To align these sources without creating millions of empty pixels, we established a **common 0.1° grid** across the eight Northeast states. Each cell spans roughly 11 km × 11 km (~121 km²). For high-resolution layers like slope, soil, and land cover, values were aggregated to cell centroids. 

This produced **2,534 valid monitored cells** across the region. In historical training data spanning 2007 through 2016, this grid represents approximately **9,256,702 cell-day rows**.

---

## 6. Feature Engineering

The production model uses nine static features for each grid cell:

1. `elevation`: Elevation in meters above sea level (from NASA SRTM). Controls temperature, orographic condensation zones, and freeze-thaw cycles.
2. `slope`: Terrain slope in degrees (derived from NASA SRTM). This is the direct physical driver of downhill gravitational shear stress.
3. `distance_to_road_km`: Shortest distance from the cell centroid to the nearest mapped road (from OpenStreetMap). Indicates human toe-cutting and excavation along transit corridors.
4. `distance_to_river_km`: Shortest distance to the nearest river channel (from HydroRIVERS). Indicates toe erosion by flowing water and elevated local water tables.
5. `clay_0_30_pct`: Topsoil clay percentage in the top 30 cm (from ISRIC SoilGrids). High clay content creates slick, impermeable slip surfaces when wet.
6. `sand_0_30_pct`: Topsoil sand percentage in the top 30 cm (from ISRIC SoilGrids). Highly permeable sandy soils lose suction quickly during intense rain.
7. `bulk_density_0_30_kg_dm3`: Soil mass per unit volume (from ISRIC SoilGrids). Differentiates loose, porous colluvium from compacted rock.
8. `lulc_class`: Categorical land use / land cover classification (from ESA WorldCover). Reflects whether the slope has tree root anchoring or bare soil.
9. `lulc_dominant_percentage`: The percentage of the cell covered by the primary land-cover class, measuring spatial consistency.

---

## 7. Machine Learning Model

We chose a **Random Forest Classifier** (`RandomForestClassifier`) over complex deep learning models for clear reasons:
- It handles non-linear interactions between slope, soil, and infrastructure well.
- It is resistant to overfitting on noisy geospatial data.
- It executes quickly during production lookups.
- Its behavior is reproducible and inspectable.

### Production Configuration
- `n_estimators`: 500 decision trees
- `min_samples_leaf`: 2 (avoids single-sample leaf overfitting)
- `class_weight`: `{0: 1.0, 1: 4.961}` (asymmetric penalty to address class imbalance)
- `random_state`: 42 (locked for exact reproducibility)
- `imputation`: Median imputation for missing environmental features

### Time-Based Splitting
Instead of using random cross-validation—which causes spatial leakage by placing identical neighboring cells in both training and test sets—we split the data strictly across time:
- **2007 to 2014:** Training set (used to fit the 500 trees)
- **2015:** Temporal validation set (used for hyperparameter tuning)
- **2016:** Locked blind test set (never seen during model training or parameter selection)

---

## 8. Model Validation

On the locked 2016 historical blind test, the production model achieved:

$$\text{Verified Blind ROC-AUC} = 0.858970 \quad (\approx 0.859)$$

### Why ROC-AUC is Not "Accuracy"
We do not describe this model as "85.9% accurate." In natural hazard modeling, landslides are rare events; on any given day, more than 99% of cells experience no landslide. A naive model that always predicts zero would achieve over 99% accuracy while being completely useless as an early warning system.

ROC-AUC measures the model's ability to rank true landslide events higher than non-events across all possible thresholds. A score of 0.859 indicates strong discrimination.

### Precision-Recall and Threshold Trade-Offs
Because the dataset is heavily imbalanced, the Precision-Recall AUC (PR-AUC) on the 2016 blind test is `0.000776`. Looking at operational thresholds shows the real-world trade-off:

* **MODERATE+ Threshold (Risk $\ge 0.33$):**
  - Recall: 57.69% (captures more than half of historical events)
  - Precision: 0.0441%
  - Warning rate: 3.67% of monitored cells
* **HIGH Threshold (Risk $\ge 0.66$):**
  - Recall: 7.69%
  - Precision: 0.0823%
  - Warning rate: 0.26% of monitored cells (reserved for the most dangerous conditions)
* **Top-500 Risk Ranking:**
  - The top 500 highest-ranked cell-days captured 15 out of 23 historical blind-test events (**65.22% event capture**).

This shows that TerraSense works primarily as a **risk-ranking and prioritization system**, helping emergency authorities narrow their focus from thousands of square kilometers down to specific high-risk zones.

---

## 9. Risk Engine

The production risk engine (`backend/app/risk_engine.py`) calculates operational risk by combining static susceptibility with recent rainfall:

```
trigger = rainfall_7d / 165.22
raw_risk = susceptibility × trigger
```

### The Extreme Rainfall Override
If a sudden, severe cloudburst hits an area with moderate static susceptibility, pure multiplication might produce an artificially low score. To prevent missed warnings during severe weather emergencies, we enforce an extreme rainfall floor:

$$\text{If } \text{rainfall\_7d} \ge 349.392\text{ mm} \implies \text{final\_score} = \max(0.67, \text{raw\_risk})$$
$$\text{Otherwise} \implies \text{final\_score} = \text{raw\_risk}$$

The final score is clamped between 0.0 and 1.0 and assigned to an operational risk tier:
- **LOW:** $< 0.33$ (Routine monitoring)
- **MODERATE:** $0.33 \le \text{score} < 0.66$ (Soil saturated; check drains, monitor slopes)
- **HIGH:** $\ge 0.66$ (Critical risk; pre-position teams, restrict road traffic, evacuate)

### Understanding the 165.22 mm Reference Value
The value **165.22 mm** is not a universal physical threshold at which every slope collapses. It is the **7-Day Cumulative Model Trigger Reference Value** derived from historical rainfall distribution data for Northeast India. It scales the recent 7-day rainfall so that when an area receives 165.22 mm over a week, its rainfall trigger reaches 1.0.

The What-If simulator in the dashboard uses this same 7-day cumulative rainfall logic to let operators test how different rainfall amounts would affect any chosen cell.

---

## 10. Live Monitoring

TerraSense does not wait for a user to refresh a webpage to check the weather. The FastAPI backend runs an **autonomous monitoring worker** (`backend/app/monitor.py`):

1. **Lifespan Startup:** When FastAPI starts up, it automatically initializes and launches `AlertMonitoringWorker` as a background asyncio task.
2. **15-Minute Cycle:** Every 900 seconds (15 minutes), the worker runs a complete monitoring cycle.
3. **Full Grid Evaluation:** It queries live Open-Meteo weather data (using an in-memory cache to prevent upstream rate-limiting) and evaluates all **2,534 cells** through the risk engine.
4. **HIGH-Risk Detection:** Any cell reaching a score $\ge 0.66$ is flagged for alert generation.
5. **Duplicate Suppression:** Before alerting, the worker checks SQLite to see if the cell is already under an active alert, preventing duplicate alarms.
6. **Frontend Synchronization:** The web dashboard polls the backend summary and alerts every **30 seconds**, keeping the interface current without requiring manual page reloads.

---

## 11. Alert Lifecycle

Alerts are tracked in a dedicated SQLite table (`alerts`):

$$\text{ACTIVE} \longrightarrow \text{ACKNOWLEDGED} \longrightarrow \text{RESOLVED}$$

- **ACTIVE:** The cell has breached the HIGH-risk threshold during a monitoring sweep. Dispatches notifications to responder devices.
- **ACKNOWLEDGED:** An operator or field officer has seen the alert and confirmed they are monitoring the situation.
- **RESOLVED:** Rainfall has decreased, the risk score has dropped below threshold levels, or field teams have confirmed conditions have stabilized.

### Duplicate Suppression
If rain continues over an area for 12 hours, an unmanaged system would send 48 identical alerts. TerraSense uses an ACID-compliant SQLite check: if an alert for that cell is already `ACTIVE` at the same risk tier, the database updates the evaluation timestamp quietly and suppresses outgoing push notifications. A new notification is sent only if the risk tier escalates or if a previously resolved alert reactivates.

---

## 12. FCM Notification System

When a HIGH-risk alert is confirmed, the backend dispatches a push notification via **Firebase Cloud Messaging (FCM)** using the Google Firebase Admin SDK:

- **Targeted Devices:** Push notifications are delivered to authorized responder devices registered in the SQLite `fcm_devices` table.
- **Android Notification Channel:** Messages target a dedicated high-priority channel (`terrasense_alerts_high_v2`).
- **Alert Audio & Vibration:** Configured with `IMPORTANCE_HIGH`, a distinct vibration pattern (`0, 400, 200, 400`), and a bundled custom emergency alert sound (`terrasense_alert.mp3`).
- **Direct Navigation:** Tapping the notification opens the mobile app's Alert Details view, showing coordinates, rainfall totals, risk scores, and one-touch mapping links.
- **Dry-Run Mode:** If Firebase credentials are not configured on a test instance, the backend logs the payload in dry-run mode rather than crashing the server.
- **Internet Requirement:** FCM operates over standard internet connections (Wi-Fi, 4G, 5G). It cannot deliver notifications if mobile data connectivity is entirely absent.

---

## 13. Ground Reports

Field observers, panchayat representatives, or local police can submit ground reports through the system. Each report records:
- Cell ID and GPS coordinates
- Nearest settlement or landmark
- Observed condition: *No visible issue, Surface cracks, Slope movement, Rockfall, Landslide, Other*
- Optional description and photo reference

Reports follow a simple verification lifecycle:

$$\text{PENDING} \longrightarrow \text{VERIFIED} \quad\text{or}\quad \text{REJECTED}$$

Ground reports give command center operators on-the-ground verification of what sensors and satellite models predict. **Ground reports do not automatically retrain the machine learning model.** They are stored in SQLite for operator review and historical record-keeping.

---

## 14. Frontend / Dashboard

The web interface is built with React 18, TypeScript, and TailwindCSS:

- **Interactive Risk Map:** A Leaflet-based choropleth map showing all 2,534 grid cells, color-coded by current risk level (Green = Low, Amber = Moderate, Red = High).
- **Cell Investigation Drawer:** Clicking any cell opens a detailed side panel displaying elevation, slope, soil composition, road distance, a radar chart of physical features, and recent rainfall curves.
- **Live Weather Map:** Displays regional cloud cover and rainfall intensity overlays across the eight states.
- **Active Alerts Console:** Displays active emergency alerts, allowing operators to acknowledge or resolve them.
- **What-If Rainfall Simulator:** Lets operators slide a hypothetical 7-day rainfall value (0 to 400 mm) to see how any selected cell's risk score would change.
- **Ground Reports Panel:** Review, verify, or reject field submissions.
- **Data Freshness & Model Specs:** Displays backend status, model version, cell count, and current monitoring health.

---

## 15. Technical Stack

Here is the actual stack used in the repository:

* **Backend:** Python 3.10+, FastAPI, Uvicorn, SQLite3, asyncio background worker
* **Machine Learning:** scikit-learn (`RandomForestClassifier`), NumPy, Pandas, PyArrow (parquet ingestion)
* **Push Notifications:** Firebase Admin SDK (FCM HTTP v1)
* **Frontend:** React 18, TypeScript, Vite, TailwindCSS, Leaflet, React-Leaflet
* **Android Client:** Kotlin, Jetpack Compose, Firebase Messaging Service, Android Room SQLite
* **Testing:** pytest, pytest-asyncio, FastAPI TestClient

---

## 16. Current System Scale

* **Monitored Cells:** Exactly 2,534 cells covering all 8 Northeast states
* **Spatial Resolution:** 0.1° × 0.1° (~11 km × 11 km)
* **Historical Dataset:** 2007–2016 (9,256,702 cell-day records)
* **Model Configuration:** Random Forest with 500 trees and 9 static features
* **Monitoring Frequency:** Automated background sweeps every 15 minutes (900 seconds)
* **Frontend Polling:** Alerts and system summaries refresh every 30 seconds

---

## 17. Current Limitations

Being honest about system limitations is critical for any safety-related project:

1. **Rainfall-Centric Trigger:** The current dynamic trigger relies entirely on 7-day cumulative rainfall. It does not model short-duration rainfall intensity (such as 50 mm in one hour) versus steady multi-day drizzle.
2. **No Physical Soil Moisture Data:** TerraSense estimates soil characteristics from static soil databases. It does not have access to real-time subsurface pore water pressure or physical moisture probes.
3. **Internet Dependency:** FCM push alerts require an active mobile internet connection. In remote Himalayan valleys where storms knock out cellular towers, messages cannot be delivered until connectivity returns.
4. **Responder-Focused Alerts:** The current notification system is designed for registered responder handsets; it does not connect to public cell broadcast or telecom SMS gateways.
5. **No Automatic Retraining:** Field reports do not update model weights automatically. Any future model update requires careful offline retraining and validation to prevent model drift.

---

## 18. Future Development

Realistic next steps for the project include:

- **Intensity-Duration Curves:** Adding short-term rainfall intensity (1-hour and 3-hour rates) alongside the 7-day accumulation window.
- **Satellite Soil Moisture Ingestion:** Testing integration with satellite soil moisture data products (such as NASA SMAP) to better estimate ground saturation before rainfall arrives.
- **Offline SMS / Mesh Fallbacks:** Exploring integration with local SMS gateways or radio systems for areas where cellular data fails during storms.
- **Controlled v2 Model Experimentation:** Testing gradient boosted trees (LightGBM/XGBoost) against the frozen v1 baseline using the same strict time-split validation standards.
- **District-Level Pilot Deployments:** Working directly with local disaster management teams in high-risk corridors (such as East Sikkim or Dima Hasao) to evaluate alert usability during real monsoon seasons.

---

## 19. Reproducibility & Model Integrity

To ensure exact reproducibility, the production model is locked and versioned:

- **Model File:** `backend/models/terrasense_model_v1.pkl`
- **Metadata File:** `backend/models/terrasense_model_metadata.json`
- **Model SHA-256 Checksum:**
  `7f150577997f1bf4dd1e75e58d72252ccccb363ab9861a23b8269b4964047fbe`

This hash confirms that the model running in production matches the exact weights produced during our validated training run.

---

## 20. Conclusion

TerraSense is our attempt to build a practical, affordable, and mathematically honest early warning tool for Northeast India. By using satellite terrain models and live weather data instead of expensive slope hardware, it offers a scalable way to monitor thousands of square kilometers simultaneously. 

It does not claim to prevent landslides or eliminate all risk. What it does is give emergency responders and district authorities advance notice—highlighting which specific corridors are approaching critical saturation so that proactive steps can be taken before slopes fail.
