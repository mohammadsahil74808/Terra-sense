/**
 * Header — persistent top navigation bar.
 * Contains: TerraSense brand mark, Northeast India 8-state scope,
 * real-time system health pill, and navigation view tabs.
 */

import type { HealthStatus } from '../types';
import { SunIcon, MoonIcon } from './icons';

interface HeaderProps {
  health: HealthStatus | null;
  activeTab: 'dashboard' | 'map' | 'weather' | 'alerts' | 'reports';
  onTabChange: (tab: 'dashboard' | 'map' | 'weather' | 'alerts' | 'reports') => void;
  activeAlertCount?: number;
  groundReportCount?: number;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export function Header({
  health,
  activeTab,
  onTabChange,
  activeAlertCount = 0,
  groundReportCount = 0,
  theme = 'dark',
  onToggleTheme,
}: HeaderProps) {
  const isOnline = health?.status === 'ok';
  const isDegraded = health?.status === 'degraded';

  return (
    <header
      className="sticky top-0 z-50 border-b border-ts-border bg-ts-base/95 backdrop-blur-md"
      role="banner"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4">

        {/* Brand mark */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="w-9 h-9 rounded-lg bg-ts-accent/15 border border-ts-accent/30 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-ts-accent" fill="none" aria-hidden="true">
              <path
                d="M3 20L12 4l9 16H3z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <path
                d="M8 20l4-8 4 8H8z"
                fill="currentColor"
                opacity="0.3"
              />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-ts-text leading-none tracking-tight">
                TERRASENSE
              </h1>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-ts-accent/15 text-ts-accent border border-ts-accent/30 font-mono">
                v1 FROZEN
              </span>
            </div>
            <p className="text-[11px] text-ts-text3 mt-0.5 leading-none">
              AI Landslide Early Warning · 8 NE States
            </p>
          </div>
        </div>

        {/* Navigation Tabs (Desktop & Tablet) */}
        <nav className="hidden md:flex items-center gap-1 bg-ts-surface1/90 p-1 rounded-lg border border-ts-border text-xs">
          <button
            onClick={() => onTabChange('dashboard')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-ts-accent/15 text-ts-accent border border-ts-accent/30 shadow-sm'
                : 'text-ts-text3 hover:text-ts-text hover:bg-ts-surface2'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => onTabChange('map')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
              activeTab === 'map'
                ? 'bg-ts-accent/15 text-ts-accent border border-ts-accent/30 shadow-sm'
                : 'text-ts-text3 hover:text-ts-text hover:bg-ts-surface2'
            }`}
          >
            Risk Map
          </button>
          <button
            onClick={() => onTabChange('weather')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
              activeTab === 'weather'
                ? 'bg-ts-accent/15 text-ts-accent border border-ts-accent/30 shadow-sm'
                : 'text-ts-text3 hover:text-ts-text hover:bg-ts-surface2'
            }`}
          >
            <span>Live Weather</span>
            <span className="w-1.5 h-1.5 rounded-full bg-ts-accent" />
          </button>
          <button
            onClick={() => onTabChange('alerts')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
              activeTab === 'alerts'
                ? 'bg-red-500/20 text-red-300 border border-red-500/30 shadow-sm'
                : 'text-ts-text3 hover:text-ts-text hover:bg-ts-surface2'
            }`}
          >
            <span>Alerts</span>
            {activeAlertCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-500/30 text-red-300 font-bold border border-red-500/40">
                {activeAlertCount}
              </span>
            )}
          </button>
          <button
            onClick={() => onTabChange('reports')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-ts-accent/15 text-ts-accent border border-ts-accent/30 shadow-sm'
                : 'text-ts-text3 hover:text-ts-text hover:bg-ts-surface2'
            }`}
          >
            <span>Ground Reports</span>
            {groundReportCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-ts-accent/25 text-ts-accent font-bold border border-ts-accent/30 font-mono">
                {groundReportCount}
              </span>
            )}
          </button>
        </nav>

        {/* Right-side status controls */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Light / Dark Mode Toggle */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-ts-border bg-ts-surface1 hover:bg-ts-surface2 text-ts-text text-xs transition-colors cursor-pointer shadow-sm"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark (Night Comfort) Mode'}
              aria-label="Toggle Light / Dark Mode"
            >
              {theme === 'light' ? (
                <>
                  <MoonIcon className="w-3.5 h-3.5 text-ts-accent shrink-0" />
                  <span className="text-[11px] font-medium hidden sm:inline text-ts-text">Dark</span>
                </>
              ) : (
                <>
                  <SunIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-[11px] font-medium hidden sm:inline text-ts-text">Light</span>
                </>
              )}
            </button>
          )}

          {/* Real System Health indicator */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
              isOnline
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : isDegraded
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
            role="status"
            aria-label={`System status: ${isOnline ? 'online' : isDegraded ? 'degraded' : 'offline'}`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isOnline
                  ? 'bg-emerald-400 animate-pulse'
                  : isDegraded
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-red-400'
              }`}
              aria-hidden="true"
            />
            <span className="text-[11px] font-semibold whitespace-nowrap tracking-wide uppercase">
              {isOnline ? 'System Online' : isDegraded ? 'Degraded' : 'Offline'}
            </span>
          </div>
        </div>

      </div>

      {/* Mobile navigation row */}
      <div className="flex md:hidden border-t border-ts-border bg-ts-surface1/90 px-4 py-1.5 gap-2 overflow-x-auto text-xs">
        <button
          onClick={() => onTabChange('dashboard')}
          className={`px-2.5 py-1 rounded font-medium whitespace-nowrap ${
            activeTab === 'dashboard' ? 'bg-ts-accent/15 text-ts-accent border border-ts-accent/30' : 'text-ts-text3'
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => onTabChange('map')}
          className={`px-2.5 py-1 rounded font-medium whitespace-nowrap ${
            activeTab === 'map' ? 'bg-ts-accent/15 text-ts-accent border border-ts-accent/30' : 'text-ts-text3'
          }`}
        >
          Risk Map
        </button>
        <button
          onClick={() => onTabChange('weather')}
          className={`px-2.5 py-1 rounded font-medium whitespace-nowrap flex items-center gap-1 ${
            activeTab === 'weather' ? 'bg-ts-accent/15 text-ts-accent border border-ts-accent/30' : 'text-ts-text3'
          }`}
        >
          Live Weather
          <span className="w-1 h-1 rounded-full bg-ts-accent animate-pulse" />
        </button>
        <button
          onClick={() => onTabChange('alerts')}
          className={`px-2.5 py-1 rounded font-medium whitespace-nowrap flex items-center gap-1 ${
            activeTab === 'alerts' ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'text-ts-text3'
          }`}
        >
          Alerts
          {activeAlertCount > 0 && (
            <span className="px-1 text-[10px] rounded bg-red-500 text-white font-bold">{activeAlertCount}</span>
          )}
        </button>
        <button
          onClick={() => onTabChange('reports')}
          className={`px-2.5 py-1 rounded font-medium whitespace-nowrap ${
            activeTab === 'reports' ? 'bg-ts-accent/15 text-ts-accent border border-ts-accent/30' : 'text-ts-text3'
          }`}
        >
          Ground Reports
        </button>
      </div>
    </header>
  );
}
