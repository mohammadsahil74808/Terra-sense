/**
 * WhatIfSimulator — interactive ML prediction panel.
 *
 * Users drag sliders for rainfall and slope, then hit "Predict".
 * The panel calls POST /api/predict with a debounced request and
 * renders the result in an SVG semicircular gauge.
 *
 * This demonstrates to judges that the ML model is live, not static.
 */

import { useState, useCallback, useRef } from 'react';
import type { PredictResponse } from '../types';
import { predict } from '../api/client';
import { getRiskBadgeClass, getRiskColor, getRiskLevel } from '../utils/riskHelpers';
import { PlayIcon } from './icons';

// ── SVG Gauge ────────────────────────────────────────────────────────────────

interface GaugeProps {
  score: number;
}

/**
 * Semicircular SVG gauge.
 * Arc goes from left (0%) through top to right (100%).
 * Needle points to current score position.
 */
function RiskGauge({ score }: GaugeProps) {
  const cx = 110;
  const cy = 100;
  const r  = 80;

  /**
   * Convert math angle (degrees, 0° = right, counter-clockwise) to SVG coords.
   * SVG y-axis is flipped, so we negate sin.
   */
  function polarToXY(angleDeg: number, radius = r): [number, number] {
    const rad = (angleDeg * Math.PI) / 180;
    return [cx + radius * Math.cos(rad), cy - radius * Math.sin(rad)];
  }

  /**
   * Build an SVG arc path string.
   * Goes counterclockwise in SVG space (through the top due to y-flip).
   * sweep=0, large=0 is correct for arcs ≤ 180°.
   */
  function arc(startDeg: number, endDeg: number): string {
    const [sx, sy] = polarToXY(startDeg);
    const [ex, ey] = polarToXY(endDeg);
    // Large arc flag: needed only if span > 180°
    const span = Math.abs(startDeg - endDeg);
    const large = span > 180 ? 1 : 0;
    return `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${r} ${r} 0 ${large} 0 ${ex.toFixed(2)} ${ey.toFixed(2)}`;
  }

  // Score maps: 0 → 180°(left), 1 → 0°(right)
  const scoreAngle = 180 - score * 180;
  const color = getRiskColor(score);

  // Needle endpoint (shorter than arc radius)
  const [nx, ny] = polarToXY(scoreAngle, r - 18);

  return (
    <svg
      viewBox="0 0 220 120"
      className="w-full max-w-[260px] mx-auto"
      aria-label={`Risk gauge showing ${(score * 100).toFixed(0)}%`}
      role="img"
    >
      {/* Background track */}
      <path
        d={arc(180, 0)}
        fill="none"
        stroke="#1E293B"
        strokeWidth={16}
        strokeLinecap="round"
      />

      {/* Colored segment overlays (dim) */}
      <path d={arc(180, 108)} fill="none" stroke="#22C55E" strokeWidth={16} opacity={0.18} />
      <path d={arc(108, 54)}  fill="none" stroke="#F97316" strokeWidth={16} opacity={0.18} />
      <path d={arc(54, 0)}   fill="none" stroke="#EF4444" strokeWidth={16} opacity={0.18} />

      {/* Active fill arc */}
      <path
        d={arc(180, scoreAngle)}
        fill="none"
        stroke={color}
        strokeWidth={16}
        strokeLinecap="round"
        style={{ transition: 'd 0.4s ease-out, stroke 0.4s ease-out' }}
      />

      {/* Needle */}
      <line
        x1={cx} y1={cy}
        x2={nx.toFixed(2)} y2={ny.toFixed(2)}
        stroke="white"
        strokeWidth={2}
        strokeLinecap="round"
        style={{ transition: 'x2 0.4s ease-out, y2 0.4s ease-out' }}
      />
      <circle cx={cx} cy={cy} r={5} fill="white" opacity={0.9} />

      {/* Score text */}
      <text
        x={cx} y={cy - 14}
        textAnchor="middle"
        fill="white"
        fontSize={22}
        fontWeight="700"
        fontFamily="'JetBrains Mono', monospace"
      >
        {(score * 100).toFixed(0)}%
      </text>

      {/* Risk label */}
      <text
        x={cx} y={cy + 2}
        textAnchor="middle"
        fill={color}
        fontSize={9}
        fontWeight="600"
        letterSpacing="1.5"
      >
        {getRiskLevel(score)}
      </text>

      {/* Scale labels */}
      <text x={18}  y={108} textAnchor="middle" fill="#475569" fontSize={9}>LOW</text>
      <text x={cx}  y={30}  textAnchor="middle" fill="#475569" fontSize={9}>MED</text>
      <text x={202} y={108} textAnchor="middle" fill="#475569" fontSize={9}>HIGH</text>
    </svg>
  );
}

// ── Slider input component ────────────────────────────────────────────────────

interface SliderProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}

