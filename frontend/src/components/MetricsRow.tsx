/**
 * MetricsRow — Compact operational system overview cards.
 * High information density, restrained colors, aligned and space-efficient.
 */

import type { SystemSummary, Summary } from '../types';
import { useCountUp } from '../hooks/useCountUp';

interface MetricsRowProps {
  systemSummary?: SystemSummary | null;
  summary?: Summary | null;
  loading: boolean;
}

interface StatCardProps {
  label: string;
  value: number;
  accentColor: 'cyan' | 'red' | 'amber' | 'emerald';
  icon: React.ReactNode;
  sublabel?: string;
  delay?: number;
}

function CompactStatCard({
  label,
  value,
  accentColor,
  icon,
  sublabel,
  delay = 0,
}: StatCardProps) {
  const displayValue = useCountUp(value, 900, 0);

  const styles = {
    cyan:    { border: 'border-ts-border', text: 'dark:text-cyan-400 text-sky-700',     bg: 'bg-ts-surface1', icon: 'dark:text-cyan-400/80 text-sky-600' },
    red:     { border: 'border-ts-border', text: 'dark:text-red-400 text-red-600',       bg: 'bg-ts-surface1', icon: 'dark:text-red-400 text-red-600' },
    amber:   { border: 'border-ts-border', text: 'dark:text-amber-400 text-amber-600',   bg: 'bg-ts-surface1', icon: 'dark:text-amber-400 text-amber-600' },
    emerald: { border: 'border-ts-border', text: 'dark:text-emerald-400 text-emerald-700', bg: 'bg-ts-surface1', icon: 'dark:text-emerald-400/80 text-emerald-600' },
  }[accentColor];

  return (
    <div
      className={`
        rounded-xl p-3.5 border ${styles.border} ${styles.bg} shadow-ts-panel
        flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:shadow-ts-panel-hover
      `}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between gap-1.5 mb-1.5">
        <span className="text-[10px] font-bold text-ts-text2 uppercase tracking-wider truncate">
          {label}
        </span>
        <span className={`${styles.icon} flex-shrink-0`} aria-hidden="true">
          {icon}
        </span>
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className={`text-xl sm:text-2xl font-black font-mono tracking-tight tabular-nums ${styles.text}`}>
          {displayValue}
        </span>
        {sublabel && (
          <span className="text-[10px] text-ts-text3 truncate hidden sm:inline font-medium">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}

export function MetricsRow({ systemSummary, summary, loading }: MetricsRowProps) {
  if (loading || (!systemSummary && !summary)) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-ts-surface1 border border-ts-border shadow-ts-panel animate-pulse" />
        ))}
      </div>
    );
  }

  const monitoredCells = systemSummary?.monitored_cells ?? summary?.total_villages ?? 2534;
  const highRisk = systemSummary?.high_risk ?? summary?.high_risk ?? 0;
  const moderateRisk = systemSummary?.moderate_risk ?? summary?.moderate_risk ?? 0;
  const lowRisk = systemSummary?.low_risk ?? summary?.low_risk ?? 0;
  const activeAlerts = systemSummary?.active_alerts ?? 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5" role="region" aria-label="System Overview">
      <CompactStatCard
        label="Monitored Cells"
        value={monitoredCells}
        accentColor="cyan"
        delay={0}
        sublabel="8 NE States"
        icon={
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
          </svg>
        }
      />
      <CompactStatCard
        label="High Risk"
        value={highRisk}
        accentColor="red"
        delay={100}
        sublabel="≥ 0.66"
        icon={
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        }
      />
      <CompactStatCard
        label="Moderate Risk"
        value={moderateRisk}
        accentColor="amber"
        delay={200}
        sublabel="0.33–0.66"
        icon={
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
          </svg>
        }
      />
      <CompactStatCard
        label="Low Risk"
        value={lowRisk}
        accentColor="emerald"
        delay={300}
        sublabel="< 0.33"
        icon={
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        }
      />
      <CompactStatCard
        label="Active Alerts"
        value={activeAlerts}
        accentColor="red"
        delay={400}
        sublabel="Live Warning"
        icon={
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        }
      />
    </div>
  );
}
