# Reference: Sample Motion Plan Document

This reference document illustrates a complete **Motion Plan Document** produced by the Motion Director skill for a high-end fintech investment application ("Apex Portfolio").

---

# Motion Plan: Apex Portfolio Workspace

## 1. Motion Concept & Intent
- **Concept**: *Architectural Precision & Tactile Confidence*.
- **Intent**: Motion provides immediate, high-confidence feedback for financial transactions while maintaining a calm, uncluttered atmosphere.

## 2. Brand Motion Personality
- **Personality Mode**: *Precise & Technical*.
- **Character**: Controlled, zero-bounce overshoot, crisp accelerations, subtle deceleration curves.

## 3. Motion Hierarchy Breakdown
- **Level 1 (Micro-Interactions)**: Button presses, table row highlights, toggle switches, filter chips.
- **Level 2 (Component Transitions)**: Asset detail drawer, modal dialogs, search bar expansion.
- **Level 3 (Section Transitions)**: Portfolio asset allocation view switch, analytics view morphing.
- **Level 4 (Cinematic)**: Onboarding narrative breakdown & quarterly report summary sequence.

## 4. Timing System Tokens
- `duration-fast`: `150ms` (Micro feedback, table row hovers)
- `duration-normal`: `250ms` (Dropdowns, filter chip selection)
- `duration-relaxed`: `380ms` (Asset drawer slide-in, modal reveals)
- `duration-deliberate`: `520ms` (Layout transformations between chart types)

## 5. Easing & Physics Tokens
- **Standard UI Ease**: `cubic-bezier(0.16, 1.0, 0.3, 1.0)` (Ultra-smooth deceleration)
- **Exit Ease**: `cubic-bezier(0.7, 0.0, 0.84, 0.0)` (Crisp departure)
- **Drawer Spring**: `stiffness: 350, damping: 30, mass: 1` (Snappy, non-bouncy spatial spring)

## 6. Choreography & Stagger Strategy
- **Asset Table Reveal**: Stagger interval `35ms` per row; capped at 6 rows total (`210ms` max stagger window).
- **Sequence Order**: Metric header card → primary chart axis → asset table rows.

## 7. Micro-Interactions Directory
- **Primary CTA Button**: Press down scales to `0.98` (100ms, ease-out); release restores `1.0` with instant state change.
- **Toggle Switch**: Thumb slides horizontally using `duration-fast` (`150ms`) with subtle scale pulse (`1.05` mid-flight).

## 8. Component Transition Strategy
- **Asset Detail Drawer**: Slides in from right margin (`translateX(100%) -> translateX(0)`) using `duration-relaxed` (`380ms`) + backdrop overlay cross-fade (`opacity 0 -> 1`).

## 9. Page & Route Spatial Transitions
- Shared element transition for asset cards: Selected asset card title and icon morph seamlessly into the header of the detail view using Motion `layoutId`.

## 10. Scroll Motion Architecture
- **Sticky Header Shimmer**: Header bar transitions from transparent to solid dark surface (`#0F172A`) with subtle 1px border reveal when scroll position exceeds `40px`.

## 11. Gesture & Touch Integration
- Mobile Asset Drawer supports pull-down to dismiss: Tracks finger Y-position 1:1. If drag velocity exceeds `500px/s` or threshold > `120px`, spring dismisses drawer.

## 12. 3D Motion Coordination
- Coordinate portfolio 3D asset globe camera lerp with **3D Experience Director** on view switch.

## 13. Loading & Skeleton Motion
- Skeleton loader pulse: Subtle opacity sweep (`0.4 -> 0.8 -> 0.4` over `1.4s` linear infinite). No heavy shimmer gradients.

## 14. State-Driven Motion Matrix
- **Order Placement**:
  - `Idle`: Solid primary button.
  - `Executing`: Button morphs width to spinner circle (`250ms`).
  - `Success`: Checkmark vector draws in via `stroke-dashoffset` (`200ms`) + subtle green pulse.

## 15. Brand Motion Accents
- Precision metric counter roll-up: Numeric values scramble/count up over `400ms` when viewing portfolio summary.

## 16. Responsive Motion Adaptations
- **Desktop**: Subtle hover scale (`1.02`) on table rows; mouse-following tooltip preview.
- **Mobile**: Remove hover states; replace desktop side-drawer with native mobile bottom-sheet (`stiffness: 400`).

## 17. Reduced-Motion Fallback Architecture
- When `prefers-reduced-motion: reduce` is detected:
  - Drawer slide-ins convert to instant `opacity` cross-fades (`150ms`).
  - Numeric scramble count-ups disabled; values update immediately.

## 18. Technology & Library Selection
- Web / React: **Motion (Framer Motion)** for layout animations and shared element transitions; **CSS Keyframes** for micro-interactions and loaders.

## 19. Performance Strategy & GPU Safeguards
- Whitelisted properties: `transform`, `opacity`.
- Zero animation of `height`, `margin`, or `box-shadow`.
- Will-change applied only during active drawer drag.

## 20. Anti-Patterns Excluded
- ❌ NO generic fade-up on every single text section.
- ❌ NO spring bounce overshoot on financial metrics.
- ❌ NO custom magnetic cursor effects.

## 21. Validation & Quality Checklist
- [x] All animations interruptible.
- [x] Zero layout reflow properties animated.
- [x] `prefers-reduced-motion` verified.
- [x] Frame rate locked at 60 FPS.
