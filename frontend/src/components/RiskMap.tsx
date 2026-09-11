/**
 * RiskMap — TerraSense Pure Landslide Risk Map for Northeast India.
 * 
 * Strict Single-Concern Purpose:
 * Answers: "Where is the current landslide risk?"
 * Contains ONLY landslide risk (susceptibility, dynamic risk score, and risk level).
 * ZERO weather overlays, ZERO rainfall circles, ZERO cloud fields, ZERO weather timelines.
 */

import { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import type { GridCell, PredictionResult } from '../types';
import { getRiskTextClass, getRiskBadgeClass, getSusceptibilityColor } from '../utils/riskHelpers';
import { MapSearch } from './MapSearch';
import { MaximizeIcon, XIcon, RefreshIcon } from './icons';

// Regional Northeast India Center
const NE_CENTER: [number, number] = [26.0, 93.2];
const DEFAULT_ZOOM = 7;

// Full Northeast India Bounding Box (Encompasses all 8 states)
const NE_BOUNDS: [[number, number], [number, number]] = [
  [21.8, 88.2], // Southwest (Mizoram / Bengal border)
  [29.5, 97.4], // Northeast (Arunachal / China border)
];

interface TileProviderConfig {
  name: string;
  url: string;
  overlayUrls?: string[];
  attr: string;
  className?: string;
  maxNativeZoom?: number;
}

// Basemap Tile Providers (Enhanced for Landslide & Topography — Zero API Key)
const TILE_PROVIDERS: Record<string, TileProviderConfig> = {
  satellite: {
    name: 'Satellite Hybrid',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    overlayUrls: [
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    ],
    attr: '&copy; Esri, Maxar, Earthstar Geographics',
    className: 'satellite-vibrant',
    maxNativeZoom: 18,
  },
  terrain: {
    name: 'Terrain Topo',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attr: '&copy; Esri, DeLorme, NAVTEQ',
    className: 'terrain-sharp',
    maxNativeZoom: 12,
  },
  dark: {
    name: 'Dark Ops',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    overlayUrls: [
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    ],
    attr: '&copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors',
    className: '',
    maxNativeZoom: 16,
  },
  standard: {
    name: 'Standard OSM',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    className: '',
    maxNativeZoom: 19,
  },
};

// 8 Northeast States coordinates
const STATE_PRESETS: Record<string, { center: [number, number]; zoom: number; bounds?: [[number, number], [number, number]] }> = {
  'All': { center: NE_CENTER, zoom: DEFAULT_ZOOM, bounds: NE_BOUNDS },
  'Assam': { center: [26.2, 92.9], zoom: 8 },
  'Arunachal Pradesh': { center: [27.8, 94.7], zoom: 8 },
  'Nagaland': { center: [25.7, 94.2], zoom: 9 },
  'Manipur': { center: [24.8, 93.9], zoom: 9 },
  'Mizoram': { center: [23.3, 92.8], zoom: 9 },
  'Tripura': { center: [23.8, 91.5], zoom: 9 },
  'Meghalaya': { center: [25.5, 91.3], zoom: 9 },
  'Sikkim': { center: [27.5, 88.5], zoom: 9 },
};

interface RiskMapProps {
  cells: GridCell[];
  selectedCell: GridCell | null;
  prediction: PredictionResult | null;
  predictionLoading: boolean;
  onCellSelect: (cell: GridCell) => void;
  onPanelClose: () => void;
  onRefreshPrediction: () => void;
  onInvestigate?: () => void;
  showFloatingCard?: boolean;
  showLegend?: boolean;
  className?: string;
}

function MapFlyController({ target }: { target: { center: [number, number]; zoom: number; bounds?: [[number, number], [number, number]] } | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      if (target.bounds) {
        map.fitBounds(target.bounds, { padding: [15, 15], duration: 0.8 });
      } else {
        map.flyTo(target.center, target.zoom, { duration: 1.0 });
      }
    }
  }, [map, target]);
  return null;
}

function MapResizeController() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

function MapWheelZoomController({ enabled }: { enabled: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (enabled) {
      map.scrollWheelZoom.enable();
    } else {
      map.scrollWheelZoom.disable();
    }
  }, [map, enabled]);
  return null;
}

/**
 * MapZoom100Control — Dedicated "100%" reset view button positioned directly
 * below Leaflet's "+" and "-" zoom buttons.
 */
