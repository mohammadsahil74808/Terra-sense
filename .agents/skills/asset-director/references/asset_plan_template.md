# Reference: Sample Asset Strategy Document

This reference document illustrates a complete **Asset Strategy Document** produced by the Asset Director skill for an electric sports car launch portal ("Aether EV").

---

# Asset Strategy Plan: Aether EV Portal

## 1. Existing Asset Audit
- Existing: 3 CAD models (`.step`), 12 studio RAW photos (`.cr3`), official brand vector logo (`logo-aether.svg`).
- Retire: Old low-res JPEG product renders from previous prototype phase.

## 2. Asset Purpose & Necessity Matrix
- **Hero Banner**: High-impact video loop establishing vehicle aerodynamics and sleek silhouette.
- **Product Gallery**: 6 high-resolution AVIF photos showing exterior angles and interior leather detailing.
- **Interactive 3D Chassis**: `.glb` file for real-time battery pack spatial exploration.
- **Icon Set**: 16 custom SVG icons for vehicle specs (Range, Acceleration, Charging Speed, Horsepower).

## 3. Asset Inventory
- `video-hero-aether-loop.webm` (1920x1080, VP9, 2.4 MB)
- `img-hero-poster-desktop.avif` (1920x1080, AVIF, 180 KB)
- `img-exterior-front-three-quarter.avif` (1600x900, AVIF, 140 KB)
- `model-aether-chassis-draco.glb` (Draco compressed, 4.1 MB)
- `icon-spec-battery.svg` (24x24px, 1.2 KB)

## 4. Real vs Generated vs Procedural Strategy
- **Real Media**: Studio photography of physical test vehicles (Authenticity critical).
- **Generated Art**: Conceptual atmospheric background artwork for futuristic charging network map.
- **Procedural Code**: SVG battery charging indicators and CSS noise textures.

## 5. Anti-Pattern Exclusions
- ❌ NO generic AI-generated glossy car renders with garbled badges.
- ❌ NO fake floating holographic UI overlays in background photography.
- ❌ NO stock photo models standing next to unrelated vehicles.

## 6. Art Direction & Visual Language
- **Lighting**: Dramatic low-key studio lighting with warm tungsten side highlights and deep slate shadows.
- **Mood**: Precision engineering, quiet luxury, minimalist power.
- **Color Grade**: Cool metallic silver background tones (`#0F172A`) with subtle cyan highlights (`#38BDF8`).

## 7. Photography Direction
- **Angle**: 3/4 low-angle tracking shot emphasizing wide stance and aerodynamic bonnet lines.
- **Focal Length**: 85mm prime lens (`f/2.8`), soft background blur, razor-sharp front headlight detail.

## 8. Raster Image Strategy
- Target Format: **AVIF** (Primary), **WebP** (Fallback).
- Quality: 82% lossy compression. Max dimension 2048px width.

## 9. Responsive Image Specification
- `<picture>` element using AVIF/WebP `srcset`: `640w`, `1024w`, `1920w`.

## 10. Video Asset Strategy
- Format: `WebM` (VP9 codec) + `MP4` (H.264 fallback).
- Duration: 6-second seamless loop, muted audio track stripped completely to reduce file size.

## 11. 3D Asset Pipeline Hand-Off
- Hand-off `model-aether-chassis.glb` to **3D Experience Director**: Apply Draco compression (clamped to 3.8 MB) and KTX2 texture maps.

## 12. SVG & Icon System Architecture
- 24x24px viewbox, 1.5px stroke-width, `#F8FAFC` stroke color. Consolidated in `assets/icons/sprite.svg`.

## 13. Vector Animation Strategy
- `anim-charging-pulse.riv` (Rive vector animation file, 18 KB) for interactive charging station map.

## 14. Font Asset Strategy
- `Inter-Variable.woff2` (Subsetting latin characters only; file size 32 KB). `font-display: swap`.

## 15. Audio Strategy
- Optional subtle UI click sound (`snd-tactile-click.mp3`, 6 KB) triggered on mobile drive mode toggle.

## 16. Asset Directory Hierarchy
- Structured according to standard `assets/` directory convention:
  `assets/images/hero/`, `assets/video/`, `assets/3d/`, `assets/icons/`.

## 17. Naming Conventions
- Standardized kebab-case: `[type]-[feature]-[description]-[size].[ext]`.

## 18. Loading Priority Architecture
- `CRITICAL`: `img-hero-poster-desktop.avif` (`fetchpriority="high"`), `Inter-Variable.woff2`.
- `DEFERRED`: Below-fold gallery images (`loading="lazy"`).
- `ON-DEMAND`: 3D chassis model loaded only when user clicks "Explore Engineering".

## 19. Fallback & Placeholder Architecture
- 3D Canvas Fallback: High-res WebP image with "Interactive 3D view unavailable" notice.
- Hero Video Fallback: `img-hero-poster-desktop.avif` static image.

## 20. Accessibility & Alt-Text Mapping
- `img-exterior-front-three-quarter.avif`: `alt="Front three-quarter view of the metallic silver Aether electric coupe parked in a studio."`
- Decorative SVG graphics: `aria-hidden="true"`.

## 21. Theme & Localization Adaptation
- Light/Dark Mode Logo: `logo-aether-light.svg` and `logo-aether-dark.svg`. Zero text embedded inside raster photos.

## 22. Licensing & Provenance Registry
- Studio photos shot by in-house team (Full commercial release).
- Fonts licensed under SIL Open Font License.

## 23. CDN & Delivery Headers
- Cloudflare CDN edge caching with `Cache-Control: public, max-age=31536000, immutable`.

## 24. Performance Budget
- Total initial media payload: < 450 KB (excluding lazy-loaded assets).

## 25. Validation Checklist
- [x] SVGs passed through SVGO optimizer.
- [x] WebM video audio track verified stripped.
- [x] Alt-text verified for screen readers.
- [x] Responsive image breakpoints verified on mobile viewport.
