# TerraSense: Complete Technical System Specification & Architecture Manual
**Document Reference:** TS-TECH-SPEC-2026-PROD-V1  
**Target Environment:** Northeast India Himalayan Landslide Monitoring  
**Authors:** Team CTRL FREAKS (Smart India Hackathon 2026)  
**System Status:** Production Ready / Frozen v1 Core  

---

## 1. Introduction & Engineering Philosophy

Building software for natural disaster management requires a practical, honest mindset. When an early warning system operates in production, its role is to assist human operators and field responders with timely, risk-ranked spatial intelligence to support pre-emptive action.

In Northeast India, landslide monitoring has historically faced two primary hurdles:
1. **Academic In-Situ Hardware Challenges:** Systems that propose deploying dense networks of physical geotechnical sensors (borehole extensometers, piezometers, soil-moisture probes, and tiltmeters) directly onto active mountain slopes. While mathematically sound in controlled alpine settings, maintaining these setups across the Eastern Himalayas is difficult. Extreme monsoon deluges, active seismic faults, seasonal road expansion, and falling rock debris routinely damage physical wiring, sever solar panels, and wash away monitoring hardware. Maintenance access in remote, roadless areas is both expensive and hazardous.
2. **Administrative Under-Engineering:** Relying on coarse, state-level weather alerts issued by meteorological departments (e.g., "Heavy Rainfall Warning for West Sikkim"). These blanket bulletins lack spatial granularity. District magistrates cannot restrict traffic along entire highway lifelines every time a general rain advisory is issued. Over time, recurring broad alarms contribute to warning fatigue.

**TerraSense v1 addresses this gap through a software-first approach.** We adopted four strict engineering principles:

- **Software-First Architecture Without Slope Sensors:** TerraSense v1 does not require dedicated slope-mounted hardware for its monitoring workflow. The system relies on open satellite remote sensing (NASA SRTM DEM), global soil physics databases (ISRIC SoilGrids), and real-time ensemble meteorological APIs (Open-Meteo).
- **Micro-Targeted Geospatial Granularity:** The entire Northeast landmass is mapped into a uniform $0.1^\circ \times 0.1^\circ$ grid (2,534 valid monitored cells, each covering roughly 11 km × 11 km). Warnings are cell-specific rather than district-wide.
- **Explainable, Frozen Machine Learning Core:** We chose an inspectable, class-weighted Random Forest ensemble (500 estimators) trained on historical Geological Survey of India (GSI) event records. In public safety systems, understanding the feature inputs driving a prediction is essential.
- **Autonomous Execution with State Deduplication:** TerraSense operates on an unassisted 15-minute background loop backed by an ACID-compliant SQLite deduplication state engine, delivering push notifications to authorized frontline field personnel via Firebase Cloud Messaging (FCM).

---

## 2. Regional Geography & Spatial Discretization

### 2.1 The Northeast Himalayan Landslide Setting
The Northeast Region (NER) of India spans roughly 262,000 square kilometers, bounded by the Main Central Thrust and Main Boundary Thrust fault systems to the north and the Indo-Burman mountain arc to the east. The terrain is young, steep, and tectonically sheared. Rocks consist predominantly of fissile shales, weathered phyllites, schists, and loosely consolidated sandstone formations overlaid by thin, easily saturated colluvial soil blankets.

When moisture-heavy clouds from the Bay of Bengal strike these steep ridges during the summer monsoon, intense orographic downpours follow. Rainwater infiltrates into fractured bedrock, building up pore water pressure and turning cohesive soil masses into mudflows and debris slides within hours.

```
                    TERRASENSE NORTHEAST GRID MATRIX
==========================================================================
State                  Monitored Cells   Topographic Character
--------------------------------------------------------------------------
Arunachal Pradesh      842 Cells         High-altitude glaciofluvial ridges,
                                         deep valleys, steep border lifelines.
Assam                  761 Cells         Alluvial valleys intersecting steep
                                         hill districts (Karbi Anglong, Dima Hasao).
Meghalaya              224 Cells         High-altitude karst & sandstone plateau,
                                         extreme rainfall erosion corridors.
Manipur                218 Cells         Sedimentary mountain rim enclosing the
                                         central Imphal lacustrine valley.
Mizoram                211 Cells         Linear, parallel anticlinal ridges,
                                         unconsolidated shales prone to mudslides.
Nagaland               165 Cells         Steep, fault-dissected ridges with
                                         recurrent highway subsidence (NH-29).
Sikkim                  73 Cells         High-energy Teesta river basin, steep
                                         granitic colluvium, critical NH-10 corridor.
Tripura                 40 Cells         Low rolling sedimentary hill tracts,
                                         heavy surface clay runoff.
==========================================================================
TOTAL SYSTEM FOOTPRINT: 2,534 VALID MONITORED CELLS (~312,000 km² Coverage)
==========================================================================
```