function MapZoom100Control({ onReset }: { onReset: () => void }) {
  const map = useMap();
  return (
    <div className="leaflet-top leaflet-left" style={{ pointerEvents: 'none' }}>
      <div
        className="leaflet-control leaflet-bar"
        style={{
          marginTop: '74px',
          marginLeft: '10px',
          pointerEvents: 'auto',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          borderRadius: '6px',
          overflow: 'hidden',
          border: '1px solid rgba(108, 124, 255, 0.4)',
        }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onReset();
            map.fitBounds(NE_BOUNDS, { padding: [15, 15], duration: 0.8 });
          }}
          className="flex items-center justify-center font-mono font-bold text-[10px] text-ts-accent hover:text-white bg-ts-surface1/95 hover:bg-ts-accent transition-colors cursor-pointer"
          style={{ width: '30px', height: '30px', border: 'none', padding: 0 }}
          title="100% Overview — Reset view to show all 8 Northeast states"
          aria-label="100% Overview"
        >
          100%
        </button>
      </div>
    </div>
  );
}

export function RiskMap({
  cells,
  selectedCell,
  prediction,
  predictionLoading,
  onCellSelect,
  onPanelClose,
  onRefreshPrediction,
  onInvestigate,
  showFloatingCard = false,
  showLegend = true,
  className = '',
}: RiskMapProps) {
  const [selectedState, setSelectedState] = useState<string>('All');
  const [riskLevelFilter, setRiskLevelFilter] = useState<'ALL' | 'HIGH' | 'MODERATE' | 'LOW'>('ALL');
  const [activeBasemap, setActiveBasemap] = useState<'dark' | 'satellite' | 'terrain' | 'standard'>('satellite');
  const [flyTarget, setFlyTarget] = useState<{ center: [number, number]; zoom: number; bounds?: [[number, number], [number, number]] } | null>(() => {
    return selectedCell ? { center: [selectedCell.latitude, selectedCell.longitude], zoom: 11 } : null;
  });
  const [wheelZoom, setWheelZoom] = useState<boolean>(true);

  // Auto-fly to selected cell when it changes
  useEffect(() => {
    if (selectedCell) {
      setFlyTarget({ center: [selectedCell.latitude, selectedCell.longitude], zoom: 11 });
    }
  }, [selectedCell]);

  // Filter cells based on state and risk level
  const filteredCells = useMemo(() => {
    return cells.filter((c) => {
      if (selectedState !== 'All' && c.state !== selectedState) return false;
      const rLevel = c.risk_level || (c.susceptibility >= 0.66 ? 'HIGH' : c.susceptibility >= 0.33 ? 'MODERATE' : 'LOW');
      if (riskLevelFilter !== 'ALL' && rLevel !== riskLevelFilter) return false;
      return true;
    });
  }, [cells, selectedState, riskLevelFilter]);

  const handleStateChange = (stateName: string) => {
    setSelectedState(stateName);
    if (STATE_PRESETS[stateName]) {
      setFlyTarget(STATE_PRESETS[stateName]);
    }
  };

  const handleResetToFullView = () => {
    setSelectedState('All');
    setRiskLevelFilter('ALL');
    setFlyTarget({ center: NE_CENTER, zoom: DEFAULT_ZOOM, bounds: NE_BOUNDS });
  };

  const tile = TILE_PROVIDERS[activeBasemap];

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-ts-border bg-ts-base shadow-2xl flex flex-col ${className}`}>

      {/* ── Compact Map Header Bar ────────────────────────────────────────── */}
      <div className="bg-ts-surface1/95 border-b border-ts-border px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 z-10 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse" />
            <h3 className="text-xs font-black tracking-wider text-slate-100 uppercase">
              TerraSense Landslide Risk Map
            </h3>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-ts-surface2 text-ts-accent border border-ts-border font-bold">
              2,534 CELLS
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Static Terrain Susceptibility Grid · Real-Time Landslide Hazard
          </p>
        </div>

        {/* Filters, State selector, Basemap, Wheel Zoom */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search Cell ID or State */}
          <div className="w-44 sm:w-52">
            <MapSearch cells={cells} onSelectCell={onCellSelect} />
          </div>

          {/* 100% Overview Quick Button */}
          <button
            onClick={handleResetToFullView}
            className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-ts-accent/15 border border-ts-accent/40 text-ts-accent hover:bg-ts-accent/25 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="100% Overview — Reset view to show all cities & states"
          >
            <MaximizeIcon className="w-3.5 h-3.5" />
            <span>100% View</span>
          </button>

          {/* Quick Risk Filter Buttons */}
          <div className="flex items-center rounded-lg border border-ts-border bg-ts-surface2 p-0.5 text-[10px]">
            <button
              onClick={() => setRiskLevelFilter('ALL')}
              className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                riskLevelFilter === 'ALL'
                  ? 'bg-slate-700 text-slate-100 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setRiskLevelFilter('HIGH')}
              className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                riskLevelFilter === 'HIGH'
                  ? 'bg-red-500/25 text-red-300 font-bold'
                  : 'text-slate-400 hover:text-red-400'
              }`}
            >
              High
            </button>
            <button
              onClick={() => setRiskLevelFilter('MODERATE')}
              className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                riskLevelFilter === 'MODERATE'
                  ? 'bg-amber-500/25 text-amber-300 font-bold'
                  : 'text-slate-400 hover:text-amber-400'
              }`}
            >
              Mod
            </button>
            <button
              onClick={() => setRiskLevelFilter('LOW')}
              className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                riskLevelFilter === 'LOW'
                  ? 'bg-emerald-500/25 text-emerald-300 font-bold'
                  : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              Low
            </button>
          </div>

          {/* State Dropdown */}
          <select
            value={selectedState}
            onChange={(e) => handleStateChange(e.target.value)}
            className="bg-ts-surface2 border border-ts-border text-ts-text text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-ts-accent font-medium cursor-pointer"
            aria-label="Filter by State"
          >
            {Object.keys(STATE_PRESETS).map((st) => (
              <option key={st} value={st}>
                {st === 'All' ? 'All 8 States' : st}
              </option>
            ))}
          </select>

          {/* Basemap Select */}
          <select
            value={activeBasemap}
            onChange={(e) => setActiveBasemap(e.target.value as any)}
            className="bg-ts-surface2 border border-ts-border text-ts-text text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-ts-accent font-medium cursor-pointer"
            aria-label="Basemap Layer"
          >
            <option value="satellite">Satellite Hybrid</option>
            <option value="terrain">Terrain Topo</option>
            <option value="dark">Dark Ops</option>
            <option value="standard">Standard OSM</option>
          </select>

          {/* Wheel Zoom Safety Toggle */}
          <button
            onClick={() => setWheelZoom(!wheelZoom)}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 cursor-pointer ${
              wheelZoom
                ? 'bg-ts-accent/15 text-ts-accent border-ts-accent/40'
                : 'bg-ts-surface2 text-slate-500 border-ts-border hover:text-slate-300'
            }`}
            title={wheelZoom ? 'Scroll-wheel zoom enabled' : 'Scroll-wheel zoom disabled'}
          >
            <span>{wheelZoom ? 'Wheel: ON' : 'Wheel: OFF'}</span>
          </button>
        </div>
      </div>


      {/* ── Leaflet Map Canvas (Landslide Risk Only) ───────────────────────── */}
      <div className="relative flex-1 w-full min-h-0 overflow-hidden">
        <MapContainer
          center={selectedCell ? [selectedCell.latitude, selectedCell.longitude] : NE_CENTER}
          zoom={selectedCell ? 11 : DEFAULT_ZOOM}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
          attributionControl={true}
          scrollWheelZoom={wheelZoom}
        >
          <MapResizeController />
          <MapFlyController target={flyTarget} />
          <MapWheelZoomController enabled={wheelZoom} />
          <MapZoom100Control onReset={handleResetToFullView} />

          {/* Basemap Base Tile Layer */}
          <TileLayer
            key={`base-${activeBasemap}`}
            url={tile.url}
            attribution={tile.attr}
            maxZoom={18}
            maxNativeZoom={tile.maxNativeZoom ?? 18}
            minZoom={5}
            className={tile.className}
          />

          {/* Basemap Overlays (Highways, State Boundaries & Place Names for Satellite Hybrid) */}
          {tile.overlayUrls && tile.overlayUrls.map((overlayUrl, idx) => (
            <TileLayer
              key={`overlay-${activeBasemap}-${idx}`}
              url={overlayUrl}
              attribution=""
              maxZoom={18}
              maxNativeZoom={tile.maxNativeZoom ?? 18}
              minZoom={5}
              zIndex={10 + idx}
              opacity={0.95}
            />
          ))}

          {/* 2,534 Susceptibility Grid Cells — Strictly Landslide Hazard */}
          {filteredCells.map((c) => {
            const isSelected = selectedCell?.cell_id === c.cell_id;
            const score = isSelected && prediction ? prediction.risk_score : (c.risk_score !== undefined ? c.risk_score : c.susceptibility);
            const level = isSelected && prediction ? prediction.risk_level : (c.risk_level || (score >= 0.66 ? 'HIGH' : score >= 0.33 ? 'MODERATE' : 'LOW'));
            const color = getSusceptibilityColor(score);

            const isHigh = score >= 0.66;
            const isModerate = score >= 0.33 && score < 0.66;

            const radius = isSelected ? 8.5 : (isHigh ? 5.5 : isModerate ? 4.5 : 3.2);
            const opacity = isSelected ? 1.0 : (isHigh ? 0.95 : isModerate ? 0.8 : 0.4);
            const strokeColor = isSelected ? '#6C7CFF' : (isHigh ? '#F87171' : color);
            const weight = isSelected ? 2.5 : (isHigh ? 1.2 : 0.4);

            return (
              <CircleMarker
                key={c.cell_id}
                center={[c.latitude, c.longitude]}
                radius={radius}
                pathOptions={{
                  fillColor: color,
                  fillOpacity: opacity,
                  color: strokeColor,
                  weight: weight,
                  opacity: isSelected ? 1.0 : 0.8,
                }}
                eventHandlers={{
                  click: () => onCellSelect(c),
                }}
              >
                <Tooltip direction="top" offset={[0, -4]} opacity={1.0} className="terrasense-dark-tooltip">
                  <div className="text-[11px] font-sans p-1 min-w-[170px] text-ts-text">
                    <div className="font-bold flex items-center justify-between gap-2 border-b border-ts-border pb-1 mb-1.5">
                      <div className="flex flex-col min-w-0">
                        <span className="text-ts-text text-xs font-semibold truncate max-w-[155px]">
                          {c.village || c.nearest_place || (c.state || 'NE India')}
                        </span>
                        {(c.subdivision || c.district) && (
                          <span className="text-[10px] text-ts-text3 font-normal truncate max-w-[155px]">
                            {[c.subdivision, c.district].filter(Boolean).join(', ')}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[10px] text-ts-accent font-bold bg-ts-accent/10 px-1.5 py-0.5 rounded border border-ts-accent/30 whitespace-nowrap">
                        NE_{c.cell_id.toString().padStart(4, '0')}
                      </span>
                    </div>
                    <div className="text-[11px] space-y-1">
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-ts-text3">Risk Score:</span>
                        <span className={`font-mono font-bold text-xs ${
                          isHigh ? 'text-red-400' : isModerate ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          {(score * 100).toFixed(1)}% ({level})
                        </span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-ts-text3">Susceptibility:</span>
                        <strong className="font-mono text-ts-accent font-semibold">{c.susceptibility.toFixed(4)}</strong>
                      </div>
                      <div className="text-[9px] text-ts-text3 pt-0.5 border-t border-ts-border font-mono">
                        {c.latitude.toFixed(3)}°N, {c.longitude.toFixed(3)}°E
                      </div>
                    </div>
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}

          {/* Selected Cell Pulsing Targeting Reticle */}
          {selectedCell && (
            <CircleMarker
              center={[selectedCell.latitude, selectedCell.longitude]}
              radius={16}
              pathOptions={{
                fill: false,
                color: '#6C7CFF',
                weight: 2.2,
                opacity: 0.95,
                dashArray: '5, 5',
              }}
              className="selected-marker-pulse"
            />
          )}
        </MapContainer>

        {/* ── Compact Floating Landslide Risk Legend (Bottom-Left) ─────────── */}
        {showLegend && (
          <div className="absolute bottom-4 left-3 z-[400] rounded-xl p-2 border border-ts-border bg-ts-surface1/95 shadow-xl backdrop-blur-md text-[10px] pointer-events-auto w-40">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[8px] font-bold text-ts-text3 uppercase tracking-wider">
                Hazard Index
              </span>
              <span className="text-[8px] text-ts-accent font-bold">FROZEN ML</span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                <span className="text-ts-text2 font-medium">Low (&lt; 0.33)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                <span className="text-ts-text2 font-medium">Mod (0.33–0.66)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                <span className="text-ts-text2 font-medium">High (≥ 0.66)</span>
              </div>
              <div className="flex items-center gap-1.5 pt-1 border-t border-ts-border text-[9px] text-ts-accent">
                <span className="w-2 h-2 rounded-full border border-ts-accent flex-shrink-0" />
                <span>Selected Target</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Floating Selected Cell Inspection Card (Top-Right of Map) ─────── */}
        {selectedCell && showFloatingCard && (
          <div className="absolute top-3 right-3 z-[400] w-72 sm:w-80 rounded-xl p-3.5 border border-ts-border bg-ts-surface1/95 shadow-2xl backdrop-blur-md text-xs pointer-events-auto space-y-2.5 animate-fade-in-up">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-ts-accent text-xs px-1.5 py-0.5 rounded bg-ts-accent/10 border border-ts-accent/30">
                    NE_{selectedCell.cell_id.toString().padStart(4, '0')}
                  </span>
                  <span className="font-bold text-ts-text truncate">
                    {selectedCell.village || selectedCell.nearest_place || (selectedCell.state || 'Northeast India')}
                  </span>
                </div>
                <p className="text-[10.5px] text-ts-text3 mt-0.5">
                  {[selectedCell.subdivision, selectedCell.district, selectedCell.state].filter(Boolean).join(', ')}
                  {selectedCell.pincode ? ` • PIN ${selectedCell.pincode}` : ''}
                </p>
              </div>
              <button
                onClick={onPanelClose}
                className="text-ts-text3 hover:text-ts-text p-1 rounded hover:bg-ts-surface2 transition-colors cursor-pointer"
                title="Close overlay"
              >
                <XIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Metrics Snapshot */}
            <div className="grid grid-cols-2 gap-2 bg-ts-base/70 p-2.5 rounded-lg border border-ts-border text-[11px]">
              <div>
                <span className="text-ts-text3 block text-[10px]">Terrain Susceptibility</span>
                <span className="font-bold font-mono text-ts-text">
                  {selectedCell.susceptibility.toFixed(4)}
                </span>
              </div>
              <div>
                <span className="text-ts-text3 block text-[10px]">Live Risk Score</span>
                <span className={`font-bold font-mono ${prediction ? getRiskTextClass(prediction.risk_score) : 'text-ts-text2'}`}>
                  {prediction ? `${(prediction.risk_score * 100).toFixed(1)}%` : `${((selectedCell.risk_score || selectedCell.susceptibility) * 100).toFixed(1)}%`}
                </span>
              </div>
            </div>

            {/* Risk Badge & Rainfall Trigger */}
            <div className="flex items-center justify-between text-[11px] pt-0.5">
              <div>
                <span className="text-ts-text3 text-[10px]">7-Day Cumulative: </span>
                <span className="font-bold font-mono text-ts-accent">
                  {prediction ? `${prediction.rainfall.rainfall_7d.toFixed(1)} mm` : `${(selectedCell.rainfall_7d || 45).toFixed(1)} mm`}
                </span>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${getRiskBadgeClass(prediction ? prediction.risk_level : (selectedCell.risk_level || 'LOW'))}`}>
                {prediction ? prediction.risk_level : (selectedCell.risk_level || 'LOW')}
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-1 border-t border-ts-border">
              <button
                onClick={onRefreshPrediction}
                disabled={predictionLoading}
                className="flex-1 py-1 px-2.5 rounded-md bg-ts-accent/15 border border-ts-accent/30 hover:bg-ts-accent/25 text-ts-accent text-[11px] font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                {predictionLoading ? (
                  'Evaluating...'
                ) : (
                  <>
                    <RefreshIcon className="w-3.5 h-3.5" />
                    <span>Refresh Risk</span>
                  </>
                )}
              </button>
              {onInvestigate && (
                <button
                  onClick={onInvestigate}
                  className="py-1 px-2.5 rounded-md bg-ts-surface2 border border-ts-border hover:bg-ts-surface3 text-ts-text text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span>Investigate</span>
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
