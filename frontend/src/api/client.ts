/**
 * TerraSense API Client
 * Typed fetch wrappers for all FastAPI endpoints.
 * The Vite proxy forwards /api/* and /health → http://localhost:8000
 */

import type {
  GridCell,
  PredictionResult,
  AlertRecord,
  SystemSummary,
  HealthStatus,
  ModelInfo,
  PredictLocationRequest,
  Village,
  Summary,
  PredictRequest,
  PredictResponse
} from '../types';

/** Generic fetch helper with error parsing */
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, options);
  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const data = await response.json();
      if (data && data.detail) {
        if (typeof data.detail === 'object' && data.detail.message) {
          errorDetail = data.detail.message;
        } else if (typeof data.detail === 'string') {
          errorDetail = data.detail;
        }
      }
    } catch {
      // ignore json parse error
    }
    throw new Error(errorDetail || `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

// ── System Health & Model Metadata ──────────────────────────────────────────

/** GET /health — system readiness & provider status */
export const fetchHealth = (): Promise<HealthStatus> =>
  apiFetch<HealthStatus>('/health');

/** GET /api/model/info — frozen ML model operational metadata */
export const fetchModelInfo = (): Promise<ModelInfo> =>
  apiFetch<ModelInfo>('/api/model/info');

// ── Susceptibility Grid & Map ────────────────────────────────────────────────

/** GET /api/map/cells — 2,534 cells across Northeast India (fast, in-memory) */
export const fetchMapCells = (): Promise<GridCell[]> =>
  apiFetch<GridCell[]>('/api/map/cells');

// ── Dynamic Prediction & Live Rainfall ──────────────────────────────────────

/** POST /api/predict — Run risk engine combining susceptibility with live rainfall */
export const predictLocation = (data: PredictLocationRequest): Promise<PredictionResult> =>
  apiFetch<PredictionResult>('/api/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

// ── Alerts Management ────────────────────────────────────────────────────────

/** GET /api/alerts — list disaster alerts with optional status filter */
export const fetchAlerts = (status?: string): Promise<AlertRecord[]> => {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiFetch<AlertRecord[]>(`/api/alerts${query}`);
};

/** POST /api/alerts/:id/acknowledge */
export const acknowledgeAlert = (alertId: string): Promise<AlertRecord> =>
  apiFetch<AlertRecord>(`/api/alerts/${encodeURIComponent(alertId)}/acknowledge`, {
    method: 'POST',
  });

/** POST /api/alerts/:id/resolve */
export const resolveAlert = (alertId: string): Promise<AlertRecord> =>
  apiFetch<AlertRecord>(`/api/alerts/${encodeURIComponent(alertId)}/resolve`, {
    method: 'POST',
  });

// ── Summary Metrics ──────────────────────────────────────────────────────────

/** GET /api/summary — high-level metrics for dashboard */
export const fetchSystemSummary = (): Promise<SystemSummary> =>
  apiFetch<SystemSummary>('/api/summary');

// ── Legacy Compatibility Wrappers ────────────────────────────────────────────

export const fetchVillages = (): Promise<Village[]> =>
  apiFetch<Village[]>('/api/villages');

export const fetchSummary = async (): Promise<Summary> => {
  const sys = await fetchSystemSummary();
  return {
    total_villages: sys.monitored_cells,
    high_risk: sys.high_risk,
    moderate_risk: sys.moderate_risk,
    low_risk: sys.low_risk,
    avg_risk_score: 0.08,
    avg_slope: 24.5,
    avg_rainfall_24h: 32.0,
    max_risk_village: 'Nagaland · Kohima Ridge',
  };
};

export const predict = (data: PredictRequest): Promise<PredictResponse> =>
  apiFetch<PredictResponse>('/api/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

/** Scenario result from /api/scenario */
export interface ScenarioResult {
  susceptibility: number;
  scenario_rainfall_7d: number;
  risk_score: number;
  risk_level: string;
  extreme_rainfall: boolean;
  rainfall_trigger: number;
  is_scenario: boolean;
}

/** POST /api/scenario — What-If rainfall scenario using frozen risk engine */
export const runScenario = (data: { susceptibility: number; rainfall_7d: number }): Promise<ScenarioResult> =>
  apiFetch<ScenarioResult>('/api/scenario', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

// ── Ground Verification Reports ──────────────────────────────────────────────

import type { GroundReport, GroundReportSummary, ReportStatus } from '../types';

export const fetchGroundReports = (status?: string): Promise<GroundReport[]> => {
  const query = status && status !== 'ALL' ? `?status=${encodeURIComponent(status)}` : '';
  return apiFetch<GroundReport[]>(`/api/reports${query}`);
};

export const fetchGroundReportsSummary = (): Promise<GroundReportSummary> =>
  apiFetch<GroundReportSummary>('/api/reports/summary');

export const submitGroundReport = (formData: FormData): Promise<GroundReport> =>
  apiFetch<GroundReport>('/api/reports', {
    method: 'POST',
    body: formData,
  });

export const updateGroundReportStatus = (reportId: string, status: ReportStatus): Promise<GroundReport> =>
  apiFetch<GroundReport>(`/api/reports/${encodeURIComponent(reportId)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });

// ── Weather Intelligence ─────────────────────────────────────────────────────

import type { RainfallHotspot, WeatherTimelinePoint } from '../types';

export const fetchWeatherHotspots = (): Promise<RainfallHotspot[]> =>
  apiFetch<RainfallHotspot[]>('/api/weather/hotspots');

export const fetchWeatherTimeline = (): Promise<WeatherTimelinePoint[]> =>
  apiFetch<WeatherTimelinePoint[]>('/api/weather/timeline');

// ── FCM Responder Push Dispatch ──────────────────────────────────────────────

export interface SimulateHighAlertPayload {
  cell_id?: string;
  location?: string;
  risk_score?: number;
  rainfall_7d?: number;
  message?: string;
  advisory?: string;
  is_demo?: boolean;
  reset_active_cell?: boolean;
  force_dispatch?: boolean;
}

export interface SimulateHighAlertResult {
  alert_id: string;
  cell_id: string;
  location: string;
  risk_level: string;
  risk_score: number;
  rainfall_7d: number;
  status: string;
  is_demo: boolean;
  is_duplicate: boolean;
  advisory?: string;
  notification_dispatched: boolean;
  fcm_details?: any;
  message: string;
}

export const dispatchSimulateHighAlert = (
  payload: SimulateHighAlertPayload
): Promise<SimulateHighAlertResult> =>
  apiFetch<SimulateHighAlertResult>('/api/alerts/simulate-high-dispatch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });



