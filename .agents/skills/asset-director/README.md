# Asset Director

Asset Director skill digital products ke visual aur media assets (images, videos, 3D models, SVG icons, illustrations) ki sourcing, format optimization (AVIF, WebP, WebM, KTX2), directory structure, aur priority loading pipeline ko design karti hai.

---

## 🧠 Ye Skill Kya Hai?

Ye skill ek senior digital asset strategist, media pipeline architect, aur visual art director ki tarah kaam karti hai. Iska main objective ye decide karna hai ki project ko konse media assets ki real zaroorat hai, woh kahan se aayenge, aur unhe fast performance, crisp quality, aur legal compliance ke saath kaise integrate kiya jaaye.

---

## 🎯 Iska Main Kaam Kya Hai?

* **Asset Sourcing Strategy**: Decide karti hai ki asset Real photography, Procedural SVG, Vector, ya 3D Model hona chahiye.
* **Modern Media Pipelines**: Multi-format images (AVIF primary, WebP secondary, PNG fallback) aur lightweight video formats (WebM/MP4) configure karti hai.
* **SVG Icon System**: Inline SVG symbol sprites setup karti hai aur SVGO se unused metadata prune karti hai.
* **Loading Priorities**: Critical assets ko `fetchpriority="high"` / eager load aur below-the-fold assets ko lazy load set karti hai.
* **Placeholders & Alt Text**: Blur-up low-resolution image placeholders (BlurHash/LIP) aur screen-reader accessible alt text define karti hai.

---

## ⚡ Kab Use Hogi?

* Jab project mein bohot saari images, videos, ya 3D models integrate karne hon.
* Jab web app par heavy images ke kaaran LCP (Largest Contentful Paint) high ho raha ho.
* Jab scalable SVG icon system aur multi-format media tags `<picture>` setup karne hon.
* Media assets ki directory structure aur CDN caching setup karne ke waqt.

---

## 🗣️ User Kya Bolega?

```text
"Website ke saare images optimize karo performance ke liye"
"SVG icons spray symbol sprite mein organize kar do"
"Images load hone par layout shift ho raha hai, aspect ratio fix karo"
"3D GLB aur video assets ki pipeline setup karo"
```

---

## 🔧 Ye Actually Kya Karegi?

```text
Media Asset Audit & Sourcing Matrix
                ↓
 Multi-Format Compression (AVIF/WebP/WebM)
                ↓
  SVG Symbol Sprite & Icon System Setup
                ↓
   Eager vs Lazy Loading Priority Rules
                ↓
  25-Point Asset Strategy / Implementation Plan
```

---

## 📥 Isko Kya Input Chahiye?

* **Raw Assets**: Uncompressed PNG/JPEG images, MP4 videos, GLB models.
* **Performance Budget**: Target image payload limits (e.g. Hero image < 150 KB).
* **Design System**: Icon style, aspect ratios, image radius rules.

---

## 📤 Ye Kya Output Degi?

* Detailed **25-Point Asset Strategy Plan** document.
* `<picture>` HTML media elements with AVIF/WebP srcset rules.
* SVGO-optimized inline SVG symbol sprite files.
* BlurHash / CSS Skeleton placeholder specifications.

---

## 🤝 Dusri Skills Ke Saath Relation

* **Design Director**: Visual identity ke according photographic tone, icon stroke weight, aur image ratios accept karti hai.
* **Performance Engineer**: Image/video payloads ko trim karke Core Web Vitals (LCP, CLS) optimize karti hai.
* **3D Experience Director**: 3D GLB/glTF model Draco/KTX2 compression pipelines par coordination karti hai.
* **Premium Web / Premium Flutter**: Production code mein optimized media tags integrate karwati hai.

---

## 🧩 Master Orchestrator Mein Iska Role

* Orchestrator media-heavy applications, e-commerce, aur visual landing pages ke liye `asset-director` ko Phase 3 (Parallel Execution) mein run karta hai.
* Iska plan implementation skills (`premium-web` / `premium-flutter`) ko transfer hota hai.

---

## 🔗 References Folder

```text
references/
└── asset_plan_template.md
```

Ye reference document skill ke media strategy plan ko 25 structured points mein document karne ka template serve karta hai (sourcing, formats, SVG sprite system, loading priorities, and CDN setup).

---

## 🚫 Ye Skill Kya Nahi Karegi?

* Ye generic stock photo search engine nahi hai (authentic product media prefer karti hai).
* Ye overall visual design language change nahi karti (woh `design-director` ka kaam hai).

---

## 🔄 Simple Example

### User:
> "Mera e-commerce store heavy 4MB PNG product images ki wajah se slow chal raha hai."

### Skill:
> Asset Director saari images ko AVIF (primary) aur WebP (secondary) format mein convert karegi, explicit `width` aur `height` attributes se CLS fix karegi, blur-up LRIP placeholder degi, aur Hero image par eager loading apply karegi.

---

## 🏗️ Overall Skills System Mein Position

```text
Design Direction
      ↓
Asset Director (Parallel with Motion & 3D)
      ↓
Implementation (Web / Flutter)
      ↓
Performance Audit
```

---

## 💡 Short Summary

**Simple words mein:** Ye skill aapke web/mobile application ke saare images, videos, 3D assets, aur icons ko high-quality visual preservation aur ultra-fast loading speed ke saath prepare aur pipeline karti hai.
