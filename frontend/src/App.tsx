/**
 * App.tsx — TerraSense AI Landslide Early Warning System Root Dashboard.
 * 
 * Layout Order (Map BELOW all dashboard content):
 * 1. Header (Brand, System Status, Navigation)
 * 2. System Overview (Compact 5-card metrics row)
 * 3. Selected Location Risk Assessment (Cell details + susceptibility + risk)
 * 4. Rainfall Intelligence (Live rainfall bars + 7-day insight)
 * 5. Risk Distribution (Clickable LOW/MODERATE/HIGH) + State-Wise Explorer
 * 6. Active / Recent Alerts
 * 7. Full-Width Interactive Map (BELOW dashboard content)
 * 8. Data Freshness + Model Specs
 * 9. Footer
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  GridCell,
  PredictionResult,
  AlertRecord,
  SystemSummary,
  HealthStatus,
  GroundReport,
} from './types';
import {
  fetchHealth,
  fetchMapCells,
  fetchSystemSummary,
  fetchAlerts,
  fetchGroundReports,
  predictLocation,
  acknowledgeAlert,
  resolveAlert,
} from './api/client';

import { Header } from './components/Header';
import { MetricsRow } from './components/MetricsRow';
import { RiskMap } from './components/RiskMap';
import { LiveWeatherMap } from './components/LiveWeatherMap';
import { AlertPanel } from './components/AlertPanel';
import { Footer } from './components/Footer';
import { RainfallIntelligence } from './components/RainfallIntelligence';
import { RiskDistribution } from './components/RiskDistribution';
import { StateRiskExplorer } from './components/StateRiskExplorer';
import { WhatIfRainfallSimulator } from './components/WhatIfRainfallSimulator';
import { CellInvestigationDrawer } from './components/CellInvestigationDrawer';
import { GroundReportModal } from './components/GroundReportModal';
import { GroundReportsPanel } from './components/GroundReportsPanel';
import { getRiskBadgeClass, getRiskColor, getRiskTextClass } from './utils/riskHelpers';
import { MapPinIcon, SearchIcon, FileTextIcon, RefreshIcon, XIcon } from './components/icons';

function SectionTitle({ title, badge }: { title: string; badge?: string }) {
  return (
    <div className="flex items-center gap-2.5 my-3">
      <div className="w-1 h-3.5 rounded-full bg-ts-accent" aria-hidden="true" />
      <h2 className="text-xs font-black tracking-wider text-ts-text uppercase flex items-center gap-2">
        {title}
        {badge && (
          <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-ts-surface2 text-ts-accent border border-ts-border">
            {badge}
          </span>
        )}
      </h2>
      <div className="flex-1 h-px bg-ts-border" aria-hidden="true" />
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-ts-base flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-ts-accent/10 border border-ts-accent/30 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-ts-accent animate-pulse" fill="none">
              <path d="M3 20L12 4l9 16H3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M8 20l4-8 4 8H8z" fill="currentColor" opacity="0.3" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-ts-text">TerraSense</span>
        </div>
        <p className="text-xs text-ts-text3 mb-6">
          Initializing 2,534-cell susceptibility grid & live rainfall pipeline for Northeast India...
        </p>
        <div className="flex items-center justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-ts-accent animate-pulse"
              style={{ animationDelay: `${i * 200}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-ts-base flex items-center justify-center p-6">
      <div className="rounded-2xl border border-red-500/25 p-7 max-w-md text-center bg-ts-surface1 shadow-2xl">
        <div className="w-12 h-12 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h2 className="text-base font-bold text-ts-text mb-2">Backend Connection Offline</h2>
        <p className="text-xs text-ts-text3 mb-5 leading-relaxed">{message}</p>
        <div className="text-xs text-ts-text3 bg-ts-base rounded-xl p-3.5 text-left font-mono border border-ts-border mb-5">
          <p className="text-ts-text3"># Start FastAPI backend:</p>
          <p className="text-ts-accent mt-1">cd backend</p>
          <p className="text-ts-accent">uvicorn main:app --reload --port 8000</p>
        </div>
        <button
          onClick={onRetry}
          className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors shadow-lg shadow-cyan-500/20"
        >
          Reconnect
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'map' | 'weather' | 'alerts' | 'reports'>('dashboard');
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [cells, setCells] = useState<GridCell[]>([]);
  const [systemSummary, setSystemSummary] = useState<SystemSummary | null>(null);
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [reports, setReports] = useState<GroundReport[]>([]);

  const [selectedCell, setSelectedCell] = useState<GridCell | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [predictionLoading, setPredictionLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Theme mode: 'dark' (Default Softer Dark / Night Comfort) or 'light'
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('ts-theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
    localStorage.setItem('ts-theme', theme);
  }, [theme]);

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  // Risk filter & state filter for map interaction
  const [riskFilter, setRiskFilter] = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState<string | null>(null);
  const [investigationOpen, setInvestigationOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  // Filtered cells for map based on active filters
  const filteredCells = useMemo(() => {
    let result = cells;
    if (riskFilter) {
      if (riskFilter === 'HIGH') result = result.filter(c => c.susceptibility >= 0.66);
      else if (riskFilter === 'MODERATE') result = result.filter(c => c.susceptibility >= 0.33 && c.susceptibility < 0.66);
      else if (riskFilter === 'LOW') result = result.filter(c => c.susceptibility < 0.33);
    }
    if (stateFilter) {
      result = result.filter(c => c.state === stateFilter);
    }
    return result;
  }, [cells, riskFilter, stateFilter]);

  // Initial data loading
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [healthData, cellsData, summaryData, alertsData, reportsData] = await Promise.all([
        fetchHealth().catch(() => ({ status: 'degraded', model_loaded: false, susceptibility_grid_loaded: false, rainfall_provider: 'offline' })),
        fetchMapCells(),
        fetchSystemSummary().catch(() => null),
        fetchAlerts().catch(() => []),
        fetchGroundReports().catch(() => []),
      ]);

      setHealth(healthData);
      setCells(cellsData);
      setSystemSummary(summaryData);
      setAlerts(alertsData);
      setReports(reportsData);

      // Automatically locate and pre-select the absolute HIGHEST risk zone across all 2,534 cells
      if (cellsData.length > 0 && !selectedCell) {
        const highestRiskCell = cellsData.reduce((max, cell) => {
          const score = cell.risk_score ?? cell.susceptibility;
          const maxScore = max.risk_score ?? max.susceptibility;
          return score > maxScore ? cell : max;
        }, cellsData[0]);
        setSelectedCell(highestRiskCell);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not connect to TerraSense FastAPI backend.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  // Periodic coordinated background polling (30-second interval)
  // Ensures website dashboard, Active Alerts, MetricsRow, and Civil Defense Broadcast Preview
  // automatically stay synchronized with live backend state without full page reload.
  useEffect(() => {
    let isMounted = true;
    let isPolling = false;

    const pollState = async () => {
      if (isPolling || !isMounted) return;
      isPolling = true;
      try {
        const [alertsData, summaryData] = await Promise.all([
          fetchAlerts().catch(() => null),
          fetchSystemSummary().catch(() => null),
        ]);

        if (isMounted) {
          if (alertsData !== null) setAlerts(alertsData);
          if (summaryData !== null) setSystemSummary(summaryData);
        }
      } catch (err) {
        console.warn('Background sync error:', err);
      } finally {
        isPolling = false;
      }
    };

    const intervalId = setInterval(pollState, 30000); // 30s polling
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  // Handle cell selection & dynamic rainfall/risk prediction
  const handleCellSelect = useCallback(async (cell: GridCell) => {
    setSelectedCell(cell);
    setPrediction(null);
    setPredictionLoading(true);

    try {
      const pred = await predictLocation({
        latitude: cell.latitude,
        longitude: cell.longitude,
        demo_mode: true,
      });
      setPrediction(pred);
    } catch (err) {
      console.error('Prediction failed for selected cell:', err);
    } finally {
      setPredictionLoading(false);
    }
  }, []);

  // Run prediction when initial cell is loaded
  useEffect(() => {
    if (selectedCell && !prediction && !predictionLoading) {
      void handleCellSelect(selectedCell);
    }
  }, [selectedCell, prediction, predictionLoading, handleCellSelect]);

  // Refresh prediction for currently selected cell
  const handleRefreshPrediction = useCallback(async () => {
    if (!selectedCell) return;
    setPredictionLoading(true);
    try {
      const pred = await predictLocation({
        latitude: selectedCell.latitude,
        longitude: selectedCell.longitude,
        demo_mode: true,
      });
      setPrediction(pred);
    } catch (err) {
      console.error('Refresh prediction failed:', err);
    } finally {
      setPredictionLoading(false);
    }
  }, [selectedCell]);

  // Alert actions
  const handleAcknowledgeAlert = useCallback(async (alertId: string) => {
    try {
      const updated = await acknowledgeAlert(alertId);
      setAlerts((prev) => prev.map((a) => (a.alert_id === alertId ? updated : a)));
      fetchSystemSummary().then(setSystemSummary).catch(() => {});
    } catch (err) {
      console.error('Acknowledge alert failed:', err);
    }
  }, []);

  const handleResolveAlert = useCallback(async (alertId: string) => {
    try {
      const updated = await resolveAlert(alertId);
      setAlerts((prev) => prev.map((a) => (a.alert_id === alertId ? updated : a)));
      fetchSystemSummary().then(setSystemSummary).catch(() => {});
    } catch (err) {
      console.error('Resolve alert failed:', err);
    }
  }, []);

  // Pan to an alert location on the map
  const handleSelectAlertLocation = useCallback((cellIdStr: string) => {
    const rawId = parseInt(cellIdStr.replace('NE_', ''), 10);
    const matchedCell = cells.find((c) => c.cell_id === rawId);
    if (matchedCell) {
      handleCellSelect(matchedCell);
      setActiveTab('dashboard');
      setTimeout(() => {
        document.getElementById('map-viewport')?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  }, [cells, handleCellSelect]);

  // Pan to a ground report location on the map
  const handleSelectReportLocation = useCallback((cellIdStr: string) => {
    const rawId = parseInt(cellIdStr.replace('NE_', ''), 10);
    const matchedCell = cells.find((c) => c.cell_id === rawId);
    if (matchedCell) {
      handleCellSelect(matchedCell);
      setActiveTab('dashboard');
      setTimeout(() => {
        document.getElementById('map-viewport')?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  }, [cells, handleCellSelect]);

  const handleReportSuccess = useCallback((newReport: GroundReport) => {
    setReports((prev) => [newReport, ...prev]);
  }, []);

  const handleReportStatusChange = useCallback((updated: GroundReport) => {
    setReports((prev) => prev.map((r) => (r.report_id === updated.report_id ? updated : r)));
  }, []);

  // View on Map for selected cell
  const handleViewOnMap = useCallback(() => {
    document.getElementById('map-viewport')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // State selection from StateRiskExplorer
  const handleStateSelect = useCallback((state: string | null) => {
    setStateFilter(state);
    if (state) {
      setTimeout(() => {
        document.getElementById('map-viewport')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, []);

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} onRetry={loadInitialData} />;

  const activeAlertCount = alerts.filter((a) => a.status === 'ACTIVE').length;

  return (
    <div className={`bg-ts-base text-ts-text flex flex-col font-sans selection:bg-ts-accent/30 selection:text-ts-text ${
      activeTab === 'weather' || activeTab === 'map' ? 'h-screen overflow-hidden' : 'min-h-screen'
    }`}>
      {/* Persistent Top Navigation Bar */}
      <Header
        health={health}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        activeAlertCount={activeAlertCount}
        groundReportCount={reports.length}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Container */}
      <main className={`flex-1 w-full mx-auto px-2 sm:px-4 ${
        activeTab === 'weather' || activeTab === 'map'
          ? 'h-[calc(100vh-64px)] max-w-full p-2 overflow-hidden flex flex-col min-h-0'
          : 'max-w-[1440px] py-4 space-y-6'
      }`}>

        {/* ── View Tab 1: Dashboard ─────────────────────────────────────────── */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">

            {/* ═══ 1. System Overview Metrics ═══ */}
            <div>
              <SectionTitle title="System Overview" badge="8 States · 2,534 Cells" />
              <MetricsRow systemSummary={systemSummary} loading={loading} />
            </div>

            {/* ═══ Entry Points: Risk Map vs Live Weather ═══ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                onClick={() => setActiveTab('map')}
                className="p-4 rounded-xl border border-ts-border bg-ts-surface1 hover:border-ts-accent/50 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer group flex items-center justify-between shadow-ts-panel hover:shadow-ts-panel-hover"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span className="text-xs font-bold text-ts-text uppercase tracking-wider">TerraSense Risk Map</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-ts-surface2 text-ts-text2 font-mono border border-ts-border">2,534 Cells</span>
                  </div>
                  <p className="text-xs text-ts-text3">View current landslide hazard, susceptibility & alert thresholds across Northeast India</p>
                </div>
                <div className="text-xs font-semibold text-ts-accent group-hover:translate-x-1 transition-transform flex items-center gap-1 pl-3 whitespace-nowrap">
                  <span>Open Risk Map</span>
                  <span>→</span>
                </div>
              </div>

              <div 
                onClick={() => setActiveTab('weather')}
                className="p-4 rounded-xl border border-ts-border bg-ts-surface1 hover:border-ts-accent/50 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer group flex items-center justify-between shadow-ts-panel hover:shadow-ts-panel-hover"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
                    <span className="text-xs font-bold text-ts-text uppercase tracking-wider">Live Weather Map</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-ts-accent/15 text-ts-accent font-mono font-bold border border-ts-border">
                      {cells.filter(c => (c.current_rainfall || c.current_rain || 0) > 0.1).length} active rain zones
                    </span>
                  </div>
                  <p className="text-xs text-ts-text3">View real-time Open-Meteo precipitation intensity & cloud cover density</p>
                </div>
                <div className="text-xs font-semibold text-sky-500 dark:text-sky-400 group-hover:translate-x-1 transition-transform flex items-center gap-1 pl-3 whitespace-nowrap">
                  <span>Open Live Weather</span>
                  <span>→</span>
                </div>
              </div>
            </div>

            {/* ═══ 2. Selected Location Risk Assessment (Left) + Interactive Map (Right) ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column: Selected Location Risk Assessment */}
              <div className="lg:col-span-5 space-y-3">
                <SectionTitle
                  title="Selected Location Risk Assessment"
                  badge={selectedCell ? (selectedCell.state || 'Northeast India') : undefined}
                />

                {selectedCell ? (() => {
                  const villageName =
                    selectedCell.village ||
                    prediction?.village ||
                    selectedCell.nearest_place ||
                    prediction?.nearest_place;
                  const adminHierarchy = [
                    selectedCell.subdivision || prediction?.subdivision,
                    selectedCell.district || prediction?.district,
                    selectedCell.state || prediction?.state || 'Northeast India',
                  ]
                    .filter(Boolean)
                    .join(', ');
                  const pinCode = selectedCell.pincode || prediction?.pincode;
                  const fullAddress = selectedCell.full_address || prediction?.full_address;
                  const placeType = selectedCell.place_type || prediction?.place_type;

                  return (
                    <div className="rounded-xl p-4 border border-ts-border bg-ts-surface1 space-y-3 shadow-ts-panel">
                      {/* Cell header row */}
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="space-y-1 min-w-0 max-w-full flex-1">
                          {/* Location name with pin */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <MapPinIcon className="w-4 h-4 text-ts-accent shrink-0" />
                            <h3 className="text-base font-bold text-ts-text tracking-tight">
                              {villageName || (selectedCell.state ? `${selectedCell.state} Monitored Cell` : 'Monitored Sector')}
                            </h3>
                            {placeType && (
                              <span className="text-[10px] uppercase font-semibold text-ts-accent bg-ts-accent/10 px-2 py-0.5 rounded border border-ts-accent/30">
                                {placeType}
                              </span>
                            )}
                          </div>

                          {/* Sub-division / District / State hierarchy */}
                          <p className="text-xs text-ts-text2 font-medium">
                            {adminHierarchy}
                            {pinCode ? <span className="text-ts-text3 font-mono"> — PIN {pinCode}</span> : null}
                          </p>

                          {/* Full address if available and distinct */}
                          {fullAddress && fullAddress !== adminHierarchy && (
                            <p className="text-[11px] text-ts-text3 leading-snug line-clamp-2">
                              {fullAddress}
                            </p>
                          )}

                          {/* Coordinates & Cell ID row */}
                          <div className="flex items-center gap-2 pt-1 flex-wrap">
                            <span className="text-xs font-mono font-bold text-ts-accent px-2 py-0.5 rounded bg-ts-accent/10 border border-ts-accent/30">
                              NE_{selectedCell.cell_id.toString().padStart(4, '0')}
                            </span>
                            <span className="text-[11px] text-ts-text3 font-mono bg-ts-base/60 px-2 py-0.5 rounded border border-ts-border">
                              {selectedCell.latitude.toFixed(4)}°N, {selectedCell.longitude.toFixed(4)}°E
                            </span>
                          </div>
                        </div>

                        {prediction && (
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${getRiskBadgeClass(prediction.risk_level)} shrink-0 shadow-sm`}>
                            {prediction.risk_level} RISK
                          </span>
                        )}
                      </div>

                      {/* Metrics grid */}
                      <div className="grid grid-cols-2 gap-2">
                        {/* Susceptibility */}
                        <div className="bg-ts-base/60 rounded-lg p-2.5 border border-ts-border">
                          <span className="text-[10px] text-ts-text3 block">Terrain Susceptibility</span>
                          <span className="text-sm font-bold font-mono text-ts-text">
                            {(selectedCell.susceptibility * 100).toFixed(1)}%
                          </span>
                          <div className="h-1 w-full bg-ts-surface2 rounded-full overflow-hidden mt-1">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min(selectedCell.susceptibility * 100, 100)}%`,
                                backgroundColor: getRiskColor(selectedCell.susceptibility),
                              }}
                            />
                          </div>
                        </div>

                        {/* Risk Score */}
                        <div className="bg-ts-base/60 rounded-lg p-2.5 border border-ts-border">
                          <span className="text-[10px] text-ts-text3 block">Risk Score</span>
                          {predictionLoading ? (
                            <div className="w-3 h-3 border-2 border-ts-accent/20 border-t-ts-accent rounded-full animate-spin mt-1" />
                          ) : (
                            <span className={`text-sm font-bold font-mono ${prediction ? getRiskTextClass(prediction.risk_score) : 'text-ts-text3'}`}>
                              {prediction ? `${(prediction.risk_score * 100).toFixed(1)}%` : '—'}
                            </span>
                          )}
                        </div>

                        {/* 7-Day Rainfall */}
                        <div className="bg-ts-base/60 rounded-lg p-2.5 border border-ts-border">
                          <span className="text-[10px] text-ts-text3 block">7-Day Rainfall</span>
                          {predictionLoading ? (
                            <div className="w-3 h-3 border-2 border-ts-accent/20 border-t-ts-accent rounded-full animate-spin mt-1" />
                          ) : (
                            <span className="text-sm font-bold font-mono text-ts-accent">
                              {prediction ? `${prediction.rainfall.rainfall_7d.toFixed(1)} mm` : '—'}
                            </span>
                          )}
                        </div>

                        {/* Risk Level */}
                        <div className="bg-ts-base/60 rounded-lg p-2.5 border border-ts-border">
                          <span className="text-[10px] text-ts-text3 block">Risk Level</span>
                          {prediction ? (
                            <span className={`text-sm font-bold ${getRiskTextClass(prediction.risk_score)}`}>
                              {prediction.risk_level}
                            </span>
                          ) : (
                            <span className="text-sm font-bold text-ts-text3">—</span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 pt-2 border-t border-ts-border flex-wrap">
                        <button
                          onClick={() => setInvestigationOpen(true)}
                          className="flex-1 py-1.5 px-2.5 rounded-lg bg-ts-accent/15 border border-ts-accent/30 text-ts-accent text-xs font-semibold hover:bg-ts-accent/25 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <SearchIcon className="w-3.5 h-3.5" />
                          <span>Investigate</span>
                        </button>
                        <button
                          onClick={() => setReportModalOpen(true)}
                          className="flex-1 py-1.5 px-2.5 rounded-lg bg-ts-surface2 border border-ts-border text-ts-text text-xs font-semibold hover:bg-ts-surface3 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <FileTextIcon className="w-3.5 h-3.5" />
                          <span>Report</span>
                        </button>
                        <button
                          onClick={handleRefreshPrediction}
                          disabled={predictionLoading}
                          className="py-1.5 px-2.5 rounded-lg bg-ts-surface2 border border-ts-border text-ts-text text-xs font-semibold hover:bg-ts-surface3 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Refresh Live Data"
                        >
                          <RefreshIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })() : (
                  <div className="rounded-xl p-8 border border-dashed border-ts-border bg-ts-surface1/40 text-center text-xs text-ts-text3">
                    Click any point on the map to evaluate live rainfall & landslide hazard.
                  </div>
                )}
              </div>

              {/* Right Column: Interactive Map */}
              <div className="lg:col-span-7 space-y-3">
                <SectionTitle
                  title="Northeast India Risk Map"
                  badge={
                    riskFilter || stateFilter
                      ? `Filtered: ${[riskFilter, stateFilter].filter(Boolean).join(' · ')} (${filteredCells.length} cells)`
                      : '2,534 Cells'
                  }
                />
                <div id="map-viewport" className="w-full h-[400px] lg:h-[430px] rounded-xl overflow-hidden shadow-ts-panel border border-ts-border">
                  <RiskMap
                    cells={filteredCells}
                    selectedCell={selectedCell}
                    prediction={prediction}
                    predictionLoading={predictionLoading}
                    onCellSelect={handleCellSelect}
                    onPanelClose={() => setSelectedCell(null)}
                    onRefreshPrediction={handleRefreshPrediction}
                    onInvestigate={() => setInvestigationOpen(true)}
                    showFloatingCard={false}
                    showLegend={false}
                    className="h-full"
                  />
                </div>
                {/* Active filter indicator below map */}
                {(riskFilter || stateFilter) && (
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="text-[10px] text-ts-text3 uppercase font-semibold">Filters:</span>
                    {riskFilter && (
                      <button
                        onClick={() => setRiskFilter(null)}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-ts-surface2 text-ts-text border border-ts-border hover:bg-ts-surface3 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <span>Risk: {riskFilter}</span>
                        <XIcon className="w-2.5 h-2.5 text-ts-text3" />
                      </button>
                    )}
                    {stateFilter && (
                      <button
                        onClick={() => setStateFilter(null)}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-ts-surface2 text-ts-text border border-ts-border hover:bg-ts-surface3 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <span>State: {stateFilter}</span>
                        <XIcon className="w-2.5 h-2.5 text-ts-text3" />
                      </button>
                    )}
                    <button
                      onClick={() => { setRiskFilter(null); setStateFilter(null); }}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-ts-accent/10 text-ts-accent border border-ts-accent/25 hover:bg-ts-accent/20 transition-colors cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ═══ 3. What-If Rainfall Scenario Simulator (Full-Width with Side-by-Side Results) ═══ */}
            <div>
              <SectionTitle title="What-If Rainfall Simulator" badge="Scenario Engine" />
              <WhatIfRainfallSimulator
                selectedCell={selectedCell}
                prediction={prediction}
              />
            </div>

            {/* ═══ 4. Risk Distribution (Left) + Rainfall Intelligence (Right) (2-Column) ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
              {/* Left Column: Risk Distribution */}
              <div className="flex flex-col">
                <SectionTitle title="Risk Distribution" badge={`${cells.length} Cells`} />
                <div className="flex-1 flex flex-col">
                  <RiskDistribution
                    cells={cells}
                    activeFilter={riskFilter}
                    onFilterRisk={(level) => {
                      setRiskFilter(level);
                      if (level) {
                        setTimeout(() => {
                          document.getElementById('map-viewport')?.scrollIntoView({ behavior: 'smooth' });
                        }, 100);
                      }
                    }}
                  />
                </div>
              </div>

              {/* Right Column: Rainfall Intelligence */}
              <div className="flex flex-col">
                <SectionTitle title="Rainfall Intelligence" badge={prediction ? 'LIVE' : undefined} />
                <div className="flex-1 flex flex-col">
                  <RainfallIntelligence
                    prediction={prediction}
                    predictionLoading={predictionLoading}
                    lastUpdated={prediction?.timestamp ? new Date(prediction.timestamp).toLocaleString() : null}
                  />
                </div>
              </div>
            </div>

            {/* ═══ 5. State-Wise Risk Explorer (Full Width) ═══ */}
            <div>
              <SectionTitle title="State-Wise Risk Explorer" badge="8 States" />
              <StateRiskExplorer
                cells={cells}
                selectedState={stateFilter}
                onSelectState={handleStateSelect}
              />
            </div>

            {/* ═══ 6. Active Disaster Alerts (Full Width) ═══ */}
            <div>
              <SectionTitle title="Active Disaster Alerts" badge={`${activeAlertCount} Active`} />
              <AlertPanel
                alerts={alerts}
                onAcknowledge={handleAcknowledgeAlert}
                onResolve={handleResolveAlert}
                onSelectAlertLocation={handleSelectAlertLocation}
              />
            </div>

          </div>
        )}

        {/* ── View Tab 2: Focused Map View */}
        {activeTab === 'map' && (
          <div className="flex-1 w-full h-full min-h-0 overflow-hidden">
            <RiskMap
              cells={cells}
              selectedCell={selectedCell}
              prediction={prediction}
              predictionLoading={predictionLoading}
              onCellSelect={handleCellSelect}
              onPanelClose={() => setSelectedCell(null)}
              onRefreshPrediction={handleRefreshPrediction}
              onInvestigate={() => setInvestigationOpen(true)}
              showFloatingCard={true}
              showLegend={true}
              className="h-full"
            />
          </div>
        )}

        {/* ── View Tab 3: Dedicated Live Weather Map ────────────────────────── */}
        {activeTab === 'weather' && (
          <div className="flex-1 w-full h-full min-h-0 overflow-hidden">
            <LiveWeatherMap
              cells={cells}
              selectedCell={selectedCell}
              onCellSelect={handleCellSelect}
              alerts={alerts}
              className="h-full"
            />
          </div>
        )}

        {/* ── View Tab 4: Alerts Focus */}
        {activeTab === 'alerts' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <AlertPanel
              alerts={alerts}
              onAcknowledge={handleAcknowledgeAlert}
              onResolve={handleResolveAlert}
              onSelectAlertLocation={handleSelectAlertLocation}
            />
          </div>
        )}

        {/* ── View Tab 4: Ground Reports Focus */}
        {activeTab === 'reports' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <GroundReportsPanel
              reports={reports}
              onSelectReportLocation={handleSelectReportLocation}
              onOpenReportModal={() => setReportModalOpen(true)}
              onReportStatusChange={handleReportStatusChange}
            />
          </div>
        )}

      </main>

      {/* ── Cell Investigation Drawer ────────────────────────────────────── */}
      <CellInvestigationDrawer
        cell={selectedCell}
        prediction={prediction}
        predictionLoading={predictionLoading}
        open={investigationOpen}
        onClose={() => setInvestigationOpen(false)}
        onViewOnMap={() => {
          setInvestigationOpen(false);
          handleViewOnMap();
        }}
        onRefresh={handleRefreshPrediction}
        onReportCondition={() => {
          setInvestigationOpen(false);
          setReportModalOpen(true);
        }}
      />

      {/* ── Ground Report Modal ──────────────────────────────────────────── */}
      <GroundReportModal
        cell={selectedCell}
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        onSuccess={handleReportSuccess}
      />

      {activeTab !== 'weather' && activeTab !== 'map' && <Footer />}
    </div>
  );
}
