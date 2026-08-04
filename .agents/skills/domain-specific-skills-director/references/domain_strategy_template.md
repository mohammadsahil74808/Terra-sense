# Reference: Sample Domain-Specific Product Strategy

This reference document illustrates a complete **Domain-Specific Product Strategy Document** produced by the Domain-Specific Skills Director skill for a hybrid AI healthcare platform ("MedPulse AI").

---

# Domain-Specific Product Strategy: MedPulse AI

## 1. Product Classification
- **Primary Domain**: Healthcare / Clinical Telemedicine.
- **Secondary Domain**: AI / Autonomous Diagnostic Agent.

## 2. Product Format & Medium
- Web Application (Clinician Workstation) + Mobile Companion App (Patient Portal).

## 3. Target Audience & User Roles
- **Role 1 (Clinician / Physician)**: High-density diagnostic workstation, patient chart review, AI diagnostic suggestion audit, prescription approval.
- **Role 2 (Patient)**: Low-friction symptom intake wizard, video appointment portal, medication reminders.

## 4. Primary User Goals
- Clinicians: Accelerate patient intake analysis and verify AI diagnostic risk flags with 100% clinical safety.
- Patients: Communicate symptoms easily and receive verified physician care.

## 5. Critical Domain Workflows
- **Clinician Workflow**: `Patient Queue → AI Diagnostic Summary Audit → Raw EEG/Lab Data Verification → Physician Approval → Patient Treatment Plan Sync`.

## 6. Domain Expectations
- Absolute data confidentiality (HIPAA compliance), zero ambiguity in medical metrics, instant access to patient medical history.

## 7. Information Architecture (IA)
- Clinician Shell:
  - Header: Patient Switcher & Emergency Escalation Alert.
  - Left Nav: Patient Queue, Diagnostic Inbox, Lab Results, Prescriptions.
  - Main Canvas: Split view (Left 45%: AI Reasoning & Risk Flags; Right 55%: Raw Medical Charts & Waveforms).

## 8. Specialized UX Patterns
- **Clinical Command Palette** (`Cmd+K` for rapid medication lookups).
- **Split-Screen Verification View** (Juxtaposing AI suggestions against raw lab data).
- **Human-in-the-Loop Sign-off Drawer**.

## 9. Trust & Transparency Baseline
- **AI Citation Tracing**: Every AI diagnostic suggestion links directly to the specific line in the patient's lab results or medical journal source.
- **Confidence Score Badges**: Explicit confidence indicators (e.g., `High Confidence (94%) - Based on 3 Lab Markers`).

## 10. High-Stakes Safety Rules
- AI *never* prescribes medication directly. Require explicit 2-step physician signature verification (`Confirm & E-Sign`).

## 11. Domain-Specific Functionality
- Real-time DICOM image viewer, HL7/FHIR medical record integration, HIPAA-compliant video consultation module.

## 12. Content Strategy & Requirements
- Clinical, precise, non-alarmist terminology. Use exact medical metrics (e.g., `SpO2 98%`, `BP 120/80 mmHg`).

## 13. Visual Tone & Direction Hand-Off
- Hand-off to **Design Director**: High-contrast clinical workstation aesthetic. Deep slate background (`#090D16`), crisp monospaced numeric readouts (`JetBrains Mono`), no generic glowing AI blurs.

## 14. 3D Domain Relevance
- Hand-off to **3D Experience Director**: Optional 3D anatomical organ viewer for localized symptom tagging. Defer to 2D SVG fallback on low-tier mobile hardware.

## 15. Motion Domain Relevance
- Hand-off to **Motion Director**: Motion restricted strictly to functional state feedback (e.g., 150ms state updates). Zero decorative floating animations.

## 16. Asset Domain Requirements
- Hand-off to **Asset Director**: Authentic medical iconography (ECG waves, stethoscope, blood metrics), high-resolution DICOM asset handling.

## 17. Performance Domain Priorities
- Hand-off to **Performance Engineer**: Target INP < 60ms for clinical data entry; instant patient chart hydration.

## 18. Accessibility Domain Needs
- Screen-reader compatible data tables (`aria-describedby`), high-contrast mode (14:1 contrast ratio), 200% font scale survival.

## 19. Security Domain Baseline
- End-to-end encryption for video streams, BAA agreement compliance, SOC2 Type II audit trail, `flutter_secure_storage` for mobile tokens.

## 20. Web-Specific Domain Mechanics
- Desktop multi-monitor layout support, URL-addressable patient IDs (`/patient/10492/diagnostics`).

## 21. Mobile-Specific Domain Mechanics
- Native push notifications for critical patient vitals, biometric login (FaceID / TouchID).

## 22. Custom Domain Modifications
- Custom hybrid rule: AI diagnostic suggestions automatically pause and highlight in amber if confidence drops below 80%.

## 23. Conflict Resolution Matrix
- Clinical safety and data legibility ALWAYS take precedence over visual trends or decorative animations.

## 24. Priority-Ranked Feature Roadmap
1. Phase 1: Core Patient Charting & E-Signature Sign-off.
2. Phase 2: AI Diagnostic Summary Stream & Citation Tracing.
3. Phase 3: Interactive 3D Anatomical Symptom Tagging.

## 25. Domain Quality Checklist
- [x] HIPAA compliance architecture verified.
- [x] AI citations mapped to raw medical records.
- [x] Physician 2-step sign-off gate enforced.
- [x] Emergency escalation path accessible from all screens.
