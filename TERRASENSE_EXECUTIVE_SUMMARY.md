# TerraSense: Executive Project Summary & Field Dossier
**Smart India Hackathon 2026 | Team: CTRL FREAKS**  
**AI-Powered Landslide Risk Monitoring & Early Warning System for Northeast India**  
*Target Domain: Disaster Management, Geospatial AI & Civil Protection*

---

## 1. The Ground Reality: Why We Built TerraSense

Every monsoon between June and September, the eight states of Northeast India—Sikkim, Assam, Arunachal Pradesh, Meghalaya, Manipur, Mizoram, Nagaland, and Tripura—face recurring landslides across the Himalayas and Indo-Burman ranges. Vital routes like National Highway 10 get severed for days, cutting off mountain communities and disrupting emergency response.

Current landslide monitoring faces two practical hurdles:
1. **Coarse Regional Warnings:** Conventional weather advisories are broad, district-wide bulletins (such as an "Orange Alert for East Sikkim") that cannot pinpoint which specific slopes or road sectors are most vulnerable.
2. **Fragility of Slope Sensors:** While physical IoT probes (inclinometers, piezometers) provide localized research data, deploying and maintaining thousands of wired probes across remote Himalayan ridges is difficult to sustain. Monsoon deluges, unstable soils, and falling debris frequently damage physical wiring, making ongoing upkeep costly and hazardous.

**TerraSense** is built as a software-first risk monitoring and decision-support system. TerraSense v1 does not require dedicated slope-mounted hardware for its monitoring workflow. Instead, it pairs static geotechnical terrain susceptibility with dynamic rolling 7-day rainfall signals to prioritize vulnerable 11 km × 11 km corridors before slope stability degrades.

---

## 2. Core System Pillars & Verified Metrics

TerraSense v1 is a functional, production-validated prototype evaluated against real-world geospatial and historical hazard datasets:

```
+---------------------------------------------------------------------------------+
|                            TERRASENSE SYSTEM AT A GLANCE                        |
+---------------------------------------------------------------------------------+
| • Monitored Footprint:  2,534 Valid Monitored Cells across all 8 NE States      |
| • Spatial Resolution:   0.1° × 0.1° Grid (~11 km × 11 km / ~121 km² per cell)   |
| • Core ML Model:        Frozen Random Forest (500 Trees, 9 Static Features)     |
| • Model Validation:     Blind 2016 Test ROC-AUC: 0.858970 (~0.859)              |
| • Evaluation Metric:    Top-500 Ranking captures 15 of 23 Blind Events (65.22%) |
| • Dynamic Trigger:      7-Day Rolling Rainfall scaled by 165.22 mm Model Value  |
| • Safety Override:      High-Risk floor (0.67) applied if 7-Day Rain >= 349.392 |
| • Autonomous Cadence:   15-Minute Automated Sweeps (FastAPI Async Worker)       |
| • Alert Pipeline:       SQLite Deduplication Engine + FCM Responder Notification|
| • Architecture Type:    Software-first monitoring; no slope hardware required   |
+---------------------------------------------------------------------------------+
```

---

## 3. How the Dual-Layer Risk Engine Works

The system architecture separates slope hazard evaluation into two questions: **Where is the terrain inherently vulnerable?** and **How much cumulative rainfall has entered the area?**

### Layer 1: Static Geotechnical Susceptibility (Terrain Baseline)
Using NASA SRTM 30m elevation models, ISRIC World Soil data (0–30 cm horizons), OpenStreetMap transit networks, and HydroRIVERS drainage lines, our frozen **Random Forest Classifier (500 trees)** evaluates nine static features for each cell:
1. `slope`: Terrain gradient in degrees (gravitational shear stress driver).
2. `elevation`: Elevation in meters above sea level (orographic condensation belts).
3. `distance_to_road_km`: Distance to mapped roads (toe excavation and human cuts).
4. `distance_to_river_km`: Distance to river networks (toe erosion and high water tables).
5. `clay_0_30_pct`: Topsoil clay percentage (slip surface formation when wet).
6. `sand_0_30_pct`: Topsoil sand percentage (rapid infiltration and pore pressure loss).
7. `bulk_density_0_30_kg_dm3`: Soil mass density (porous colluvium vs. compacted ground).
8. `lulc_class`: Land use / land cover classification (vegetative root cohesion).
9. `lulc_dominant_percentage`: Dominance percentage of the primary cover class.

This produces a static **Susceptibility Score** ($S \in [0.0, 1.0]$) for every cell across the region.