### 2.2 The Uniform 0.1° × 0.1° Geospatial Grid
To make processing computationally viable without sacrificing actionable spatial resolution, TerraSense discretizes the region into a grid where each cell is defined by a $0.1^\circ$ increment in both latitude and longitude. 

- **Cell Dimensions:** At an average latitude of $26^\circ\text{N}$, $0.1^\circ$ of latitude is $\approx 11.08\text{ km}$, and $0.1^\circ$ of longitude is $\approx 10.02\text{ km}$. This yields an average cell footprint of approximately $111\text{ km}^2$ to $123\text{ km}^2$.
- **Cell Identifiers:** Every cell carries a persistent, deterministic identifier (e.g., `NE_1653`), anchored at its precise mathematical centroid ($27.3500^\circ\text{N}, 88.5500^\circ\text{E}$).
- **Centroid Data Anchor:** The centroid serves as the query target for live weather telemetry, soil profiles, and administrative boundary lookups.
- **GeoJSON Boundary Generation:** When rendered on the Leaflet web console, the system constructs a precise bounding box polygon by projecting $\pm 0.05^\circ$ along both axes, enabling clean, non-overlapping choropleth rendering across the entire region.
- **Historical Scale:** In our historical training dataset spanning 2007 through 2016, this 2,534-cell grid comprises approximately **9,256,702 cell-day rows**.

---

## 3. The Static Machine Learning Susceptibility Engine

### 3.1 Model Architecture & Selection Rationale
The susceptibility engine uses a **frozen Random Forest Classifier** (`RandomForestClassifier_v1_frozen`), trained and locked to maintain consistency across production runs:
- **Number of Estimators:** 500 decision trees.
- **Maximum Features per Split:** $\sqrt{N} = \sqrt{9} = 3$.
- **Minimum Samples per Leaf:** 2 (prevents isolated noise from skewing predictions).
- **Asymmetric Class Weights:** `{0: 1.0, 1: 4.961}`.
- **Random Seed:** Locked at `42` for exact reproducibility.
- **Imputation:** Median imputation across numerical features.

**Why Random Forest?**
In natural hazard modeling, machine learning algorithms encounter non-linear, interacting geotechnical drivers. A steep slope might remain stable if covered by dense, deep-rooted forest, while a gentler slope can fail if composed of high-plasticity clay right next to an excavated road cut. Random Forest captures these non-linear feature interactions without the overfitting tendencies and opaque failure modes common in deep neural networks. 

Training with asymmetric class weights (`1: 4.961`) addresses the natural scarcity of landslide events in the training data, where stable cell-days vastly outnumber active failure events. Penalizing missed positive landslide events more heavily during training ensures that vulnerable slopes are flagged reliably.

```
                    FEATURE INGESTION & TRAINING SCHEMATIC
==========================================================================
Geotechnical / Morphological Layer                Data Source
--------------------------------------------------------------------------
[NASA SRTM 30m Global DEM]               -->   Slope Angle (degrees)
                                         -->   Elevation (meters ASL)

[ISRIC World SoilGrids (0-30cm)]         -->   Topsoil Clay Fraction (%)
                                         -->   Topsoil Sand Fraction (%)
                                         -->   Bulk Density (kg/dm³)

[OpenStreetMap Transport Infrastructure] -->   Distance to Road (km)
[HydroRIVERS High-Resolution Drainage]   -->   Distance to River (km)

[ESA WorldCover 10m Land Use]            -->   LULC Classification Type
                                         -->   LULC Dominance Percentage
--------------------------------------------------------------------------
                                |
                                v
               [Scikit-Learn Random Forest Pipeline]
                    500 Orthogonal Trees (Seed 42)
                    Class Weights: 0: 1.0, 1: 4.961
                                |
                                v
              [Static Susceptibility Score: 0.0 - 1.0]
==========================================================================
```

### 3.2 Detailed Geotechnical Feature Profiles

#### 1. Slope Angle ($\theta$ in degrees)
- **Source:** NASA SRTM 30m Digital Elevation Model.
- **Physical Rationale:** Slope is the primary driver of gravitational shear stress. In standard Mohr-Coulomb soil mechanics, the shear force driving soil downhill is proportional to $\sin\theta \cos\theta$. In Northeast Himalayan colluvium, slopes under $15^\circ$ rarely experience shear failure, while slopes between $28^\circ$ and $45^\circ$ fall into a vulnerable zone where loose debris accumulates before giving way during monsoons. Slopes steeper than $60^\circ$ are typically exposed bedrock that sheds soil continuously, rarely accumulating thick, failure-prone regolith blankets.

