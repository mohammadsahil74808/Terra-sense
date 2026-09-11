/**
 * TerraSense — Risk helper utilities
 * Enforces frozen production thresholds:
 * LOW < 0.33 | MODERATE 0.33 - 0.66 | HIGH >= 0.66
 */

import type { RiskLevel } from '../types';

export function getRiskLevel(score: number): RiskLevel {
  if (score >= 0.66) return 'HIGH';
  if (score >= 0.33) return 'MODERATE';
  return 'LOW';
}

/** Hex color for risk score and susceptibility markers */
export function getRiskColor(score: number): string {
  if (score >= 0.66) return '#EF4444'; // red-500
  if (score >= 0.33) return '#F59E0B'; // amber-500
  return '#10B981';                    // emerald-500
}

/** Susceptibility color mapping with opacity for grid layer */
export function getSusceptibilityColor(score: number): string {
  if (score >= 0.66) return '#EF4444'; // Red for high susceptibility
  if (score >= 0.33) return '#F59E0B'; // Amber for moderate susceptibility
  if (score >= 0.15) return '#06B6D4'; // Cyan for low-moderate
  return '#10B981';                    // Emerald for minimal susceptibility
}

/** Tailwind text color class */
export function getRiskTextClass(score: number): string {
  if (score >= 0.66) return 'text-red-400';
  if (score >= 0.33) return 'text-amber-400';
  return 'text-emerald-400';
}

/** Tailwind badge classes (bg + text + border) for risk level label */
export function getRiskBadgeClass(level: string): string {
  switch (level.toUpperCase()) {
    case 'CRITICAL':
    case 'HIGH':
      return 'bg-red-500/15 text-red-400 border border-red-500/30';
    case 'MODERATE':
      return 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
    case 'LOW':
    default:
      return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
  }
}

/** Circle marker radius on the map, scaled by susceptibility */
export function getRiskMapRadius(score: number): number {
  return 5 + Math.min(score * 12, 12);
}

/** Box shadow glow for stat cards */
export function getRiskGlowClass(level: RiskLevel): string {
  switch (level) {
    case 'HIGH':
      return 'shadow-glow-red';
    case 'MODERATE':
      return 'shadow-glow-orange';
    case 'LOW':
      return 'shadow-glow-green';
  }
}
