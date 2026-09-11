/**
 * GroundReportModal — Report Ground Condition dialog.
 * Genuinely submits ground observations and optional photos to backend SQLite database.
 * Does NOT fake photo upload or success status.
 */

import { useState, useEffect, useRef } from 'react';
import type { GridCell, GroundCondition, GroundReport } from '../types';
import { submitGroundReport } from '../api/client';
import {
  FileTextIcon,
  XIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  CameraIcon,
} from './icons';

interface GroundReportModalProps {
  cell: GridCell | null;
  open: boolean;
  onClose: () => void;
  onSuccess: (newReport: GroundReport) => void;
}

const CONDITIONS: GroundCondition[] = [
  'No visible issue',
  'Surface cracks',
  'Slope movement',
  'Rockfall',
  'Landslide',
  'Other',
];

export function GroundReportModal({
  cell,
  open,
  onClose,
  onSuccess,
}: GroundReportModalProps) {
  const [condition, setCondition] = useState<GroundCondition>('No visible issue');
  const [description, setDescription] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens or cell changes
  useEffect(() => {
    if (open) {
      setCondition('No visible issue');
      setDescription('');
      setPhotoFile(null);
      setPhotoPreview(null);
      setError(null);
      setSuccess(false);
    }
  }, [open, cell]);

  if (!open || !cell) return null;

  const cellIdFormatted = `NE_${cell.cell_id.toString().padStart(4, '0')}`;
  const locationFormatted = `${cell.state || 'Northeast India'} · Cell ${cellIdFormatted}`;
  const currentTimestamp = new Date().toISOString();

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Photo exceeds 10 MB limit.');
      return;
    }

    setError(null);
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('cell_id', cellIdFormatted);
      formData.append('latitude', cell.latitude.toString());
      formData.append('longitude', cell.longitude.toString());
      formData.append('location', locationFormatted);
      formData.append('condition', condition);
      if (description.trim()) {
        formData.append('description', description.trim());
      }
      if (photoFile) {
        formData.append('photo', photoFile);
      }

      // Backend API call — real SQLite persistence
      const savedReport = await submitGroundReport(formData);

      setSuccess(true);
      setTimeout(() => {
        onSuccess(savedReport);
        onClose();
      }, 1400);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed. Please check network.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop — High z-index ensures map and page sit cleanly in the background */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md"
        onClick={() => !isSubmitting && onClose()}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-ts-surface1 border border-ts-border rounded-2xl shadow-ts-panel overflow-hidden animate-fade-in-up z-10">
        {/* Header */}
        <div className="bg-ts-surface1 border-b border-ts-border px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-ts-accent/10 border border-ts-accent/30 flex items-center justify-center">
              <FileTextIcon className="w-4 h-4 text-ts-accent" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-ts-text uppercase tracking-wider">
                Report Ground Condition
              </h3>
              <p className="text-[11px] text-ts-text3">
                Submit field verification observation to operations database
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-ts-surface2 hover:bg-ts-surface2/80 text-ts-text3 hover:text-ts-text transition-colors text-sm cursor-pointer"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Success banner — ONLY after backend confirms */}
          {success && (
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 flex items-center gap-2.5 animate-pulse">
              <CheckCircleIcon className="w-5 h-5 text-emerald-500 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold">Report submitted successfully</p>
                <p className="text-[11px] opacity-90">
                  Recorded in operational database. Pending field engineer verification.
                </p>
              </div>
            </div>
          )}

          {/* Error alert */}
          {error && (
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-300 flex items-center gap-2">
              <AlertTriangleIcon className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Grid Metadata Row */}
          <div className="grid grid-cols-2 gap-2 bg-ts-surface2 p-3 rounded-xl border border-ts-border">
            <div>
              <span className="text-[10px] text-ts-text3 block">Cell ID</span>
              <span className="font-mono font-bold text-ts-accent">{cellIdFormatted}</span>
            </div>
            <div>
              <span className="text-[10px] text-ts-text3 block">Location</span>
              <span className="font-semibold text-ts-text truncate block">{locationFormatted}</span>
            </div>
            <div>
              <span className="text-[10px] text-ts-text3 block">Coordinates</span>
              <span className="font-mono text-ts-text2">
                {cell.latitude.toFixed(4)}°N, {cell.longitude.toFixed(4)}°E
              </span>
            </div>
            <div>
              <span className="text-[10px] text-ts-text3 block">Timestamp</span>
              <span className="font-mono text-ts-text2">
                {new Date(currentTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} (UTC)
              </span>
            </div>
          </div>

          {/* Condition Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-ts-text block uppercase tracking-wider">
              Observed Slope Condition <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {CONDITIONS.map((cond) => {
                const isSelected = condition === cond;
                return (
                  <button
                    key={cond}
                    type="button"
                    onClick={() => setCondition(cond)}
                    className={`py-2 px-2.5 rounded-lg border text-left font-medium text-[11px] transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-ts-accent/15 border-ts-accent/50 text-ts-accent shadow-xs'
                        : 'bg-ts-surface2 border-ts-border text-ts-text3 hover:text-ts-text hover:border-ts-border'
                    }`}
                  >
                    <span className="block truncate">{cond}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-ts-text block uppercase tracking-wider">
              Field Description & Notes
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe physical indicators (e.g. tension crack width, runoff turbidity, leaning trees)..."
              className="w-full bg-ts-surface2 border border-ts-border rounded-lg p-2.5 text-ts-text placeholder-ts-text3 focus:outline-none focus:border-ts-accent text-xs resize-none"
            />
          </div>

          {/* Photo Upload */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-ts-text block uppercase tracking-wider">
              Field Photo Evidence <span className="text-[10px] text-ts-text3 font-normal lowercase">(optional)</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoSelect}
              className="hidden"
            />

            {photoPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-ts-border bg-ts-surface2 p-2 flex items-center gap-3">
                <img
                  src={photoPreview}
                  alt="Evidence preview"
                  className="w-16 h-16 object-cover rounded-lg border border-ts-border"
                />
                <div className="flex-1 min-w-0 text-[11px]">
                  <p className="text-ts-text truncate font-medium">{photoFile?.name}</p>
                  <p className="text-ts-text3 font-mono text-[10px]">
                    {photoFile ? `${(photoFile.size / 1024).toFixed(1)} KB` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="text-ts-text3 hover:text-red-500 px-2 py-1 text-xs cursor-pointer flex items-center gap-1"
                >
                  <XIcon className="w-3 h-3" />
                  <span>Remove</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 px-4 border border-dashed border-ts-border hover:border-ts-accent/50 rounded-xl bg-ts-surface2/40 text-ts-text3 hover:text-ts-accent text-center transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <CameraIcon className="w-4 h-4 text-ts-text3" />
                <span>Select Slope Photo from Device</span>
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-ts-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-ts-surface2 hover:bg-ts-surface2/80 text-ts-text2 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || success}
              className="px-5 py-2 rounded-lg bg-ts-accent hover:bg-ts-accent/90 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-ts-accent/20 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>SUBMIT REPORT</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