#### 2. Elevation ($Z$ in meters above sea level)
- **Source:** NASA SRTM 30m DEM.
- **Physical Rationale:** Elevation governs local microclimates, frost-thaw mechanical weathering, vegetation tree lines, and orographic rainfall belts. In the Himalayas, heavy orographic cloud condensation typically concentrates between 1,200 m and 2,800 m, making slopes in this elevation band especially vulnerable.

#### 3. Distance to Road Infrastructure ($D_{\text{road}}$ in kilometers)
- **Source:** OpenStreetMap highway vectors.
- **Physical Rationale:** Human engineering along mountain corridors is a frequent contributor to Himalayan slope destabilization. Building and widening highways (such as NH-10 and NH-29) involves cutting away the natural toe of the slope, removing lateral support. Excavation and blasting also introduce micro-fractures into the surrounding rock mass, creating pathways for rainwater infiltration. Slopes immediately adjacent to roads ($< 0.5\text{ km}$) experience significantly higher failure rates than undisturbed slopes.

#### 4. Distance to River Network ($D_{\text{river}}$ in kilometers)
- **Source:** HydroRIVERS global hydrologic drainage vectors.
- **Physical Rationale:** Himalayan rivers carry substantial hydraulic energy during the monsoon. Active river flow undercuts the base of adjacent slopes, removing the toe support that stabilizes the hill. Mountain river valleys also feature elevated water tables, keeping adjacent soils closer to saturation.

#### 5. Topsoil Clay Fraction (0–30 cm depth, %)
- **Source:** ISRIC SoilGrids 250m database.
- **Physical Rationale:** Clay minerals have high plasticity and expand when wet. When water infiltrates clay-rich topsoil, it forms a slick, impermeable slip horizon along the bedrock interface. This trapped water layer acts as a lubricant, precipitating translational block slides.

#### 6. Topsoil Sand Fraction (0–30 cm depth, %)
- **Source:** ISRIC SoilGrids 250m database.
- **Physical Rationale:** Sandy, granular soils have high hydraulic conductivity, allowing rainwater to soak in quickly. During torrential downpours, rapid infiltration quickly destroys the negative pore pressure (soil suction) that holds granular particles together. Once pore spaces fill completely, the soil can liquefy into fast-moving debris flows.

#### 7. Soil Bulk Density (0–30 cm depth, $\text{kg}/\text{dm}^3$)
- **Source:** ISRIC SoilGrids 250m database.
- **Physical Rationale:** Bulk density measures how tightly soil particles are packed. Lower values indicate porous, loose colluvium that absorbs water quickly; higher values indicate dense, compacted soil or shallow bedrock with lower storage capacity.

#### 8. Land Use / Land Cover (LULC Class)
- **Source:** ESA WorldCover 10m spatial classification.
- **Physical Rationale:** Root systems from undisturbed mountain forests provide mechanical reinforcement, binding soil particles together and adding effective cohesion. Trees also intercept heavy raindrops through their canopies and draw moisture out of the ground through transpiration. Conversely, deforested hills, open agricultural land, and construction areas leave topsoil unprotected and prone to rapid saturation.

#### 9. LULC Dominance Percentage (%)
- **Source:** ESA WorldCover 10m spatial analysis.
- **Physical Rationale:** Quantifies how uniform the land cover is across the 11 km cell, preventing small forested patches from masking broader deforestation along transit corridors.

### 3.3 Model Validation & Performance Metrics
When evaluating natural hazard prediction models, relying on simple accuracy figures is misleading. In an imbalanced dataset where only a small fraction of cell-days represent actual landslides, a model that simply predicts "no landslide" 100% of the time achieves over 99% accuracy while failing completely as an early warning system.

Instead, TerraSense was evaluated against an **isolated historical blind test from 2016**, representing a locked monsoon disaster period in the Northeast that was never seen during training:
- **Verified Blind ROC-AUC:** **0.858970** ($\approx 0.859$)
- **Verified Blind PR-AUC:** **0.000776**

#### Threshold & Ranking Behavior on 2016 Blind Test:
- **MODERATE+ Threshold (Score $\ge 0.33$):**
  - Recall: 57.69%
  - Precision: 0.0441%
  - Warning Rate: 3.67% of monitored cells
- **HIGH Threshold (Score $\ge 0.66$):**
  - Recall: 7.69%
  - Precision: 0.0823%
  - Warning Rate: 0.26% of monitored cells
