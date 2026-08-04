# Reference: Sample Design Direction Document

This reference document illustrates a complete **Design Direction Document** produced by the Design Director skill for a hypothetical high-density medical diagnostic workstation application ("NeuroPulse").

---

# Design Direction: NeuroPulse Diagnostic Workstation

## 1. Product Interpretation & Context
- **Domain**: Clinical Neurology & Brain Wave Diagnostics.
- **Audience**: Neurologists, EEG technicians, and clinical researchers operating under high cognitive load.
- **Context**: Used on high-resolution multi-monitor desktop setups in dimly lit diagnostic reading rooms.

## 2. Visual Concept & Atmosphere
- **Concept**: *High-Precision Tactical Instrument*.
- **Impression**: Deep contrast, razor-sharp vector line-work, clinical focus, zero visual distraction.
- **Metaphor**: Oscilloscope & Precision Laboratory Display.

## 3. Anti-Pattern Exclusions
- ❌ NO generic purple/cyan AI glowing blurs.
- ❌ NO glassmorphic cards or backdrop-filter blurs (distorts diagnostic waveforms).
- ❌ NO rounded card-grid containers; use structural hairline grid dividers (`1px solid #1E293B`).
- ❌ NO decorative 3D assets or floating background particles.

## 4. Typography Strategy
- **Display / Headers**: `JetBrains Mono` (Technical, precise, monospaced numeric alignment).
- **Body / Labels**: `Inter` (Neutral, ultra-legible neo-grotesque sans-serif).
- **Typographic Scale**: Modular ratio `1.2` (Minor Third).
  - H1: `24px / 1.2 line-height / -0.02em tracking / Bold`
  - H2: `18px / 1.3 line-height / -0.01em tracking / SemiBold`
  - Body: `13px / 1.5 line-height / normal tracking / Regular`
  - Technical Data / Labels: `11px / 1.4 line-height / +0.03em tracking / Monospace`

## 5. Color System Tokens
- **Background Layer 0**: `#090D16` (Deep Midnight Black/Blue)
- **Surface Layer 1**: `#111827` (Dark Charcoal Slate)
- **Hairline Borders**: `#1F293D`
- **Primary Text**: `#F1F5F9` (95% White)
- **Muted Text**: `#64748B` (Slate Grey)
- **Diagnostic Signal Accents**:
  - Alpha Waves (Channel 1): `#38BDF8` (Cyan Blue)
  - Beta Waves (Channel 2): `#34D399` (Emerald)
  - Anomaly Alert: `#F43F5E` (High-visibility Crimson)
  - Selected Region: `#F59E0B` (Amber)

## 6. Layout & Spatial System
- **Layout Architecture**: Asymmetric 3-Column Workstation Layout.
  - Left Panel (18% width): Channel selector & patient metadata hierarchy.
  - Center Canvas (62% width): Continuous multi-channel waveform renderer.
  - Right Panel (20% width): Quantitative metrics & spectral analysis.
- **Spacing Scale**: 4px base (`4, 8, 12, 16, 24, 32px`). Compact density.

## 7. Component Philosophy
- **Custom Waveform Viewports**: Direct-rendered canvas containers without rounded card margins.
- **Status Badges**: Flat, hairline-bordered inline tags with solid state indicators (no drop shadows).
- **Control Bar**: Integrated top utility band with crisp 1px borders and icon-label pairs.

## 8. Interaction & State Architecture
- **Hover**: 1px border highlight (`#38BDF8`) + cursor coordinate crosshair on waveform canvas.
- **Focus**: High-contrast 2px solid `#38BDF8` outline with 2px offset (WCAG AA).
- **Active Selection**: Time-range drag highlight in translucent amber (`rgba(245, 158, 11, 0.15)`).
- **Loading State**: Monospaced status readout with sweep progress bar (no generic spinning wheels).

## 9. Asset & Imagery Strategy
- Vector SVG icons (16x16px stroke-width 1.5px).
- Direct SVG/Canvas rendering for all waveform graphics; no raster images or stock icons.

## 10. Platform Adaptations
- **Desktop Focus**: Multi-monitor canvas drag-and-drop, full keyboard shortcuts (Space to pause, J/K to skip time steps, Esc to reset zoom).
- **Tablet Adaptation**: Collapsible side panels into side drawers with minimum 44px touch targets.

## 11. 3D Requirements & Intent
- None. 3D is explicitly excluded as it adds no diagnostic value.

## 12. Motion Requirements & Intent
- **Functional Motion Only**: 150ms linear transitions for panel collapsing and 60 FPS continuous linear scroll for real-time waveform feed.
- Defer frame timing optimization to Motion Director.

## 13. Accessibility Baseline
- Contrast ratio between text (`#F1F5F9`) and background (`#090D16`) exceeds 14:1.
- All waveform anomaly colors paired with unique pattern hatching or text tags for color-blind accessibility.

## 14. Performance Constraints
- Canvas-based rendering for 16-channel 60 FPS time-series data.
- Strict limit of 0 backdrop-filter blurs and 0 box-shadow blurs.

## 15. Implementation Roadmap
1. Setup CSS custom properties for color tokens and monospace font definitions.
2. Build 3-column grid container in HTML/CSS without card wrappers.
3. Integrate canvas-based waveform renderer component.
4. Implement keyboard event listeners and state management.
