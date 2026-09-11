/**
 * RainfallIntelligence — Real live precipitation & weather intelligence.
 * Displays current weather condition, rainfall windows, and real rainfall hotspots.
 * Directly backed by Open-Meteo batch weather data.
 */

import { useState, useEffect } from 'react';
import type { PredictionResult, RainfallHotspot } from '../types';
import { fetchWeatherHotspots } from '../api/client';
import { CloudRainIcon } from './icons';

interface RainfallIntelligenceProps {
  prediction: PredictionResult | null;
  predictionLoading: boolean;
  lastUpdated: string | null;
}

function RainfallBar({ label, value, maxValue, accent }: {
  label: string;
  value: number;
  maxValue: number;
  accent: boolean;
}) {
  const pct = maxValue > 0 ? Math.min((value / maxValue) * 100, 100) : 0;
  return (
    <div className="group relative">
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className={accent ? 'text-ts-accent font-bold' : 'text-ts-text3 font-medium'}>{label}</span>
        <span className={`font-mono font-bold ${accent ? 'text-ts-accent' : 'text-ts-text'}`}>
          {value.toFixed(1)} mm
        </span>
      </div>
      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${accent ? 'bg-ts-accent' : 'bg-slate-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function RainfallIntelligence({ prediction, predictionLoading, lastUpdated }: RainfallIntelligenceProps) {
  const [hotspots, setHotspots] = useState<RainfallHotspot[]>([]);

  useEffect(() => {
    fetchWeatherHotspots()
      .then((data) => setHotspots(data))
      .catch(() => {});
  }, []);

  if (predictionLoading) {
    return (
      <div className="rounded-xl p-5 border border-ts-border bg-ts-surface1 h-full flex items-center justify-center">
        <div className="flex items-center justify-center gap-2 py-6">
          <div className="w-4 h-4 border-2 border-ts-accent/20 border-t-ts-accent rounded-full animate-spin" />
          <span className="text-xs text-slate-400">Fetching live weather data from Open-Meteo...</span>
        </div>
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="rounded-xl p-5 border border-dashed border-ts-border bg-ts-surface1/40 text-center h-full flex flex-col items-center justify-center">
        <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Weather Intelligence Standby</p>
        <p className="text-[11px] text-slate-400 mt-1">Select any cell on the map to inspect live rainfall & weather metrics.</p>
      </div>
    );
  }

  const { rainfall } = prediction;
  const maxVal = Math.max(rainfall.rainfall_1d, rainfall.rainfall_3d, rainfall.rainfall_7d, rainfall.rainfall_14d, 1);

  return (
    <div className="rounded-xl p-4 border border-ts-border bg-ts-surface1 space-y-3.5 flex flex-col justify-between h-full shadow-ts-panel">
      {/* Header with status badges */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
            LIVE WEATHER
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-ts-surface2 text-ts-text3 border border-ts-border">
            Open-Meteo Model
          </span>
        </div>
        {lastUpdated && (
          <span className="text-[10px] text-ts-text3 font-mono">
            Updated: {lastUpdated}
          </span>
        )}
      </div>

      {/* Cumulative precipitation bars */}
      <div className="space-y-2">
        <RainfallBar label="24-Hour Accumulation" value={rainfall.rainfall_1d} maxValue={maxVal} accent={false} />
        <RainfallBar label="3-Day Accumulation" value={rainfall.rainfall_3d} maxValue={maxVal} accent={false} />
        <RainfallBar label="7-Day Cumulative (Model Trigger)" value={rainfall.rainfall_7d} maxValue={maxVal} accent={true} />
        <RainfallBar label="14-Day Baseline" value={rainfall.rainfall_14d} maxValue={maxVal} accent={false} />
      </div>

      {/* Model Trigger Reference Context */}
      <div className="p-2.5 rounded-lg bg-ts-surface2 border border-ts-border text-[11px] text-ts-text2 space-y-1">
        <div className="flex items-center justify-between font-mono">
          <span className="text-ts-text3">7-Day Rainfall Trigger Reference:</span>
          <span className="text-ts-accent font-bold">165.22 mm</span>
        </div>
        <p className="text-[10px] text-ts-text3 leading-snug">
          Reference value used by the current TerraSense v1 risk engine. (Extreme rainfall floor at 349.39 mm).
        </p>
      </div>

      {/* Quick insight row */}
      <div className="pt-2 border-t border-ts-border">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-ts-surface2 rounded-lg p-2 border border-ts-border shadow-ts-panel">
            <span className="text-[10px] text-ts-text3 block font-medium">Daily Avg</span>
            <span className="text-xs font-bold font-mono text-ts-text">
              {(rainfall.rainfall_7d / 7).toFixed(1)} mm
            </span>
          </div>
          <div className="bg-ts-surface2 rounded-lg p-2 border border-ts-border shadow-ts-panel">
            <span className="text-[10px] text-ts-text3 block font-medium">7d Intensity</span>
            <span className={`text-xs font-bold font-mono ${
              rainfall.rainfall_7d >= 349.39 ? 'text-red-500 dark:text-red-400' : rainfall.rainfall_7d >= 165 ? 'text-amber-500 dark:text-amber-400' : 'text-emerald-500 dark:text-emerald-400'
            }`}>
              {rainfall.rainfall_7d >= 349.39 ? 'EXTREME' : rainfall.rainfall_7d >= 165 ? 'HIGH' : 'NORMAL'}
            </span>
          </div>
          <div className="bg-ts-surface2 rounded-lg p-2 border border-ts-border shadow-ts-panel">
            <span className="text-[10px] text-ts-text3 block font-medium">Extreme Floor</span>
            <span className={`text-xs font-bold font-mono ${prediction.extreme_rainfall ? 'text-red-500 dark:text-red-400' : 'text-emerald-500 dark:text-emerald-400'}`}>
              {prediction.extreme_rainfall ? 'ACTIVE (0.67)' : 'INACTIVE'}
            </span>
          </div>
        </div>
      </div>

      {/* Real Top Rainfall Hotspots across Northeast India */}
      {hotspots.length > 0 && (
        <div className="pt-2 border-t border-ts-border">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-ts-text uppercase tracking-wider flex items-center gap-1.5">
              <CloudRainIcon className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 shrink-0" />
              <span>Regional Rain Activity (Open-Meteo)</span>
            </span>
            <span className="text-[9px] text-ts-accent font-mono font-medium">Top Precipitation</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {hotspots.slice(0, 3).map((h, i) => (
              <div key={h.state} className="bg-ts-surface2 p-1.5 rounded-lg border border-ts-border text-[10px]">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-ts-text truncate">{i + 1}. {h.state}</span>
                  {h.is_raining && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" title="Precipitation active" />}
                </div>
                <div className="text-ts-accent font-mono font-bold mt-0.5">
                  {h.max_rainfall_mmh.toFixed(1)} mm/h peak
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

