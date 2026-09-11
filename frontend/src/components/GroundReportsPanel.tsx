/**
 * GroundReportsPanel — Ground Verification feed and review console.
 * Displays real SQLite-backed field reports with actual counts:
 * Pending, Verified, Rejected.
 * Operators can review, verify/reject, and jump to report locations on the map.
 * NO FAKE REPORTS.
 */

import { useState } from 'react';
import type { GroundReport, ReportStatus } from '../types';
import { updateGroundReportStatus } from '../api/client';
import {
  ActivityIcon,
  FileTextIcon,
  CameraIcon,
  XIcon,
  PlusIcon,
} from './icons';

interface GroundReportsPanelProps {
  reports: GroundReport[];
  onSelectReportLocation?: (cellId: string) => void;
  onOpenReportModal?: () => void;
  onReportStatusChange?: (updated: GroundReport) => void;
}

type FilterType = 'ALL' | ReportStatus;

function getConditionBadge(condition: string) {
  switch (condition) {
    case 'Landslide':
      return 'bg-red-500/20 text-red-300 border-red-500/40';
    case 'Rockfall':
    case 'Slope movement':
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    case 'Surface cracks':
      return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
    case 'No visible issue':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    default:
      return 'bg-slate-800 text-slate-300 border-slate-700';
  }
}

