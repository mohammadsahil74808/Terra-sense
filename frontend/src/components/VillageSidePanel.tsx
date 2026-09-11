/**
 * VillageSidePanel — slide-in detail panel on map marker click.
 * Shows village terrain data, risk score, and a severity indicator.
 */

import type { Village } from '../types';
import { getRiskBadgeClass, getRiskColor, getRiskTextClass } from '../utils/riskHelpers';
import { AlertTriangleIcon, AlertCircleIcon, CheckCircleIcon, XIcon } from './icons';

interface VillageSidePanelProps {
  village: Village | null;
  onClose: () => void;
}

interface DataRowProps {
  label: string;
  value: string | number;
  unit?: string;
}

function DataRow({ label, value, unit }: DataRowProps) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-ts-border/60 last:border-0">
      <span className="text-xs text-ts-text3">{label}</span>
      <span className="text-xs font-medium text-ts-text font-mono">
        {value}{unit && <span className="text-ts-text3 ml-0.5 font-sans">{unit}</span>}
      </span>
    </div>
  );
}

export function VillageSidePanel({ village, onClose }: VillageSidePanelProps) {
  const visible = village !== null;

  return (
    <>
      {/* Backdrop on mobile */}
      {visible && (
        <div
          className="absolute inset-0 z-10 lg:hidden bg-black/40"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <div
        className={`
          absolute top-0 right-0 h-full z-20
          w-72 bg-ts-surface1 border-l border-ts-border
          transition-transform duration-300 ease-out
          ${visible ? 'translate-x-0' : 'translate-x-full'}
          flex flex-col shadow-2xl
        `}
        role="dialog"
        aria-modal="true"
        aria-label={village ? `${village.name} risk details` : 'Village details'}
      >
        {village && (
          <>
            {/* Panel header */}
            <div className="flex items-start justify-between p-4 border-b border-ts-border">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-ts-text truncate pr-2">
                  {village.name}
                </h3>
                <p className="text-[11px] text-ts-text3 mt-0.5">
                  {village.lat.toFixed(4)}°N, {village.lon.toFixed(4)}°E
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-6 h-6 flex items-center justify-center rounded text-ts-text3 hover:text-ts-text hover:bg-ts-surface2 transition-colors flex-shrink-0 cursor-pointer"
                aria-label="Close village detail panel"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Risk score hero */}
            <div className="px-4 py-4 border-b border-ts-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-ts-text3 uppercase tracking-widest">Risk Score</span>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getRiskBadgeClass(village.risk_level)}`}
                >
                  {village.risk_level}
                </span>
              </div>

              {/* Score bar */}
              <div className="mb-1">
                <div className="h-2 bg-ts-surface2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${village.risk_score * 100}%`,
                      backgroundColor: getRiskColor(village.risk_score),
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] text-ts-text3">0%</span>
                <span className={`text-2xl font-bold tabular-nums ${getRiskTextClass(village.risk_score)}`}>
                  {(village.risk_score * 100).toFixed(1)}%
                </span>
                <span className="text-[10px] text-ts-text3">100%</span>
              </div>
            </div>

            {/* Feature breakdown */}
            <div className="flex-1 overflow-y-auto px-4 py-2">
              <p className="text-[10px] font-semibold text-ts-text3 uppercase tracking-wider mb-1 pt-2">
                Terrain & Rainfall Features
              </p>
              <DataRow label="Elevation" value={village.elevation.toFixed(0)} unit=" m" />
              <DataRow label="Slope" value={village.slope_degrees.toFixed(1)} unit="°" />
              <DataRow label="Max 24h Rain" value={village.max_24h_rain.toFixed(1)} unit=" mm" />
              <DataRow label="Total Monsoon" value={village.total_monsoon_rain.toFixed(0)} unit=" mm" />
              <DataRow
                label="Binary Threshold"
                value={village.landslide_risk_label === 1 ? 'Landslide' : 'No Landslide'}
              />
            </div>

            {/* Recommendation footer */}
            <div className={`mx-4 mb-4 p-3 rounded-lg text-xs leading-snug flex items-start gap-2
              ${village.risk_level === 'HIGH'
                ? 'bg-red-500/10 border border-red-500/25 text-red-300'
                : village.risk_level === 'MODERATE'
                ? 'bg-amber-500/10 border border-amber-500/25 text-amber-300'
                : 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-300'
              }`}
            >
              {village.risk_level === 'HIGH' && (
                <>
                  <AlertTriangleIcon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>High probability of slope failure. Immediate monitoring required.</span>
                </>
              )}
              {village.risk_level === 'MODERATE' && (
                <>
                  <AlertCircleIcon className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>Elevated risk. Monitor rainfall and evacuate if conditions worsen.</span>
                </>
              )}
              {village.risk_level === 'LOW' && (
                <>
                  <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Conditions stable. Continue routine monitoring.</span>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