- **Top-500 Risk Ranking Evaluation:**
  - Evaluated on the top 500 highest-ranked cell-days, the model captured **15 of 23 historical blind events (65.22% event capture)**.

These numbers demonstrate that TerraSense operates primarily as a **risk-ranking and spatial prioritization tool**, giving authorities a systematic way to narrow their operational focus to the most critical zones.

---

## 4. Dynamic Physics & The Multi-Tier Trigger Formulation

A static susceptibility map shows *where* a mountain is inherently vulnerable, but it cannot tell you *when* failure conditions emerge. A steep, fractured cliff can stand stable for months during the dry winter, only to fail during an intense monsoon storm.

To turn static susceptibility into an operational risk-monitoring pipeline, TerraSense fuses its susceptibility scores with **multi-day rolling precipitation tracking**.

```
+---------------------------------------------------------------------------------+
|                    DYNAMIC TRIGGER & RISK EVALUATION PIPELINE                   |
+---------------------------------------------------------------------------------+
|                                                                                 |
|  [Open-Meteo Meteorological Service]                                            |
|  • Ingests 7-Day Cumulative Rolling Rainfall (R_7d in mm)                       |
|  • In-memory cache protects against API rate limits                             |
|                                                                                 |
|                                    |                                            |
|                                    v                                            |
|                                                                                 |
|  [Dynamic Trigger Ratio (T)]                                                    |
|  • Formula: T = min(1.0, R_7d / 165.22 mm)                                      |
|  • 165.22 mm = Model v1 7-Day Rainfall Reference Trigger Value                  |
|                                                                                 |
|                                    |                                            |
|                                    v                                            |
|                                                                                 |
|  [Compound Risk Calculation]                                                    |
|  • Raw Risk = Susceptibility (S) × Trigger Ratio (T)                            |
|                                                                                 |
|                                    |                                            |
|                     +--------------+--------------+                             |
|                     |                             |                             |
|                     v                             v                             |
|                                                                                 |
|        [Standard Condition]              [Extreme Cloudburst Condition]         |
|        R_7d < 349.392 mm                 R_7d >= 349.392 mm                     |
|        Final Risk = Raw Risk             Final Risk = max(Raw Risk, 0.67)       |
|                                          --> Applies HIGH-RISK Floor (0.67)     |
|                                                                                 |
+---------------------------------------------------------------------------------+
```

### 4.1 Geotechnical Mechanics & The 7-Day Infiltration Window
In soil mechanics, slope failure occurs when the shear stress ($\tau$) along a slip plane exceeds the shear strength ($\tau_f$) of the soil mass, governed by the Mohr-Coulomb equation:
$$\tau_f = c' + (\sigma_n - u)\tan\phi'$$
Where:
- $c'$ = Effective soil cohesion
- $\sigma_n$ = Total normal stress from soil weight
- $u$ = Pore water pressure
- $\phi'$ = Internal angle of friction

During dry periods, negative pore water pressure (suction) pulls soil particles together, enhancing effective shear strength. When prolonged rain occurs, water seeps into the soil mantle, filling pore spaces and eventually generating positive pore water pressure ($u > 0$). This reduces effective normal stress $(\sigma_n - u)$, lowering the soil's internal frictional resistance and promoting slope movement.

TerraSense tracks **7-day rolling accumulated rainfall** ($R_{\text{7d}}$) because real-world slope failures in the Northeast frequently follow multi-day cumulative infiltration that progressively saturates the soil column.

### 4.2 Mathematical Formulation of the Dynamic Trigger
The Dynamic Trigger Ratio ($T$) scales the 7-day cumulative rainfall against the model's reference value:
$$T = \min\left(1.0, \frac{R_{\text{7d}}}{165.22\text{ mm}}\right)$$
The value **165.22 mm** is the model's v1 rainfall reference trigger value, used to scale the rolling 7-day rainfall signal. It is an empirical reference parameter used within TerraSense v1 to normalize rainfall accumulation, rather than a universal physical constant. When a cell accumulates 165.22 mm over seven days, its dynamic trigger ratio reaches 1.0.

### 4.3 Compound Hazard Index & Risk Tiers
Combining static susceptibility with the dynamic trigger yields the Compound Hazard Index:
$$R_{\text{raw}} = S \times T$$
Where:
- $S \in [0.0, 1.0]$: Static Geotechnical Susceptibility (Random Forest output)
- $T \in [0.0, 1.0]$: Dynamic 7-Day Rainfall Trigger Ratio

