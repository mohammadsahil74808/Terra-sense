/**
 * MapSearch — Search for grid cells by Cell ID or State name.
 * Searches the actual loaded cell data array, no external API needed.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { GridCell } from '../types';
import { SearchIcon, XIcon } from './icons';

interface MapSearchProps {
  cells: GridCell[];
  onSelectCell: (cell: GridCell) => void;
}

export function MapSearch({ cells, onSelectCell }: MapSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const results = useMemo(() => {
    const q = query.trim();
    if (q.length < 1) return [];

    // Cell ID search (NE_0543 or 0543 or 543)
    const idMatch = q.replace(/^NE_?/i, '').replace(/^0+/, '');
    const idNum = parseInt(idMatch, 10);

    let matches: GridCell[] = [];

    // Search by exact cell ID
    if (!isNaN(idNum)) {
      matches = cells.filter(c => c.cell_id === idNum);
    }

    // Also search by village, subdivision, district, pincode or state (case-insensitive partial match)
    if (matches.length === 0 || isNaN(idNum)) {
      const qLower = q.toLowerCase();
      const placeMatches = cells.filter(c =>
        c.state?.toLowerCase().includes(qLower) ||
        c.village?.toLowerCase().includes(qLower) ||
        c.subdivision?.toLowerCase().includes(qLower) ||
        c.district?.toLowerCase().includes(qLower) ||
        c.pincode?.includes(qLower) ||
        c.full_address?.toLowerCase().includes(qLower) ||
        c.nearest_place?.toLowerCase().includes(qLower) ||
        c.location_name?.toLowerCase().includes(qLower)
      );
      // Deduplicate and limit
      const seen = new Set(matches.map(c => c.cell_id));
      for (const c of placeMatches) {
        if (!seen.has(c.cell_id)) {
          matches.push(c);
          seen.add(c.cell_id);
        }
      }
    }

    return matches.slice(0, 12); // limit results
  }, [cells, query]);

  const handleSelect = useCallback((cell: GridCell) => {
    onSelectCell(cell);
    const placeLabel = cell.village ? ` (${cell.village})` : (cell.nearest_place ? ` (${cell.nearest_place})` : '');
    setQuery(`NE_${cell.cell_id.toString().padStart(4, '0')}${placeLabel}`);
    setIsOpen(false);
  }, [onSelectCell]);

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-1.5 bg-ts-base/80 border border-ts-border rounded-lg px-2.5 py-1.5 focus-within:border-ts-accent/50 transition-colors">
        <SearchIcon className="w-3.5 h-3.5 text-ts-text3 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => query.length > 0 && setIsOpen(true)}
          placeholder="Search village, block, district, PIN or state..."
          className="flex-1 bg-transparent text-xs text-ts-text placeholder-ts-text3 outline-none font-mono min-w-0"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setIsOpen(false); }}
            className="text-ts-text3 hover:text-ts-text p-0.5 cursor-pointer"
            title="Clear search"
          >
            <XIcon className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Dropdown results */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-ts-surface1 border border-ts-border rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
          {results.map((cell) => {
            const villageName = cell.village || cell.nearest_place;
            const subLocation = [cell.subdivision, cell.district, cell.state].filter(Boolean).join(', ');
            return (
              <button
                key={cell.cell_id}
                onClick={() => handleSelect(cell)}
                className="w-full px-3 py-2 text-left hover:bg-ts-surface2 transition-colors flex items-center justify-between border-b border-ts-border/50 last:border-b-0 cursor-pointer"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-mono font-bold text-ts-accent">
                      NE_{cell.cell_id.toString().padStart(4, '0')}
                    </span>
                    {villageName && (
                      <span className="text-[11px] text-amber-300 font-semibold truncate">
                        {villageName}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-ts-text3 truncate mt-0.5">
                    {subLocation} {cell.pincode ? `• PIN ${cell.pincode}` : ''}
                  </div>
                </div>
                <span className="text-[10px] font-mono text-ts-text3 whitespace-nowrap">
                  {cell.latitude.toFixed(2)}°N
                </span>
              </button>
            );
          })}
        </div>
      )}

      {isOpen && query.length >= 1 && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-ts-surface1 border border-ts-border rounded-lg shadow-xl z-50 px-3 py-3 text-xs text-ts-text3 text-center">
          No cells found for "{query}"
        </div>
      )}
    </div>
  );
}
