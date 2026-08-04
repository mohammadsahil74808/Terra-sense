# Reference: Sample 3D Experience Plan

This reference document illustrates a complete **3D Experience Plan** produced by the 3D Experience Director skill for a luxury chronograph watch configurator ("Chronos 3D").

---

# 3D Experience Plan: Chronos Interactive Watch Configurator

## 1. 3D Purpose & Value Proposition
- **Value**: Allows customers to inspect watch craftsmanship, material finishes, and custom strap/dial combinations in real-time, driving direct e-commerce conversion.

## 2. Experience Category
- **Category**: Interactive 3D Product Configurator & Exploded Engineering View.

## 3. Recommended Visual Direction & Atmosphere
- **Style**: Studio Photorealism.
- **Atmosphere**: Dark luxury, high-contrast studio rim lighting, crisp metallic reflections, zero visual noise.

## 4. Rendering Technology Recommendation
- **Technology**: React Three Fiber (R3F) + Three.js + `@react-three/drei`.
- **Justification**: Seamless integration with Next.js e-commerce state management and declarative component architecture.

## 5. Architecture & Framework Integration
- R3F Canvas encapsulated in `<WatchConfiguratorCanvas />` wrapper.
- Zustand store managing active material IDs, camera preset states, and animation clip triggers.

## 6. Asset Pipeline & Requirements
- `watch_base.glb` (Chronograph casing, movement, dial face, hands, strap variants).
- `studio_softbox.hdr` (Custom 1K HDRI environment map for realistic studio reflections).

## 7. Asset Optimization Strategy
- **Triangles**: 42,000 triangles total (Draco compressed `.glb` file size: ~3.2 MB).
- **Textures**: 2K KTX2/Basis Universal textures for dial & metallic casing.
- **Instancing**: Instanced meshes for dial tick marks and movement gear teeth.

## 8. Camera Strategy & Pathing
- **Projection**: Perspective (FOV 35° to minimize wide-angle distortion).
- **Controls**: `OrbitControls` with strict damping (`dampingFactor={0.05}`).
  - Min Distance: `1.8m`, Max Distance: `4.5m`.
  - Min Polar Angle: `Math.PI / 4`, Max Polar Angle: `Math.PI / 2.1` (prevents viewing under table plane).
- **Presets**: Smooth camera lerp transitions to predefined focus angles (Dial view, Strap view, Movement back-case view).

## 9. Lighting & Environment Strategy
- **Environment**: IBL via HDRI (`studio_softbox.hdr`, intensity: `0.8`).
- **Directional Lights**: 2 Key Lights (Warm key light top-right, Cool rim light bottom-left).
- **Shadows**: Contact Shadows (`<ContactShadows opacity={0.6} scale={10} blur={1} far={10} resolution={512} color="#000000" />`).

## 10. Material Architecture
- **Case Metal**: `MeshStandardMaterial` (Metalness: 0.95, Roughness: 0.15, Clearcoat: 0.3).
- **Sapphire Glass**: `MeshPhysicalMaterial` (Transmission: 0.9, Roughness: 0.05, IOR: 1.77, Transparent: true).
- **Leather Strap**: PBR bump/normal map with Roughness: 0.7, Metalness: 0.0.

## 11. Custom Shader Strategy
- **Lume Glow Shader**: Custom fragment shader for dial hands glow in low-light preview mode.

## 12. Animation Architecture
- Skeletal animation clips for watch hands movement (`tickAnimation`, `chronographStart`).
- Exploded view morph target animation (`explodedState: 0.0 -> 1.0`).

## 13. Physics Strategy
- None. Physics is excluded as it is unnecessary for product inspection.

## 14. Interaction Model
- **Raycasting**: Hovering over watch components highlights selectable regions (Dial, Bezel, Strap).
- **Touch Targets**: Mobile hotspot overlays (48x48px) for mobile users to trigger focus views without dragging.

## 15. UI & HUD Integration
- Left/Bottom HUD: Material picker panel floating over transparent canvas.
- Smooth CSS backdrop-blur on HUD controls; `pointer-events: none` on main canvas container with `pointer-events: auto` on interactive UI buttons.

## 16. Responsive & Mobile Strategy
- **Desktop**: Full interactive canvas + side material customizer panel.
- **Mobile**: Canvas scaled to top 50% viewport; material customization bottom sheet with swipe gestures.

## 17. Performance Budget
- **Target**: 60 FPS Desktop, 30-60 FPS Mobile.
- **Limits**: Max 45 Draw Calls, Max 50k Triangles, Max 60MB GPU VRAM usage.

## 18. Tiered Quality Levels
- **HIGH** (Desktop discrete GPU): Full 2K KTX2 textures, transmission glass shader, contact shadows.
- **MEDIUM** (Mid-range mobile): 1K textures, simplified glass material (alpha blending), soft shadows.
- **LOW** (Budget mobile): 512px textures, basic PBR, no transmission/shadows.
- **FALLBACK**: High-resolution 360° WebP frame sequence (36 frames).

## 19. Loading Experience & Progressive Reveal
- 2D circular percentage loader with animated SVG watch icon.
- Load low-LOD mesh first (visible in <500ms), stream 2K KTX2 textures in background.

## 20. Fallback Architecture
- If WebGL initialization fails, render interactive 360° image sequence slider using pre-rendered WebP frames.

## 21. Accessibility Baseline
- ARIA live region announcing material configuration changes (e.g., "Strap changed to Italian Black Leather").
- Full keyboard controls for camera focus presets (Keys 1-4).
- Respects `prefers-reduced-motion` by disabling smooth camera lerp transitions.

## 22. Failure Handling & WebGL Recovery
- `webglcontextlost` event triggers toast notice and switches smoothly to 360° image slider fallback without breaking page layout.

## 23. Anti-Patterns Excluded
- ❌ NO floating glowing cubes or random particle backgrounds.
- ❌ NO unconstrained camera orbits allowing clipping below the pedestal.
- ❌ NO heavy post-processing bloom or depth-of-field masking model details.

## 24. Validation Checklist
- [x] WebGL context loss recovery verified.
- [x] Mobile touch targets > 48px verified.
- [x] FPS > 55 on integrated Intel GPU verified.
- [x] ARIA screen reader output verified.
