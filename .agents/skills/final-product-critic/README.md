# Final Product Critic

Final Product Critic skill completed ya substantially built digital products (Web, Flutter, 3D, AI, Dashboards) ke liye final independent quality-control gatekeeper aur readiness evaluator ki tarah kaam karti hai.

---

## 🧠 Ye Skill Kya Hai?

Ye skill ek senior independent quality control architect, product critic, anti-genericness auditor, aur production readiness evaluator hai. Iska kaam product ko scratch se design karna nahi hai, balki build hone ke baad actual product aur codebase ko independently inspect karke clear evidence ke saath batana hai ki kya strong hai, kya broken hai, kya generic hai, aur kya product ship hone ke liye ready hai ya nahi.

---

## 🎯 Iska Main Kaam Kya Hai?

* **Empirical Product Inspection**: Actual code, components, routes, network responses, assets, aur interactions inspect karti hai. Non-verifiable items ko explicitly `[UNVERIFIED]` tag karti hai.
* **13-Point Review Order**: Sequential auditing sequence:
  1. Product Correctness (Blockers first)
  2. Core UX
  3. Visual Design
  4. Premium Quality vs. Fake Premium (rejects purple/cyan glowing orbs, glassmorphism overuse, uniform cards)
  5. Anti-AI / Genericness Review
  6. Motion Review
  7. 3D Review (verifies mobile fallbacks & necessity)
  8. Asset Quality
  9. Responsive & Platform Quality
  10. Performance
  11. Accessibility (WCAG 2.1 AA)
  12. Security & Trust (BOLA/IDOR, prompt injection, tool gates)
  13. Content & Consistency
* **P0-P3 Severity Matrix**: Every finding ko rank karti hai into **P0 — Blocker** (Ship gate stopper), **P1 — Critical**, **P2 — Important**, aur **P3 — Polish**.
* **Defensible Verdict**: Review ko explicit final verdict par end karti hai: **SHIP**, **SHIP WITH FIXES**, **NOT READY**, ya **BLOCKED**.

---

## ⚡ Kab Use Hogi?

* Major product build ya redesign complete hone par final release evaluation ke liye.
* Jab user product ki readiness ya quality audit karne ko kahe.
* Master Orchestrator ke Quality Gate 5 par production shipping approval dene ke liye.

---

## 🗣️ User Kya Bolega?

```text
"Review this project and tell me if it's production ready"
"Is this product ready to ship?"
"Critique the whole web app and find what's broken or generic"
"Check if this app looks professional and anti-generic"
```

---

## 🔧 Ye Actually Kya Karegi?

```text
Codebase & Empirical Product Inspection
                ↓
    13-Point Comprehensive Category Audit
                ↓
 P0 / P1 / P2 / P3 Priority Classification Matrix
                ↓
  Anti-AI Cliché & Fake Premium Elimination
                ↓
 Executive Verdict (SHIP / SHIP WITH FIXES / NOT READY / BLOCKED)
                ↓
  Targeted Remediation Order Output
```

---

## 📥 Isko Kya Input Chahiye?

* **Implemented Codebase**: Actual Web or Flutter codebase files, components, styles, assets.
* **Live / Static Build**: Inspected routes, API responses, console logs, mobile viewport states.

---

## 📤 Ye Kya Output Degi?

* Detailed **Product Review & Quality Critique** document.
* Executive Verdict (**SHIP**, **SHIP WITH FIXES**, **NOT READY**, **BLOCKED**).
* P0-P3 Priority Findings Matrix with exact file locations, impact explanations, and fix recommendations.
* Practical Remediation Sequence.

---

## 🤝 Dusri Skills Ke Saath Relation

* **Master Orchestrator**: Final Product Critic Gate 5 ka final audit report orchestrator ko submit karti hai.
* **Specialist Skills (Design, Security, Performance, 3D, Accessibility)**: Audit mein mile P0/P1 findings ko Master Orchestrator ke zariye unke respective specialist tak fix ke liye reroute karwati hai.

---

## 🧩 Master Orchestrator Mein Iska Role

* Master Orchestrator product completion ke baad `final-product-critic` ko Gate 5 par final quality audit ke liye invoke karta hai.
* Agar Critic **NOT READY** ya **BLOCKED** verdict deta hai, toh Orchestrator P0/P1 issues ko directly specific specialists par route karta hai aur fix ke baad re-audit karwata hai.

---

## 🔗 References Folder

```text
references/
└── product_review_template.md
```

Ye reference document product review aur quality critique ko structured format mein document karne ka master template serve karta hai (Executive verdict, what works, P0-P3 findings matrix, category audits, and remediation order).

---

## 🚫 Ye Skill Kya Nahi Karegi?

* Ye initial product orchestrator nahi hai (architecture khud define nahi karti).
* Ye overall visual design scratch se invent nahi karti (sirf existing implementation ko critique aur audit karti hai).
* Ye technical tests pass hone par blind praise nahi degi (usability aur real user perspective se judge karti hai).

---

## 🔄 Simple Example

### User:
> "Mera crypto dashboard ready hai, dekh ke batao production ready hai ya nahi."

### Skill:
> Final Product Critic entire app audit karegi. Woh payegi ki visual styling achhi hai lekin 'Send Funds' button par network error aane par silent failure hota hai (P0 Blocker) aur keyboard traversal par focus ring missing hai (P1 Critical). Critic verdict degi: **NOT READY**, aur exact file locations ke saath P0/P1 fix sequence degi.

---

## 🏗️ Overall Skills System Mein Position

```text
Requirement Analysis
        ↓
Design & Implementation
        ↓
Performance, Accessibility & Security Audits
        ↓
   Final Product Critic (Final Quality Gate)
        ↓
   [P0/P1 Issues?] ── YES ──► Specialist Remediation Loop
        │
       NO
        ↓
      SHIP
```

---

## 💡 Short Summary

**Simple words mein:** Ye skill aapke final product ki complete empirical testing aur critique karke P0-P3 issues highlight karti hai aur clear final verdict (**SHIP / NOT READY / BLOCKED**) deti hai taaki koi broken ya generic product launch na ho.
