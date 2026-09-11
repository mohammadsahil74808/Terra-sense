/**
 * DataFreshness — Compact data pipeline status indicator.
 * Uses real values from backend /health and /api/model/info endpoints.
 */

import type { HealthStatus, ModelInfo, SystemSummary } from '../types';

interface DataFreshnessProps {
  health: HealthStatus | null;
  modelInfo: ModelInfo | null;
  systemSummary: SystemSummary | null;
  predictionTimestamp: string | null;
}

interface StatusIndicator {
  label: string;
  status: string;
  online: boolean;
  detail: string;
}

export function DataFreshness({ health, modelInfo, systemSummary, predictionTimestamp }: DataFreshnessProps) {
  const indicators: StatusIndicator[] = [
    {
      label: 'Rainfall',
      status: health?.rainfall_provider === 'open-meteo' ? 'LIVE' : 'OFFLINE',
      online: health?.rainfall_provider === 'open-meteo',
      detail: health?.rainfall_provider ?? 'unknown',
    },
    {
      label: 'Model',
      status: 'FROZEN',
      online: health?.model_loaded ?? false,
      detail: modelInfo?.model ?? 'RandomForest v1',
    },
    {
      label: 'Grid',
      status: `${systemSummary?.monitored_cells ?? 2534} CELLS`,
      online: health?.susceptibility_grid_loaded ?? false,
      detail: '8 NE States',
    },
    {
      label: 'Backend',
      status: health?.status === 'ok' ? 'ONLINE' : 'DEGRADED',
      online: health?.status === 'ok',
      detail: 'FastAPI',
    },
  ];

  return (
    <div className="rounded-xl border border-ts-border bg-ts-surface1 p-3.5 shadow-ts-panel">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-ts-text2">Data Status</span>
        {predictionTimestamp && (
          <span className="text-[10px] text-ts-text3 font-mono ml-auto">
            Last query: {new Date(predictionTimestamp).toLocaleTimeString()}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {indicators.map((ind) => (
          <div key={ind.label} className="flex items-center gap-2 bg-ts-surface2 rounded-lg px-2.5 py-2 border border-ts-border">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              ind.online ? 'bg-emerald-400' : 'bg-red-400'
            }`} />
            <div className="min-w-0">
              <div className="text-[10px] text-ts-text3 truncate">{ind.label}</div>
              <div className={`text-[11px] font-bold font-mono truncate ${
                ind.online ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {ind.status}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