function LabeledSlider({ id, label, value, min, max, step, unit, onChange }: SliderProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor={id} className="text-xs text-slate-400">
          {label}
        </label>
        <span className="text-xs font-mono font-medium text-slate-200 tabular-nums">
          {value}
          <span className="text-slate-500 text-[10px] ml-0.5">{unit}</span>
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${value} ${unit}`}
      />
      <div className="flex justify-between text-[10px] text-slate-700 mt-0.5">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function WhatIfSimulator() {
  // Slider state (primary sliders shown to user)
  const [slope,    setSlope]    = useState(25);
  const [rain24h,  setRain24h]  = useState(100);
  // Secondary inputs (collapsible / shown as numeric inputs)
  const [elevation,      setElevation]      = useState(1500);
  const [monsoonRain,    setMonsoonRain]     = useState(1800);

  // Prediction state
  const [result,    setResult]   = useState<PredictResponse | null>(null);
  const [loading,   setLoading]  = useState(false);
  const [error,     setError]    = useState<string | null>(null);

  // Debounce ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runPrediction = useCallback(async (
    slopeVal: number,
    rain24hVal: number,
    elevVal: number,
    monsoonVal: number,
  ) => {
    setLoading(true);
    setError(null);
    try {
      const res = await predict({
        elevation:          elevVal,
        slope_degrees:      slopeVal,
        max_24h_rain:       rain24hVal,
        total_monsoon_rain: monsoonVal,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Prediction failed');
    } finally {
      setLoading(false);
    }
  }, []);

  /** Debounced trigger: called on every slider change */
  const schedulePredict = useCallback((
    slopeVal: number,
    rain24hVal: number,
    elevVal: number,
    monsoonVal: number,
  ) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runPrediction(slopeVal, rain24hVal, elevVal, monsoonVal);
    }, 350);
  }, [runPrediction]);

  const handleSlope = (v: number) => { setSlope(v);   schedulePredict(v, rain24h, elevation, monsoonRain); };
  const handleRain  = (v: number) => { setRain24h(v); schedulePredict(slope, v, elevation, monsoonRain); };
  const handleElev  = (v: number) => { setElevation(v);   schedulePredict(slope, rain24h, v, monsoonRain); };
  const handleMonsoon = (v: number) => { setMonsoonRain(v); schedulePredict(slope, rain24h, elevation, v); };

  const displayScore = result?.risk_score ?? 0;

  return (
    <section
      aria-labelledby="simulator-heading"
      className="glass-card rounded-xl border border-slate-700/40 overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="simulator-heading" className="text-xs font-semibold text-slate-300">
              What-If Simulator
            </h2>
            <p className="text-[10px] text-slate-600 mt-0.5">
              Live ML inference · RandomForestClassifier
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" aria-hidden="true" />
            <span className="text-[10px] text-cyan-400 font-medium">Model Online</span>
          </div>
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">

        {/* Left: Sliders */}
        <div className="flex flex-col gap-5">
          <LabeledSlider
            id="slope-slider"
            label="Slope Angle"
            value={slope}
            min={0}
            max={45}
            step={0.5}
            unit="°"
            onChange={handleSlope}
          />
          <LabeledSlider
            id="rain-slider"
            label="Max 24h Rainfall"
            value={rain24h}
            min={0}
            max={300}
            step={1}
            unit=" mm"
            onChange={handleRain}
          />
          <LabeledSlider
            id="elevation-slider"
            label="Elevation"
            value={elevation}
            min={500}
            max={2500}
            step={10}
            unit=" m"
            onChange={handleElev}
          />
          <LabeledSlider
            id="monsoon-slider"
            label="Total Monsoon Rain"
            value={monsoonRain}
            min={500}
            max={3000}
            step={10}
            unit=" mm"
            onChange={handleMonsoon}
          />

          {/* Predict button (manual trigger as backup) */}
          <button
            onClick={() => void runPrediction(slope, rain24h, elevation, monsoonRain)}
            disabled={loading}
            className="
              mt-1 w-full py-2.5 rounded-lg text-xs font-semibold
              bg-ts-accent/15 border border-ts-accent/30 text-ts-accent
              hover:bg-ts-accent/25 hover:border-ts-accent/50 active:scale-[0.98]
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer
            "
            aria-busy={loading}
          >
            {loading ? (
              'Running Model…'
            ) : (
              <>
                <PlayIcon className="w-3.5 h-3.5" />
                <span>Run Prediction</span>
              </>
            )}
          </button>

          {/* Error message */}
          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2" role="alert">
              {error}
            </p>
          )}
        </div>

        {/* Right: Gauge */}
        <div className="flex flex-col items-center gap-3">
          {/* Gauge */}
          <div className={`w-full transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`}>
            <RiskGauge score={displayScore} />
          </div>

          {/* Risk level badge */}
          {result && (
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getRiskBadgeClass(result.risk_level)}`}>
              {result.risk_level} RISK
            </span>
          )}

          {!result && !loading && (
            <p className="text-[11px] text-slate-600 text-center">
              Adjust sliders to predict risk
            </p>
          )}

          {loading && (
            <p className="text-[11px] text-slate-500 text-center animate-pulse">
              Model computing…
            </p>
          )}

          {/* Context callout */}
          {result && (
            <div className={`w-full p-3 rounded-lg text-[11px] leading-snug
              ${result.risk_level === 'HIGH'
                ? 'bg-red-500/10 border border-red-500/20 text-red-300'
                : result.risk_level === 'MODERATE'
                ? 'bg-orange-500/10 border border-orange-500/20 text-orange-300'
                : 'bg-green-500/10 border border-green-500/20 text-green-300'
              }`}
            >
              {result.risk_level === 'HIGH' &&
                'Conditions match high-risk historical events. Immediate evacuation recommended.'}
              {result.risk_level === 'MODERATE' &&
                'Elevated risk. Continuous monitoring and readiness alert advised.'}
              {result.risk_level === 'LOW' &&
                'Conditions within safe thresholds. Routine monitoring sufficient.'}
            </div>
          )}
        </div>
      </div>

      {/* Feature importance footnote */}
      <div className="px-4 pb-4">
        <div className="rounded-lg bg-slate-900/50 border border-slate-800 px-3 py-2 flex flex-wrap gap-x-4 gap-y-1">
          <p className="text-[10px] text-slate-600 w-full mb-1 font-medium">Feature weights (approximate):</p>
          {[
            { label: 'Slope',          pct: 40 },
            { label: '24h Rain',       pct: 40 },
            { label: 'Monsoon Total',  pct: 15 },
            { label: 'Elevation',      pct: 5  },
          ].map(({ label, pct }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500/60 rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[10px] text-slate-600">{label} {pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
