/**
 * Footer — credits, data sources, team info.
 */

export function Footer() {
  return (
    <footer className="border-t border-ts-border mt-6 bg-ts-surface1/60" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">

          {/* Project identity & Model Info */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-ts-accent" fill="none" aria-hidden="true">
                <path d="M3 20L12 4l9 16H3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M8 20l4-8 4 8H8z" fill="currentColor" opacity="0.3" />
              </svg>
              <span className="text-sm font-semibold text-ts-text">TerraSense v1</span>
            </div>
            <p className="text-xs text-ts-text3 leading-relaxed mb-3">
              AI-powered landslide early warning system monitoring 2,534 grid cells across all 8 Northeast Indian States. Built for Smart India Hackathon 2026.
            </p>
            <div className="text-[11px] font-mono text-ts-text3 space-y-1 bg-ts-surface2 p-2.5 rounded-lg border border-ts-border">
              <div className="flex justify-between"><span className="text-ts-text3">Model:</span> <span className="text-ts-text">Random Forest (500 trees)</span></div>
              <div className="flex justify-between"><span className="text-ts-text3">Stage:</span> <span className="text-ts-text">Stage 1 Susceptibility (Frozen)</span></div>
              <div className="flex justify-between"><span className="text-ts-text3">2016 Blind Test:</span> <span className="text-emerald-500 dark:text-emerald-400 font-bold">ROC-AUC 0.859</span></div>
            </div>
          </div>

          {/* Accurate Data sources */}
          <div>
            <h3 className="text-xs font-bold text-ts-text uppercase tracking-widest mb-2">
              Scientific &amp; Geospatial Data Sources
            </h3>
            <ul className="space-y-1 text-xs text-ts-text3 font-mono">
              <li><span className="text-ts-text2">NASA SRTM DEM</span> — Elevation &amp; Slope</li>
              <li><span className="text-ts-text2">ISRIC SoilGrids</span> — Clay, Sand &amp; Bulk Density</li>
              <li><span className="text-ts-text2">ESA WorldCover</span> — Land Cover (LULC)</li>
              <li><span className="text-ts-text2">HydroRIVERS &amp; OSM</span> — Drainage &amp; Road Cut</li>
              <li><span className="text-ts-text2">NASA GPM IMERG</span> — Historical Rainfall (2007-2014)</li>
              <li><span className="text-ts-text2">GSI Bhusanket</span> — Historical Landslide Records</li>
              <li><span className="text-ts-text2">Open-Meteo API</span> — Live Precipitation &amp; Forecast</li>
            </ul>
          </div>

          {/* System Architecture */}
          <div>
            <h3 className="text-xs font-bold text-ts-text uppercase tracking-widest mb-2">
              Technology Stack
            </h3>
            <ul className="space-y-1 text-xs text-ts-text3">
              <li>Python FastAPI + scikit-learn (Risk Engine)</li>
              <li>React 18 + TypeScript + Tailwind CSS</li>
              <li>Leaflet.js (GIS Risk Map)</li>
              <li>Firebase Cloud Messaging (FCM Responders)</li>
              <li>SQLite Thread-Safe Storage</li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-ts-border pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-ts-text3">
            Team <span className="text-ts-text font-medium">TerraSense</span> · SIH 2026
          </p>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-ts-accent/30 bg-ts-accent/10">
            <span className="text-[10px] font-medium text-ts-accent tracking-wide">
              SMART INDIA HACKATHON 2026 PROTOTYPE
            </span>
          </div>
          <p className="text-[10px] text-ts-text3">
            Civil defense decision-support prototype. Evaluated against 2016 historical blind-test data.
          </p>
        </div>
      </div>
    </footer>
  );
}
