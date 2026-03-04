# 🌸 Flowers for Molly — Technical Roadmap (Web Phase)

---

## 1 · Project Goals & Success Signals

| Goal                                                 | Success Signal                                                  |
| ---------------------------------------------------- | --------------------------------------------------------------- |
| Capture & replay memories through generative flowers | Visitors dwell **> 3 min**, return-rate **> 25 %**              |
| Friction-free story submission                       | **≥ 80 %** of users who start the form finish it                |
| Longevity & scalability (“lives on forever”)         | Zero-downtime upgrades, horizontal scaling to **100 k** stories |
| Accessibility first                                  | **WCAG 2.2 AA** for color, keyboard, screen-reader support      |

---

## 2 · Target Stack

| Layer             | Choice(s)                                    | Notes                                         |
| ----------------- | -------------------------------------------- | --------------------------------------------- |
| **Frontend**      | **Next.js 18** on Vercel Edge                | Tailwind, Framer Motion                       |
| p5 Integration    | `useP5Sketch` React hook                     | Canvas hosted inside React tree               |
| Data Fetching     | SWR / React-Query                            | Edge cache aware                              |
| **Backend**       | MongoDB Atlas (Serverless)                   | Mongoose-typed models                         |
| Edge/API          | Next API Routes&nbsp;/&nbsp;Vercel Functions | Thin controller → service layer               |
| Image / OG Cards  | Vercel OG Function or Cloudinary             | Generates share card SVG/PNG                  |
| **Tooling**       | Turborepo + TypeScript mono-repo             | GitHub Actions CI; Vercel preview deployments |
| Error & Analytics | Sentry, Vercel Analytics, Plausible          | Privacy-friendly                              |

---

## 3 · Phased Timeline (~ 16 weeks)

| Phase                       | Wks   | Key Deliverables                                |
| --------------------------- | ----- | ----------------------------------------------- |
| 0 · Discovery & IA          | 1     | Content model, mood-board, story grooming       |
| 1 · Foundation & DevOps     | 1-2   | Repo scaffold, CI/CD, Storybook                 |
| 2 · Flower Algo R&D         | 2-4   | p5 interactive prototype, seed API              |
| 3 · Data Model & API        | 4-6   | Mongo schema, edge functions, rate-limit stubs  |
| 4 · Garden MVP              | 6-9   | Landing, garden canvas, story modal (read-only) |
| 5 · Contribution Flow       | 9-11  | Story form, moderation queue, bloom animation   |
| 6 · Accessibility & Perf    | 11-13 | Reduced-motion, Lighthouse ≥ 90, lazy streaming |
| 7 · Analytics & Soft-launch | 13-14 | KPI dashboards, closed beta                     |
| 8 · Public Launch & Harden  | 15-16 | Incident playbook, hand-off docs                |

---

## 4 · High-Level Architecture

```mermaid
graph TD
  subgraph Client
    A[Next.js pages] -->|p5 Hook| B(P5 Canvas)
    A --> C(API calls /SWR)
  end
  subgraph Edge@Vercel
    C --> D[/api/stories]
    C --> E[/api/flowers/:id]
    C --> F[/api/shareCard]
  end
  subgraph Service Layer
    D --> G{StoryService}
    E --> H{FlowerService}
    F --> I{CardService}
  end
  subgraph MongoDB Atlas
    G --> M[(stories)]
    H --> N[(flowers)]
  end
```

## 5 · Backend Schematics

### Collections

| Collection  | Important Fields (✱ = indexed)                                                                       |
| ----------- | ---------------------------------------------------------------------------------------------------- |
| **stories** | `_id`, `authorName`, `text`, `createdAt✱`, `flowerId✱`, `status` (`pending`, `approved`, `rejected`) |
| **flowers** | `_id`, `seed✱`, `params` (JSON), `imageUrl`, `createdAt`                                             |
| **users**   | `_id`, `email`, `role`, `createdAt`                                                                  |
| **metrics** | `type`, `timestamp✱`, `value`                                                                        |

### API Contract

GET /api/stories?skip&limit → paginated stories
POST /api/stories → { name, text } → { storyId, flowerId }
GET /api/flowers/:id → flower params + CDN image
GET /api/share/:flowerId → OG-image URL

> _All routes protected by IP rate-limit (100 req / 15 min) and content-moderation middleware._

---

## 6 · Flower Generation Algorithms

### 6.1 Deterministic seed

function storyToSeed(text: string): number {
return murmurhash3(text.trim().toLowerCase()) >>> 0; // uint32
}

### 6.2 Parameter mapping

const rng = sfc32(seed, seed >> 8, seed >> 16, seed >> 24);
const petalCount = pickByLength(text.length);
const sentiment = getSentiment(text); // -1…1
const hue = map(sentiment, -1, 1, 210, 20); // cool → warm
const layers = rngInt(rng, 1, 3);
const noiseSeed = rng() \* 1000;
Geometry (p5.js)
r(θ) = base × [1 + 0.2 sin(kθ + φ) + jitter · noise(θ + noiseSeed)]
Bloom animation: spring scale 0 → 1 (600 ms) followed by gentle breathing (±2 % scale, 6 s).

Performance tips

Cache drawn graphics by flowerId.
Cap device-pixel-ratio at 2.
Pause animation via IntersectionObserver.

## 7 · Frontend Interaction Map

- Landing – gradient fade-in → “Enter Garden”.
- GardenCanvas – virtualized sprites, pan/zoom (react-use-gesture).
- FlowerModal – Framer Motion sheet (focus-trap, Esc close).
- AddMemoryForm – optimistic bloom (client computes params before POST).
