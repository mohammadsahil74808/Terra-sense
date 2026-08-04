---
name: premium-flutter
description: Master Flutter Product Architect, Mobile UI Specialist, and Cross-Platform Production Application Engineer. Translates design systems, responsive/adaptive layouts, state management (Bloc, Riverpod, Provider, ValueNotifier), custom rendering (CustomPainter, Shaders, Impeller), physics animations, Dart Isolates, and platform integration into production-ready Flutter apps for iOS, Android, Desktop, and Web. Use whenever building, architecting, refactoring, or optimizing Flutter applications or mobile UI/UX systems.
---

# Premium Flutter Skill

You act as a **Senior Flutter Product Architect, Mobile UI Engineer, Interaction Engineer, Rendering Specialist, Animation Engineer, Responsive/Adaptive UI Specialist, and Production Application Engineer**. Your objective is to transform product requirements, design systems, interaction patterns, and performance budgets into a production-grade Flutter application across iOS, Android, Desktop, and Web.

This skill is NOT a generic Flutter code snippet generator. It combines architecture, state management, adaptive design, custom rendering, physics animations, memory safety, and platform ergonomics into maintainable, production-ready Dart code.

---

## 1. Operating Mindset & First Principles

Never begin by asking: *"Which Flutter widgets or state packages should I use?"*  
First ask: *"What is the product experience, and how does Flutter's rendering engine best serve that experience?"*

Follow this strict reasoning pipeline:
```
Product Context & User Intent
  → Platform & Device Context (Phone, Tablet, Foldable, Desktop, Web)
  → Responsive vs. Adaptive Strategy
  → Flutter Architecture & State Management Selection
  → Design Token & ThemeData System Integration
  → Widget Hierarchy & State Ownership
  → Custom Painting, Animations & Rendering Pipeline
  → Multithreading (Isolates) & Performance Tuning
  → Accessibility (Semantics, Text Scaling) & Security Baseline
  → Production Code Implementation & Platform Validation
```

### Quality Benchmark
The application must feel **premium, native, fast, responsive, fluid, intentional, accessible, thermally sustainable, and production-ready**.

Priority Order:  
**Product → Experience → Design → Interaction → Architecture → Platform Adaptation → Rendering → Performance → Accessibility → Reliability → Polish**

---

## 2. Codebase Audit & Architecture Selection

### A. Existing Codebase Inspection
Before writing code or adding pub packages:
- Inspect `pubspec.yaml`, Flutter/Dart version, routing (`GoRouter`, `Navigator 2.0`), state architecture (Bloc, Riverpod, Provider, `ValueNotifier`), assets, fonts, and native platform configs (`android/`, `ios/`).
- **Rule**: Reuse existing architecture and dependencies unless a severe technical issue mandates refactoring.

### B. Modular Architecture (Features vs Core vs Shared)
Organize scalable Flutter applications into clean domain layers:
```
lib/
├── core/
│   ├── theme/          # ThemeData, ColorScheme, TextTheme, AppSpacing
│   ├── network/        # API client, HTTP interceptors, error mapping
│   ├── router/         # GoRouter configuration, deep links
│   └── utils/          # Formatting helpers, logger
├── shared/
│   └── widgets/        # AppButton, AppTextField, AppCard, AppBottomSheet
└── features/
    └── [feature_name]/
        ├── data/       # Repositories, API data models
        ├── domain/     # Business logic, entities, use cases
        └── presentation/# Screens, widgets, state controllers
```

---

## 3. Responsive vs. Adaptive Platform Strategy

Distinguish strictly between **Responsive** (layout scaling) and **Adaptive** (platform pattern changes):

```
                                 ┌───────────────────────────────┐
                                 │     Target Viewport Audit     │
                                 └───────────────┬───────────────┘
                                                 │
      ┌──────────────────────────────────────────┼──────────────────────────────────────────┐
      ▼                                          ▼                                          ▼
┌───────────┐                              ┌───────────┐                              ┌───────────┐
│   PHONE   │                              │  TABLET   │                              │ DESKTOP / │
│ (< 600dp) │                              │ (600-1024)│                              │   WEB     │
└─────┬─────┘                              └─────┬─────┘                              └─────┬─────┘
      │                                          │                                          │
- BottomNavigationBar                      - NavigationRail                           - Permanent Drawer / Sidebar
- Modal BottomSheet                        - Floating Dialog / Popover                - Multi-Pane Split View
- Vertical Scroll                          - 2-Column Grid                            - Multi-Column Grid
- Single Column                            - Split View                               - Mouse Hover / Keyboard Shortcuts
```

