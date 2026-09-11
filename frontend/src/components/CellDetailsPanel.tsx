/**
 * CellDetailsPanel — Comprehensive details panel for a selected Northeast India grid cell.
 * Displays: Cell ID, Location, Static Susceptibility bar, Live Rainfall (24h, 3d, 7d, 14d),
 * Final Risk Score & Level, Extreme rainfall warning, and Refresh/Run Prediction actions.
 */

import type { GridCell, PredictionResult } from '../types';
import { getRiskBadgeClass, getRiskColor, getRiskTextClass } from '../utils/riskHelpers';
import {
  LandmarkIcon,
  AlertTriangleIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  RefreshIcon,
  XIcon,
} from './icons';

interface CellDetailsPanelProps {
  cell: GridCell | null;
  prediction: PredictionResult | null;
  loading: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function CellDetailsPanel({
  cell,
  prediction,
  loading,
  onClose,
  onRefresh,
}: CellDetailsPanelProps) {
  if (!cell) return null;

  const cellIdFormatted = `NE_${cell.cell_id.toString().padStart(4, '0')}`;
  const susceptibility = cell.susceptibility;
  const currentRisk = prediction ? prediction.risk_score : susceptibility;
  const currentLevel = prediction ? prediction.risk_level : (susceptibility >= 0.66 ? 'HIGH' : susceptibility >= 0.33 ? 'MODERATE' : 'LOW');

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className="fixed inset-0 z-30 lg:hidden bg-black/50 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-out side card */}
      <aside
        className="absolute top-0 right-0 h-full z-40 w-full sm:w-88 md:w-96 glass-card border-l border-ts-border bg-ts-surface1/95 shadow-2xl flex flex-col overflow-hidden transition-transform duration-300"
        role="dialog"
        aria-label={`Cell details for ${cellIdFormatted}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-ts-border bg-ts-surface2/60">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold text-ts-accent px-2 py-0.5 rounded bg-ts-accent/10 border border-ts-accent/25">
                {cellIdFormatted}
              </span>
              <span className="text-xs text-slate-300 font-medium">
                {cell.state || 'Northeast India'}
              </span>
            </div>
            {cell.village || cell.nearest_place ? (
              <div className="mt-1.5 space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs text-amber-300 font-semibold">
                  <LandmarkIcon className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  <span>{cell.village || cell.nearest_place}</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  {[cell.subdivision, cell.district].filter(Boolean).join(' · ')}
                  {cell.pincode ? ` (${cell.pincode})` : ''}
                </div>
              </div>
            ) : null}
            <p className="text-[10.5px] text-slate-500 mt-1 font-mono">
              {cell.latitude.toFixed(4)}°N, {cell.longitude.toFixed(4)}°E
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-ts-surface2 transition-colors cursor-pointer"
            aria-label="Close panel"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">

          {/* Official Administrative Jurisdiction Block */}
          {(cell.full_address || cell.village) && (
            <div className="bg-ts-surface2/80 rounded-xl p-3 border border-ts-border space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider">
                <LandmarkIcon className="w-3 h-3 text-slate-400" />
                <span>Administrative Jurisdiction</span>
              </div>
              <p className="text-xs text-slate-200 leading-snug font-medium">
                {cell.full_address || `${cell.village || cell.nearest_place}, ${cell.district}, ${cell.state}`}
              </p>
              {cell.place_type && (
                <div className="flex items-center gap-1.5 text-[10.5px] text-slate-400">
                  <span className="text-ts-accent">Terrain / Settlement Type:</span>
                  <span>{cell.place_type}</span>
                </div>
              )}
            </div>
          )}

          {/* Susceptibility Block */}
          <div className="bg-ts-surface2/70 rounded-xl p-3.5 border border-ts-border">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Static Susceptibility
              </span>
              <span className="text-sm font-bold text-slate-200 font-mono">
                {susceptibility.toFixed(3)}
              </span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden mb-1.5">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(susceptibility * 100, 100)}%`,
                  backgroundColor: getRiskColor(susceptibility),
                }}
              />
            </div>
            <p className="text-[10px] text-slate-500">
              Derived from 9 physical terrain & soil features (Random Forest v1).
            </p>
          </div>

