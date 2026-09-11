/**
 * VillageTable — sortable, searchable data table.
 * Default sort: risk_score descending. Columns: Village, Elevation, Slope, 24h Rain, Risk Score (bar), Level.
 */

import { useState, useMemo } from 'react';
import type { Village } from '../types';
import { getRiskBadgeClass, getRiskColor } from '../utils/riskHelpers';

interface VillageTableProps {
  villages: Village[];
  onVillageSelect: (village: Village) => void;
  selectedVillage: Village | null;
}

type SortKey = 'name' | 'elevation' | 'slope_degrees' | 'max_24h_rain' | 'risk_score';
type SortDir = 'asc' | 'desc';

interface ColDef {
  key: SortKey;
  label: string;
  align: 'left' | 'right';
}

const COLUMNS: ColDef[] = [
  { key: 'name',         label: 'Village',       align: 'left' },
  { key: 'elevation',    label: 'Elevation (m)', align: 'right' },
  { key: 'slope_degrees',label: 'Slope (°)',     align: 'right' },
  { key: 'max_24h_rain', label: '24h Rain (mm)', align: 'right' },
  { key: 'risk_score',   label: 'Risk Score',    align: 'right' },
];

function SortIcon({ dir, active }: { dir: SortDir; active: boolean }) {
  return (
    <svg
      className={`w-3 h-3 ml-1 inline-block transition-opacity ${active ? 'opacity-100' : 'opacity-30'}`}
      viewBox="0 0 12 12"
      fill="currentColor"
      aria-hidden="true"
    >
      {dir === 'asc'
        ? <path d="M6 2L10 9H2L6 2z" />
        : <path d="M6 10L2 3h8L6 10z" />
      }
    </svg>
  );
}

export function VillageTable({ villages, onVillageSelect, selectedVillage }: VillageTableProps) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('risk_score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return villages.filter((v) =>
      q === '' || v.name.toLowerCase().includes(q),
    );
  }, [villages, query]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      const an = Number(av);
      const bn = Number(bv);
      return sortDir === 'asc' ? an - bn : bn - an;
    });
  }, [filtered, sortKey, sortDir]);

  return (
    <section aria-labelledby="table-heading" className="mt-6">
      {/* Section header + search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 id="table-heading" className="text-sm font-bold text-ts-text">
            Village Risk Registry
          </h2>
          <p className="text-xs text-ts-text3 mt-0.5">
            {sorted.length} of {villages.length} villages
          </p>
        </div>

        {/* Search input */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ts-text3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            placeholder="Search village…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="
              pl-8 pr-3 py-2 text-xs
              bg-ts-surface2 border border-ts-border rounded-lg
              text-ts-text placeholder-ts-text3
              focus:outline-none focus:border-ts-accent focus:ring-1 focus:ring-ts-accent
              transition-colors w-48
            "
            aria-label="Search villages by name"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-ts-border bg-ts-surface1 overflow-hidden shadow-ts-panel">
        <div className="overflow-x-auto">
          <table className="w-full text-xs" aria-label="Village risk data table">
            <thead>
              <tr className="border-b border-ts-border bg-ts-surface2">
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    className={`
                      px-4 py-3 font-medium text-ts-text3 uppercase tracking-widest
                      cursor-pointer select-none hover:text-ts-text transition-colors
                      ${col.align === 'right' ? 'text-right' : 'text-left'}
                    `}
                    onClick={() => handleSort(col.key)}
                    aria-sort={sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    {col.label}
                    <SortIcon dir={sortDir} active={sortKey === col.key} />
                  </th>
                ))}
                {/* Risk Level column — not sortable, decorative */}
                <th
                  scope="col"
                  className="px-4 py-3 font-medium text-ts-text3 uppercase tracking-widest text-right"
                >
                  Level
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((village, idx) => {
                const isSelected = selectedVillage?.name === village.name;
                return (
                  <tr
                    key={village.name}
                    className={`
                      border-b border-ts-border/60 last:border-0
                      cursor-pointer transition-colors
                      ${isSelected
                        ? 'bg-ts-accent/10 border-l-2 border-l-ts-accent'
                        : idx % 2 === 0 ? 'bg-ts-surface2/30 hover:bg-ts-surface2/60' : 'hover:bg-ts-surface2/60'
                      }
                    `}
                    onClick={() => onVillageSelect(village)}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && onVillageSelect(village)}
                    role="row"
                    aria-selected={isSelected}
                  >
                    {/* Village name */}
                    <td className="px-4 py-3 font-medium text-ts-text whitespace-nowrap">
                      {village.name}
                    </td>

                    {/* Elevation */}
                    <td className="px-4 py-3 text-right text-ts-text2 font-mono tabular-nums">
                      {village.elevation.toFixed(0)}
                    </td>

                    {/* Slope */}
                    <td className="px-4 py-3 text-right text-ts-text2 font-mono tabular-nums">
                      {village.slope_degrees.toFixed(1)}
                    </td>

                    {/* 24h Rain */}
                    <td className="px-4 py-3 text-right text-ts-text2 font-mono tabular-nums">
                      {village.max_24h_rain.toFixed(1)}
                    </td>

                    {/* Risk score with progress bar */}
                    <td className="px-4 py-3 text-right min-w-[120px]">
                      <div className="flex items-center gap-2 justify-end">
                        <div className="w-20 h-1.5 bg-ts-surface2 rounded-full overflow-hidden flex-shrink-0">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${village.risk_score * 100}%`,
                              backgroundColor: getRiskColor(village.risk_score),
                            }}
                          />
                        </div>
                        <span className="text-ts-text font-mono tabular-nums w-8 text-right">
                          {(village.risk_score * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>

                    {/* Risk level badge */}
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`
                          inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full
                          ${getRiskBadgeClass(village.risk_level)}
                        `}
                      >
                        {village.risk_level}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {sorted.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-ts-text3 text-xs">
                    No villages match &quot;{query}&quot;
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