The system translates this continuous risk score into three standardized operational tiers:
- **LOW HAZARD ($R < 0.33$):** Green status. Hill slopes remain within baseline structural parameters; routine monitoring.
- **MODERATE HAZARD ($0.33 \le R < 0.66$):** Yellow/Amber status. Significant moisture accumulation; soil approaching saturation. Highway crews and local teams should inspect culverts and monitor vulnerable slopes.
- **HIGH HAZARD ($R \ge 0.66$):** Red status. Slopes have reached critical saturation conditions. Fired alerts notify authorized responders to prioritize field inspections and traffic management.

### 4.4 The Extreme Rainfall Safety Floor Override
Real-world weather can produce extreme precipitation events that challenge standard linear multipliers. Consider an intense cloudburst dumping over 350 mm of rain within a week on a moderately steep valley flank with an inherently modest static susceptibility score ($S = 0.42$).

Under basic multiplication:
$$R_{\text{raw}} = 0.42 \times 1.0 = 0.42 \quad (\text{Categorized as MODERATE})$$
To prevent under-warning during extreme weather emergencies, TerraSense incorporates an **Extreme Rainfall Safety Floor**:
$$\text{If } R_{\text{7d}} \ge 349.392\text{ mm} \implies R_{\text{final}} = \max(R_{\text{raw}}, 0.67)$$

```python
# EXTREME WEATHER OVERRIDE (Backend Production Logic: backend/app/monitor.py)
trigger_ratio = min(1.0, round(rainfall_7d / 165.22, 4))
raw_risk = round(susceptibility * trigger_ratio, 4)

# Extreme Rainfall Floor Override
# If 7-day rainfall breaches 349.392 mm, apply risk floor of 0.67 (HIGH RISK)
if rainfall_7d >= 349.392:
    final_risk = max(raw_risk, 0.67)
else:
    final_risk = raw_risk
```

The threshold **349.392 mm** represents the extreme precipitation level where heavy saturation and surface runoff can destabilize even moderately susceptible slopes. With this override, any cell receiving $\ge 349.392\text{ mm}$ of rain is elevated to at least **HIGH RISK ($0.67$)**, supporting responder awareness during severe monsoonal events.

---

## 5. Backend Architecture & High-Concurrency Services

The TerraSense backend is implemented in Python using the **FastAPI** framework, running on ASGI Uvicorn workers. It serves geospatial queries, runs background monitoring workers, and dispatches push notifications concurrently.

```
+---------------------------------------------------------------------------------+
|                        BACKEND ARCHITECTURE DIAGRAM                             |
+---------------------------------------------------------------------------------+
|                                                                                 |
|   +-------------------------------------------------------------------------+   |
|   |                       FASTAPI WEB APPLICATION                           |   |
|   |  • main.py: API Router, CORS, Lifespan Startup & Shutdown Tasks         |   |
|   |  • grid.py: In-Memory Spatial Cache of 2,534 Monitored Cells            |   |
|   |  • weather_service.py: Async Open-Meteo Client with 15-Min TTL Cache    |   |
|   |  • alerts.py: SQLite Deduplication State Machine & Dispatch Logic       |   |
|   |  • fcm_service.py: HTTP v1 Firebase Cloud Messaging Push Service        |   |
|   +-------------------------------------------------------------------------+   |
|            |                                                    |               |
|            | Runs continuously                                  | Reads/Writes  |
|            v                                                    v               |
|   +--------------------------+                      +-----------------------+   |
|   |   AUTONOMOUS WORKER      |                      |    SQLITE DATABASE    |   |
|   |   (backend/monitor.py)   |                      |    (terrasense.db)    |   |
|   |   • 15-minute intervals  |                      |   • active_alerts     |   |
|   |   • Batch grid sweeps    |                      |   • alert_history     |   |
|   |   • Triggers FCM pushes  |                      |   • fcm_devices       |   |
|   +--------------------------+                      +-----------------------+   |
|                                                                                 |
+---------------------------------------------------------------------------------+
```

### 5.1 In-Memory Spatial Cache & Grid Engine (`grid.py`)
To ensure responsive API performance across 2,534 cells, `grid.py` loads the grid dataset into an in-memory data structure on startup:
- **Fast Spatial Lookups:** Maps unique cell tokens (`NE_0001` through `NE_2534`) to centroid coordinates, state names, administrative subdivisions, PIN codes, and static susceptibility scores.
- **Settlement Gazetteer:** Integrates a gazetteer of Northeast towns, hill stations, and administrative points (e.g., Gangtok, Mangan, Pelling, Kohima, Aizawl, Shillong, Tawang, Haflong), allowing operators to search by town name or 6-digit postal code (e.g., `737101`) to jump directly to the relevant cell.
- **On-the-Fly GeoJSON Boundaries:** Computes cell bounding boxes ($\pm 0.05^\circ$ offsets) on demand, assembling GeoJSON polygons for web rendering without storing redundant geometry files on disk.

