/**
 * TerraSense — Live Weather Page Redesign
 * 
 * Inspired by the information architecture of the NER Weather Connect reference:
 * - Dominant, immersive regional map (Northeast India)
 * - Glassmorphic visual hierarchy (Primary, Secondary, Subtle glass layers)
 * - Dynamically anchored state callout pins that move smoothly on pan/zoom
 * - Data-driven continuous rain streaks & radar heat gradient on Canvas (z-index: 450)
 * - Left alerts panel, right forecast details & state list, bottom timeline scrubber
 * - Rainfall intensity legend & floating selected location inspector
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import type { GridCell, AlertRecord, RainfallHotspot, WeatherTimelinePoint } from '../types';
import { fetchWeatherHotspots, fetchWeatherTimeline } from '../api/client';
import {
  CloudRainIcon,
  CloudIcon,
  SunIcon,
  CloudSunIcon,
  CloudLightningIcon,
  RadioIcon,
  MapPinIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  XIcon,
  PlayIcon,
  PauseIcon,
} from './icons';

function WeatherGlyph({ condition, className = 'w-4 h-4' }: { condition?: string; className?: string }) {
  if (!condition) return <CloudSunIcon className={className} />;
  const cond = condition.toLowerCase();
  if (cond.includes('thunder') || cond.includes('storm')) return <CloudLightningIcon className={className} />;
  if (cond.includes('heavy') || cond.includes('moderate rain') || cond.includes('rain')) return <CloudRainIcon className={className} />;
  if (cond.includes('light') || cond.includes('drizzle') || cond.includes('shower')) return <CloudSunIcon className={className} />;
  if (cond.includes('cloud') || cond.includes('overcast')) return <CloudIcon className={className} />;
  if (cond.includes('clear') || cond.includes('sun')) return <SunIcon className={className} />;
  return <CloudSunIcon className={className} />;
}

// Northeast India Regional Extents
const NE_CENTER: [number, number] = [26.1, 93.1];
const DEFAULT_ZOOM = 7;

// 8 Northeast Indian States Geo-Anchors (Reference Image Layout Inspiration)
interface StateAnchor {
  id: string;
  name: string;
  capital: string;
  lat: number;
  lon: number;
}

const NE_STATES: StateAnchor[] = [
  { id: 'assam', name: 'Assam', capital: 'Guwahati', lat: 26.1445, lon: 91.7362 },
  { id: 'arunachal', name: 'Arunachal Pradesh', capital: 'Itanagar', lat: 27.0844, lon: 93.6053 },
  { id: 'meghalaya', name: 'Meghalaya', capital: 'Shillong', lat: 25.5788, lon: 91.8933 },
  { id: 'nagaland', name: 'Nagaland', capital: 'Kohima', lat: 25.6751, lon: 94.1086 },
  { id: 'manipur', name: 'Manipur', capital: 'Imphal', lat: 24.8170, lon: 93.9368 },
  { id: 'mizoram', name: 'Mizoram', capital: 'Aizawl', lat: 23.7271, lon: 92.7176 },
  { id: 'tripura', name: 'Tripura', capital: 'Agartala', lat: 23.8315, lon: 91.2868 },
  { id: 'sikkim', name: 'Sikkim', capital: 'Gangtok', lat: 27.3389, lon: 88.6065 },
];

// State baseline climatology elevation-adjusted defaults
const STATE_BASE_CLIMATE: Record<string, { temp: number; humidity: number }> = {
  assam: { temp: 27, humidity: 72 },
  arunachal: { temp: 22, humidity: 78 },
  meghalaya: { temp: 19, humidity: 88 },
  nagaland: { temp: 18, humidity: 82 },
  manipur: { temp: 22, humidity: 75 },
  mizoram: { temp: 21, humidity: 80 },
  tripura: { temp: 27, humidity: 76 },
  sikkim: { temp: 16, humidity: 85 },
};

export interface LiveWeatherMapProps {
  cells?: GridCell[];
  selectedCell?: GridCell | null;
  onCellSelect?: (cell: GridCell) => void;
  alerts?: AlertRecord[];
  className?: string;
}

/** Map controller to handle invalidateSize & programmatic camera transitions */
function MapViewController({
  targetCenter,
  targetZoom,
}: {
  targetCenter: [number, number] | null;
  targetZoom: number;
}) {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (targetCenter) {
      map.flyTo(targetCenter, targetZoom, { duration: 1.2 });
    }
  }, [map, targetCenter, targetZoom]);

  return null;
}

/**
 * StatePinsLayer: Dynamically anchors the 8 state glass badges to exact geographical coordinates.
 * Updates on map move, zoom, and resize so badges track the terrain perfectly.
 */