          {/* Live Rainfall Block */}
          <div className="bg-ts-surface2/70 rounded-xl p-3.5 border border-ts-border">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Rainfall Trigger
              </span>
              {prediction ? (
                <span className={`text-[10px] px-2 py-0.5 rounded font-medium border ${
                  prediction.rainfall.source.includes('live')
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}>
                  ● {prediction.rainfall.source.toUpperCase()}
                </span>
              ) : (
                <span className="text-[10px] text-slate-500">Fetching...</span>
              )}
            </div>

            {loading ? (
              <div className="py-4 flex flex-col items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-ts-accent/20 border-t-ts-accent rounded-full animate-spin" />
                <span className="text-[11px] text-slate-500">Connecting to Open-Meteo pipeline...</span>
              </div>
            ) : prediction ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-ts-surface1/80 rounded-lg p-2 border border-ts-border">
                  <span className="text-[10px] text-slate-400">24 Hours (1d)</span>
                  <p className="text-base font-bold text-slate-200 font-mono mt-0.5">
                    {prediction.rainfall.rainfall_1d} <span className="text-[11px] font-normal text-slate-500">mm</span>
                  </p>
                </div>
                <div className="bg-ts-surface1/80 rounded-lg p-2 border border-ts-border">
                  <span className="text-[10px] text-slate-400">3 Days</span>
                  <p className="text-base font-bold text-slate-200 font-mono mt-0.5">
                    {prediction.rainfall.rainfall_3d} <span className="text-[11px] font-normal text-slate-500">mm</span>
                  </p>
                </div>
                <div className="bg-ts-surface1/80 rounded-lg p-2 border border-ts-border">
                  <span className="text-[10px] text-slate-400">7 Days (Trigger)</span>
                  <p className="text-base font-bold text-ts-accent font-mono mt-0.5">
                    {prediction.rainfall.rainfall_7d} <span className="text-[11px] font-normal text-slate-500">mm</span>
                  </p>
                </div>
                <div className="bg-ts-surface1/80 rounded-lg p-2 border border-ts-border">
                  <span className="text-[10px] text-slate-400">14 Days</span>
                  <p className="text-base font-bold text-slate-200 font-mono mt-0.5">
                    {prediction.rainfall.rainfall_14d} <span className="text-[11px] font-normal text-slate-500">mm</span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-2 text-center text-slate-500">
                Rainfall data not loaded. Click 'Run Prediction' below.
              </div>
            )}

            {prediction?.extreme_rainfall && (
              <div className="mt-3 p-2.5 rounded-lg bg-red-500/15 border border-red-500/35 text-red-300 flex items-start gap-2">
                <AlertTriangleIcon className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                <div className="leading-tight">
                  <span className="font-semibold text-[11px]">Extreme Rainfall Condition (≥ 349.4 mm)</span>
                  <p className="text-[10px] text-red-400/90 mt-0.5">
                    Frozen risk floor (0.67) applied automatically to this cell.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Final Operational Risk Block */}
          <div className="bg-ts-surface2/70 rounded-xl p-3.5 border border-ts-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Final Combined Risk
              </span>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${getRiskBadgeClass(currentLevel)}`}>
                {currentLevel}
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span className={`text-3xl font-extrabold font-mono ${getRiskTextClass(currentRisk)}`}>
                {(currentRisk * 100).toFixed(1)}%
              </span>
              <span className="text-xs text-slate-500">
                (score: {currentRisk.toFixed(3)})
              </span>
            </div>

            <div className="text-[11px] text-slate-400 leading-relaxed border-t border-ts-border pt-2 flex items-start gap-1.5">
              {currentLevel === 'HIGH' && (
                <>
                  <AlertTriangleIcon className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                  <span>Elevated risk of slope failure under current precipitation. Local disaster authority response recommended.</span>
                </>
              )}
              {currentLevel === 'MODERATE' && (
                <>
                  <AlertCircleIcon className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>Moderate alert level. Drainage saturated. Monitor slope movement sensors and local advisories.</span>
                </>
              )}
              {currentLevel === 'LOW' && (
                <>
                  <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Stable condition. Low landslide trigger threshold under current weather parameters.</span>
                </>
              )}
            </div>
          </div>

          {/* Operational Status */}
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-ts-surface2/50 border border-ts-border text-[11px]">
            <span className="text-slate-500">Monitoring Status:</span>
            <span className="font-medium text-emerald-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Active Monitoring
            </span>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-ts-border bg-ts-surface2/80 flex items-center gap-2.5">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex-1 py-2 px-3 rounded-lg bg-ts-accent hover:bg-ts-accent/90 disabled:opacity-50 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-ts-accent/20 cursor-pointer"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Evaluating...</span>
              </>
            ) : (
              <>
                <RefreshIcon className="w-3.5 h-3.5" />
                <span>Run Prediction / Refresh</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}

