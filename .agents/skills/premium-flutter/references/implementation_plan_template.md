# Reference: Sample Premium Flutter Implementation Strategy

This reference document illustrates a complete **Premium Flutter Implementation Strategy Document** produced by the Premium Flutter skill for a voice AI mobile assistant ("Jarvis Assistant").

---

# Premium Flutter Implementation Strategy: Jarvis Assistant

## 1. Project & Flutter Audit
- **SDK**: Flutter 3.22.x / Dart 3.4.x (Null safe).
- **Dependencies**: `flutter_bloc`, `go_router`, `flutter_svg`, `just_audio`, `speech_to_text`, `flutter_secure_storage`, `permission_handler`.

## 2. Product Experience Architecture
- **Concept**: *Tactile Iron Man HUD Assistant*.
- **Impression**: Dark mode neon slate surfaces (`#0B0F19`), cyan audio wave visualizers (`#38BDF8`), instant voice activation feedback, zero clutter.

## 3. Information Architecture
- Main Assistant Screen → Conversation History Drawer → Voice Settings Modal → Account Profile.

## 4. Flutter Architecture Pattern
- Feature-driven modular layout: `lib/features/assistant/`, `lib/features/settings/`, `lib/core/theme/`, `lib/shared/widgets/`.

## 5. Feature Architecture
- Presentation (`assistant_screen.dart`, `assistant_cubit.dart`), Domain (`assistant_entity.dart`), Data (`assistant_repository.dart`).

## 6. Navigation Strategy
- `GoRouter` setup with `/` (Assistant Home), `/history` (Conversation Drawer), `/settings` (Settings Modal).

## 7. Responsive & Adaptive Strategy
- **Phone (< 600dp)**: Centered audio visualizer orb, bottom voice bar, drag-up bottom sheet for history.
- **Tablet (>= 600dp)**: 2-Column split: Left 35% conversation history list; Right 65% assistant visualizer & streaming chat.

## 8. Design System & ThemeData System
- `ThemeData.dark()` with custom `ColorScheme`: `--surface: #0B0F19`, `--primary: #38BDF8`, `--secondary: #22C55E`.

## 9. Theme Architecture
- Monospaced numeric font (`JetBrains Mono`) for voice metrics + `Inter` for speech bubbles.

## 10. Widget Architecture Directory
- `AppVoiceBar.dart`, `ChatBubble.dart`, `WaveformVisualizer.dart`, `StatusIndicatorTag.dart`.

## 11. Interaction & Tactile Feedback System
- Microphone button press triggers `HapticFeedback.lightImpact()` and scale transform (`0.95` over 100ms).

## 12. Motion System Integration
- Voice orb pulse uses `AnimationController` with `Curves.easeInOut` (Duration `1200ms`, repeat reverse).

## 13. Gesture & Physics System
- History bottom-sheet uses `DraggableScrollableSheet` with spring physics deceleration.

## 14. 3D & Custom Rendering Strategy
- Custom `WaveformVisualizer` built with `CustomPainter` rendering 64 animated frequency bars. Fallback to 2D progress ring on budget devices.

## 15. Asset & Font Strategy
- Icons: `flutter_svg` loading `assets/icons/ic_mic.svg`. Fonts: SubsetBounds `JetBrainsMono-Regular.ttf` (28 KB).

## 16. Media Player Strategy
- `just_audio` player for TTS response playback. Always dispose audio player in `State.dispose()`.

## 17. State Management Implementation
- `AssistantCubit` managing 6 states: `Idle`, `Listening`, `Processing`, `Responding`, `Completed`, `Error`.

## 18. Networking & HTTP Architecture
- Dio client with stream transformer listening to SSE token responses from Jarvis AI backend.

## 19. Caching & Offline Strategy
- Recent 50 conversation text threads cached locally using `Hive` key-value storage.

## 20. AI / Voice Assistant Architecture
- Streaming tokens update `ValueNotifier<String>` in real-time; chat list auto-scrolls using `ScrollController`.

## 21. Native Integration & Permissions
- Microphone permission requested via `permission_handler`. Native Android/iOS audio routing for Bluetooth headsets.

## 22. Permission Handling Strategy
- Pre-permission dialog explaining: "Jarvis needs microphone access to listen to your voice commands."

## 23. Accessibility (Semantics & Text Scale) Integration
- Visualizer wrapped in `Semantics(label: "Jarvis Assistant Voice Orb, currently listening")`. Layout tested at 200% font scaling.

## 24. Performance & Rebuild Control Strategy
- Mark all static widget trees with `const`. Isolate audio visualizer repaints using `RepaintBoundary`.

## 25. Memory & Lifecycle Management
- `State.dispose()` cleans up `AnimationController`, `StreamSubscription`, and `just_audio` instances.

## 26. Internationalization & RTL Strategy
- Prepared for Hinglish & English via `AppLocalizations` (`l10n`).

## 27. Security Baseline
- API tokens stored securely in `flutter_secure_storage`. Zero private credentials committed in Dart files.

## 28. Testing Strategy
- Widget test for `AppVoiceBar` tapping state transition; Unit test for `AssistantCubit` state stream.

## 29. Platform & Real Device QA
- Tested on iPhone 15 Pro (iOS 17), Pixel 8 (Android 14), and Samsung Galaxy Tab S9.

## 30. Production Quality Checklist
- [x] Zero yellow/black overflow stripes on 200% font size test.
- [x] Zero memory leaks on screen pop navigation.
- [x] All audio subscriptions disposed cleanly.

## 31. Production Deployment Plan
- Release APK & IPA built using `flutter build appbundle --release` and `flutter build ipa --release`.
