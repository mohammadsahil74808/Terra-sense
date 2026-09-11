# TerraSense — Project Summary

## Problem
Unfortunately, land slides are a common occurrence in the Northeast states of India during every monsoon season, causing loss of life and livelihood, vehicles getting buried under the soil, and formation of barricades on the major highways such as NH-10 and NH-29 for days. The prevailing disaster management is reactive, meaning emergency responders cannot even move to the road until it becomes blocked. Wide-spread weather warnings are not accurate enough to specify which slopes will fail, and it is too costly and delicate to install the sensors throughout the Himalayan ridges.

## Solution
Smart India Hackathon 2026 (SIH26) (Problem Statement: SIH26001, Team: CTRL FREAKS) is an autonomous early warning system. It tracks landslide potential in all of the eight Northeast states, without using any physical sensors on mountain slopes. Rather, it combines static susceptibility of the terrain with the actual rainfall for multiple days to assess risk at finer scales of 11 km x 11 km grid cells.

## How It Works
The system has a clean & logical pipeline:

```
DATA → GRID → ML SUSCEPTIBILITY → LIVE RAINFALL → RISK ENGINE → ALERT
```

The 1. Static Data includes NASA elevation models, soil property maps, land-cover classifications, and the vectors for roads and rivers that are aligned to a common 0.1° geographic grid.
The second model is a locked Random Forest model which uses the physical slope characteristics of each cell to generate a baseline susceptibility score (0.0 to 1.0).
3. Live Rainfall: Background worker that monitors 7-day rolling accumulated rainfall on every cell, autonomously, every 15 minutes.
4. Risk Engine – Static susceptibility multiplied by dynamic rainfall trigger, and extreme weather safety override and classification to LOW, MODERATE or HIGH risk.
5. Alert Dispatch: If a HIGH-risk cell is detected, duplicate alerts will be suppressed, an event will be logged in SQLite, and an emergency push notification to the authorized answer cell will be sent using Firebase Cloud Messaging (FCM).

## Data Sources
The TerraSense is a fusion of existing, publicly available geospatial data sets:
NASA SRTM (30m): Elevation and slope angles of terrain.
ISRIC SoilGrids (250m): These provide the clay percentage, sand percentage and bulk density (0–30 cm).
ESA WorldCover (10m): land-cover classification and vegetative dominance.
For distances to waterways and transit cuts, provide drainage lines and road vectors in HydroRIVERS and OpenStreetMap.
Rainfall calibration for historical (2007-2016) and historical landslide event reconciliation (NASA GPM IMERG & GSI Bhusanket).
* **Sharing of rainfall data through the Open-Meteo API for live and forecast rainfall telemetry in real time, for ongoing operational monitoring.

## Machine Learning Model
The core susceptibility model is a classifer based on a Random Forest and configured as follows:
* **Estimators:** 500 decision trees
The 9 production features of the data (`elevation`, `slope`, `distance_to_road_km`, `distance_to_river_km`, `clay_0_30_pct`, `sand_0_30_pct`, `bulk_density_0_30_kg_dm3`, `lulc_class`, `lulc_dominant_percentage`)
Class Weight: `{0: 1.0, 1: 4.961}` to give a weighting due to the natural rarity of landslide events.
* **Data Splits:** 2007–2014 for training, 2015 for validation, and 2016 locked as a blind test
* **Performance:** Achieved an **ROC-AUC of 0.858970** ($\approx 0.859$) on the locked 2016 blind test

Given the highly imbalanced nature of the landslide data, ROC-AUC is used to evaluate the model's ability to separate the high risk from stable ground for all decision thresholds. For this blind test, 15 of 23 historical events were captured (65.22% event capture) with the top 500 ranked cell-days.

## Risk Engine
Operational risk is calculated using an open formula:
$$\text{trigger} = \frac{\text{rainfall\_7d}}{165.22}$$
The hazards of a specific individual is multiplied by the trigger.The susceptibility of an individual is multiplied by the trigger.

This is our calibrated reference value for 7 day cumulative rainfall for the region, which is scaled to 1.0, the dynamic trigger.
During cloudbursts, the risk score is automatically raised to at least 0.67 (HIGH), when 7-day rainfall is 349.392 mm or more.
* **Risk Tiers:** LOW ($< 0.33$), MODERATE ($0.33 \text{ to } < 0.66$), and HIGH ($\ge 0.66$).

## Live Monitoring
Valid Monitored Cells: 2,534 monitored cells in all 8 Northeast states.
An asynchronous daemon is running within FastAPI each 15 minutes (900 seconds), to evaluate the whole grid without user interaction.
With Duplicate Suppression, notifies are stored in SQLite in an ACTIVE/ACKNOWLEDGED/RESOLVED lifecycle. When a cell continues to be high risk for the subsequent cycles, no additional siren alarms are sent to ensure responder fatigue is not an issue.
Frontend Sync: There is a 30 second frequency of polling against backend summary and alert endpoints.

## Responder Alerts
Delivered to registered responder devices using: Firebase Cloud Messaging (FCM).
Android Experience: High priority channel (terrasense_alerts_high_v2) with custom siren audio (terrasense_alert.mp3), separate vibration, and one touch mapping links.
Requires connectivity: Must have an internet connection (Wi-Fi or cellular data) to be able to send push notifications.

## Current Evidence
The Backend Test Suite: 31 automated tests passed for grid lookups, risk math, extreme rainfall overrides, SQLite alert states, FCM formatting, and monitoring worker behavior.
Passing TypeScript type checks and running the production build with vite.
* **Model Integrity:** Production model artifact verified with locked SHA-256 hash (`7f150577997f1bf4dd1e75e58d72252ccccb363ab9861a23b8269b4964047fbe`).

## Current Limitations
Rainfall-Centric: Captures 7-day accumulated rain, but not yet captures peak intensity of cloudburst at hourly time scales.
No Real-Time Soil Moisture: Soil properties are retrieved from static soil databases, not in-situ moisture sensors.
Network Dependent: If storms take down cell towers in remote valleys, FCM alerts will not reach the phones.
No Automatic Retraining: No field reports are used to automatically change the production ML weights.

## Future Scope
Incorporating rainfall intensity-duration curve for short duration (1 hour, 3 hours).
Satellite soil moisture feeds (NASA SMAP) taken before storms to monitor soil moisture.
Adding SMS and radio emergency fallback path for areas with weak cellular signal.
Carrying out pilots at the district level in direct collaboration with State Disaster Management Authorities.

## One-Line Summary
A 2534 cell hardware-less Early Warning System (EWS) for Northeast India which combines Machine Learning Terrain Susceptibility and live 7 day rainfall monitoring to give advance warning of vulnerable mountain slopes.