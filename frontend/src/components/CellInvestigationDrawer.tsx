/**
 * CellInvestigationDrawer — Full cell investigation panel/drawer.
 * Shows all available backend data for a selected cell: identity, terrain,
 * rainfall, risk assessment, and advisory. No dummy data.
 */

import type { GridCell, PredictionResult } from '../types';
import { getRiskColor, getRiskTextClass } from '../utils/riskHelpers';
import {
  SearchIcon,
  XIcon,
  AlertTriangleIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  MapPinIcon,
  RefreshIcon,
  FileTextIcon,
} from './icons';

interface CellInvestigationDrawerProps {
  cell: GridCell | null;
  prediction: PredictionResult | null;
  predictionLoading: boolean;
  open: boolean;
  onClose: () => void;
  onViewOnMap: () => void;
  onRefresh: () => void;
  onReportCondition?: () => void;
}

export function CellInvestigationDrawer({
  cell,
  prediction,
  predictionLoading,
  open,
  onClose,
  onViewOnMap,
  onRefresh,
  onReportCondition,
}: CellInvestigationDrawerProps) {
  if (!open || !cell) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true">
      {/* Backdrop — High z-index ensures map and page sit cleanly in the background */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Centered Modal Dialog */}
      <div className="relative w-full max-w-xl bg-ts-surface1 border border-ts-border rounded-2xl shadow-ts-panel overflow-hidden my-auto max-h-[90vh] flex flex-col animate-fade-in-up z-10">
        {/* Header */}
        <div className="bg-ts-surface1 border-b border-ts-border px-5 py-3.5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-ts-accent/15 border border-ts-accent/30 flex items-center justify-center">
              <SearchIcon className="w-4 h-4 text-ts-accent" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-ts-text uppercase tracking-wider">
                  Cell Investigation
                </h3>
                <span className="text-xs font-mono font-bold text-ts-accent px-2 py-0.5 rounded bg-ts-accent/10 border border-ts-accent/30">
                  NE_{cell.cell_id.toString().padStart(4, '0')}
                </span>
              </div>
              <p className="text-[11px] text-ts-text3">
                In-depth terrain, rainfall trigger, and operational hazard telemetry
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-ts-surface2 hover:bg-ts-surface2/80 text-ts-text3 hover:text-ts-text transition-colors cursor-pointer"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">

          {/* ═══ 1. Official Administrative Jurisdiction ═══ */}
          <section>
            <SectionLabel text="Official Administrative Jurisdiction" />
            <div className="grid grid-cols-2 gap-2">
              <InfoField label="Cell ID" value={`NE_${cell.cell_id.toString().padStart(4, '0')}`} />
              <InfoField label="Village / Settlement" value={cell.village || cell.nearest_place || 'Mountain Sector'} />
              <InfoField label="Sub-Division / Block" value={cell.subdivision || 'Sub-Division'} />
              <InfoField label="District" value={cell.district || 'District'} />
              <InfoField label="State & PIN" value={`${cell.state || 'NE India'}${cell.pincode ? ` - ${cell.pincode}` : ''}`} />
              {cell.place_type && (
                <InfoField label="Terrain / Category" value={cell.place_type} />
              )}
              <InfoField label="Latitude" value={`${cell.latitude.toFixed(4)}°N`} mono />
              <InfoField label="Longitude" value={`${cell.longitude.toFixed(4)}°E`} mono />
            </div>
            {cell.full_address && (
              <div className="mt-2 p-2.5 rounded-lg bg-ts-surface2 border border-ts-border text-[11px] text-ts-text2">
                <span className="text-ts-text3 font-semibold block text-[10px] uppercase tracking-wider mb-0.5">Official Administrative Address</span>
                {cell.full_address}
              </div>
            )}
          </section>

          {/* ═══ 2. Terrain Susceptibility ═══ */}
          <section>
            <SectionLabel text="Terrain Susceptibility" />
            <div className="bg-ts-surface2 rounded-xl p-3.5 border border-ts-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-ts-text3">Static Score</span>
                <span className="text-lg font-black font-mono text-ts-text">
                  {(cell.susceptibility * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-2 w-full bg-ts-surface1 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(cell.susceptibility * 100, 100)}%`,
                    backgroundColor: getRiskColor(cell.susceptibility),
                  }}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-[10px] text-ts-text3 font-mono">
                <span>0%</span>
                <span>33% LOW</span>
                <span>66% HIGH</span>         <span>66% HIGH</span>
                <span>100%</span>
              </div>
            </div>
          </section>

          {/* ═══ 3. Operational Risk Calculation Pipeline ═══ */}
          <section>
            <SectionLabel text="Risk Calculation Pipeline (v1 Frozen Logic)" />
            {predictionLoading ? (
              <LoadingPlaceholder text="Evaluating risk with live rainfall pipeline..." />
            ) : prediction ? (
              <div className="space-y-3">
                {/* 4-Step Pipeline Flow */}
                <div className="bg-ts-surface2 p-3 rounded-xl border border-ts-border space-y-2 font-mono text-[11px]">
                  <div className="flex items-center justify-between py-1 border-b border-ts-border/60">
                    <span className="text-ts-text3">1. Static Terrain Susceptibility (Random Forest):</span>
                    <span className="text-ts-text font-bold">{(cell.susceptibility * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-ts-border/60">
                    <span className="text-ts-text3">2. Rainfall Trigger (7d / 165.22 mm reference):</span>
                    <span className="text-ts-accent font-bold">{(prediction.rainfall.rainfall_7d / 165.22).toFixed(3)}×</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-ts-border/60">
                    <span className="text-ts-text3">3. Combined Product (Susceptibility × Trigger):</span>
                    <span className="text-ts-text font-bold">{((cell.susceptibility * (prediction.rainfall.rainfall_7d / 165.22)) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-ts-text3">4. Final Risk Score (Clipped [0-1] &amp; Floor Rules):</span>
                    <span className={`font-bold text-sm ${getRiskTextClass(prediction.risk_score)}`}>
                      {(prediction.risk_score * 100).toFixed(1)}% ({prediction.risk_level})
                    </span>
                  </div>
                </div>

                {/* Status Callout */}
                <div className="grid grid-cols-2 gap-2">
                  <InfoField
                    label="Extreme Rainfall Floor"
                    value={prediction.extreme_rainfall ? 'ENFORCED (≥349.4mm → min 0.67)' : 'NOT TRIGGERED'}
                    color={prediction.extreme_rainfall ? 'text-red-500 dark:text-red-400' : 'text-emerald-500 dark:text-emerald-400'}
                  />
                  <InfoField label="Operational Hazard Level" value={`${prediction.risk_level}`} color={getRiskTextClass(prediction.risk_score)} />
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-ts-text3">
                Risk data pending. Loading...
              </div>
            )}
          </section>

          {/* ═══ 4. Frozen ML Feature Vector (9 Production Features) ═══ */}
          <section>
            <SectionLabel text="Frozen ML Features (Random Forest 500 Trees)" />
            <div className="bg-ts-surface2 p-3 rounded-xl border border-ts-border">
              <p className="text-[10px] text-ts-text3 mb-2 leading-tight">
                Evaluated by the frozen Stage 1 model to generate the static susceptibility score:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 font-mono text-[10px] text-ts-text2">
                {[
                  { name: 'lulc_dominant_percentage', desc: 'Land cover dominant %' },
                  { name: 'clay_0_30_pct', desc: 'Clay content (0-30 cm)' },
                  { name: 'sand_0_30_pct', desc: 'Sand content (0-30 cm)' },
                  { name: 'bulk_density_0_30_kg_dm3', desc: 'Soil bulk density (0-30 cm)' },
                  { name: 'distance_to_river_km', desc: 'Distance to river network' },
                  { name: 'distance_to_road_km', desc: 'Distance to road corridor' },
                  { name: 'elevation', desc: 'Digital elevation model' },
                  { name: 'slope', desc: 'Terrain slope angle' },
                  { name: 'lulc_class', desc: 'Land cover category code' },
                ].map((feat, idx) => (
                  <div key={feat.name} className="p-1.5 rounded bg-ts-surface1 border border-ts-border flex items-center justify-between">
                    <span className="text-ts-accent font-bold">{idx + 1}. {feat.name}</span>
                    <span className="text-ts-text3 text-[9px]">{feat.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ═══ 4. Rainfall Intelligence ═══ */}
          <section>
            <SectionLabel text="Rainfall Intelligence" />
            {predictionLoading ? (
              <LoadingPlaceholder text="Fetching rainfall from Open-Meteo..." />
            ) : prediction ? (
              <div className="space-y-2">
                {/* Source info */}
                <div className="flex items-center justify-between text-[10px] mb-2">
                  <span className="text-ts-text3">Source: {prediction.rainfall.source.toUpperCase()}</span>
                  <span className="text-ts-text3 font-mono">
                    {new Date(prediction.rainfall.timestamp).toLocaleString()}
                  </span>
                </div>

                {/* Rainfall period bars */}
                {[
                  { label: '24-Hour', value: prediction.rainfall.rainfall_1d, key: false },
                  { label: '3-Day', value: prediction.rainfall.rainfall_3d, key: false },
                  { label: '7-Day', value: prediction.rainfall.rainfall_7d, key: true },
                  { label: '14-Day', value: prediction.rainfall.rainfall_14d, key: false },
                ].map((r) => {
                  const max = Math.max(prediction.rainfall.rainfall_14d, 1);
                  const pct = Math.min((r.value / max) * 100, 100);
                  return (
                    <div key={r.label}>
                      <div className="flex items-center justify-between text-[11px] mb-0.5">
                        <span className={r.key ? 'text-ts-accent font-bold' : 'text-ts-text3'}>{r.label}</span>
                        <span className={`font-mono font-bold ${r.key ? 'text-ts-accent' : 'text-ts-text'}`}>
                          {r.value.toFixed(1)} mm
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-ts-surface1 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${r.key ? 'bg-ts-accent' : 'bg-ts-border'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-ts-text3">
                Rainfall data unavailable for this cell.
              </div>
            )}
          </section>

          {/* ═══ 5. Advisory ═══ */}
          {prediction && (
            <section>
              <SectionLabel text="Operational Advisory" />
              <div className={`p-3 rounded-xl border text-xs leading-relaxed ${
                prediction.risk_level === 'HIGH'
                  ? 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300'
                  : prediction.risk_level === 'MODERATE'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              }`}>
                <p className="font-semibold mb-1 flex items-center gap-1.5">
                  {prediction.risk_level === 'HIGH' ? (
                    <>
                      <AlertTriangleIcon className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
                      <span>High Hazard Advisory</span>
                    </>
                  ) : prediction.risk_level === 'MODERATE' ? (
                    <>
                      <AlertCircleIcon className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                      <span>Moderate Advisory</span>
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                      <span>Normal Baseline</span>
                    </>
                  )}
                </p>
                <p className="text-[11px] opacity-90">
                  {prediction.risk_level === 'HIGH'
                    ? 'Excess cumulative precipitation exceeds critical threshold. Recommend heightened slope inspection and local evacuation protocols.'
                    : prediction.risk_level === 'MODERATE'
                    ? 'Precipitation is accumulating on moderate-susceptibility terrain. Monitor regional drainage channels and weather bulletins.'
                    : 'Terrain susceptibility and live rainfall remain within safe baseline thresholds.'}
                </p>
              </div>
            </section>
          )}

        </div>

        {/* ═══ Footer Actions ═══ */}
        <div className="bg-ts-surface1 border-t border-ts-border px-5 py-3 flex items-center justify-between gap-2 flex-shrink-0 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onViewOnMap();
              }}
              className="px-3 py-1.5 rounded-lg bg-ts-accent/10 border border-ts-accent/25 text-ts-accent text-xs font-semibold hover:bg-ts-accent/20 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <MapPinIcon className="w-3.5 h-3.5" />
              <span>View On Map</span>
            </button>
            <button
              onClick={onRefresh}
              disabled={predictionLoading}
              className="px-3 py-1.5 rounded-lg bg-ts-surface2 border border-ts-border text-ts-text2 text-xs font-semibold hover:bg-ts-surface2/80 transition-colors flex items-center gap-1 disabled:opacity-50 cursor-pointer"
            >
              <RefreshIcon className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>
          {onReportCondition && (
            <button
              onClick={() => {
                onClose();
                onReportCondition();
              }}
              className="px-3 py-1.5 rounded-lg bg-ts-surface2 border border-ts-border text-ts-text hover:bg-ts-surface2/80 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FileTextIcon className="w-3.5 h-3.5 text-ts-accent" />
              <span>Report Condition</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Internal helper components ──────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <div className="w-0.5 h-3 rounded-full bg-ts-accent/60" />
      <span className="text-[10px] font-bold uppercase tracking-wider text-ts-text3">{text}</span>
      <div className="flex-1 h-px bg-ts-border/60" />
    </div>
  );
}

function InfoField({ label, value, mono, color }: {
  label: string;
  value: string;
  mono?: boolean;
  color?: string;
}) {
  return (
    <div className="bg-ts-surface2 rounded-lg p-2.5 border border-ts-border">
      <span className="text-[10px] text-ts-text3 block">{label}</span>
      <span className={`text-xs font-bold ${mono ? 'font-mono' : ''} ${color || 'text-ts-text'}`}>
        {value}
      </span>
    </div>
  );
}

function LoadingPlaceholder({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-5">
      <div className="w-4 h-4 border-2 border-ts-accent/20 border-t-ts-accent rounded-full animate-spin" />
      <span className="text-xs text-ts-text3">{text}</span>
    </div>
  );
}

