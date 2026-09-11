// TerraSense — TypeScript definitions for Northeast India AI Landslide Early Warning System

export type RiskLevel = 'HIGH' | 'MODERATE' | 'LOW';
export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
export type ReportStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';
export type GroundCondition =
  | 'No visible issue'
  | 'Surface cracks'
  | 'Slope movement'
  | 'Rockfall'
  | 'Landslide'
  | 'Other';

/** Ground Verification observation record */
export interface GroundReport {
  report_id: string;
  cell_id: string;
  latitude: number;
  longitude: number;
  location: string;
  timestamp: string;
  condition: GroundCondition;
  description?: string;
  photo_reference?: string;
  status: ReportStatus;
  verified_at?: string;
}

/** Ground reports aggregate summary */
export interface GroundReportSummary {
  pending: number;
  verified: number;
  rejected: number;
  total: number;
}

/** Susceptibility grid cell from 2,534 Northeast India dataset with real weather */
export interface GridCell {
  cell_id: number;
  latitude: number;
  longitude: number;
  susceptibility: number;
  state?: string;
  district?: string;
  subdivision?: string;
  village?: string;
  pincode?: string;
  full_address?: string;
  short_address?: string;
  place_type?: string;
  nearest_place?: string;
  place_distance_km?: number;
  location_name?: string;
  current_rainfall?: number;
  current_rain?: number;
  cloud_cover?: number;
  cloud_cover_low?: number;
  cloud_cover_mid?: number;
  cloud_cover_high?: number;
  weather_code?: number;
  weather_condition?: string;
  weather_icon?: string;
  rainfall_7d?: number;
  temperature?: number;
  wind_speed?: number;
  wind_direction?: number;
  humidity?: number;
  risk_score?: number;
  risk_level?: RiskLevel;
  extreme_rainfall?: boolean;
  weather_updated_at?: string;
}

/** Precipitation metrics from rainfall pipeline */
export interface RainfallMetrics {
  rainfall_1d: number;
  rainfall_3d: number;
  rainfall_7d: number;
  rainfall_14d: number;
  source: string;
  timestamp: string;
}

/** Real-time combined landslide risk prediction */
export interface PredictionResult {
  cell_id: string;
  latitude: number;
  longitude: number;
  susceptibility: number;
  rainfall: RainfallMetrics;
  risk_score: number;
  risk_level: RiskLevel;
  extreme_rainfall: boolean;
  state?: string;
  district?: string;
  subdivision?: string;
  village?: string;
  pincode?: string;
  full_address?: string;
  short_address?: string;
  place_type?: string;
  nearest_place?: string;
  place_distance_km?: number;
  location_name?: string;
  timestamp: string;
}

/** Operational disaster alert record */
export interface AlertRecord {
  alert_id: string;
  cell_id: string;
  location: string;
  risk_level: string;
  risk_score: number;
  rainfall_7d: number;
  created_at: string;
  status: AlertStatus;
}

/** Regional aggregate metrics dynamically calculated from live weather */
export interface SystemSummary {
  monitored_cells: number;
  total_cells?: number;
  low_risk: number;
  moderate_risk: number;
  high_risk: number;
  active_alerts: number;
  current_rainfall_max?: number;
  current_rainfall_mean?: number;
  weather_updated_at?: string;
  weather_source?: string;
  weather_status?: string;
  timestamp: string;
}

/** Real rainfall hotspot observation */
export interface RainfallHotspot {
  state: string;
  mean_rainfall_mmh: number;
  max_rainfall_mmh: number;
  temperature?: number;
  humidity?: number;
  is_raining: boolean;
}

/** Hourly weather timeline point */
export interface WeatherTimelinePoint {
  offset_hours: number;
  label: string;
  time: string;
  precipitation: number;
  cloud_cover: number;
  precipitation_probability: number;
  weather_code: number;
  weather_condition: string;
  weather_icon: string;
  is_forecast: boolean;
}

/** System health status from /health */
export interface HealthStatus {
  status: string;
  model_loaded: boolean;
  susceptibility_grid_loaded: boolean;
  rainfall_provider: string;
}

/** Frozen model operational metadata */
export interface ModelInfo {
  model: string;
  status: string;
  feature_count: number;
  grid_cells: number;
  features?: string[];
  rainfall_config?: {
    rainfall_scale: number;
    extreme_rain_p95_mm: number;
    extreme_risk_floor: number;
    low_limit: number;
    high_limit: number;
  };
}

/** Request payload for coordinates prediction */
export interface PredictLocationRequest {
  latitude: number;
  longitude: number;
  demo_mode?: boolean;
}

// ── Legacy Interfaces for Backward Compatibility ───────────────────────────
export interface Village {
  name: string;
  lat: number;
  lon: number;
  elevation: number;
  slope_degrees: number;
  max_24h_rain: number;
  total_monsoon_rain: number;
  landslide_risk_label: number;
  risk_score: number;
  risk_level: RiskLevel;
}

export interface Summary {
  total_villages: number;
  high_risk: number;
  moderate_risk: number;
  low_risk: number;
  avg_risk_score: number;
  avg_slope: number;
  avg_rainfall_24h: number;
  max_risk_village: string;
}

export interface PredictRequest {
  elevation: number;
  slope_degrees: number;
  max_24h_rain: number;
  total_monsoon_rain: number;
}

export interface PredictResponse {
  risk_score: number;
  risk_level: RiskLevel;
}
