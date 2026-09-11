/**
 * StateRiskExplorer — State-wise risk overview computed from actual loaded grid cells.
 * Clicking a state fires onSelectState to filter/highlight on map.
 */

import { useMemo } from 'react';
import type { GridCell } from '../types';

interface StateRiskExplorerProps {
  cells: GridCell[];
  selectedState: string | null;
  onSelectState: (state: string | null) => void;
}

interface StateStats {
  name: string;
  total: number;
  high: number;
  moderate: number;
  low: number;
  avgSusceptibility: number;
}

const NE_STATES = [
  'Assam', 'Arunachal Pradesh', 'Nagaland', 'Manipur',
  'Mizoram', 'Tripura', 'Meghalaya', 'Sikkim',
];

export function StateRiskExplorer({ cells, selectedState, onSelectState }: StateRiskExplorerProps) {
  const stateStats = useMemo<StateStats[]>(() => {
    if (cells.length === 0) return [];

    return NE_STATES.map((name) => {
      const stateCells = cells.filter(c => c.state === name);
      const total = stateCells.length;
      const high = stateCells.filter(c => c.susceptibility >= 0.66).length;
      const moderate = stateCells.filter(c => c.susceptibility >= 0.33 && c.susceptibility < 0.66).length;
      const low = stateCells.filter(c => c.susceptibility < 0.33).length;
      const avgSusc = total > 0
        ? stateCells.reduce((sum, c) => sum + c.susceptibility, 0) / total
        : 0;

      return { name, total, high, moderate, low, avgSusceptibility: avgSusc };
    }).filter(s => s.total > 0);
  }, [cells]);

  if (stateStats.length === 0) return null;

  return (
    <div className="rounded-xl border border-ts-border bg-ts-surface1 overflow-hidden shadow-ts-panel">
      {/* Header */}
      <div className="px-4 py-2.5 bg-ts-surface2 border-b border-ts-border flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-ts-text2">
          Northeast India — State Risk Overview
        </span>
        {selectedState && (
          <button
            onClick={() => onSelectState(null)}
            className="text-[10px] px-2 py-0.5 rounded bg-ts-surface1 text-ts-accent border border-ts-border hover:bg-ts-surface2 transition-colors cursor-pointer font-medium"
          >
            Clear Filter
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-ts-border bg-ts-surface2/50">
              <th className="text-left px-4 py-2 text-[10px] text-ts-text3 font-semibold uppercase tracking-wider">State</th>
              <th className="text-right px-3 py-2 text-[10px] text-ts-text3 font-semibold uppercase tracking-wider">Cells</th>
              <th className="text-right px-3 py-2 text-[10px] text-red-500 dark:text-red-400 font-semibold uppercase tracking-wider">High</th>
              <th className="text-right px-3 py-2 text-[10px] text-amber-500 dark:text-amber-400 font-semibold uppercase tracking-wider">Mod</th>
              <th className="text-right px-3 py-2 text-[10px] text-emerald-500 dark:text-emerald-400 font-semibold uppercase tracking-wider">Low</th>
              <th className="text-right px-3 py-2 text-[10px] text-ts-text3 font-semibold uppercase tracking-wider">Avg Susc.</th>
            </tr>
          </thead>
          <tbody>
            {stateStats.map((state) => {
              const isSelected = selectedState === state.name;
              return (
                <tr
                  key={state.name}
                  onClick={() => onSelectState(isSelected ? null : state.name)}
                  className={`
                    border-b border-ts-border/50 cursor-pointer transition-colors
                    ${isSelected
                      ? 'bg-ts-accent/10'
                      : 'hover:bg-ts-surface2/40'
                    }
                  `}
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-ts-accent" />}
                      <span className={`font-medium ${isSelected ? 'text-ts-accent font-bold' : 'text-ts-text'}`}>
                        {state.name}
                      </span>
                    </div>
                  </td>
                  <td className="text-right px-3 py-2.5 font-mono text-ts-text">{state.total}</td>
                  <td className="text-right px-3 py-2.5 font-mono font-bold text-red-500 dark:text-red-400">
                    {state.high > 0 ? state.high : '—'}
                  </td>
                  <td className="text-right px-3 py-2.5 font-mono text-amber-500 dark:text-amber-400 font-medium">
                    {state.moderate > 0 ? state.moderate : '—'}
                  </td>
                  <td className="text-right px-3 py-2.5 font-mono text-emerald-500 dark:text-emerald-400">
                    {state.low > 0 ? state.low : '—'}
                  </td>
                  <td className="text-right px-3 py-2.5 font-mono text-ts-text3">
                    {(state.avgSusceptibility * 100).toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
