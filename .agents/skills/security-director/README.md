# Security Director

Security Director skill web, Flutter, mobile, SaaS, aur AI applications ke liye Security-by-Design architecture, STRIDE threat modeling, server-side RBAC/ABAC authorization, BOLA/IDOR protection, OWASP vulnerabilities defense, mobile secure storage, zero-secret bundle enforcement, aur AI prompt injection safeguards implement karti hai.

---

## 🧠 Ye Skill Kya Hai?

Ye skill ek senior application security architect, product security engineer, threat modeler, aur AI security specialist ki tarah kaam karti hai. Iska main purpose application ko Security-by-Design principles ke saath plan, audit, aur build karna hai taaki security final patch ki bajaye baseline architecture ka hissa rahe.

---

## 🎯 Iska Main Kaam Kya Hai?

* **Asset Classification & STRIDE Threat Modeling**: Critical, High, Medium, aur Public assets classify karna aur STRIDE framework ke under threats audit karna.
* **Server-Side Authorization & BOLA/IDOR Defense**: Enforce karna ki har single API endpoint server-side ownership aur permissions verify kare (`GET /api/user/1029/orders`).
* **OWASP Vulnerability Defenses**: SQL Injection (parameterized queries), XSS (DOM sanitization & CSP headers), CSRF (`SameSite` cookies), SSRF (internal IP blocking), aur CORS rules (`*` avoid करना) setup karna.
* **Zero-Secret Rule & Mobile Hardening**: Client bundles aur Flutter APKs se secrets eliminate karna, `flutter_secure_storage` / Keychain use karna, aur SSL pinning setup karna.
* **AI & Multi-Agent Safety Architecture**: Indirect prompt injection defense (system prompt isolation), vector DB document-level permissions, aur high-risk tool actions (payments, file deletion, CLI) ke liye mandatory Human-in-the-Loop approval gates design karna.

---

## ⚡ Kab Use Hogi?

* Jab authentication, OAuth, Passkeys, ya session architecture design ya audit karni ho.
* Jab APIs, payment gateways, ya sensitive user databases expose kar rahe hon.
* Jab Flutter/Mobile app mein API secrets, JWT tokens, ya secure storage configure karna ho.
* Jab AI Assistants, autonomous tool-using agents, ya RAG vector search engines build kar rahe hon.

---

## 🗣️ User Kya Bolega?

```text
"App ka security threat model aur OWASP audit karo"
"API end-points par IDOR / BOLA vulnerabilities test karo"
"Flutter app mein JWT tokens ko securely store karo"
"AI agent ke tool execution par human confirmation gate lagao"
```

---

## 🔧 Ye Actually Kya Karegi?

```text
Product & Trust Boundary Identification
                ↓
  STRIDE Threat Modeling & Asset Classification
                ↓
 Server-Side Authorization & BOLA/IDOR Safeguards
                ↓
 Web OWASP Defenses & Mobile Storage Hardening
                ↓
 AI Prompt Injection & Tool Approval Gates
                ↓
 37-Point Security Architecture & Risk Strategy
```

---

## 📥 Isko Kya Input Chahiye?

* **Architecture & API Endpoints**: Backend API routes, database schemas, auth mechanisms.
* **Sensitive Assets**: API keys, user PII, payment pipelines, AI agent tools.
* **Deployment Targets**: AWS, Vercel, Firebase, Flutter Mobile.

---

## 📤 Ye Kya Output Degi?

* Detailed **37-Point Security Architecture & Risk Strategy** document.
* Server-side authorization middleware rules, CSP security headers, aur parameter validation schemas.
* `flutter_secure_storage` implementation guidance and SSL pinning configs.
* AI prompt isolation tags and human-in-the-loop confirmation gate workflows.

---

## 🤝 Dusri Skills Ke Saath Relation

* **Domain-Specific Skills Director**: High-trust domains (Fintech, Healthcare) ke compliance rules (HIPAA, PCI-DSS) accept karti hai.
* **Premium Web / Premium Flutter**: Production code mein zero-secret bundle rules, secure storage, aur CSRF/CSP headers enforce karti hai.
* **Accessibility Director**: Security UI (Passkeys, 2FA modals) ko accessible aur understandable banane par coordinate karti hai.

---

## 🧩 Master Orchestrator Mein Iska Role

* Master Orchestrator authentication, APIs, payments, personal data, ya AI agents handle karne wale har project ke liye `security-director` ko Phase 5 (Production Audits) mein mandatory activate karta hai.

---

## 🔗 References Folder

```text
references/
└── security_strategy_template.md
```

Ye reference document security strategy ko 37 structured points mein organize karne ka master template serve karta hai (threat modeling, authentication, BOLA/IDOR protection, CORS/CSP headers, AI prompt injection safeguards, and incident response).

---

## 🚫 Ye Skill Kya Nahi Karegi?

* Ye usability ko unnecessary block nahi karegi (security risk-proportional honi chahiye).
* Ye custom encryption algorithms invent nahi karti (industry-standard TLS 1.3 / AES-256 libraries use karti hai).

---

## 🔄 Simple Example

### User:
> "Mera AI agent database records delete aur emails send kar sakta hai, security kaise handle karein?"

### Skill:
> Security Director tool-level least privilege grant karegi, system instructions ko external input se isolate karegi, `delete_record` aur `send_email` tools par explicit human approval gate UI enforce karegi, aur API keys ko server environment variables mein lock karegi.

---

## 🏗️ Overall Skills System Mein Position

```text
Domain & Design Architecture
            ↓
Implementation (Web / Flutter)
            ↓
    Security Director Audit
            ↓
   Final Product Critic
```

---

## 💡 Short Summary

**Simple words mein:** Ye skill aapke web, mobile, aur AI applications ko server-side authorization, BOLA/IDOR defense, OWASP hardening, zero-secret bundles, aur AI prompt injection safeguards ke zariye 100% Security-by-Design banati hai.