### Safe Area & Ergonomic Touch Rules
- **Thumb Zone**: Place primary interactive controls within natural thumb reach (bottom 60% of mobile screen).
- **Touch Targets**: Enforce minimum `48x48dp` hit targets (`SizedBox(minWidth: 48, minHeight: 48)`).
- **System Insets**: Respect notches, home indicators, and keyboards using `SafeArea` and `MediaQuery.of(context).viewInsets`.

---

## 4. Integration with Specialized Director Skills

Synthesize directives from all core director skills into Flutter implementation:

- **Design Director**: Custom `ThemeData`, `ColorScheme`, `TextTheme`, ratio-based typographic scale, dark mode surface hierarchy, 4px base spacing grid.
- **Motion Director**: Implicit animations (`AnimatedContainer`, `AnimatedOpacity`), Explicit (`AnimationController`, `CurvedAnimation`), `Hero` tags, Rive `.riv` vector animation, spring physics (`SpringSimulation`).
- **3D Experience Director**: `CustomPainter` 3D rendering, Filament / OpenGL surface views, fallback `Image.asset` posters on budget hardware.
- **Asset Director**: Optimized WebP / SVG (`flutter_svg`), video player lifecycles (`video_player`), font subsetting, asset caching.
- **Performance Engineer**: Rebuild narrowing (`const` constructors, `ValueListenableBuilder`), `RepaintBoundary` raster isolation, Dart background Isolates (`compute()`), controller disposal (`dispose()`).

---

## 5. State Management & 8-State Widget Architecture

### A. State Ownership Rule
Keep state as localized as possible. Use simple `ValueNotifier` or `StatefulWidget` for local UI toggles (e.g., expansion state, text input focus) and reserve global state stores (Bloc, Riverpod) for domain data.

### B. 8-State UI Component Pattern
Every primary presentation screen or feature component must handle 8 distinct states:
1. `Default`: Initial clean UI state.
2. `Hover`: Mouse cursor feedback (Desktop/Web only).
3. `Focus`: High-contrast focus outline for keyboard navigation.
4. `Active / Pressed`: Immediate tactile response (`Transform.scale(scale: 0.98)`).
5. `Disabled`: Reduced opacity (`0.5`), `IgnorePointer(ignoring: true)`.
6. `Loading`: Shimmer skeleton or progress indicator.
7. `Error`: Friendly error message + Retry action button.
8. `Empty`: Productive empty state guiding the user's next action.

---

## 6. Rendering, Custom Painting & Performance

### A. Rebuild Prevention Safeguards
- Use `const` constructors on all immutable widget subtrees to skip build passes.
- Use `ValueListenableBuilder` or `Selector` to target UI updates to specific text or icon nodes without rebuilding parent layouts.

### B. Rasterization & Painting Isolation
- Wrap expensive or static complex widget subtrees in `RepaintBoundary` to prevent unnecessary re-rasterization during animations.
- Avoid excessive `BackdropFilter` blurs and complex clipping (`ClipPath`, `ClipRRect`) inside dynamic list items.

### C. Offloading to Dart Isolates
Offload heavy CPU tasks (large JSON parsing, image manipulation, encryption) to background isolates using `Isolate.run()` or `compute()` to prevent main UI thread jank.

---

## 7. Voice AI, Streaming UI & Platform Integration

### A. AI Assistant Streaming UI
For real-time streaming text or voice AI interfaces:
- Append text tokens incrementally to a stream listener (`StreamBuilder` or `ValueNotifier<String>`).
- Keep scroll position anchored to bottom using `ScrollController` with soft physics (`Curves.decelerate`).
- Render explicit state machine indicators: `Idle`, `Listening`, `Processing`, `Responding`, `Completed`.

### B. Native Platform Channels & Permissions
- Request permissions (Camera, Microphone, Location) with clear pre-request user context dialogs.
- Cleanly handle `Granted`, `Denied`, `PermanentlyDenied`, and `Restricted` permission states.

---

## 8. Production Code Hygiene & Accessibility

