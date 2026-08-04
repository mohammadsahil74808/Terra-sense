# Reference: Sample Performance Engineering Plan

This reference document illustrates a complete **Performance Engineering Plan** produced by the Performance Engineer skill for a high-traffic 3D real estate portal ("UrbanSpace 3D").

---

# Performance Engineering Plan: UrbanSpace 3D

## 1. Performance Baseline & Measurement
- **Initial Load**: FCP = 2.4s, LCP = 4.8s, INP = 280ms, CLS = 0.18.
- **Bundle Payload**: Initial JS = 1.8 MB (uncompressed), Total Page Weight = 14.2 MB.
- **Frame Rate**: Desktop GPU = 55 FPS; Mid-range Android = 18 FPS (frequent frame drops).

## 2. User-Perceived Responsiveness Assessment
- High perceived friction: White blank screen displayed for 2.4s while main bundle and 3D engine initialize simultaneously.

## 3. Critical Bottleneck Identification
1. **LCP & Network**: 14.2 MB initial payload downloading uncompressed `.gltf` files on startup.
2. **Main Thread Jank**: 350ms long tasks caused by synchronous JSON parsing of property data.
3. **GPU VRAM Overload**: Uncompressed 4K PNG textures causing WebGL context crashes on mobile devices.

## 4. Root-Cause Analysis
### [BOTTLENECK] 4K Uncompressed Texture VRAM Overload
- **Symptom**: Mobile Safari crashes after 15 seconds of camera navigation.
- **Measurement**: GPU VRAM consumption = 480 MB (exceeds mobile limit of 250 MB).
- **Root Cause**: 12 property room textures loaded as 4096x4096px uncompressed PNGs.
- **Impact**: App crash and WebGL context loss on 65% of mobile sessions.
- **Fix Recommendation**: Convert textures to KTX2 / Basis Universal format and resize max width to 2048px. Hand-off to Asset Director.
- **Trade-off**: 2% reduction in ultra-close-up wall texture sharpness (negligible to user).
- **Validation**: Re-measurement VRAM consumption < 120 MB; 0 WebGL crashes on mobile Safari test suite.

## 5. Loading Strategy & Classification
- `CRITICAL`: Hero shell HTML, critical CSS, `Inter` font subset, low-LOD 3D building exterior.
- `IMPORTANT`: Property detail text content, agent contact form.
- `DEFERRED`: Interior 3D room meshes, customer review videos.
- `ON-DEMAND`: Virtual walkthrough audio guide, 4K texture upgrades.

## 6. Code Splitting & Bundle Strategy
- Split Three.js engine and 3D viewport component into dynamic import (`React.lazy()` / `import()`).
- Target initial JS bundle reduction: 1.8 MB -> 280 KB.

## 7. Rendering & Compositing Strategy
- Replace CSS `top/left` drawer animation with GPU-accelerated `transform: translateX()`.
- Add `contain: strict` to static property list items to prevent full-page layout reflows.

## 8. Animation Performance Strategy
- Restrict all UI animations to `opacity` and `transform`.
- Defer non-critical micro-interaction animations when device battery saver mode is active.

## 9. 3D & Graphics Optimization Strategy
- Apply **Draco compression** to `.glb` meshes (reduces 3D geometry file size from 9.4 MB to 1.1 MB).
- Implement `InstancedMesh` for repeated furniture models (chairs, light fixtures), cutting draw calls from 180 to 22.

## 10. Asset Optimization Hand-Off
- Hand-off 24 property images to **Asset Director**: Convert from JPEG to AVIF format with responsive `srcset` breakpoints.

## 11. Network & Delivery Strategy
- Enable Brotli compression on server.
- Configure CDN immutable caching: `Cache-Control: public, max-age=31536000, immutable`.

## 12. API & Data Fetching Strategy
- Deduplicate property listing API calls using React Query with `staleTime: 300000` (5 minutes).

## 13. Memory Leak & Lifecycle Management
- Ensure `scene.remove()` and `geometry.dispose()` / `material.dispose()` are explicitly invoked inside `useEffect` cleanup handlers when unmounting the 3D canvas.

## 14. Mobile Web Strategy
- Cap mobile viewport device pixel ratio to `Math.min(window.devicePixelRatio, 1.5)` to prevent rendering high-DPI canvases on budget GPUs.

## 15. Flutter Strategy
- *(N/A - Project is React / Next.js Web)*.

## 16. AI / Voice Assistant Latency Strategy
- *(N/A - No voice assistant component)*.

## 17. Adaptive Quality Matrix
- **HIGH** (Desktop discrete GPU): Full 60 FPS, 2048px KTX2 textures, soft shadows.
- **MEDIUM** (Mid-range mobile): 60 FPS target, 1024px KTX2 textures, hard shadows, 1.5x max DPR.
- **LOW** (Budget mobile): 30 FPS target, 512px textures, disabled shadows, unlit materials.
- **FALLBACK**: Static 360° WebP image sequence slider.

## 18. Fallback Architecture
- If WebGL initialization fails or context is lost, render interactive 360° image sequence slider automatically.

## 19. Performance Budgets
- **Initial JS Bundle**: < 300 KB gzipped.
- **3D Geometry Weight**: < 1.5 MB Draco.
- **Texture VRAM**: < 120 MB.
- **LCP Target**: < 1.8s.
- **INP Target**: < 90ms.

## 20. Measurement & Verification Plan
- Run automated WebPageTest audit on emulate Moto G4 (3G Fast network connection).

## 21. Regression Prevention
- Add `@next/bundle-analyzer` to CI/CD build pipeline to block PRs that increase main bundle size by > 50 KB.

## 22. Priority-Ranked Fix Roadmap
1. **P0 (Immediate)**: Convert textures to KTX2 and apply Draco to 3D models (Payload reduction).
2. **P0 (Immediate)**: Code-split 3D engine out of initial JS bundle.
3. **P1 (High)**: Implement `InstancedMesh` for repeated furniture items (Draw call reduction).
4. **P2 (Medium)**: Add adaptive DPR clamping for mobile devices.

## 23. Validation & Quality Checklist
- [x] LCP < 2.0s verified on mobile emulation.
- [x] INP < 100ms verified under tap interactions.
- [x] 0 WebGL context crashes observed during stress test.
- [x] Memory cleanup verified upon canvas unmount.