export function GroundReportsPanel({
  reports,
  onSelectReportLocation,
  onOpenReportModal,
  onReportStatusChange,
}: GroundReportsPanelProps) {
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activePhoto, setActivePhoto] = useState<string | null>(null);

  const counts = {
    pending: reports.filter((r) => r.status === 'PENDING').length,
    verified: reports.filter((r) => r.status === 'VERIFIED').length,
    rejected: reports.filter((r) => r.status === 'REJECTED').length,
    total: reports.length,
  };

  const filteredReports = reports.filter((r) => {
    if (filter === 'ALL') return true;
    return r.status === filter;
  });

  const handleStatusUpdate = async (reportId: string, newStatus: ReportStatus) => {
    setUpdatingId(reportId);
    try {
      const updated = await updateGroundReportStatus(reportId, newStatus);
      if (onReportStatusChange) {
        onReportStatusChange(updated);
      }
    } catch (err) {
      console.error('Failed to update ground report status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <section
      aria-labelledby="ground-reports-heading"
      className="glass-card rounded-2xl border border-ts-border bg-ts-base overflow-hidden shadow-2xl flex flex-col"
    >
      {/* Header bar */}
      <div className="px-5 py-3.5 border-b border-ts-border bg-ts-surface1/90 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-ts-accent/10 border border-ts-accent/30 flex items-center justify-center">
            <ActivityIcon className="w-4 h-4 text-ts-accent" />
          </div>
          <div>
            <h2 id="ground-reports-heading" className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Ground Verification Registry
            </h2>
            <p className="text-[11px] text-slate-500">
              Field observations for operational confirmation & future model validation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Counts / Filters */}
          <div className="flex items-center gap-1 bg-ts-surface2/80 p-1 rounded-lg border border-ts-border text-[11px]">
            {[
              { id: 'ALL' as FilterType, label: 'All', count: counts.total },
              { id: 'PENDING' as FilterType, label: 'Pending', count: counts.pending, color: 'text-amber-400' },
              { id: 'VERIFIED' as FilterType, label: 'Verified', count: counts.verified, color: 'text-emerald-400' },
              { id: 'REJECTED' as FilterType, label: 'Rejected', count: counts.rejected, color: 'text-red-400' },
            ].map((tab) => {
              const isSelected = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={`px-2.5 py-1 rounded font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-ts-surface1 text-slate-100 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1 rounded-full font-mono font-bold ${
                      isSelected ? 'bg-ts-accent/20 text-ts-accent' : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Report Button */}
          {onOpenReportModal && (
            <button
              onClick={onOpenReportModal}
              className="px-3 py-1.5 rounded-lg bg-ts-accent/15 border border-ts-accent/30 text-ts-accent hover:bg-ts-accent/25 text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>Report Condition</span>
            </button>
          )}
        </div>
      </div>

      {/* Reports List */}
      <div className="p-4 sm:p-5">
        {filteredReports.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed border-ts-border text-center max-w-md mx-auto">
            <FileTextIcon className="w-8 h-8 text-slate-600 block mb-2 mx-auto" />
            <p className="text-xs font-bold text-slate-300">
              {filter === 'ALL'
                ? 'No ground reports recorded yet'
                : `No reports matching status "${filter}"`}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Field observations submitted by local emergency teams will appear here with verification controls.
            </p>
            {onOpenReportModal && (
              <button
                onClick={onOpenReportModal}
                className="mt-3 px-3.5 py-1.5 rounded-lg bg-ts-accent/15 border border-ts-accent/30 text-ts-accent text-xs font-semibold hover:bg-ts-accent/25 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span>Submit First Observation</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredReports.map((report) => {
              const isUpdating = updatingId === report.report_id;

              return (
                <div
                  key={report.report_id}
                  className="p-3.5 rounded-xl bg-ts-surface1/80 border border-ts-border hover:border-slate-700 transition-all flex flex-col justify-between gap-3 text-xs"
                >
                  <div className="space-y-2">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-ts-accent text-[11px] px-1.5 py-0.5 rounded bg-ts-accent/10 border border-ts-accent/25">
                            {report.cell_id}
                          </span>
                          <span className="font-semibold text-slate-200 text-xs truncate">
                            {report.location}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                          ID: {report.report_id} · {new Date(report.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Status */}
                      <span
                        className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          report.status === 'VERIFIED'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}
                      >
                        {report.status}
                      </span>
                    </div>

                    {/* Condition badge */}
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getConditionBadge(report.condition)}`}>
                        {report.condition}
                      </span>
                      {report.photo_reference && (
                        <button
                          onClick={() => setActivePhoto(report.photo_reference || null)}
                          className="text-[10px] text-ts-accent hover:text-ts-accent/80 font-medium flex items-center gap-1 underline underline-offset-2 cursor-pointer"
                        >
                          <CameraIcon className="w-3.5 h-3.5" />
                          <span>Photo Evidence</span>
                        </button>
                      )}
                    </div>

                    {/* Description */}
                    {report.description && (
                      <p className="text-[11px] text-slate-300 bg-ts-surface2/60 p-2 rounded-lg border border-ts-border leading-relaxed italic">
                        "{report.description}"
                      </p>
                    )}
                  </div>

                  {/* Actions footer */}
                  <div className="pt-2 border-t border-ts-border flex items-center justify-between gap-1">
                    {onSelectReportLocation && (
                      <button
                        onClick={() => onSelectReportLocation(report.cell_id)}
                        className="px-2.5 py-1 rounded bg-ts-surface2 hover:bg-ts-surface2/80 text-slate-300 text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        View On Map
                      </button>
                    )}

                    {/* Verification Actions for Pending reports */}
                    <div className="flex items-center gap-1">
                      {report.status !== 'VERIFIED' && (
                        <button
                          onClick={() => handleStatusUpdate(report.report_id, 'VERIFIED')}
                          disabled={isUpdating}
                          className="px-2 py-0.8 rounded bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 text-emerald-300 text-[10px] font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          Verify
                        </button>
                      )}
                      {report.status !== 'REJECTED' && (
                        <button
                          onClick={() => handleStatusUpdate(report.report_id, 'REJECTED')}
                          disabled={isUpdating}
                          className="px-2 py-0.8 rounded bg-red-500/15 border border-red-500/30 hover:bg-red-500/25 text-red-300 text-[10px] font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Photo Preview Modal */}
      {activePhoto && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md" role="dialog">
          <div className="relative max-w-lg w-full bg-ts-base border border-ts-border rounded-2xl overflow-hidden p-4 space-y-3 z-10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">Field Photo Evidence</span>
              <button
                onClick={() => setActivePhoto(null)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold p-1 cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="rounded-xl overflow-hidden border border-ts-border bg-ts-surface2 flex items-center justify-center max-h-[70vh]">
              <img src={activePhoto} alt="Field evidence" className="max-h-full max-w-full object-contain" />
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setActivePhoto(null)}
                className="px-3 py-1.5 rounded-lg bg-ts-surface2 text-slate-300 text-xs font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

