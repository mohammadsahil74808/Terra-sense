/**
 * AlertPanel — Operational Disaster Warning Engine & Multi-Lingual Broadcast.
 * Supports:
 * 1. Live SQLite-backed operational alerts list with filter (ACTIVE / ACKNOWLEDGED / RESOLVED).
 * 2. Instant Acknowledge & Resolve actions wired to backend API.
 * 3. View on Map navigation.
 * 4. Multi-lingual emergency broadcast preview (English / Hindi / Nagamese).
 */

import { useState, useMemo } from 'react';
import type { AlertRecord } from '../types';
import { getRiskBadgeClass, getRiskTextClass } from '../utils/riskHelpers';
import { dispatchSimulateHighAlert } from '../api/client';
import {
  AlertTriangleIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  CheckIcon,
  MapPinIcon,
  RadioIcon,
  SmartphoneIcon,
  SirenIcon,
} from './icons';

interface AlertPanelProps {
  alerts: AlertRecord[];
  onAcknowledge: (alertId: string) => Promise<void>;
  onResolve: (alertId: string) => Promise<void>;
  onSelectAlertLocation?: (cellId: string) => void;
}

type Lang = 'en' | 'hi' | 'na';

const LANGUAGES = [
  { code: 'en' as Lang, label: 'English' },
  { code: 'hi' as Lang, label: 'Hindi' },
  { code: 'na' as Lang, label: 'Nagamese' },
];

function getAlertBroadcast(
  lang: Lang,
  location: string,
  riskScore: number,
  rain7d: number,
  riskLevel: string
): string {
  const pct = (riskScore * 100).toFixed(0);
  const isHigh = riskLevel.toUpperCase() === 'HIGH' || riskScore >= 0.66;
  const isModerate = riskLevel.toUpperCase() === 'MODERATE' || (riskScore >= 0.33 && riskScore < 0.66);

  switch (lang) {
    case 'en':
      if (isHigh) {
        return (
          `CRITICAL DISASTER WARNING: ${location} — Landslide hazard is CRITICAL (${pct}%). ` +
          `7-day cumulative rainfall reached ${rain7d.toFixed(1)} mm. ` +
          `High probability of slope failure. Immediate evacuation to identified relief shelters advised. Emergency Helpline: 112.`
        );
      } else if (isModerate) {
        return (
          `ADVISORY ALERT: ${location} — Landslide hazard is MODERATE (${pct}%). ` +
          `7-day cumulative rainfall reached ${rain7d.toFixed(1)} mm. ` +
          `Local slope surveillance and road caution in effect. Stay alert to hillside changes. Emergency Helpline: 112.`
        );
      } else {
        return (
          `INFORMATIONAL NOTICE: ${location} — Landslide risk is LOW (${pct}%). ` +
          `7-day cumulative rainfall is ${rain7d.toFixed(1)} mm. ` +
          `Normal hillside conditions. Monitoring continues.`
        );
      }
    case 'hi':
      if (isHigh) {
        return (
          `आपातकालीन चेतावनी (HIGH ALERT): ${location} — भूस्खलन का खतरा अत्यधिक गंभीर (${pct}%) स्तर पर पहुंच गया है। ` +
          `7 दिनों की संचयी वर्षा ${rain7d.toFixed(1)} mm दर्ज की गई। ` +
          `ढलानों पर रहने वाले नागरिक तुरंत सुरक्षित आश्रयों की ओर जाएं। आपातकालीन हेल्पलाइन: 112।`
        );
      } else if (isModerate) {
        return (
          `सतर्कता सूचना (ADVISORY): ${location} — भूस्खलन का मध्यम जोखिम (${pct}%) बना हुआ है। ` +
          `7 दिनों की वर्षा ${rain7d.toFixed(1)} mm दर्ज की गई। ` +
          `पहाड़ी मार्गों पर सावधानी बरतें और ढलान निगरानी रखें। आपातकालीन हेल्पलाइन: 112।`
        );
      } else {
        return (
          `सामान्य सूचना: ${location} — भूस्खलन का जोखिम न्यूनतम (${pct}%) है। ` +
          `7 दिनों की वर्षा ${rain7d.toFixed(1)} mm है। स्थिति सामान्य है।`
        );
      }
    case 'na':
      if (isHigh) {
        return (
          `CRITICAL HIGH ALERT: ${location} — Landslide hazard bohot dangar hoise (${pct}%)! ` +
          `7-din te ${rain7d.toFixed(1)} mm barish hoise. ` +
          `Turant safe relief shelter te jabi. Emergency Helpline: 112.`
        );
      } else if (isModerate) {
        return (
          `ADVISORY NOTICE: ${location} — Landslide hazard moderate ase (${pct}%). ` +
          `7-din te ${rain7d.toFixed(1)} mm barish hoise. ` +
          `Hill road te sabdhani thakibi aru monitoring rakhibi. Helpline: 112.`
        );
      } else {
        return (
          `NORMAL NOTICE: ${location} — Landslide risk kom ase (${pct}%). ` +
          `Sab bhal ase. Monitoring choli ase.`
        );
      }
  }
}