### 5.2 Resilient Meteorological Client (`weather_service.py`)
Live rainfall data is retrieved from Open-Meteo's weather service through an asynchronous HTTP client:
- **Hydrological Variables:** Ingests current precipitation, 24-hour totals, 7-day cumulative rainfall, temperature, relative humidity, cloud cover, and WMO weather codes.
- **In-Memory TTL Caching:** Implements a 15-minute Time-to-Live (TTL) cache keyed by rounded coordinates. When multiple requests query the same cell or district, the system serves the cached response, preventing upstream rate limits.
- **Fallback Telemetry:** If upstream APIs experience temporary connectivity issues, the service uses seasonal baseline averages as a fallback, allowing the monitoring loop to continue execution without crashing.

### 5.3 Autonomous Background Daemon (`monitor.py`)
Rather than calculating risk only when a user interacts with the dashboard, TerraSense evaluates hazards autonomously:
- **15-Minute Sweep Interval:** An unassisted background task runs every 900 seconds (15 minutes), sweeping across all 2,534 cells.
- **Asynchronous Concurrent Batches:** Queries weather telemetry in concurrent asynchronous batches, recalculates dynamic triggers, and evaluates the compound hazard index.
- **Continuous Oversight:** If overnight rainfall causes a threshold breach while operators are away from the console, the daemon detects the condition and triggers emergency mobile alerts.

---

## 6. Alert Deduplication & Firebase Mobile Dispatch

### 6.1 The Alert Fatigue Challenge
In early warning systems, **alert fatigue** can degrade operational responsiveness. If a mountain ridge experiences heavy rain for 16 hours, an automated monitor sweeping every 15 minutes would generate 64 notifications if unmanaged. Field personnel receiving repetitive alarms may silence their devices, defeating the warning system's purpose.

### 6.2 The SQLite Deduplication State Machine (`alerts.py`)
To keep alerts actionable and credible, TerraSense manages warning states through an ACID-compliant SQLite datastore (`terrasense.db`):