### Layer 2: Dynamic Rainfall Trigger (Meteorological Input)
Water infiltration steadily reduces effective normal stress by elevating pore water pressure. TerraSense tracks rolling 7-day accumulated rainfall ($R_{\text{7d}}$) for each cell using the Open-Meteo weather service. The dynamic trigger ratio ($T$) is calculated as:
$$T = \min\left(1.0, \frac{R_{\text{7d}}}{165.22\text{ mm}}\right)$$
Here, **165.22 mm** is the model's v1 rainfall reference trigger value, used to scale the 7-day rainfall accumulation signal. It is a model scaling parameter rather than a universal physical threshold.

### Layer 3: Compound Risk & Extreme Rainfall Floor
The baseline hazard score is calculated as:
$$\text{Raw Risk} = \text{Susceptibility } (S) \times \text{Trigger } (T)$$
- **LOW:** $< 0.33$ (Baseline conditions, routine monitoring)
- **MODERATE:** $0.33 \text{ to } < 0.66$ (Soil saturated; drainage inspection advised)
- **HIGH:** $\ge 0.66$ (Critical saturation zone; prioritized responder alerts)

**Extreme Rainfall Override:** During severe cloudbursts, large volumes of rain can destabilize slopes even where static susceptibility is moderate. If 7-day accumulated rainfall reaches or exceeds **349.392 mm**, the system automatically applies a risk floor of **0.67 (HIGH)**:
$$\text{If } R_{\text{7d}} \ge 349.392\text{ mm} \implies \text{Final Risk} = \max(\text{Raw Risk}, 0.67)$$
This ensures high-volume precipitation events are not missed due to lower static susceptibility.

---

## 4. End-to-End Operational Pipeline

```
[Static Environmental Data]             [Historical Rainfall & Event Labels]
(NASA DEM, ISRIC, WorldCover, OSM)      (NASA GPM IMERG + GSI Bhusanket)
              |                                          |
              +--------------------+---------------------+
                                   |
                                   v
             [Random Forest Model: 500 Trees, 9 Features]
               Validated ROC-AUC: 0.858970 (2016 Blind Test)
                                   |
                                   v
        +-----------------------------------------------------+
        | STATIC SUSCEPTIBILITY FOR 2,534 CELLS (0.1° GRID)   |
        +-----------------------------------------------------+
                                   |
                                   v
             [FastAPI Autonomous Background Worker]
             Runs every 15 minutes (900s interval)
             Ingests live Open-Meteo rainfall telemetry
                                   |
                                   v
            [Risk Engine Evaluates All 2,534 Cells]
            Applies 165.22mm Trigger & Extreme Rain Floor
                                   |
                   +---------------+---------------+
                   |                               |
                   v                               v
        [HIGH-Risk Cells Detected]     [Dashboard Synchronization]
        (Final Risk Score >= 0.66)     React 18 + Leaflet Web GIS
                   |                   (30s Alerts / Summary Polling)
                   v
        [SQLite Deduplication Engine]
        (Suppresses duplicate alarms)
                   |
                   v
        [Firebase Cloud Messaging (FCM)]
        Push notification dispatch
                   |
                   v
        [Authorized Responder Handsets]
        Dedicated channel + Custom sound
```

1. **Autonomous Monitoring (`monitor.py`):** An asynchronous worker runs inside FastAPI every 15 minutes, evaluating all 2,534 cells concurrently without requiring manual dashboard requests.
2. **State Deduplication (`alerts.py`):** Alerts are managed across an `ACTIVE → ACKNOWLEDGED → RESOLVED` lifecycle in SQLite. If a cell remains under active warning, timestamps update quietly while duplicate push notifications are suppressed to prevent responder fatigue.
3. **Authorized Responder Notifications (`fcm_service.py`):** When a new HIGH-risk condition is verified, FCM delivers an alert to authorized devices on the dedicated `terrasense_alerts_high_v2` channel with custom audio and vibration.
4. **Command Console:** A React 18 + Leaflet web console displays interactive risk choropleths, weather overlays, and an investigation drawer with radar charts.

---

## 5. Practical Capabilities & Boundaries

1. **Earlier Situational Awareness:** Provides early warning support based on rolling 7-day rainfall accumulation, helping authorities position equipment and monitor vulnerable roads ahead of peak hazard windows.
2. **Actionable Spatial Prioritization:** Replaces broad district advisories with specific **11 km × 11 km grid cells**, allowing response teams to focus their attention where danger is concentrated.
3. **Software-First Design:** TerraSense v1 operates without slope-mounted sensor hardware, avoiding the high installation and repair costs associated with physical probes in rugged terrain.
4. **Honest Machine Learning:** Validated with an **ROC-AUC of 0.858970** on an isolated 2016 historical blind test, balancing positive event capture against false alarm rates.
5. **Clear Operational Scope:** TerraSense v1 is a risk-ranking and decision-support system. It does not predict the exact second a slope will fail, does not autonomously enforce evacuations, and depends on active network connectivity for FCM push alerts.