export type AlertFilter = 'ALL' | 'HIGH' | 'MODERATE' | 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';

export function AlertPanel({
  alerts,
  onAcknowledge,
  onResolve,
  onSelectAlertLocation,
}: AlertPanelProps) {
  const [filter, setFilter] = useState<AlertFilter>('ACTIVE');
  const [lang, setLang] = useState<Lang>('en');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [selectedPreviewAlertId, setSelectedPreviewAlertId] = useState<string | null>(null);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchFeedback, setDispatchFeedback] = useState<{ type: 'success' | 'error' | 'duplicate'; message: string } | null>(null);
  const [dispatchedAlertIds, setDispatchedAlertIds] = useState<Set<string>>(new Set());

  const filteredAlerts = useMemo(() => {
    return alerts
      .filter((a) => {
        if (filter === 'ALL') return true;
        if (filter === 'HIGH') return a.risk_level.toUpperCase() === 'HIGH';
        if (filter === 'MODERATE') return a.risk_level.toUpperCase() === 'MODERATE';
        if (filter === 'ACTIVE') return a.status === 'ACTIVE';
        if (filter === 'ACKNOWLEDGED') return a.status === 'ACKNOWLEDGED';
        if (filter === 'RESOLVED') return a.status === 'RESOLVED';
        return true;
      })
      .sort((a, b) => b.risk_score - a.risk_score);
  }, [alerts, filter]);

  const counts = {
    all: alerts.length,
    high: alerts.filter((a) => a.risk_level.toUpperCase() === 'HIGH').length,
    moderate: alerts.filter((a) => a.risk_level.toUpperCase() === 'MODERATE').length,
    active: alerts.filter((a) => a.status === 'ACTIVE').length,
    acknowledged: alerts.filter((a) => a.status === 'ACKNOWLEDGED').length,
    resolved: alerts.filter((a) => a.status === 'RESOLVED').length,
  };

  // Find the absolute highest risk alert among ACTIVE alerts only as default preview.
  // RESOLVED alerts must NEVER remain on top in preview when resolved!
  const defaultTopAlert = useMemo(() => {
    const active = alerts.filter((a) => a.status === 'ACTIVE');
    if (active.length === 0) return null;
    return active.reduce((max, a) => (a.risk_score > max.risk_score ? a : max), active[0]);
  }, [alerts]);

  const topAlert = useMemo(() => {
    if (selectedPreviewAlertId) {
      const selected = alerts.find((a) => a.alert_id === selectedPreviewAlertId);
      // Only keep selected alert if it exists and is ACTIVE
      if (selected && selected.status === 'ACTIVE') return selected;
    }
    return defaultTopAlert;
  }, [selectedPreviewAlertId, alerts, defaultTopAlert]);

  const handleAction = async (alertId: string, action: 'ack' | 'resolve') => {
    setActionLoadingId(alertId);
    try {
      if (action === 'ack') {
        await onAcknowledge(alertId);
      } else {
        await onResolve(alertId);
        // When resolving the currently previewed alert, deselect it so it drops immediately
        if (selectedPreviewAlertId === alertId) {
          setSelectedPreviewAlertId(null);
        }
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDispatchToPhone = async () => {
    if (!topAlert) return;
    if (dispatchedAlertIds.has(topAlert.alert_id)) {
      setDispatchFeedback({
        type: 'duplicate',
        message: `Alert ${topAlert.alert_id} already dispatched to phone. Select another cell or resolve to send again.`,
      });
      return;
    }

    const currentBroadcast = getAlertBroadcast(
      lang,
      topAlert.location,
      topAlert.risk_score,
      topAlert.rainfall_7d,
      topAlert.risk_level
    );

    setDispatching(true);
    setDispatchFeedback(null);
    try {
      const res = await dispatchSimulateHighAlert({
        cell_id: topAlert.cell_id,
        location: topAlert.location,
        risk_score: topAlert.risk_score,
        rainfall_7d: topAlert.rainfall_7d,
        message: currentBroadcast,
        advisory: currentBroadcast,
        reset_active_cell: false,
        force_dispatch: true,
        is_demo: true,
      });

      if (res.is_duplicate) {
        setDispatchedAlertIds((prev) => new Set(prev).add(topAlert.alert_id));
        setDispatchFeedback({
          type: 'duplicate',
          message: `Alert ${res.alert_id} is already active on responder device. Duplicate suppressed.`,
        });
      } else {
        setDispatchedAlertIds((prev) => new Set(prev).add(topAlert.alert_id));
        setDispatchFeedback({
          type: 'success',
          message: `Test alert dispatched to authorized responder (${res.alert_id}).`,
        });
      }
    } catch (err: any) {
      setDispatchFeedback({
        type: 'error',
        message: err?.message || 'Failed to dispatch alert to authorized responder.',
      });
    } finally {
      setDispatching(false);
      setTimeout(() => {
        setDispatchFeedback((prev) => (prev?.type === 'success' ? null : prev));
      }, 7000);
    }
  };


  const filterOptions: { id: AlertFilter; label: string; count: number }[] = [
    { id: 'ALL', label: 'All', count: counts.all },
    { id: 'HIGH', label: 'High', count: counts.high },
    { id: 'MODERATE', label: 'Moderate', count: counts.moderate },
    { id: 'ACTIVE', label: 'Active', count: counts.active },
    { id: 'ACKNOWLEDGED', label: 'Acknowledged', count: counts.acknowledged },
    { id: 'RESOLVED', label: 'Resolved', count: counts.resolved },
  ];

  return (
    <section
      aria-labelledby="alert-heading"
      className="rounded-2xl border border-ts-border bg-ts-surface1 overflow-hidden shadow-ts-panel flex flex-col"
    >
      {/* Header bar */}
      <div className="px-5 py-3.5 border-b border-ts-border bg-ts-surface1 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <SirenIcon className="w-4 h-4 text-red-500 dark:text-red-400" />
          </div>
          <div>
            <h2 id="alert-heading" className="text-xs font-bold text-ts-text uppercase tracking-wider">
              Disaster Early Warning Feed
            </h2>
            <p className="text-[11px] text-ts-text3">
              Operational alerts across 8 Northeast Indian States
            </p>
          </div>
        </div>

        {/* 6-Way Filter Tabs: All, High, Moderate, Active, Acknowledged, Resolved */}
        <div className="flex items-center gap-1 bg-ts-surface2 p-1 rounded-lg border border-ts-border text-[11px] flex-wrap">
          {filterOptions.map((opt) => {
            const isSelected = filter === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setFilter(opt.id)}
                className={`px-2.5 py-1 rounded font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-ts-surface1 text-ts-text shadow-xs border border-ts-border font-bold'
                    : 'text-ts-text3 hover:text-ts-text'
                }`}
              >
                <span>{opt.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    isSelected ? 'bg-ts-accent/20 text-ts-accent' : 'bg-ts-surface2 text-ts-text3'
                  }`}
                >
                  {opt.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* Left Col (7 cols): Operational Alerts Feed */}
        <div className="lg:col-span-7 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Incident Registry ({filteredAlerts.length})
            </span>
          </div>

          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
            {filteredAlerts.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-ts-border text-center">
                <CheckCircleIcon className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 mt-2 font-medium">No alerts matching "{filter}"</p>
                <p className="text-[11px] text-slate-500 mt-0.5">All slope sectors in this category are nominal.</p>
              </div>
            ) : (
              filteredAlerts.map((alert) => {
                const isLoading = actionLoadingId === alert.alert_id;
                const isPreviewed = topAlert?.alert_id === alert.alert_id;

                return (
                  <div
                    key={alert.alert_id}
                    onClick={() => setSelectedPreviewAlertId(alert.alert_id)}
                    className={`p-3.5 rounded-xl transition-all flex flex-col gap-2.5 cursor-pointer ${
                      isPreviewed
                        ? 'bg-ts-surface1 border-2 border-ts-accent shadow-lg shadow-black/40'
                        : 'bg-ts-surface1/90 border border-ts-border hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${getRiskBadgeClass(alert.risk_level)}`}>
                            {alert.risk_level === 'HIGH' ? (
                              <>
                                <AlertTriangleIcon className="w-3 h-3 shrink-0" />
                                <span>HIGH</span>
                              </>
                            ) : alert.risk_level === 'MODERATE' ? (
                              <>
                                <AlertCircleIcon className="w-3 h-3 shrink-0" />
                                <span>MODERATE</span>
                              </>
                            ) : (
                              <>
                                <CheckCircleIcon className="w-3 h-3 shrink-0" />
                                <span>LOW</span>
                              </>
                            )}
                          </span>
                          <span className="text-[10px] font-mono text-ts-text2 font-semibold px-1.5 py-0.5 rounded bg-ts-surface2 border border-ts-border">
                            {alert.cell_id}
                          </span>
                          {isPreviewed && (
                            <span className="text-[9px] font-semibold text-ts-accent bg-ts-accent/15 border border-ts-accent/30 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                              <RadioIcon className="w-2.5 h-2.5 shrink-0" />
                              <span>In Preview</span>
                            </span>
                          )}
                        </div>
                        <div className="flex items-start gap-1.5 text-xs text-ts-text font-medium pt-0.5 leading-snug">
                          <MapPinIcon className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <span className="font-semibold text-ts-text">{alert.location}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-mono text-ts-text3 block font-semibold">
                          {alert.alert_id}
                        </span>
                        <span className="text-[9px] text-ts-text3 font-mono">
                          {new Date(alert.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-ts-surface2/60 p-2 rounded-lg border border-ts-border">
                      <div>
                        <span className="text-ts-text3">Landslide Risk:</span>{' '}
                        <span className={`font-bold font-mono ${getRiskTextClass(alert.risk_score)}`}>
                          {(alert.risk_score * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-ts-text3">7-Day Rain:</span>{' '}
                        <span className="font-mono font-medium text-ts-text">
                          {alert.rainfall_7d.toFixed(1)} mm
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-xs">
                      <span className="text-[10px] text-slate-400">
                        Status:{' '}
                        <span
                          className={`font-semibold uppercase px-1.5 py-0.5 rounded text-[9px] ${
                            alert.status === 'ACTIVE'
                              ? 'bg-red-500/20 text-red-300'
                              : alert.status === 'ACKNOWLEDGED'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {alert.status}
                        </span>
                      </span>

                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedPreviewAlertId(alert.alert_id)}
                          className={`px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
                            isPreviewed
                              ? 'bg-ts-accent/20 text-ts-accent border border-ts-accent/40 font-bold'
                              : 'bg-ts-surface2 hover:bg-slate-700 text-slate-300'
                          }`}
                          title="Preview emergency broadcast"
                        >
                          <RadioIcon className="w-3 h-3 shrink-0" />
                          <span>Broadcast</span>
                        </button>

                        {onSelectAlertLocation && (
                          <button
                            onClick={() => onSelectAlertLocation(alert.cell_id)}
                            className="px-2.5 py-1 rounded bg-ts-surface2 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-colors flex items-center gap-1"
                          >
                            <MapPinIcon className="w-3 h-3 shrink-0 text-slate-400" />
                            <span>View on Map</span>
                          </button>
                        )}

                        {alert.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleAction(alert.alert_id, 'ack')}
                            disabled={isLoading}
                            className="px-2.5 py-1 rounded bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 text-amber-300 text-[11px] font-medium transition-colors flex items-center gap-1"
                          >
                            <CheckIcon className="w-3 h-3 shrink-0" />
                            <span>Acknowledge</span>
                          </button>
                        )}

                        {alert.status !== 'RESOLVED' && (
                          <button
                            onClick={() => handleAction(alert.alert_id, 'resolve')}
                            disabled={isLoading}
                            className="px-2.5 py-1 rounded bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 text-emerald-300 text-[11px] font-medium transition-colors flex items-center gap-1"
                          >
                            <CheckCircleIcon className="w-3 h-3 shrink-0" />
                            <span>Resolve</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Col (5 cols): Multi-lingual Broadcast Simulation */}
        <div className="lg:col-span-5 flex flex-col space-y-3 bg-ts-surface1 p-4 rounded-xl border border-ts-border">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-[11px] font-bold text-ts-text uppercase tracking-wider block">
                Emergency Alert Preview
              </span>
              <span className="text-[10px] text-ts-text3 font-mono">
                Draft Preview · Authorized Responder Dispatch
              </span>
            </div>
            <div className="flex gap-1">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={`px-2.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                    lang === l.code
                      ? 'bg-ts-accent/20 text-ts-accent border border-ts-accent/40 font-bold'
                      : 'text-ts-text3 hover:text-ts-text bg-ts-surface2 border border-ts-border'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {topAlert ? (
            <div className="bg-ts-surface2/50 p-4 rounded-xl border border-ts-border flex flex-col gap-2.5 relative">
              {/* Hierarchy: Risk Level & Cell */}
              <div className="flex items-center justify-between text-[11px] border-b border-ts-border pb-2">
                <span className={`font-bold flex items-center gap-1.5 ${
                  topAlert.risk_level.toUpperCase() === 'HIGH' ? 'text-red-500 dark:text-red-400' : 'text-amber-500 dark:text-amber-400'
                }`}>
                  {topAlert.risk_level.toUpperCase() === 'HIGH' ? (
                    <AlertTriangleIcon className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
                  ) : (
                    <AlertCircleIcon className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                  )}
                  <span>{topAlert.risk_level.toUpperCase() === 'HIGH' ? 'HIGH HAZARD ADVISORY' : 'MODERATE ADVISORY'}</span>
                </span>
                <span className="font-mono text-[10px] text-ts-text2 px-2 py-0.5 rounded bg-ts-surface2 border border-ts-border font-bold">
                  {topAlert.cell_id}
                </span>
              </div>

              {/* Hierarchy: Location, Risk Score, 7-Day Rainfall */}
              <div className="grid grid-cols-2 gap-2 text-[11px] bg-ts-surface1 p-2.5 rounded-lg border border-ts-border font-mono">
                <div>
                  <span className="text-ts-text3 block text-[10px]">Calculated Risk Score</span>
                  <span className={`font-bold text-xs ${topAlert.risk_level.toUpperCase() === 'HIGH' ? 'text-red-500 dark:text-red-400' : 'text-amber-500 dark:text-amber-400'}`}>
                    {(topAlert.risk_score * 100).toFixed(1)}% ({topAlert.risk_level})
                  </span>
                </div>
                <div>
                  <span className="text-ts-text3 block text-[10px]">7-Day Cumulative Rain</span>
                  <span className="text-ts-text font-bold text-xs">
                    {topAlert.rainfall_7d.toFixed(1)} mm
                  </span>
                </div>
                <div className="col-span-2 pt-1 border-t border-ts-border font-sans text-xs text-ts-text flex items-center gap-1.5">
                  <MapPinIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="truncate font-medium">{topAlert.location}</span>
                </div>
              </div>

              {/* Actionable Advisory Message */}
              <div className="pt-1">
                <span className="text-[10px] text-ts-text3 uppercase font-semibold tracking-wider block mb-1">
                  Draft Broadcast Text ({lang.toUpperCase()}):
                </span>
                <p className="text-xs text-ts-text leading-relaxed font-sans bg-ts-surface1 p-2.5 rounded-lg border border-ts-border">
                  {getAlertBroadcast(lang, topAlert.location, topAlert.risk_score, topAlert.rainfall_7d, topAlert.risk_level)}
                </p>
              </div>

              <div className="flex items-center justify-between text-[10px] text-ts-text3 pt-1.5 border-t border-ts-border font-mono">
                <span>Alert ID: {topAlert.alert_id}</span>
                <span>Status: {topAlert.status}</span>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-xl border border-dashed border-ts-border text-center bg-ts-surface1">
              <CheckCircleIcon className="w-8 h-8 text-emerald-500 dark:text-emerald-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-ts-text">No Active Disaster Alerts</p>
              <p className="text-[11px] text-ts-text3 mt-1">
                Emergency broadcast console is on standby. All monitored sectors are currently nominal.
              </p>
            </div>
          )}

          {/* Quick Dispatch to Authorized Responder Button */}
          {topAlert && (
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={handleDispatchToPhone}
                disabled={dispatching || dispatchedAlertIds.has(topAlert.alert_id)}
                className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all shadow-md active:scale-[0.98] ${
                  dispatching
                    ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                    : dispatchedAlertIds.has(topAlert.alert_id)
                    ? 'bg-slate-850 text-amber-300/80 border border-amber-500/30 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white border border-red-500/50 hover:shadow-md cursor-pointer'
                }`}
                title={
                  dispatchedAlertIds.has(topAlert.alert_id)
                    ? 'This alert was already dispatched to the responder device. Select another card from Incident Registry to test another cell.'
                    : 'Dispatch this previewed alert to registered authorized responder devices via FCM'
                }
              >
                {dispatching ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Dispatching to Responder Device...</span>
                  </>
                ) : dispatchedAlertIds.has(topAlert.alert_id) ? (
                  <>
                    <AlertCircleIcon className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>Already Dispatched (Duplicate Protected)</span>
                  </>
                ) : (
                  <>
                    <SmartphoneIcon className="w-4 h-4 text-white shrink-0" />
                    <span>Send Test Alert to Authorized Responder</span>
                  </>
                )}
              </button>

              {dispatchFeedback && (
                <div
                  className={`text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-2 font-mono transition-all ${
                    dispatchFeedback.type === 'success'
                      ? 'bg-emerald-950 border border-emerald-600/50 text-emerald-300'
                      : dispatchFeedback.type === 'duplicate'
                      ? 'bg-amber-950 border border-amber-600/50 text-amber-300'
                      : 'bg-rose-950 border border-rose-600/50 text-rose-300'
                  }`}
                >
                  {dispatchFeedback.type === 'success' ? (
                    <CheckCircleIcon className="w-3.5 h-3.5 shrink-0" />
                  ) : dispatchFeedback.type === 'duplicate' ? (
                    <AlertCircleIcon className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <AlertTriangleIcon className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span className="truncate">{dispatchFeedback.message}</span>
                </div>
              )}
            </div>
          )}

          {/* Operational Resilience Note & Future Integrations */}
          <div className="pt-2 border-t border-ts-border space-y-2">
            <div className="p-2.5 rounded-lg bg-ts-surface2 border border-ts-border text-[10px] text-ts-text2 leading-snug">
              <span className="text-ts-text font-semibold block mb-0.5">Operational Delivery Note:</span>
              FCM currently provides internet-based responder notification. Additional communication channels would be required for environments with degraded cellular/internet connectivity.
            </div>
            <div className="text-[10px] text-ts-text3 flex items-center justify-between px-1">
              <span className="font-semibold text-ts-text2">Future Alert Delivery (Planned):</span>
              <span className="text-ts-text3 font-mono text-[9px]">CAP · Cell Broadcast · VHF/HF · Satellite</span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