```sql
-- Production Table: active_alerts
CREATE TABLE IF NOT EXISTS active_alerts (
    alert_id INTEGER PRIMARY KEY AUTOINCREMENT,
    cell_id TEXT UNIQUE NOT NULL,
    state TEXT NOT NULL,
    district TEXT NOT NULL,
    risk_score REAL NOT NULL,
    rainfall_7d REAL NOT NULL,
    susceptibility REAL NOT NULL,
    risk_level TEXT NOT NULL,       -- 'MODERATE' or 'HIGH'
    status TEXT NOT NULL,           -- 'ACTIVE' or 'RESOLVED'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_notified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### State Transition Rules:
1. **New Breach Detected:** When a cell enters High Risk ($\ge 0.66$) without an existing `ACTIVE` record, the system logs a new alert in `active_alerts` and dispatches a push notification to authorized responder devices.
2. **Persistent Condition (Suppression):** If the cell is already recorded as `ACTIVE` at the same risk tier, the daemon updates timestamps and telemetry quietly. **Outgoing push notifications are suppressed**, keeping the web dashboard current without sending redundant alarms.
3. **Escalation Trigger:** If a cell escalates from Moderate to High Risk, or its compound risk index increases significantly (>15%), an updated notification is dispatched to reflect the worsening condition.
4. **Resolution & Archiving:** When 7-day rainfall subsides and the risk score drops below 0.33, the alert status transitions to `RESOLVED`, archiving the incident for record-keeping.

### 6.3 Push Notification Architecture (`fcm_service.py`)
Mobile dispatch uses **Firebase Cloud Messaging (FCM)** via Google's HTTP v1 protocol:

```
+---------------------------------------------------------------------------------+
|                       FCM EMERGENCY DISPATCH PROTOCOL                           |
+---------------------------------------------------------------------------------+
|                                                                                 |
|  [FastAPI Backend Alert Trigger]                                                |
|  • Cell NE_1653 breaches threshold (Score: 0.824, Rainfall: 246.7 mm)          |
|                                                                                 |
|                                    |                                            |
|                                    v                                            |
|                                                                                 |
|  [FCM HTTP v1 Payload Assembly]                                                 |
|  • Target: Authorized Responder Devices in SQLite fcm_devices                   |
|  • Android Channel: "terrasense_alerts_high_v2"                                 |
|  • Priority: HIGH                                                               |
|  • Custom Sound: "siren" (res/raw/siren.mp3)                                    |
|                                                                                 |
|                                    |                                            |
|                                    v                                            |
|                                                                                 |
|  [Google FCM Gateway]                                                           |
|                                                                                 |
|                                    |                                            |
|                                    v                                            |
|                                                                                 |
|     [Authorized Responder Android Device]                                       |
|     • Heads-up notification on dedicated channel                                |
|     • Displays cell, district, and risk metadata                                |
|     • Plays custom alert tone with vibration pattern                            |
|     • Tap action opens Alert Details screen                                     |
|                                                                                 |
+---------------------------------------------------------------------------------+
```

#### Delivery Features & Operational Constraints:
- **Dedicated Notification Channel:** Notifications target the `terrasense_alerts_high_v2` channel with `IMPORTANCE_HIGH`, presenting as heads-up banners on authorized responder devices.
- **Custom Alert Audio:** Configured with a dedicated alert tone (`res/raw/siren.mp3`) and vibration pattern (`0, 400, 200, 400`) to ensure warnings are noticed during critical monitoring periods.
- **Network Dependency:** FCM push alerts rely on active internet connectivity (cellular data or Wi-Fi). If severe weather knocks out local mobile networks, notifications cannot reach devices until connectivity is restored.

---

## 7. Native Android Field Responder Application

The mobile client is built as a native Android application in **Kotlin**, designed for field responders, emergency personnel, and local administrators:

```
+---------------------------------------------------------------------------------+
|                       ANDROID APPLICATION ARCHITECTURE                          |
+---------------------------------------------------------------------------------+
|                                                                                 |
|  [FirebaseMessagingService (Background Listener)]                              |
|  • Listens for incoming high-priority data messages                             |
|  • Dispatches notifications targeting 'terrasense_alerts_high_v2'               |
|  • Associates custom alert tone with incoming warning payloads                  |
|                                                                                 |
|                                    |                                            |
|                                    v                                            |
|                                                                                 |
|  [AlertDetailsScreen UI]                                                        |
|  • Emergency banner with hazard tier indicator                                  |
|  • Cell identifier, administrative district, and coordinates                    |
|  • Geotechnical breakdown: Susceptibility, 7-Day Rainfall, Risk Score           |
|  • Action links: Open GPS coordinates in map, contact emergency operations      |
|                                                                                 |
|                                    |                                            |
|                                    v                                            |
|                                                                                 |
|  [Local Preferences Cache (AlertPreferences)]                                   |
|  • Stores recent alert payloads locally in application preferences              |
|  • Retains recent alert history on device                                       |
|                                                                                 |
+---------------------------------------------------------------------------------+
```

### Key Field Features:
1. **Device Registration:** Registers the handset's FCM token with the FastAPI backend on launch, enrolling the device in authorized responder notification dispatch.
2. **Local Alert Cache:** Stores recent alert history locally on the device using `AlertPreferences`, allowing responders to review recent alert payloads even when mobile network quality fluctuates.
3. **Direct Navigation Links:** Deep-links directly to mapping applications using the cell's centroid coordinates to assist personnel in identifying affected road sectors.

---

## 8. Web Command Center & GIS Dashboard

For State Disaster Management Authorities (SDMA) and central control rooms, TerraSense provides a responsive web console built with **React 18, TypeScript, TailwindCSS, and Leaflet GIS**.

```
+---------------------------------------------------------------------------------+
|                         WEB COMMAND CENTER LAYOUT                               |
+---------------------------------------------------------------------------------+
| [HEADER BAR] TerraSense v1 FROZEN | 2,534 Cells Monitored | 8 States | Online   |
+---------------------------------------------------------------------------------+
| [METRICS STRIP]                                                                 |
| • Total Monitored: 2,534  • High Risk: 4  • Moderate Risk: 23  • Active: 33    |
+---------------------------------------------------------------------------------+
| [SPLIT WORKSPACE]                                                               |
|                                       |                                         |
|  INTERACTIVE GIS MAP (Leaflet)        |  INVESTIGATION DRAWER (Slide-Over)      |
|  • Regional Northeast boundary map    |  • Selected: NE_1653 (Gangtok Sub-Div)  |
|  • 2,534 color-coded grid cells       |  • Risk Level: HIGH (Score: 82.4%)      |
|  • Green (Low), Amber (Med), Red (Hi) |  • Susceptibility: 67.6%                |
|  • Live weather radar overlay         |  • 7-Day Rainfall: 246.7 mm             |
|  • Search by District / PIN / Cell ID |  • Terrain Radar Profile Chart          |
|  • Coordinated 30s background polling |  • 7-Day Infiltration Curve             |
|                                       |  • Administrative Contact Info          |
+---------------------------------------------------------------------------------+
| [LOWER CONSOLE] Live Alerts Stream | Ground Reports Verification | Model Spec   |
+---------------------------------------------------------------------------------+
```

### Key Interface Features:
- **Interactive 2,534-Cell Grid Map:** Visualizes all 2,534 cells with color-coded risk markers and boundary polygons, allowing operators to zoom and pan across the eight states.
- **Live Weather Radar Layer:** An integrated weather toggle displays live cloud cover and precipitation intensity from Open-Meteo across the terrain grid.
- **Cell Investigation Drawer:** Clicking any cell opens a slide-over panel detailing its geotechnical breakdown: elevation, slope angle, soil clay/sand fractions, distance to highways, a radar chart of terrain vulnerabilities, and recent rainfall curves.
- **Town & PIN Code Search:** Operators can search by district names or 6-digit postal PIN codes (e.g., `737101` for Gangtok) to locate the corresponding grid cell.
- **Ground Truth Reporting Portal:** Allows field personnel to submit verified observations (minor rockfalls, tension cracks, road subsidence) through a `PENDING → VERIFIED / REJECTED` workflow, supporting ground-truth record collection without automatically altering production model weights.
- **Coordinated Frontend Polling:** The web dashboard automatically synchronizes alerts and system summary metrics every **30 seconds**, while weather map data refreshes approximately every **180 seconds**.

---

## 9. Scientific References & Primary Data Sources

TerraSense is grounded in peer-reviewed scientific datasets and established geotechnical research:

1. **NASA Shuttle Radar Topography Mission (SRTM):**
   *Farr, T. G., et al. (2007). "The Shuttle Radar Topography Mission." Reviews of Geophysics, 45(2).*
   Provided the baseline 30-meter Digital Elevation Model (DEM) used to calculate regional slope angles, elevations, and terrain aspect.
2. **ISRIC World Soil Information (SoilGrids 250m):**
   *Poggio, L., et al. (2021). "SoilGrids 2.0: producing soil property maps with global coverage using machine learning." SOIL, 7(1), 217-240.*
   Supplied spatial distributions for clay content, sand percentage, and bulk density across standard 0–30 cm soil profiles.
3. **NASA GPM IMERG:**
   Historical precipitation reanalysis data used for multi-year model training, calibration, and temporal validation splits (2007–2016).
4. **Open-Meteo Weather API:**
   *Zippenfenig, P. (2023). "Open-Meteo: Open-Source Weather API."*
   Provides live meteorological telemetry and 7-day cumulative rainfall inputs for operational risk scoring.
5. **Geological Survey of India (GSI) Landslide Compendium:**
   Historical landslide spatial databases and National Landslide Susceptibility Mapping (NLSM) program records used for event reconciliation and labeling.
6. **HydroRIVERS & OpenStreetMap:**
   *Lehner, B., et al. (2008). "New global hydrography derived from spaceborne elevation data." Eos, Transactions American Geophysical Union.*
   Supplied high-resolution regional river drainage lines and transport infrastructure vectors.

---

## 10. System Verification & Implementation Status

```
=================================================================================
                     TERRASENSE PRODUCTION AUDIT MANIFEST
