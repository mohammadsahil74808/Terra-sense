/**
 * RoadmapStrip — honest capability roadmap.
 * Shows which features are live, conceptual, or planned.
 * Judges appreciate transparency about prototype scope.
 */

import React from 'react';
import {
  ActivityIcon,
  CompassIcon,
  ZapIcon,
  SmartphoneIcon,
  RadioIcon,
  CameraIcon,
  LayersIcon,
} from './icons';

type StatusTag = 'Live' | 'Concept' | 'Planned';

interface RoadmapItem {
  label: string;
  description: string;
  status: StatusTag;
  icon: React.ComponentType<{ className?: string }>;
}

const ITEMS: RoadmapItem[] = [
  {
    label: 'Risk ML Model',
    description: 'RandomForest trained on terrain + rainfall features',
    status: 'Live',
    icon: ActivityIcon,
  },
  {
    label: 'Interactive Map',
    description: 'Leaflet.js map with real village coordinates',
    status: 'Live',
    icon: CompassIcon,
  },
  {
    label: 'What-If Simulator',
    description: 'Live ML inference via REST API',
    status: 'Live',
    icon: ZapIcon,
  },
  {
    label: 'SMS Alert System',
    description: 'Twilio/MSG91 integration — architecture designed',
    status: 'Planned',
    icon: SmartphoneIcon,
  },
  {
    label: 'Soil Moisture',
    description: 'NASA SMAP satellite proxy integration',
    status: 'Concept',
    icon: LayersIcon,
  },
  {
    label: 'Satellite Imagery',
    description: 'Sentinel-2 change detection for slope movement',
    status: 'Concept',
    icon: RadioIcon,
  },
  {
    label: 'Citizen Photo Upload',
    description: 'Crowd-sourced ground truth via mobile app',
    status: 'Concept',
    icon: CameraIcon,
  },
  {
    label: 'Offline SMS Support',
    description: 'Low-connectivity fallback for field officers',
    status: 'Planned',
    icon: RadioIcon,
  },
];

const STATUS_STYLES: Record<StatusTag, string> = {
  Live:    'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  Concept: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  Planned: 'bg-ts-surface2 text-ts-text3 border border-ts-border',
};

export function RoadmapStrip() {
  return (
    <section aria-labelledby="roadmap-heading" className="mt-8">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-4">
        <h2
          id="roadmap-heading"
          className="text-sm font-semibold text-ts-text2 uppercase tracking-widest"
        >
          Feature Roadmap &amp; Coverage
        </h2>
        <div className="flex-1 h-px bg-ts-border" />
        {/* Legend */}
        <div className="hidden sm:flex items-center gap-3 text-[10px]">
          {(['Live', 'Concept', 'Planned'] as StatusTag[]).map((s) => (
            <span key={s} className={`px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[s]}`}>
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Grid of roadmap items */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ITEMS.map((item) => {
          const IconComp = item.icon;
          return (
            <div
              key={item.label}
              className="p-3 rounded-lg border border-ts-border bg-ts-surface1/60 flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="p-1 rounded bg-ts-accent/10 border border-ts-accent/20">
                  <IconComp className="w-4 h-4 text-ts-accent" />
                </div>
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_STYLES[item.status]}`}
                >
                  {item.status}
                </span>
              </div>
              <div>
                <p className="text-xs font-medium text-ts-text leading-tight">{item.label}</p>
                <p className="text-[11px] text-ts-text3 mt-0.5 leading-snug">{item.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