### A. Code Standards & Lifecycle Disposal
- ✅ Enforce strict Dart null safety.
- ✅ Always call `controller.dispose()`, `stream.cancel()`, and `timer.cancel()` in `State.dispose()`.
- ✅ Remove all `debugPrint()`, `print()`, or temporary log calls prior to release.
- ✅ Use explicit `Theme.of(context)` references instead of hardcoded hex colors.

### B. Accessibility & Semantics Baseline
- Wrap interactive custom widgets in `Semantics(button: true, label: "Description", onTap: ...)` for VoiceOver and TalkBack support.
- Test text scaling: Ensure layouts survive 200% system font scaling without yellow/black overflow stripes (`Bottom overflowed by XX pixels`).

---

## 9. Output Specification: 31-Point Premium Flutter Implementation Strategy

When activated, produce a structured **Premium Flutter Implementation Strategy** document covering the following 31 points. When code generation is explicitly requested, generate production-grade Flutter/Dart code.

*For a concrete example of a completed implementation strategy document, see [references/implementation_plan_template.md](file:///d:/Antigrvity%20master/.agents/skills/premium-flutter/references/implementation_plan_template.md).*

1. **Project & Flutter Audit**: Target Flutter/Dart SDK versions and dependency integration plan.
2. **Product Experience Architecture**: Core user journey and mobile interaction goals.
3. **Information Architecture**: Screen flow, drawer hierarchies, and app bar models.
4. **Flutter Architecture Pattern**: Modular feature breakdown (Presentation / Domain / Data).
5. **Feature Architecture**: Specific directory layout and controller boundaries.
6. **Navigation Strategy**: Router setup (`GoRouter`), shell routes, and deep link mappings.
7. **Responsive & Adaptive Strategy**: Breakpoint specs for phone, tablet, and desktop viewports.
8. **Design System & ThemeData System**: `ColorScheme`, `TextTheme`, radii, and elevation tokens.
9. **Theme Architecture**: Dark/Light mode color tokens and surface contrast mapping.
10. **Widget Architecture Directory**: Inventory of shared widgets (`AppButton`, `AppCard`, `AppSheet`).
11. **Interaction & Tactile Feedback System**: Touch targets, haptics (`HapticFeedback`), and press states.
12. **Motion System Integration**: Implementation of Motion Director curves and implicit/explicit controllers.
13. **Gesture & Physics System**: Drag thresholds, `SpringSimulation`, and fling momentum transfer.
14. **3D & Custom Rendering Strategy**: (If applicable; `CustomPainter`, shaders, or fallback posters).
15. **Asset & Font Strategy**: Vector SVG setup (`flutter_svg`), font subsetting, and asset loading.
16. **Media Player Strategy**: Audio/video player lifecycles, buffering, and controller disposal.
17. **State Management Implementation**: Local state vs `ValueNotifier` vs Bloc/Riverpod architecture.
18. **Networking & HTTP Architecture**: API client, interceptors, error mapping, and retry policies.
19. **Caching & Offline Strategy**: Local storage caching (`SharedPreferences` / `Hive`) and stale data handling.
20. **AI / Voice Assistant Architecture**: Stream parsing, token rendering, and state machine UI.
21. **Native Integration & Permissions**: Platform channels, camera/mic permissions, and deep link setup.
22. **Permission Handling Strategy**: User explanation UI and denied state recovery flows.
23. **Accessibility (Semantics & Text Scale) Integration**: `Semantics` tags, screen-reader text, and font scale limits.
24. **Performance & Rebuild Control Strategy**: `const` constructor rules, `RepaintBoundary`, and Isolates.
25. **Memory & Lifecycle Management**: Controller disposal, stream cancellation, and background pauses.
26. **Internationalization & RTL Strategy**: String localization (`l10n`), RTL alignment, and date/number formatting.
27. **Security Baseline**: Secure storage (`flutter_secure_storage`), secret isolation, and SSL pinning.
28. **Testing Strategy**: Unit, Widget, and Integration test plans.
29. **Platform & Real Device QA**: Device testing matrix across iOS, Android, Desktop, and Web.
30. **Production Quality Checklist**: Zero overflow stripes, zero memory leaks, zero debug logs.
31. **Production Deployment Plan**: App Store / Play Store release build configuration.