=================================================================================
[CONFIRMED] 2,534 Active Monitored Cells across 8 Northeast Indian States.
[CONFIRMED] Frozen Random Forest v1 (500 Trees, 9 Features, ROC-AUC: 0.858970).
[CONFIRMED] Dynamic Risk Formula with 165.22 mm 7-Day Rainfall Reference Value.
[CONFIRMED] Extreme Rainfall Safety Floor Override (>= 349.392 mm applies 0.67 Floor).
[CONFIRMED] Autonomous 15-Minute Background Daemon running in FastAPI.
[CONFIRMED] SQLite State Machine with active alert deduplication.
[CONFIRMED] Firebase Cloud Messaging (FCM) push dispatch for authorized responders.
[CONFIRMED] Native Android Field Application with local alert history and siren tone.
[CONFIRMED] React 18 / TypeScript Web Command Center with 30s background polling.
[CONFIRMED] Software-first monitoring architecture; no slope sensors required.
=================================================================================
```

TerraSense v1 provides disaster management authorities and field responders with an objective, data-driven early warning support tool. By combining static geotechnical susceptibility with dynamic multi-day rainfall tracking, it offers a scalable means to **monitor thousands of square kilometers simultaneously, prioritize vulnerable corridors, and support earlier disaster decision-making**.
