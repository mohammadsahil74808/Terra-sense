/**
 * ModelInfoCard — Displays frozen ML model architecture, safe metadata,
 * feature list, and frozen risk configuration for transparency.
 */

import type { ModelInfo } from '../types';

interface ModelInfoProps {
  info: ModelInfo | null;
  loading: boolean;
}

export function ModelInfoCard({ info, loading }: ModelInfoProps) {
  if (loading || !info) {
    return (
      <div className="rounded-2xl p-6 border border-ts-border bg-ts-surface1 shadow-ts-panel text-center text-xs text-ts-text3">
        Loading model architecture details...
      </div>
    );
  }

  const features = info.features || [
    'lulc_dominant_percentage',
    'clay_0_30_pct',
    'sand_0_30_pct',
    'bulk_density_0_30_kg_dm3',
    'distance_to_river_km',
    'distance_to_road_km',
    'elevation',
    'slope',
    'lulc_class',
  ];

  return (
    <section className="rounded-2xl p-6 border border-ts-border bg-ts-surface1 shadow-ts-panel space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ts-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-ts-text">
              {info.model} — Production Architecture
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-ts-accent/15 text-ts-accent border border-ts-accent/30">
              {info.status}
            </span>
          </div>
          <p className="text-xs text-ts-text3 mt-1">
            Random Forest Classifier for Northeast India Terrain Susceptibility (Inference-Only)
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-ts-surface2 border border-ts-border">
            <span className="text-ts-text3">Features: </span>
            <span className="text-ts-accent font-bold">{info.feature_count}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-ts-surface2 border border-ts-border">
            <span className="text-ts-text3">Grid Cells: </span>
            <span className="text-emerald-500 dark:text-emerald-400 font-bold">{info.grid_cells}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
        {/* 9 Features */}
        <div className="bg-ts-surface2/70 rounded-xl p-4 border border-ts-border">
          <h3 className="text-[11px] font-bold text-ts-text uppercase tracking-wider mb-2.5">
            Static Terrain & Soil Feature Vector ({features.length})
          </h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 font-mono text-[11px] text-ts-text2">
            {features.map((feat, idx) => (
              <li key={feat} className="flex items-center gap-1.5 py-1 px-2 rounded bg-ts-surface1 border border-ts-border">
                <span className="text-ts-accent text-[10px] font-bold">{idx + 1}.</span>
                <span className="truncate">{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Frozen Risk Configuration */}
        <div className="bg-ts-surface2/70 rounded-xl p-4 border border-ts-border">
          <h3 className="text-[11px] font-bold text-ts-text uppercase tracking-wider mb-2.5">
            Frozen Operational Thresholds
          </h3>
          <div className="space-y-2 font-mono text-[11px]">
            <div className="flex justify-between py-1 border-b border-ts-border">
              <span className="text-ts-text3">Rainfall Scale (7-day):</span>
              <span className="text-ts-text font-bold">165.22 mm</span>
            </div>
            <div className="flex justify-between py-1 border-b border-ts-border">
              <span className="text-ts-text3">Extreme Rainfall p95 Floor:</span>
              <span className="text-red-500 dark:text-red-400 font-bold">349.392 mm</span>
            </div>
            <div className="flex justify-between py-1 border-b border-ts-border">
              <span className="text-ts-text3">Extreme Risk Floor:</span>
              <span className="text-red-500 dark:text-red-400 font-bold">0.67 (67%)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-ts-border">
              <span className="text-ts-text3">Low Risk Limit:</span>
              <span className="text-emerald-500 dark:text-emerald-400 font-bold">&lt; 0.33 (33%)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-ts-text3">High Risk Limit:</span>
              <span className="text-amber-500 dark:text-amber-400 font-bold">≥ 0.66 (66%)</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
