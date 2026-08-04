# Reference: Sample Security Architecture & Risk Strategy

This reference document illustrates a complete **Security Architecture & Risk Strategy Document** produced by the Security Director skill for an AI financial workspace platform ("OmniVault AI").

---

# Security Strategy: OmniVault AI Platform

## 1. Security Objectives & Risk Profile
- **Target Posture**: High-Security Enterprise Standard (SOC2 Type II / ISO 27001 baseline).
- **Scope**: Web Application, Mobile Companion App (Flutter), AI Agent Backends, Cloud Infrastructure.

## 2. Asset Inventory
- **Critical**: Database encryption master keys, AWS production credentials, customer financial records, JWT signing private keys.
- **High**: OAuth refresh tokens, AI prompt conversation history, user contact details.
- **Medium**: Non-sensitive application logs, user UI preferences.
- **Public**: Marketing content, public API documentation.

## 3. STRIDE Threat Model
- **Spoofing**: Fake OAuth callback → Mitigated via PKCE (`Pixie`) and strict redirect URI matching.
- **Tampering**: Modifying financial transfer payloads → Mitigated via HMAC-SHA256 request signatures.
- **Repudiation**: Unverified financial actions → Mitigated via immutable audit logs (`audit_events` table).
- **Information Disclosure**: BOLA on `/api/portfolio/:id` → Mitigated via mandatory server-side tenant checks.
- **Denial of Service**: AI prompt flooding → Mitigated via IP/User rate limiting (10 AI requests/min).
- **Elevation of Privilege**: Normal user invoking admin tool → Mitigated via server-side RBAC middleware.

## 4. Trust Boundary Identification
- Boundary 1: Browser / Flutter App ↔ Public API Gateway.
- Boundary 2: Public API Gateway ↔ Internal Microservices / AI Agent Workers.
- Boundary 3: AI Agent Workers ↔ External Banking & Payment APIs.

## 5. Attack Surface Reduction Plan
- Disable all Swagger/OpenAPI documentation endpoints in production (`NODE_ENV === 'production'`).
- Block direct public database connections; isolate PostgreSQL inside a private AWS VPC subnet.

## 6. Authentication Architecture
- Primary Auth: OAuth 2.0 + OpenID Connect via Auth0 with WebAuthn / Passkey support.
- MFA: Required for all financial execution actions via TOTP Authenticator apps.

## 7. Authorization Architecture
- Server-Side Role-Based Access Control (RBAC): Roles = `Viewer`, `Trader`, `Administrator`.
- Attribute-Based Access Control (ABAC): Enforces `organization_id` matching on every database query.

## 8. Session & Token Management
- Short-lived Access Tokens (JWT, 15-minute expiration) + Encrypted Refresh Tokens stored in `HttpOnly`, `SameSite=Strict`, `Secure` cookies.

## 9. API Security Strategy
- Rate Limiting: 100 requests/minute per IP for standard endpoints; 5 requests/minute for password reset.
- Payload Cap: Maximum 2 MB payload size on REST APIs; 10 MB on file upload routes.

## 10. Input Validation Strategy
- Server-Side Validation: Schema enforcement using `Zod` allowlists. Reject any unknown JSON fields.

## 11. Output Encoding & Sanitization
- Contextual HTML encoding using DOMPurify for untrusted user inputs to eliminate XSS risks.

## 12. File Security & Upload Isolation
- File Uploads: Re-encoded server-side, checked via ClamAV virus scanner, stored in private S3 bucket with signed URLs expiring in 15 minutes.

## 13. Database Security Baseline
- PostgreSQL: Parameterized queries only (`pg-promise` / Prisma ORM). Master password stored in AWS Secrets Manager.

## 14. Data Classification & Privacy Policy
- Sensitive PII encrypted at rest using AES-256-GCM. Automatic 30-day deletion for temporary diagnostic logs.

## 15. Encryption Strategy (Transit & Rest)
- In Transit: TLS 1.3 enforced with HSTS (`max-age=31536000; includeSubDomains; preload`).
- At Rest: AES-256 KMS encryption for EBS volumes and S3 buckets.

## 16. Secret Management Architecture
- Zero Secrets in Code: All secrets loaded via environment variables at container startup. Secret scanning enabled in CI/CD.

## 17. Frontend Security Strategy
- Strict Content Security Policy (CSP): `default-src 'self'; script-src 'self' https://cdn.auth0.com; object-src 'none'`.

## 18. Flutter / Mobile Security Strategy
- `flutter_secure_storage` used for storing session refresh tokens. SSL Pinning enabled for production domain APIs.

## 19. Web Security Headers
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.

## 20. Dependency & Supply Chain Security
- Automated `npm audit` / `dependabot` checks in GitHub Actions. Lockfiles (`package-lock.json`) strictly committed.

## 21. CI/CD Build Pipeline Hardening
- GitHub Actions runners execute with minimal read-only permissions; main branch requires 2 code reviews + signed commits.

## 22. Infrastructure & Network Security
- AWS Web Application Firewall (WAF) enabled with OWASP Top 10 rule sets.

## 23. Third-Party Integration Security
- Webhook endpoints validate incoming Stripe signatures via `stripe.webhooks.constructEvent()` with cryptographic secret.

## 24. Webhook Security Architecture
- Signature verification + 300-second timestamp freshness check to eliminate replay attacks.

## 25. OAuth & Identity Provider Hardening
- PKCE (`S256` code challenge) enforced for Flutter and Web SPA OAuth authorization code grants.

## 26. AI Prompt Injection Safeguards
- System prompts wrapped in explicit isolation XML tags (`<system_instructions>`). Untrusted user content tagged in `<user_content>` blocks.

## 27. RAG & Vector Storage Security
- Vector searches (pgvector) filter queries with `WHERE organization_id = :org_id AND user_role IN (:roles)`.

## 28. AI Agent Tool Permission Architecture
- Least-Privilege Scoping: AI agents receive access *only* to `read_balance` and `generate_report` tools by default.

## 29. Voice Assistant Security Baseline
- Voice commands for money transfers strictly trigger an interactive 2-step confirmation modal on the screen.

## 30. Privacy & Data Deletion Controls
- Account Deletion API: Cascading delete purging user records, vector embeddings, and session caches within 72 hours.

## 31. Logging, Audit & Monitoring Architecture
- Audit Log: `audit_logs` table records `user_id`, `action`, `resource_id`, `timestamp`, `ip_hash`. Zero passwords or tokens logged.

## 32. Incident Response & Containment Plan
- Emergency Secret Revocation: Automated AWS Lambda script revokes all active session tokens on secret rotation.

## 33. Abuse Case & Negative Testing Matrix
- Automated integration test attempts IDOR access on `/api/portfolio/999` using `User 1` credentials and expects `403 Forbidden`.

## 34. Security Testing Plan
- SAST via SonarQube; DAST via OWASP ZAP automated scanner; bi-annual third-party penetration testing.

## 35. Security Risk Priority Matrix
- P0 Blocker: Hardcoded private keys or unauthenticated admin API routes.
- P1 Critical: Missing authorization check on data mutation endpoints.

## 36. Remediation Roadmap
- Phase 1: Remediate authorization gaps & enforce CSP headers.
- Phase 2: Implement SSL Pinning & AI tool approval gates.

## 37. Final Security Quality Checklist
- [x] Zero hardcoded secrets in Git repo.
- [x] BOLA/IDOR authorization verified on all routes.
- [x] Content Security Policy verified active.
- [x] AI agent human approval gate operational.
