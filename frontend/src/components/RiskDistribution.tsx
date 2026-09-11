/**
 * RiskDistribution — Clickable risk breakdown computed from actual loaded cells data.
 * Shows LOW / MODERATE / HIGH counts and percentages, continuous distribution bar,
 * and key regional susceptibility insights.
 * Clicking a category fires onFilterRisk callback.
 */

import { useMemo } from 'react';
import type { GridCell } from '../types';
import { XIcon } from './icons';

interface RiskDistributionProps {
  cells: GridCell[];
  activeFilter: string | null;
  onFilterRisk: (level: string | null) => void;
}

interface RiskCategory {
  level: string;
  label: string;
  count: number;
  pct: number;
  color: string;
  bgColor: string;
  borderColor: string;
  barColor: string;
}

export function RiskDistribution({ cells, activeFilter, onFilterRisk }: RiskDistributionProps) {
  const analysis = useMemo(() => {
    const total = cells.length;
    if (total === 0) return null;

    const high = cells.filter((c) => (c.risk_level ? c.risk_level === 'HIGH' : c.susceptibility >= 0.66));
    const moderate = cells.filter((c) => (c.risk_level ? c.risk_level === 'MODERATE' : (c.susceptibility >= 0.33 && c.susceptibility < 0.66)));
    const low = cells.filter((c) => (c.risk_level ? c.risk_level === 'LOW' : c.susceptibility < 0.33));

    const categories: RiskCategory[] = [
      {
        level: 'HIGH',
        label: 'High Risk',
        count: high.length,
        pct: (high.length / total) * 100,
        color: 'text-red-400',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30',
        barColor: 'bg-red-500',
      },
      {
        level: 'MODERATE',
        label: 'Moderate Risk',
        count: moderate.length,
        pct: (moderate.length / total) * 100,
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/30',
        barColor: 'bg-amber-500',
      },
      {
        level: 'LOW',
        label: 'Low Risk',
        count: low.length,
        pct: (low.length / total) * 100,
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/30',
        barColor: 'bg-emerald-500',
      },
    ];

    // Find state with most high risk cells
    const highStateCounts: Record<string, number> = {};
    high.forEach((c) => {
      const s = c.state || 'Northeast';
      highStateCounts[s] = (highStateCounts[s] || 0) + 1;
    });
    let topState = '—';
    let topStateCount = 0;
    Object.entries(highStateCounts).forEach(([s, count]) => {
      if (count > topStateCount) {
        topState = s;
        topStateCount = count;
      }
    });

    const elevatedCount = high.length + moderate.length;
    const elevatedPct = (elevatedCount / total) * 100;

    return {
      categories,
      total,
      elevatedCount,
      elevatedPct,
      topState,
      topStateCount,
    };
  }, [cells]);

  if (!analysis) return null;

  const { categories, total, elevatedCount, elevatedPct, topState, topStateCount } = analysis;

  return (
    <div className="rounded-xl p-4 border border-ts-border bg-ts-surface1 space-y-3.5 flex flex-col justify-between h-full shadow-ts-panel">
      {/* Header row with badges & filter indicator */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-ts-accent/15 text-ts-accent border border-ts-accent/30 font-mono">
            TERRAIN BREAKDOWN
          </span>
          <span className="text-[10px] text-ts-text3 font-medium">
            Click card to filter map
          </span>
        </div>
        {activeFilter ? (
          <button
            onClick={() => onFilterRisk(null)}
            className="text-[10px] px-2 py-0.5 rounded-full bg-ts-accent/15 text-ts-accent border border-ts-accent/30 hover:bg-ts-accent/25 transition-colors flex items-center gap-1.5 font-mono font-bold cursor-pointer"
          >
            <span>Filtering: {activeFilter}</span>
            <XIcon className="w-3 h-3 text-ts-accent" />
          </button>
        ) : (
          <span className="text-[10px] text-ts-text3 font-mono">
            All {total} Cells Active
          </span>
        )}
      </div>


      {/* 3 Interactive Cards */}
      <div className="grid grid-cols-3 gap-2.5">
        {categories.map((cat) => {
          const isActive = activeFilter === cat.level;
          return (
            <button
              key={cat.level}
              type="button"
              onClick={() => onFilterRisk(isActive ? null : cat.level)}
              className={`
                rounded-xl p-3 border text-left transition-all cursor-pointer relative overflow-hidden
                ${
                  isActive
                    ? `${cat.borderColor} ${cat.bgColor} ring-1 ring-offset-0 ring-ts-accent shadow-ts-panel-hover`
                    : `border-ts-border bg-ts-surface2 hover:bg-ts-surface2/80 hover:${cat.borderColor} shadow-ts-panel`
                }
              `}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${cat.color}`}>
                  {cat.label}
                </span>
                {isActive && (
                  <span className="text-[8px] px-1 py-0.2 rounded bg-ts-surface1 text-ts-accent font-bold border border-ts-border">
                    ACTIVE
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-xl sm:text-2xl font-black font-mono tabular-nums ${cat.color}`}>
                  {cat.count}
                </span>
                <span className="text-[10px] text-ts-text3 font-mono">
                  ({cat.pct.toFixed(1)}%)
                </span>
              </div>
              <div className="h-1.5 w-full bg-ts-surface2 rounded-full overflow-hidden mt-2">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${cat.barColor}`}
                  style={{ width: `${cat.pct}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Continuous Multi-Segment Distribution Bar */}
      <div className="space-y-1.5 bg-ts-surface2/40 rounded-lg p-2.5 border border-ts-border/80">
        <div className="flex items-center justify-between text-[10px] text-ts-text3">
          <span className="font-semibold uppercase tracking-wider">Regional Susceptibility Spectrum</span>
          <span className="font-mono text-ts-text3">{total} total cells</span>
        </div>
        <div className="h-2.5 w-full bg-ts-surface2 rounded-full overflow-hidden flex">
          <div
            className="bg-red-500 h-full transition-all duration-500"
            style={{ width: `${(categories[0].count / total) * 100}%` }}
            title={`High Risk: ${categories[0].count} cells`}
          />
          <div
            className="bg-amber-500 h-full transition-all duration-500"
            style={{ width: `${(categories[1].count / total) * 100}%` }}
            title={`Moderate Risk: ${categories[1].count} cells`}
          />
          <div
            className="bg-emerald-500 h-full transition-all duration-500"
            style={{ width: `${(categories[2].count / total) * 100}%` }}
            title={`Low Risk: ${categories[2].count} cells`}
          />
        </div>
        <div className="flex items-center justify-between text-[9px] text-ts-text3 font-mono pt-0.5">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" /> High: {categories[0].pct.toFixed(1)}%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" /> Mod: {categories[1].pct.toFixed(1)}%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Low: {categories[2].pct.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Bottom Insights row (matches Rainfall Intelligence 3-box row) */}
      <div className="pt-2 border-t border-ts-border">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-ts-surface2 rounded-lg p-2 border border-ts-border shadow-ts-panel">
            <span className="text-[10px] text-ts-text3 block">Elevated Hazard</span>
            <span className="text-xs font-bold font-mono text-amber-500 dark:text-amber-400">
              {elevatedCount} ({elevatedPct.toFixed(1)}%)
            </span>
          </div>
          <div className="bg-ts-surface2 rounded-lg p-2 border border-ts-border shadow-ts-panel">
            <span className="text-[10px] text-ts-text3 block">Top High-Risk State</span>
            <span className="text-xs font-bold font-mono text-ts-text truncate block" title={`${topState} (${topStateCount})`}>
              {topState} ({topStateCount})
            </span>
          </div>
          <div className="bg-ts-surface2 rounded-lg p-2 border border-ts-border shadow-ts-panel">
            <span className="text-[10px] text-ts-text3 block">Map Filter</span>
            <span className={`text-xs font-bold font-mono ${activeFilter ? 'text-ts-accent' : 'text-ts-text3'}`}>
              {activeFilter ? activeFilter : 'NONE'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
