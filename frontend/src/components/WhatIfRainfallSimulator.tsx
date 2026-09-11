/**
 * WhatIfRainfallSimulator — Scenario tool for hypothetical rainfall analysis.
 * Uses the SAME frozen risk engine via /api/scenario endpoint.
 * Clearly labeled as SCENARIO, NOT A LIVE PREDICTION.
 */

import { useState, useCallback, useEffect } from 'react';
import type { GridCell, PredictionResult } from '../types';
import { runScenario, type ScenarioResult } from '../api/client';
import { getRiskTextClass } from '../utils/riskHelpers';
import {
  PlayIcon,
  InfoIcon,
  AlertTriangleIcon,
  BarChartIcon,
} from './icons';

interface WhatIfSimulatorProps {
  selectedCell: GridCell | null;
  prediction: PredictionResult | null;
}

export function WhatIfRainfallSimulator({ selectedCell, prediction }: WhatIfSimulatorProps) {
  const currentRainfall7d = prediction?.rainfall?.rainfall_7d ?? 0;
  const [scenarioRainfall, setScenarioRainfall] = useState<number>(Math.round(currentRainfall7d));
  const [scenarioResult, setScenarioResult] = useState<ScenarioResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Automatically update input slider whenever user selects a different cell or prediction loads
  useEffect(() => {
    setScenarioRainfall(Math.round(currentRainfall7d));
    setScenarioResult(null);
    setError(null);
  }, [selectedCell?.cell_id, currentRainfall7d]);

  // Sync slider to current rainfall when reset button is clicked
  const handleReset = useCallback(() => {
    setScenarioRainfall(Math.round(currentRainfall7d));
    setScenarioResult(null);
    setError(null);
  }, [currentRainfall7d]);

  const handleRunScenario = useCallback(async () => {
    if (!selectedCell) return;
    setLoading(true);
    setError(null);
    try {
      const result = await runScenario({
        susceptibility: selectedCell.susceptibility,
        rainfall_7d: scenarioRainfall,
      });
      setScenarioResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scenario calculation failed');
    } finally {
      setLoading(false);
    }
  }, [selectedCell, scenarioRainfall]);

  if (!selectedCell) {
    return (
      <div className="rounded-xl p-5 border border-dashed border-ts-border bg-ts-surface1/40 text-center text-xs text-slate-500">
        Select a grid cell to run What-If rainfall scenarios.
      </div>
    );
  }

  const riskChange = scenarioResult && prediction
    ? scenarioResult.risk_score - prediction.risk_score
    : null;
  const rainfallChange = scenarioRainfall - currentRainfall7d;

  return (
    <div className="rounded-xl border border-ts-border bg-ts-surface1 overflow-hidden shadow-ts-panel">
      {/* Header */}
      <div className="px-4 py-2.5 bg-ts-surface2 border-b border-ts-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30">
            SCENARIO SIMULATOR
          </span>
          <span className="text-xs font-bold text-ts-text">7-Day Rainfall Scenario Analysis</span>
        </div>
        <span className="text-[10px] text-ts-text3 font-mono">Model Reference Trigger: 165.22 mm</span>
      </div>

      <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        {/* Left Column: Inputs & Controls */}
        <div className="space-y-4 flex flex-col justify-between">
          {/* Current values */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-ts-surface2 rounded-lg p-2.5 border border-ts-border">
              <span className="text-[10px] text-ts-text3 block font-medium">Current 7-Day Rainfall</span>
              <span className="text-sm font-bold font-mono text-ts-accent">{currentRainfall7d.toFixed(1)} mm</span>
            </div>
            <div className="bg-ts-surface2 rounded-lg p-2.5 border border-ts-border">
              <span className="text-[10px] text-ts-text3 block font-medium">Baseline Risk Score</span>
              {prediction ? (
                <span className={`text-sm font-bold font-mono ${getRiskTextClass(prediction.risk_score)}`}>
                  {(prediction.risk_score * 100).toFixed(1)}% ({prediction.risk_level})
                </span>
              ) : (
                <span className="text-sm text-ts-text3">—</span>
              )}
            </div>
          </div>

          {/* Rainfall slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-ts-text2 font-medium">Hypothetical 7-Day Rainfall</span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-300 text-xs px-2 py-0.5 rounded bg-ts-surface2 border border-ts-border">
                {scenarioRainfall} mm
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={600}
              step={5}
              value={scenarioRainfall}
              onChange={(e) => {
                setScenarioRainfall(Number(e.target.value));
                setScenarioResult(null);
              }}
              className="w-full cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-[10px] text-ts-text3 font-mono">
              <span>0 mm (Dry)</span>
              <span className="text-amber-600 dark:text-amber-400">Extreme Threshold: 349.4 mm</span>
            </div>
          </div>

          {/* Direct input & action buttons */}
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={1000}
              value={scenarioRainfall}
              onChange={(e) => {
                setScenarioRainfall(Math.max(0, Number(e.target.value)));
                setScenarioResult(null);
              }}
              className="flex-1 bg-ts-surface2 border border-ts-border rounded-lg px-3 py-1.5 text-xs font-mono text-ts-text focus:outline-none focus:border-amber-500"
              placeholder="Enter rainfall (mm)"
            />
            <button
              onClick={handleRunScenario}
              disabled={loading}
              className="px-4 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-700 dark:text-amber-300 text-xs font-bold hover:bg-amber-500/30 transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {loading ? (
                <div className="w-3 h-3 border-2 border-amber-400/20 border-t-amber-400 rounded-full animate-spin" />
              ) : (
                <PlayIcon className="w-3 h-3" />
              )}
              Run Scenario
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-lg bg-ts-surface2 border border-ts-border text-ts-text2 text-xs font-medium hover:text-ts-text hover:bg-ts-surface2/80 transition-colors cursor-pointer"
            >
              Reset
            </button>
          </div>

          {/* Scientific Disclaimer Note */}
          <p className="text-[11px] text-ts-text3 leading-relaxed bg-ts-surface2/60 p-2 rounded border border-ts-border flex items-start gap-1.5">
            <InfoIcon className="w-3.5 h-3.5 shrink-0 text-ts-text3 mt-0.5" />
            <span><strong>Model Behavior Note:</strong> TerraSense v1 uses the 7-day cumulative rainfall trigger in its risk calculation. Short-duration rainfall intensity is not currently an independent model input.</span>
          </p>

          {/* Error */}
          {error && (
            <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/25 text-xs text-red-500 dark:text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Right Column: Scenario Results (Side-by-Side) */}
        <div className="bg-ts-surface2 rounded-xl border border-ts-border p-3.5 flex flex-col justify-between">
          {scenarioResult ? (
            <div className="space-y-3 my-auto">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-ts-text2 uppercase font-bold tracking-wider">Scenario Projection Result</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 font-bold">
                  PROJECTED SCENARIO
                </span>
              </div>

              {/* Comparison */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                {/* Current */}
                <div className="bg-ts-surface1 rounded-lg p-2.5 border border-ts-border">
                  <span className="text-[10px] text-ts-text3 block mb-1 font-medium">Baseline Risk</span>
                  <span className={`text-lg font-black font-mono ${prediction ? getRiskTextClass(prediction.risk_score) : 'text-ts-text3'}`}>
                    {prediction ? `${(prediction.risk_score * 100).toFixed(1)}%` : '—'}
                  </span>
                  {prediction && (
                    <span className={`text-[10px] block mt-0.5 font-bold ${getRiskTextClass(prediction.risk_score)}`}>
                      {prediction.risk_level}
                    </span>
                  )}
                </div>

                {/* Delta / Shift */}
                <div className="flex items-center justify-center">
                  <div className="text-center">
                    <span className="text-lg text-ts-text3">→</span>
                    {rainfallChange !== 0 && (
                      <div className={`text-[10px] font-mono font-bold ${rainfallChange > 0 ? 'text-red-500 dark:text-red-400' : 'text-emerald-500 dark:text-emerald-400'}`}>
                        {rainfallChange > 0 ? '+' : ''}{rainfallChange.toFixed(0)} mm
                      </div>
                    )}
                    {riskChange !== null && riskChange !== 0 && (
                      <div className={`text-[10px] font-mono font-bold ${riskChange > 0 ? 'text-red-500 dark:text-red-400' : 'text-emerald-500 dark:text-emerald-400'}`}>
                        {riskChange > 0 ? '+' : ''}{(riskChange * 100).toFixed(1)}%
                      </div>
                    )}
                  </div>
                </div>

                {/* Scenario */}
                <div className="bg-ts-surface1 rounded-lg p-2.5 border border-amber-500/30">
                  <span className="text-[10px] text-amber-600 dark:text-amber-300 block mb-1 font-medium">Scenario Risk</span>
                  <span className={`text-lg font-black font-mono ${getRiskTextClass(scenarioResult.risk_score)}`}>
                    {(scenarioResult.risk_score * 100).toFixed(1)}%
                  </span>
                  <span className={`text-[10px] block mt-0.5 font-bold ${getRiskTextClass(scenarioResult.risk_score)}`}>
                    {scenarioResult.risk_level}
                  </span>
                </div>
              </div>

              {/* Extreme rainfall warning */}
              {scenarioResult.extreme_rainfall ? (
                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-700 dark:text-red-200 flex items-start gap-1.5">
                  <AlertTriangleIcon className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Extreme Rainfall Floor Enforced (≥ 349.4 mm)</span>
                    <span className="block mt-0.5 text-[11px] text-red-600 dark:text-red-300">
                      Model enforces minimum risk score floor of 0.67 (HIGH hazard classification).
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-ts-surface1 border border-ts-border text-[11px] text-ts-text2 flex items-center justify-between">
                  <span>Rainfall Trigger Ratio (vs 165.22 mm reference):</span>
                  <span className="font-mono font-bold text-ts-accent">
                    {(scenarioRainfall / 165.22).toFixed(3)}×
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center text-ts-text3 space-y-1.5 my-auto">
              <BarChartIcon className="w-8 h-8 mx-auto text-ts-text3/50 block mb-1" />
              <p className="text-xs font-semibold text-ts-text">Scenario Output Panel</p>
              <p className="text-[11px] text-ts-text3 max-w-xs mx-auto">
                Adjust the 7-day rainfall scenario on the left and click <strong>Run Scenario</strong>. Projected risk and comparison will appear here.
              </p>
            </div>
          )}

          {/* Planned / Future Research note */}
          <div className="pt-2.5 mt-2 border-t border-ts-border text-[10px] text-ts-text3 flex items-center justify-between">
            <span>Planned / Future Research:</span>
            <span className="text-ts-text3">Peak hourly intensity · Antecedent soil moisture · Duration</span>
          </div>
        </div>
      </div>
    </div>
  );
}