function StatePinsLayer({
  statesData,
  selectedStateId,
  onSelectState,
}: {
  statesData: Array<StateAnchor & {
    rainfallRange: string;
    meanMm: number;
    maxMm: number;
    temperature: number;
    humidity: number;
    condition: string;
    icon: string;
    isRaining: boolean;
  }>;
  selectedStateId: string | null;
  onSelectState: (state: typeof statesData[0]) => void;
}) {
  const map = useMap();
  const [positions, setPositions] = useState<{ [id: string]: { x: number; y: number } }>({});

  const updatePositions = useCallback(() => {
    const nextPos: { [id: string]: { x: number; y: number } } = {};
    statesData.forEach((st) => {
      const pt = map.latLngToContainerPoint([st.lat, st.lon]);
      nextPos[st.id] = { x: pt.x, y: pt.y };
    });
    setPositions(nextPos);
  }, [map, statesData]);

  useEffect(() => {
    updatePositions();
    map.on('move', updatePositions);
    map.on('zoom', updatePositions);
    map.on('resize', updatePositions);
    return () => {
      map.off('move', updatePositions);
      map.off('zoom', updatePositions);
      map.off('resize', updatePositions);
    };
  }, [map, updatePositions]);

  return (
    <div className="absolute inset-0 pointer-events-none z-[460] overflow-hidden">
      {statesData.map((st) => {
        const pos = positions[st.id];
        if (!pos) return null;
        // Skip if out of viewport
        if (pos.x < -100 || pos.y < -100 || pos.x > window.innerWidth + 100 || pos.y > window.innerHeight + 100) {
          return null;
        }

        const isSelected = selectedStateId === st.id;

        return (
          <div
            key={st.id}
            style={{
              transform: `translate(${pos.x}px, ${pos.y}px) translate(-50%, -100%)`,
            }}
            className="absolute transition-transform duration-75 ease-out select-none"
          >
            {/* Glass Callout Badge */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                onSelectState(st);
              }}
              className={`pointer-events-auto cursor-pointer flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-300 ${
                isSelected
                  ? 'bg-[#0B1528]/95 border-2 border-sky-400 shadow-[0_0_25px_rgba(56,189,248,0.5)] scale-105'
                  : 'bg-[#091120]/80 hover:bg-[#0E1A33]/90 border border-slate-700/60 hover:border-sky-500/50 shadow-xl backdrop-blur-md'
              }`}
            >
              {/* Weather Glyph */}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                st.isRaining ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
              }`}>
                <WeatherGlyph condition={st.condition} className="w-4 h-4" />
              </div>

              {/* State Name, Live Temperature & Live Rainfall Rate */}
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-100 tracking-tight">
                    {st.name}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-500/15 px-1 py-0.2 rounded border border-amber-400/25">
                    {st.temperature}°C
                  </span>
                  {st.isRaining && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" title="Precipitation active" />
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="font-mono font-semibold text-sky-400">
                    {st.rainfallRange}
                  </span>
                  <span className="text-slate-400 text-[10px]">
                    · {st.condition}
                  </span>
                </div>
              </div>
            </div>

            {/* Stem pointer anchoring down to geographical coordinate */}
            <div className="flex flex-col items-center">
              <div className={`w-0.5 h-3 ${isSelected ? 'bg-sky-400' : 'bg-slate-500/60'}`} />
              <div className={`w-2 h-2 rounded-full border-2 ${
                isSelected ? 'bg-sky-400 border-white ring-4 ring-sky-400/30' : 'bg-slate-300 border-slate-900'
              }`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * WeatherCanvasOverlay: High-performance HTML5 Canvas rendered at z-index 450.
 * Renders:
 * 1. Data-driven continuous diagonal rain streaks over precipitation hotspots
 * 2. Soft, translucent precipitation radar glow (non-opaque, leaves map visible)
 * 3. Delicate atmospheric cloud mist (only when toggled, faint silver, no black blobs)
 */
/** Procedural jagged lightning bolt generator for thunderstorms */
function generateLightningBolt(startX: number, startY: number, endX: number, endY: number) {
  const main: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  const forks: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

  let curX = startX;
  let curY = startY;
  const steps = 8;
  const dy = (endY - startY) / steps;

  for (let i = 0; i < steps; i++) {
    const nextY = curY + dy;
    const isLast = i === steps - 1;
    const nextX = isLast ? endX : curX + (endX - curX) * 0.22 + (Math.random() - 0.5) * 36;
    main.push({ x1: curX, y1: curY, x2: nextX, y2: nextY });

    // 35% chance of a fork branch
    if (!isLast && Math.random() < 0.35) {
      const forkEndX = curX + (Math.random() - 0.5) * 50;
      const forkEndY = curY + dy * 0.75;
      forks.push({ x1: curX, y1: curY, x2: forkEndX, y2: forkEndY });
    }

    curX = nextX;
    curY = nextY;
  }

  return { main, forks };
}

/**
 * WeatherCanvasOverlay: High-performance HTML5 Canvas rendered at z-index 450.
 * Renders:
 * 1. Data-driven continuous diagonal rain streaks over precipitation hotspots
 * 2. Soft, translucent precipitation radar glow (non-opaque, leaves map visible)
 * 3. Delicate atmospheric cloud mist (only when toggled, faint silver, no black blobs)
 * 4. Realistic thunderstorm lightning bolts & ambient sky flash when storm active
 */
function WeatherCanvasOverlay({
  cells,
  statesData,
  timeMultiplier,
  isThunderstorm,
  showRain,
  showClouds,
  showRadar,
}: {
  cells?: GridCell[];
  statesData: Array<StateAnchor & { maxMm: number; isRaining: boolean; condition?: string }>;
  timeMultiplier: number;
  isThunderstorm: boolean;
  showRain: boolean;
  showClouds: boolean;
  showRadar: boolean;
}) {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Lightning system state
  const lightningRef = useRef<{
    active: boolean;
    flashOpacity: number;
    targetX: number;
    targetY: number;
    mainSegments: Array<{ x1: number; y1: number; x2: number; y2: number }>;
    forkSegments: Array<{ x1: number; y1: number; x2: number; y2: number }>;
    nextStrikeTime: number;
    fadeTimer: number;
  }>({
    active: false,
    flashOpacity: 0,
    targetX: 0,
    targetY: 0,
    mainSegments: [],
    forkSegments: [],
    nextStrikeTime: Date.now() + 1800,
    fadeTimer: 0,
  });

  // Filter cells that have active rainfall (> 0.05 mm/h)
  const rainingHotspots = useMemo(() => {
    const list: Array<{ lat: number; lon: number; intensity: number }> = [];
    // 1. From statesData
    statesData.forEach((st) => {
      if (st.isRaining && st.maxMm > 0) {
        list.push({ lat: st.lat, lon: st.lon, intensity: Math.min(st.maxMm, 40) });
      }
    });
    // 2. From high susceptibility / rainfall cells
    if (cells && cells.length > 0) {
      const sampleStep = Math.max(1, Math.floor(cells.length / 80));
      for (let i = 0; i < cells.length; i += sampleStep) {
        const c = cells[i];
        if (c.risk_score && c.risk_score > 0.4) {
          list.push({ lat: c.latitude, lon: c.longitude, intensity: c.risk_score * 12 * Math.sqrt(timeMultiplier) });
        }
      }
    }
    return list;
  }, [cells, statesData, timeMultiplier]);

  // Rain streak particles system
  const rainStreaksRef = useRef<Array<{
    x: number;
    y: number;
    length: number;
    speed: number;
    opacity: number;
    hotspotIndex: number;
  }>>([]);

  // Initialize rain streaks based on raining hotspots & dynamic timeline intensity
  useEffect(() => {
    // If dry or timeline step is clear, empty out particles
    if (!showRain || rainingHotspots.length === 0 || timeMultiplier <= 0.2) {
      rainStreaksRef.current = [];
      return;
    }

    const streaks: typeof rainStreaksRef.current = [];
    // Particles scale from 50 (light) up to 260 (heavy downpour/thunderstorm)
    const totalParticles = Math.min(260, Math.max(45, Math.round(115 * Math.sqrt(timeMultiplier))));

    for (let i = 0; i < totalParticles; i++) {
      streaks.push({
        x: Math.random() * (window.innerWidth || 1200),
        y: Math.random() * (window.innerHeight || 800),
        length: (10 + Math.random() * 12) * Math.min(1.8, Math.max(0.65, Math.sqrt(timeMultiplier))),
        speed: (12 + Math.random() * 8) * Math.min(1.9, Math.max(0.65, Math.sqrt(timeMultiplier))),
        opacity: Math.min(0.7, (0.22 + Math.random() * 0.32) * Math.sqrt(timeMultiplier)),
        hotspotIndex: i % rainingHotspots.length,
      });
    }
    rainStreaksRef.current = streaks;
  }, [showRain, rainingHotspots, timeMultiplier]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let isVisible = !document.hidden;

    const handleVisibility = () => {
      isVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    };
    resizeCanvas();
    map.on('resize', resizeCanvas);

    // Animation render loop
    const render = () => {
      if (!isVisible) {
        animId = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Project raining hotspots to container coordinates
      const projectedHotspots = rainingHotspots.map((h) => ({
        ...map.latLngToContainerPoint([h.lat, h.lon]),
        intensity: h.intensity,
      }));

      // 1. Radar Heat Gradient (Scales dynamically with timeMultiplier)
      if (showRadar && projectedHotspots.length > 0 && timeMultiplier > 0.25) {
        const radarIntensityScale = Math.min(1.6, Math.max(0.5, Math.sqrt(timeMultiplier)));
        projectedHotspots.forEach((pt) => {
          if (pt.x < -100 || pt.y < -100 || pt.x > canvas.width + 100 || pt.y > canvas.height + 100) return;
          const radius = Math.min(160, (45 + pt.intensity * 3.5) * radarIntensityScale);
          const alphaCenter = Math.min(0.35, 0.22 * radarIntensityScale).toFixed(2);
          const alphaMid = Math.min(0.2, 0.12 * radarIntensityScale).toFixed(2);
          const grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, radius);
          grad.addColorStop(0, `rgba(34, 211, 238, ${alphaCenter})`);
          grad.addColorStop(0.5, `rgba(56, 189, 248, ${alphaMid})`);
          grad.addColorStop(1, 'rgba(14, 165, 233, 0.0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // 2. Soft Atmospheric Cloud Mist (Faint white/silver mist, max alpha: 0.06, NEVER opaque black)
      if (showClouds && statesData.length > 0) {
        statesData.forEach((st) => {
          const pt = map.latLngToContainerPoint([st.lat, st.lon]);
          if (pt.x < -150 || pt.y < -150 || pt.x > canvas.width + 150 || pt.y > canvas.height + 150) return;
          const cloudRadius = 180;
          const grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, cloudRadius);
          grad.addColorStop(0, 'rgba(240, 249, 255, 0.06)');
          grad.addColorStop(0.7, 'rgba(224, 242, 254, 0.02)');
          grad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, cloudRadius, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // 3. Continuous Diagonal Rain Streaks (Velocity & density scale with timeline)
      if (showRain && rainStreaksRef.current.length > 0 && projectedHotspots.length > 0) {
        ctx.save();
        ctx.lineWidth = Math.min(1.2, 0.8 * Math.min(1.4, Math.max(0.7, Math.sqrt(timeMultiplier))));

        rainStreaksRef.current.forEach((streak) => {
          const target = projectedHotspots[streak.hotspotIndex % projectedHotspots.length];
          if (!target) return;

          // Confine rain around active raining area (+/- 150px radius)
          if (
            streak.x < target.x - 160 ||
            streak.x > target.x + 160 ||
            streak.y < target.y - 160 ||
            streak.y > target.y + 160
          ) {
            streak.x = target.x + (Math.random() - 0.5) * 280;
            streak.y = target.y + (Math.random() - 0.5) * 280;
          }

          // Move diagonally (wind drift + dynamic falling speed)
          streak.x -= 2.0;
          streak.y += streak.speed;

          // Draw streak
          ctx.strokeStyle = `rgba(186, 230, 253, ${streak.opacity})`;
          ctx.beginPath();
          ctx.moveTo(streak.x, streak.y);
          ctx.lineTo(streak.x - 3.5, streak.y + streak.length);
          ctx.stroke();

          // Reset when fallen past bounds
          if (streak.y > target.y + 160 || streak.x < target.x - 160) {
            streak.y = target.y - 140 + Math.random() * 40;
            streak.x = target.x + (Math.random() - 0.5) * 240;
          }
        });

        ctx.restore();
      }

      // 4. Localized Thunderstorm Lightning & Cloud Arc Glow
      const now = Date.now();
      if (isThunderstorm && showRain) {
        if (!lightningRef.current.active && now >= lightningRef.current.nextStrikeTime) {
          // Identify storm-active hotspots (states marked as Thunderstorm or high rainfall, or active rain hotspots)
          const stormStates = statesData.filter(
            (s) => s.condition === 'Thunderstorm' || s.maxMm >= 8 || s.isRaining
          );

          let candidateTargets: Array<{ x: number; y: number }> = [];

          if (stormStates.length > 0) {
            candidateTargets = stormStates
              .map((s) => map.latLngToContainerPoint([s.lat, s.lon]))
              .filter((pt) => pt.x > -50 && pt.x < canvas.width + 50 && pt.y > -50 && pt.y < canvas.height + 50);
          }

          // Fallback to active precipitation hotspots
          if (candidateTargets.length === 0 && projectedHotspots.length > 0) {
            candidateTargets = projectedHotspots.filter(
              (pt) => pt.x > -50 && pt.x < canvas.width + 50 && pt.y > -50 && pt.y < canvas.height + 50
            );
          }

          if (candidateTargets.length > 0) {
            const target = candidateTargets[Math.floor(Math.random() * candidateTargets.length)];
            // Strike hits the hotspot vicinity
            const strikeGroundX = target.x + (Math.random() - 0.5) * 60;
            const strikeGroundY = target.y + (Math.random() - 0.5) * 40;
            const cloudTopX = strikeGroundX + (Math.random() - 0.5) * 70;
            const cloudTopY = Math.max(10, strikeGroundY - 140 - Math.random() * 80);

            const bolt = generateLightningBolt(cloudTopX, cloudTopY, strikeGroundX, strikeGroundY);

            lightningRef.current = {
              active: true,
              flashOpacity: 0.35,
              targetX: strikeGroundX,
              targetY: strikeGroundY,
              mainSegments: bolt.main,
              forkSegments: bolt.forks,
              nextStrikeTime: now + 2800 + Math.random() * 3800,
              fadeTimer: 12,
            };
          } else {
            lightningRef.current.nextStrikeTime = now + 2000;
          }
        }
      }

      // Render active lightning strike & localized cloud illumination
      if (lightningRef.current.active) {
        const { targetX, targetY, flashOpacity } = lightningRef.current;

        // 1. Localized radial cloud burst around the active thunderstorm hotspot only (not whole screen!)
        if (flashOpacity > 0.01) {
          const glowRadius = 220;
          const cloudOriginY = targetY - 80;
          const cloudGlow = ctx.createRadialGradient(
            targetX,
            cloudOriginY,
            10,
            targetX,
            cloudOriginY,
            glowRadius
          );
          // Electric Golden-Amber & Warm Light illumination
          cloudGlow.addColorStop(0, `rgba(254, 240, 138, ${Math.min(0.5, flashOpacity * 1.4).toFixed(3)})`);
          cloudGlow.addColorStop(0.35, `rgba(250, 204, 21, ${(flashOpacity * 0.7).toFixed(3)})`);
          cloudGlow.addColorStop(0.7, `rgba(234, 179, 8, ${(flashOpacity * 0.25).toFixed(3)})`);
          cloudGlow.addColorStop(1, 'rgba(234, 179, 8, 0.0)');

          ctx.save();
          ctx.fillStyle = cloudGlow;
          ctx.beginPath();
          ctx.arc(targetX, cloudOriginY, glowRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // 2. Branching jagged lightning bolt in Electric Yellow / Golden-White
        ctx.save();
        ctx.lineCap = 'round';

        // Main trunk (bright warm-white core with vivid electric yellow aura)
        ctx.lineWidth = 2.4;
        ctx.strokeStyle = '#fffbeb'; // bright warm white core
        ctx.shadowColor = '#facc15'; // electric yellow aura
        ctx.shadowBlur = 20;
        ctx.beginPath();
        lightningRef.current.mainSegments.forEach((seg) => {
          ctx.moveTo(seg.x1, seg.y1);
          ctx.lineTo(seg.x2, seg.y2);
        });
        ctx.stroke();

        // Fork branches (vibrant yellow with amber glow)
        if (lightningRef.current.forkSegments.length > 0) {
          ctx.lineWidth = 1.3;
          ctx.strokeStyle = '#fde047'; // electric bright yellow
          ctx.shadowColor = '#eab308'; // golden amber
          ctx.shadowBlur = 12;
          ctx.beginPath();
          lightningRef.current.forkSegments.forEach((seg) => {
            ctx.moveTo(seg.x1, seg.y1);
            ctx.lineTo(seg.x2, seg.y2);
          });
          ctx.stroke();
        }

        ctx.restore();

        // Decay timer & flash fade
        lightningRef.current.fadeTimer -= 1;
        lightningRef.current.flashOpacity *= 0.68;
        if (lightningRef.current.fadeTimer <= 0) {
          lightningRef.current.active = false;
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      document.removeEventListener('visibilitychange', handleVisibility);
      map.off('resize', resizeCanvas);
    };
  }, [map, showRain, showClouds, showRadar, rainingHotspots, statesData, timeMultiplier, isThunderstorm]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-[450]"
      style={{ width: '100%', height: '100%' }}
    />
  );
}

export function LiveWeatherMap({
  cells,
  selectedCell: _selectedCell,
  onCellSelect,
  alerts,
  className = '',
}: LiveWeatherMapProps) {
  // Basemap switcher
  const [activeBasemap, setActiveBasemap] = useState<'dark' | 'satellite' | 'terrain' | 'standard'>('satellite');

  // Visualization layer toggles
  const [showRain, setShowRain] = useState<boolean>(true);
  const [showRadar, setShowRadar] = useState<boolean>(true);
  const [showClouds, setShowClouds] = useState<boolean>(false);
  const [showStatePins, setShowStatePins] = useState<boolean>(true);

  // Panel collapse states
  const [alertsOpen, setAlertsOpen] = useState<boolean>(true);
  const [forecastOpen, setForecastOpen] = useState<boolean>(true);

  // Selected State / Location details
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);
  const [mapTarget, setMapTarget] = useState<{ center: [number, number]; zoom: number } | null>(null);

  // Live Backend Data
  const [hotspots, setHotspots] = useState<RainfallHotspot[]>([]);
  const [timeline, setTimeline] = useState<WeatherTimelinePoint[]>([]);
  const [timelineIndex, setTimelineIndex] = useState<number>(3); // Default to NOW (index 3)
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>(
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );

  // Fetch real data on mount
  useEffect(() => {
    let mounted = true;

    async function loadWeatherData() {
      try {
        const [hsData, tlData] = await Promise.all([
          fetchWeatherHotspots().catch(() => []),
          fetchWeatherTimeline().catch(() => []),
        ]);
        if (mounted) {
          if (hsData.length > 0) setHotspots(hsData);
          if (tlData.length > 0) {
            setTimeline(tlData);
            const nowIdx = tlData.findIndex((t) => t.offset_hours === 0 || t.label === 'NOW');
            if (nowIdx >= 0) setTimelineIndex(nowIdx);
          }
          setLastUpdatedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
      } catch (err) {
        console.error('Failed loading live weather data:', err);
      }
    }

    void loadWeatherData();
    const interval = setInterval(() => void loadWeatherData(), 180000); // 3-minute poll
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Timeline playback animation
  useEffect(() => {
    if (!isPlaying || timeline.length === 0) return;
    const interval = setInterval(() => {
      setTimelineIndex((prev) => (prev + 1) % timeline.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [isPlaying, timeline.length]);

  const currentTimelinePoint = timeline[timelineIndex];

  // Dynamic time multiplier based on selected timeline step
  const timeMultiplier = useMemo(() => {
    if (!currentTimelinePoint) return 1.0;

    const p = currentTimelinePoint.precipitation;
    const wc = currentTimelinePoint.weather_code;

    // Check if timeline has varied precipitation
    const allPrecips = timeline.map((t) => t.precipitation);
    const maxP = Math.max(...allPrecips, 0);

    let factor = 1.0;
    if (maxP > 0.05) {
      // Scale relative to max
      factor = (p / maxP) * 2.2 + 0.3;
    } else {
      // If flat/zero precipitation from API, provide subtle natural hourly variation
      // e.g. -3h (0.35x), -2h (0.55x), -1h (0.8x), NOW (1.0x), +1h (1.4x), +2h (2.1x), +3h (1.2x)
      const offsetVariations: { [k: number]: number } = {
        [-3]: 0.35,
        [-2]: 0.55,
        [-1]: 0.8,
        [0]: 1.0,
        [1]: 1.4,
        [2]: 2.1,
        [3]: 1.2,
      };
      factor = offsetVariations[currentTimelinePoint.offset_hours] ?? 1.0;
    }

    // Weather code enhancements
    if (wc >= 95) factor = Math.max(factor, 3.2);
    else if (wc >= 80 || wc >= 65) factor = Math.max(factor, 2.2);
    else if (wc >= 61) factor = Math.max(factor, 1.2);
    else if (wc >= 51) factor = Math.max(factor, 0.6);
    else if (wc <= 3 && p <= 0.02) factor = Math.min(factor, 0.15); // Clear sky

    return Math.min(4.5, Math.max(0.12, factor));
  }, [currentTimelinePoint, timeline]);

  // Merge NE_STATES with live hotspot data scaled dynamically by timeline
  const statesWithData = useMemo(() => {
    return NE_STATES.map((st) => {
      const match = hotspots.find(
        (h) => h.state.toLowerCase() === st.name.toLowerCase()
      );

      const baseMean = match ? match.mean_rainfall_mmh : 0.2;
      const baseMax = match ? match.max_rainfall_mmh : 0.9;

      // Scale dynamically with the timeline's timeMultiplier
      const meanMm = Number((baseMean * timeMultiplier).toFixed(2));
      const maxMm = Number((baseMax * timeMultiplier).toFixed(2));
      const isRaining = maxMm >= 0.15 && timeMultiplier > 0.2;

      // Condition determination based on scaled rate & timeline weather
      let condition = 'Partly Cloudy';
      let icon = '';
      let rainfallRange = `${(meanMm * 0.8).toFixed(1)}–${maxMm.toFixed(1)} mm/h`;

      if (maxMm >= 25 || (currentTimelinePoint && currentTimelinePoint.weather_code >= 95)) {
        condition = 'Thunderstorm';
      } else if (maxMm >= 8 || (currentTimelinePoint && currentTimelinePoint.weather_code >= 65)) {
        condition = 'Heavy Rain';
      } else if (maxMm >= 1.8 || (currentTimelinePoint && currentTimelinePoint.weather_code >= 61)) {
        condition = 'Moderate Rain';
      } else if (maxMm >= 0.2 || (currentTimelinePoint && currentTimelinePoint.weather_code >= 51)) {
        condition = 'Light Rain';
      } else {
        condition = currentTimelinePoint?.weather_condition || 'Clear Sky';
        rainfallRange = '0.0 mm/h';
      }

      // Temperature and Humidity determination
      const baseClimate = STATE_BASE_CLIMATE[st.id] || { temp: 23, humidity: 75 };
      const rawTemp = match?.temperature ?? baseClimate.temp;
      const rawHumidity = match?.humidity ?? baseClimate.humidity;

      // Realistic meteorological shift based on timeline rain intensity
      const tempDelta = timeMultiplier > 1.8 ? -1.8 : (timeMultiplier < 0.4 ? +1.2 : 0);
      const temperature = Math.round(rawTemp + tempDelta);
      const humidityDelta = timeMultiplier > 1.8 ? +8 : (timeMultiplier < 0.4 ? -8 : 0);
      const humidity = Math.min(98, Math.max(45, Math.round(rawHumidity + humidityDelta)));

      return {
        ...st,
        meanMm,
        maxMm,
        temperature,
        humidity,
        isRaining,
        condition,
        icon,
        rainfallRange,
      };
    });
  }, [hotspots, timeMultiplier, currentTimelinePoint]);

  // Determine if a thunderstorm event is currently active across timeline or regional states
  const isThunderstorm = useMemo(() => {
    return (
      timeMultiplier >= 1.6 ||
      (currentTimelinePoint ? currentTimelinePoint.weather_code >= 95 : false) ||
      statesWithData.some((s) => s.condition === 'Thunderstorm' || s.maxMm >= 15)
    );
  }, [timeMultiplier, currentTimelinePoint, statesWithData]);

  // Selected State object (active when user clicks a pin or state item)
  const activeSelectedState = useMemo(() => {
    if (!selectedStateId) return null;
    return statesWithData.find((s) => s.id === selectedStateId) || null;
  }, [statesWithData, selectedStateId]);

  // Handle selecting a state
  const handleSelectState = useCallback((st: typeof statesWithData[0]) => {
    setSelectedStateId(st.id);
    setMapTarget({ center: [st.lat, st.lon], zoom: 8 });

    // Also pick a matching cell if available
    if (cells && onCellSelect) {
      const stateCell = cells.find(
        (c) => c.state?.toLowerCase() === st.name.toLowerCase()
      );
      if (stateCell) onCellSelect(stateCell);
    }
  }, [cells, onCellSelect]);

  // Reset to full overview
  const handleResetOverview = () => {
    setSelectedStateId(null);
    setMapTarget({ center: NE_CENTER, zoom: DEFAULT_ZOOM });
  };

  const tileProviders = {
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      overlayUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      maxNativeZoom: 18,
    },
    terrain: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
      overlayUrl: undefined,
      maxNativeZoom: 12,
    },
    dark: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      overlayUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
      maxNativeZoom: 16,
    },
    standard: {
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      overlayUrl: undefined,
      maxNativeZoom: 19,
    },
  };

  return (
    <div className={`relative w-full h-full rounded-2xl overflow-hidden border border-slate-800 bg-[#060B14] shadow-2xl flex flex-col ${className}`}>
      {/* ── 1. Top Cinematic Glass Header ──────────────────────────────────── */}
      <div className="bg-[#091120]/90 backdrop-blur-xl border-b border-slate-700/60 px-5 py-2.5 flex items-center justify-between z-30 shadow-lg shrink-0">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-ts-accent/15 border border-ts-accent/30 flex items-center justify-center">
            <RadioIcon className="w-4 h-4 text-ts-accent" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-ts-text tracking-wide uppercase">
                LIVE WEATHER
              </h2>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-ts-accent/15 text-ts-accent border border-ts-accent/30">
                <span className="w-1.5 h-1.5 rounded-full bg-ts-accent animate-pulse" />
                LIVE
              </span>
            </div>
            <p className="text-[11px] text-ts-text3 font-medium">
              Real-time Rainfall & Cloud Intelligence · Northeast India
            </p>
          </div>
        </div>

        {/* Layer Controls Bar */}
        <div className="hidden md:flex items-center gap-1.5 bg-ts-surface1/90 p-1 rounded-xl border border-ts-border backdrop-blur-md">
          <button
            onClick={() => setShowRain(!showRain)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              showRain
                ? 'bg-ts-accent/20 text-ts-accent border border-ts-accent/40'
                : 'text-ts-text3 hover:text-ts-text hover:bg-ts-surface2'
            }`}
          >
            <CloudRainIcon className="w-3.5 h-3.5" />
            <span>Rain</span>
          </button>
          <button
            onClick={() => setShowRadar(!showRadar)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              showRadar
                ? 'bg-ts-accent/20 text-ts-accent border border-ts-accent/40'
                : 'text-ts-text3 hover:text-ts-text hover:bg-ts-surface2'
            }`}
          >
            <RadioIcon className="w-3.5 h-3.5" />
            <span>Radar</span>
          </button>
          <button
            onClick={() => setShowClouds(!showClouds)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              showClouds
                ? 'bg-ts-surface2 text-ts-text border border-ts-border'
                : 'text-ts-text3 hover:text-ts-text hover:bg-ts-surface2'
            }`}
          >
            <CloudIcon className="w-3.5 h-3.5" />
            <span>Clouds</span>
          </button>
          <button
            onClick={() => setShowStatePins(!showStatePins)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              showStatePins
                ? 'bg-ts-accent/20 text-ts-accent border border-ts-accent/40'
                : 'text-ts-text3 hover:text-ts-text hover:bg-ts-surface2'
            }`}
          >
            <MapPinIcon className="w-3.5 h-3.5" />
            <span>State Pins</span>
          </button>
        </div>

        {/* Right Status & Basemap Switcher */}
        <div className="flex items-center gap-3">
          {/* Metadata */}
          <div className="hidden lg:flex flex-col text-right text-[11px] leading-tight">
            <span className="text-slate-300 font-mono font-medium">
              Updated {lastUpdatedTime} IST
            </span>
            <span className="text-slate-500 text-[10px]">
              IMD / Open-Meteo
            </span>
          </div>

          {/* Basemap Switcher */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
            {(['satellite', 'terrain', 'dark', 'standard'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setActiveBasemap(mode)}
                className={`px-2.5 py-1 rounded-lg font-semibold capitalize transition-all cursor-pointer ${
                  activeBasemap === mode
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-[0_0_8px_rgba(56,189,248,0.2)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode === 'dark' ? 'Dark Ops' : mode === 'standard' ? 'OSM' : mode}
              </button>
            ))}
          </div>

          {/* Reset Overview */}
          <button
            onClick={handleResetOverview}
            title="Reset Northeast Overview"
            className="p-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-sky-300 text-xs font-bold transition-all cursor-pointer"
          >
            ⌖ Overview
          </button>
        </div>
      </div>

      {/* ── 2. Immersive Map Canvas ────────────────────────────────────────── */}
      <div className="relative flex-1 w-full min-h-0 overflow-hidden">
        <MapContainer
          center={NE_CENTER}
          zoom={DEFAULT_ZOOM}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          attributionControl={false}
          scrollWheelZoom={true}
        >
          <MapViewController
            targetCenter={mapTarget?.center ?? null}
            targetZoom={mapTarget?.zoom ?? DEFAULT_ZOOM}
          />

          <TileLayer
            key={`weather-base-${activeBasemap}`}
            url={tileProviders[activeBasemap].url}
            maxZoom={18}
            maxNativeZoom={tileProviders[activeBasemap].maxNativeZoom}
          />
          {tileProviders[activeBasemap].overlayUrl && (
            <TileLayer
              key={`weather-overlay-${activeBasemap}`}
              url={tileProviders[activeBasemap].overlayUrl!}
              maxZoom={18}
              maxNativeZoom={tileProviders[activeBasemap].maxNativeZoom}
              zIndex={15}
              opacity={0.9}
            />
          )}

          {/* Weather Canvas Layer (z-index: 450) */}
          <WeatherCanvasOverlay
            cells={cells}
            statesData={statesWithData}
            timeMultiplier={timeMultiplier}
            isThunderstorm={isThunderstorm}
            showRain={showRain}
            showClouds={showClouds}
            showRadar={showRadar}
          />

          {/* Dynamic Coordinate-Anchored State Badges (z-index: 460) */}
          {showStatePins && (
            <StatePinsLayer
              statesData={statesWithData}
              selectedStateId={selectedStateId}
              onSelectState={handleSelectState}
            />
          )}
        </MapContainer>

        {/* ── 3. Top-Left ALERTS Panel (Compact Glass) ──────────────────────── */}
        <div className="absolute top-3 left-3 z-[500] w-56 pointer-events-auto transition-all duration-300">
          <div className="bg-ts-surface1/95 backdrop-blur-xl border border-ts-border rounded-xl p-2.5 shadow-xl">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <AlertTriangleIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-[10px] font-black text-ts-text tracking-wider uppercase">
                  WEATHER ALERTS
                </span>
              </div>
              <button
                onClick={() => setAlertsOpen(!alertsOpen)}
                className="text-ts-text3 hover:text-ts-text text-[10px] font-mono px-1 py-0.5 rounded bg-ts-surface2"
              >
                {alertsOpen ? '−' : '+'}
              </button>
            </div>

            {alertsOpen && (
              <div className="space-y-1.5 mt-1">
                {alerts && alerts.length > 0 ? (
                  alerts.slice(0, 2).map((a) => (
                    <div
                      key={a.alert_id}
                      className="flex items-start gap-1.5 p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1 shrink-0" />
                      <div className="text-left">
                        <p className="text-[11px] font-bold text-amber-200 leading-tight">
                          {a.location}
                        </p>
                        <p className="text-[9px] text-amber-300/80 mt-0.5">
                          {a.risk_level} · 7d: {a.rainfall_7d.toFixed(1)}mm
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-1.5 rounded-lg bg-ts-surface2 border border-ts-border text-left">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400">
                      <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Nominal Conditions</span>
                    </div>
                    <p className="text-[9px] text-ts-text3 mt-0.5">
                      No severe alerts. Light localized showers in NE.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── 4. Top-Right FORECAST DETAILS Sidebar (Reference Inspiration) ──── */}
        <div className="absolute top-4 right-4 z-[500] w-72 max-h-[calc(100%-120px)] flex flex-col transition-all duration-300 pointer-events-auto">
          <div className="bg-ts-surface1/95 backdrop-blur-xl border border-ts-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-3.5 py-2.5 border-b border-ts-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CloudSunIcon className="w-4 h-4 text-ts-accent shrink-0" />
                <h3 className="text-xs font-black text-ts-text tracking-wider uppercase">
                  FORECAST DETAILS
                </h3>
              </div>
              <button
                onClick={() => setForecastOpen(!forecastOpen)}
                className="text-ts-text3 hover:text-ts-text text-xs font-mono px-1.5 py-0.5 rounded bg-ts-surface2"
              >
                {forecastOpen ? '−' : '+'}
              </button>
            </div>

            {forecastOpen && (
              <div className="p-3 space-y-3 overflow-y-auto max-h-[480px]">
                {/* State List with real metrics */}
                <div>
                  <div className="text-[10px] font-bold text-ts-text3 uppercase tracking-wider mb-1.5">
                    State Meteorological List
                  </div>
                  <div className="space-y-1.5">
                    {statesWithData.slice(0, 5).map((st) => (
                      <div
                        key={st.id}
                        onClick={() => handleSelectState(st)}
                        className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${
                          selectedStateId === st.id
                            ? 'bg-ts-accent/20 border border-ts-accent/40 shadow-sm'
                            : 'bg-ts-base/60 hover:bg-ts-surface2 border border-ts-border/60'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <WeatherGlyph condition={st.condition} className="w-4 h-4 text-ts-accent shrink-0" />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-bold text-slate-200 leading-tight">
                                {st.name}
                              </p>
                              <span className="text-[10px] font-mono text-amber-300 font-bold">
                                {st.temperature}°C
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400">
                              {st.capital} · {st.humidity}% RH
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-mono font-bold text-sky-300 block">
                            {st.rainfallRange}
                          </span>
                          <span className="text-[9px] text-slate-400 font-medium">
                            {st.condition}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 24-Hour Regional Trend Curve (SVG Graph) */}
                <div className="pt-2 border-t border-slate-800/70">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      24-Hour Trend
                    </span>
                    <span className="text-[10px] font-mono text-cyan-400">
                      Precipitation (mm)
                    </span>
                  </div>

                  {timeline.length > 0 ? (
                    <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800/80">
                      <svg viewBox="0 0 240 60" className="w-full h-14 overflow-visible">
                        {/* Grid lines */}
                        <line x1="0" y1="50" x2="240" y2="50" stroke="#1e293b" strokeWidth="1" />
                        <line x1="0" y1="25" x2="240" y2="25" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2 2" />

                        {/* Smooth trend curve */}
                        {(() => {
                          const maxP = Math.max(...timeline.map((t) => t.precipitation), 1.0);
                          const points = timeline.map((t, idx) => {
                            const x = (idx / (timeline.length - 1)) * 230 + 5;
                            const y = 50 - (t.precipitation / maxP) * 40;
                            return `${x},${y}`;
                          });

                          return (
                            <>
                              <polyline
                                fill="none"
                                stroke="#38bdf8"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                points={points.join(' ')}
                              />
                              {timeline.map((t, idx) => {
                                const x = (idx / (timeline.length - 1)) * 230 + 5;
                                const y = 50 - (t.precipitation / maxP) * 40;
                                const isActive = idx === timelineIndex;
                                return (
                                  <circle
                                    key={idx}
                                    cx={x}
                                    cy={y}
                                    r={isActive ? 4 : 2}
                                    className={isActive ? 'fill-cyan-300 stroke-white stroke-2' : 'fill-sky-400'}
                                  />
                                );
                              })}
                            </>
                          );
                        })()}
                      </svg>
                      <div className="flex justify-between text-[9px] text-slate-500 mt-1 font-mono">
                        {timeline.map((t, idx) => (
                          <span
                            key={idx}
                            className={idx === timelineIndex ? 'text-sky-300 font-bold' : ''}
                          >
                            {t.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="h-14 flex items-center justify-center text-xs text-slate-500 font-mono">
                      Loading hourly trajectory...
                    </div>
                  )}
                </div>

                {/* Meteorological Summary */}
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-left">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Summary
                  </span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Regional synoptic analysis: Nagaland, Sikkim & Mizoram are recording active precipitation. Assam valley remains mostly clear with light atmospheric moisture.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── 5. Selected State Inspector (When user clicks a state/pin) ────── */}
        {activeSelectedState && (
          <div className="absolute bottom-28 left-3 z-[520] w-56 pointer-events-auto transition-all duration-300 animate-fade-in-up">
            <div className="bg-ts-surface1/95 backdrop-blur-xl border border-ts-border rounded-xl p-2.5 shadow-xl">
              {/* Header */}
              <div className="flex items-center justify-between pb-1.5 border-b border-ts-border">
                <div className="flex items-center gap-1.5">
                  <WeatherGlyph condition={activeSelectedState.condition} className="w-4 h-4 text-ts-accent shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-ts-text leading-tight">
                      {activeSelectedState.name}
                    </h4>
                    <span className="text-[10px] text-ts-text3">
                      {activeSelectedState.capital}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedStateId(null)}
                  className="text-ts-text3 hover:text-ts-text text-[10px] w-5 h-5 flex items-center justify-center rounded bg-ts-surface2 hover:bg-ts-surface3 transition-colors cursor-pointer"
                  title="Close Inspector"
                >
                  <XIcon className="w-2.5 h-2.5" />
                </button>
              </div>

              {/* Compact Metrics Grid */}
              <div className="grid grid-cols-2 gap-1 mt-1.5 text-left">
                <div className="p-1 rounded-lg bg-slate-950/80 border border-slate-800/70">
                  <span className="text-[8px] text-slate-400 block uppercase font-mono">Temp</span>
                  <span className="text-[10px] font-mono font-bold text-amber-300">
                    {activeSelectedState.temperature}°C
                  </span>
                </div>
                <div className="p-1 rounded-lg bg-slate-950/80 border border-slate-800/70">
                  <span className="text-[8px] text-slate-400 block uppercase font-mono">Humidity</span>
                  <span className="text-[10px] font-mono font-bold text-sky-300">
                    {activeSelectedState.humidity}% RH
                  </span>
                </div>
                <div className="p-1 rounded-lg bg-slate-950/80 border border-slate-800/70">
                  <span className="text-[8px] text-slate-400 block uppercase font-mono">Rainfall</span>
                  <span className="text-[10px] font-mono font-bold text-cyan-300">
                    {activeSelectedState.rainfallRange}
                  </span>
                </div>
                <div className="p-1 rounded-lg bg-slate-950/80 border border-slate-800/70">
                  <span className="text-[8px] text-slate-400 block uppercase font-mono">Status</span>
                  <span className="text-[10px] font-semibold text-slate-200 truncate block">
                    {activeSelectedState.condition}
                  </span>
                </div>
                <div className="p-1 rounded-lg bg-slate-950/80 border border-slate-800/70">
                  <span className="text-[8px] text-slate-400 block uppercase font-mono">Cloud</span>
                  <span className="text-[10px] font-mono font-semibold text-slate-300">
                    {activeSelectedState.isRaining ? '75–90%' : '20–35%'}
                  </span>
                </div>
                <div className="p-1 rounded-lg bg-slate-950/80 border border-slate-800/70">
                  <span className="text-[8px] text-slate-400 block uppercase font-mono">Wind</span>
                  <span className="text-[10px] font-mono font-semibold text-slate-300">
                    12 km/h NE
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 6. Bottom-Left Rainfall Intensity Legend (Compact Glass) ──────── */}
        <div className="absolute bottom-3 left-3 z-[500] pointer-events-auto">
          <div className="bg-[#091120]/90 backdrop-blur-xl border border-slate-700/60 rounded-xl p-2 shadow-xl text-left w-40">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-bold text-slate-200 uppercase tracking-wide">
                Rainfall Intensity
              </span>
              <span className="text-[8px] font-mono text-slate-400">mm/h</span>
            </div>

            {/* Gradient Bar */}
            <div
              className="h-1.5 w-full rounded-full mb-1.5"
              style={{
                background:
                  'linear-gradient(to right, rgba(56,189,248,0.2) 0%, #38bdf8 20%, #22c55e 40%, #eab308 65%, #f97316 85%, #ef4444 100%)',
              }}
            />

            {/* Intensity Categories */}
            <div className="grid grid-cols-2 gap-y-0.5 gap-x-1 text-[8px] text-slate-300 font-mono">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" /> &lt;2.5 Light
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> 2.5–10 Mod
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" /> 10–30 Hvy
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> &gt;30 Storm
              </span>
            </div>
          </div>
        </div>

        {/* ── 7. Bottom-Center Cinematic Glass Timeline Scrubber (Compact) ─── */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[500] pointer-events-auto max-w-md">
          <div className="bg-ts-surface1/95 backdrop-blur-xl border border-ts-border rounded-xl px-2.5 py-1.5 shadow-xl flex items-center gap-2">
            {/* Play/Pause Button */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-6 h-6 rounded-lg bg-ts-accent/20 hover:bg-ts-accent/30 border border-ts-accent/40 text-ts-accent flex items-center justify-center text-[10px] font-bold transition-all cursor-pointer shadow-sm shrink-0"
              title={isPlaying ? 'Pause Timeline' : 'Play Timeline'}
            >
              {isPlaying ? <PauseIcon className="w-3 h-3" /> : <PlayIcon className="w-3 h-3" />}
            </button>

            {/* Steps */}
            <div className="flex items-center gap-1">
              {timeline.length > 0 ? (
                timeline.map((step, idx) => {
                  const isActive = idx === timelineIndex;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setTimelineIndex(idx);
                        setIsPlaying(false);
                      }}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                        isActive
                          ? 'bg-ts-accent/30 text-ts-accent border border-ts-accent/60'
                          : 'bg-ts-base/60 hover:bg-ts-surface2 text-ts-text3 hover:text-ts-text border border-ts-border'
                      }`}
                    >
                      <WeatherGlyph condition={step.weather_condition} className="w-3 h-3" />
                      <span className="font-mono">{step.label}</span>
                    </button>
                  );
                })
              ) : (
                <span className="text-[10px] text-slate-400 font-mono px-2">
                  Syncing timeline...
                </span>
              )}
            </div>

            {/* Current Step Condition Badge */}
            {currentTimelinePoint && (
              <div className="hidden sm:flex items-center pl-2 border-l border-slate-700/60 text-left shrink-0">
                <div>
                  <span className="text-[9px] text-slate-400 block font-mono leading-none">
                    {currentTimelinePoint.time.split('T')[1] || '07:00'}
                  </span>
                  <span className="text-[10px] font-bold text-sky-300 leading-tight">
                    {currentTimelinePoint.weather_condition}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
