# Motion Director

Motion Director skill digital products ke liye motion language architecture, animation choreography, spring physics, duration tokens, transition curves, touch gesture feedback, aur reduced-motion fallbacks design karti hai.

---

## 🧠 Ye Skill Kya Hai?

Ye skill ek senior motion designer, interaction animator, aur motion systems architect ki tarah operate karti hai. Iska main objective ye decide karna hai ki product mein kya move hoga, kyun move hoga, kab move hoga, kitni speed se move hoga (`100-300ms`), aur bina performance destroy kiye animations hierarchy aur user feedback ko kaise communicate karein.

---

## 🎯 Iska Main Kaam Kya Hai?

* **4-Level Motion Hierarchy**: Micro-interactions (Level 1), UI State Transitions (Level 2), Page/Route Choreography (Level 3), aur Immersive Storytelling (Level 4) define karti hai.
* **Duration & Easing Tokens**: Fast (100-150ms), Medium (200-250ms), Slow (300-400ms) duration tokens aur cubic-bezier / spring physics curves set karti hai.
* **GPU-Whitelisted Animations**: Browser performance bachat ke liye sirf `transform` aur `opacity` properties animate karwati hai (triggers zero layout reflows).
* **Gesture Tracking & Physics**: Swipe, drag, fling, aur scroll interactions ko natural physics simulations (`SpringSimulation`) ke saath align karti hai.
* **Reduced Motion Safety**: Accessibility preference (`prefers-reduced-motion: reduce`) detect karke large spatial motion ko 150ms opacity cross-fades mein convert karti hai.

---

## ⚡ Kab Use Hogi?

* Jab web ya Flutter app mein smooth page transitions, dynamic drawers, ya hover effects choreograph karne hon.
* Jab interactive UI micro-interactions (like button press, toggle switches, badge counters) design karne hon.
* Jab animations laggy ho rahe hon aur frame-rate drop ka issue aara ho.
* Accessibility ke liye reduced-motion fallbacks setup karte waqt.

---

## 🗣️ User Kya Bolega?

```text
"UI animations ko smooth aur fast banao"
"Page transition par spatial slide-in choreography add kar do"
"Micro-interactions ke cubic-bezier easing tokens define karo"
"Animations slow lag rahe hain, performant transform properties use karo"
```

---

## 🔧 Ye Actually Kya Karegi?

```text
Product Interaction Requirements
                ↓
    4-Level Motion Hierarchy Mapping
                ↓
   Duration Tokens & Easing Curve Setup
                ↓
 GPU-Whitelisted CSS / Flutter Controller Rules
                ↓
   Reduced-Motion Accessibility Fallbacks
                ↓
  21-Point Motion Plan / Implementation Rules
```

---

## 📥 Isko Kya Input Chahiye?

* **Design System**: Design Director ke component specs, border radii, aur color tokens.
* **Target Platform**: Web (GSAP/CSS) vs Flutter (`AnimationController`, `CurvedAnimation`).
* **Frame Rate Target**: 60 FPS / 120 FPS display target.

---

## 📤 Ye Kya Output Degi?

* Detailed **21-Point Motion Plan** document.
* CSS keyframe / transform tokens & cubic-bezier function values.
* Flutter `AnimationController`, `Tween`, aur `CurvedAnimation` setup parameters.
* Reduced-motion CSS `@media (prefers-reduced-motion)` rules.

---

## 🤝 Dusri Skills Ke Saath Relation

* **Design Director**: Design identity ke visual rhythm aur mood ke hisab se easing curves aur duration select karti hai.
* **Performance Engineer**: Layout reflows avoid karne ke liye GPU-whitelisted properties (`transform`, `opacity`) enforce karti hai.
* **Accessibility Director**: `prefers-reduced-motion` settings detect karke motion fallbacks handle karti hai.
* **Premium Web / Premium Flutter**: Production animation code implement karne ke liye instructions pass karti hai.

---

## 🧩 Master Orchestrator Mein Iska Role

* Master Orchestrator dynamic UI, interactive web apps, ya Flutter products ke liye `motion-director` ko Phase 3 (Parallel Execution) mein run karta hai.
* Iska plan frontend implementation skills ko hand off hota hai.

---

## 🔗 References Folder

```text
references/
└── motion_plan_template.md
```

Ye reference document motion strategy ko 21 structured points mein organize karne ka master template hai (motion hierarchy, duration tokens, curves, gesture physics, and reduced-motion fallbacks).

---

## 🚫 Ye Skill Kya Nahi Karegi?

* Ye har element par bina matlab ke distructive animations apply nahi karegi (usability hamesha pehle rahegi).
* Ye overall visual design system khud nahi banati (woh `design-director` ka kaam hai).

---

## 🔄 Simple Example

### User:
> "Mera mobile app drawer open hone par bohot sudden aur laggy lagta hai."

### Skill:
> Motion Director drawer transition ke liye 220ms duration set karegi, spring physics easing curve (`cubic-bezier(0.16, 1, 0.3, 1)`) define karegi, background blur ko opacity fade mein restrict karegi, aur reduced-motion user ke liye instant fade-in fallback degi.

---

## 🏗️ Overall Skills System Mein Position

```text
Design Direction
      ↓
Motion Director (Parallel with 3D & Assets)
      ↓
Implementation (Web / Flutter)
      ↓
Performance & Accessibility Audits
```

---

## 💡 Short Summary

**Simple words mein:** Ye skill aapke web aur mobile apps mein smooth, natural, aur ultra-fast (100-300ms) UI animations, page transitions, aur touch gesture feedback ka complete motion system design karti hai.
