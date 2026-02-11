# Flowers for Molly — Application Overview

## Purpose

Flowers for Molly is a memorial, collaborative generative artwork. Visitors can:

- Explore an infinite parallax “garden” scene where each story is represented as a dot.
- Read stories in a modal or a grid index view.
- Submit new stories that are stored in MongoDB.

The experience leans heavily on custom layout/animation (parallax layers, particles, audio) and a data-backed story archive.

## Tech Stack

- Framework: Next.js 15 (App Router)
- UI: React 19, CSS Modules, local fonts via `next/font/local`
- Data: MongoDB + Mongoose
- Generative sketch (optional): p5 (prototype in `src/p5/sketch.ts`)
- Tooling: TypeScript, ESLint, Tailwind (imported but used minimally)

## Project Structure (Top Level)

- `src/app`: Next App Router pages, layout, components, CSS modules.
- `src/app/components`: Core UI building blocks for the garden, header, modal, and story overlays.
- `src/app/garden`: Declarative biome/layer system for the parallax scene.
- `src/app/api`: API routes for stories.
- `src/lib`: DB connection helpers.
- `src/models`: Mongoose schema for stories.
- `public`: Static assets (images, gradients, icons, fonts, audio, garden sprites).
- `data`: Story import source (`data/stories.txt`).
- `scripts`: Import script for ingesting stories into MongoDB.
- `blender-photoshop`: Source assets and art pipeline files for garden sprites.

## Runtime Configuration

- Environment: `MONGODB_URI` is required. `src/lib/mongoose.ts` throws on missing value.

## Routing Overview (App Router)

### `/` (Garden)

`src/app/page.tsx`

- Client-only page that renders the infinite parallax garden.
- Fetches stories from `/api/stories?page=1&limit=1000`.
- Overlays a story dot for each story, pinned to world coordinates.
- Displays a modal when a dot is clicked.
- Plays background music on first user interaction; loops with fade-in/out.
- Includes an always-on debug panel for:
  - Wireframe sprites
  - Pointer coordinate debug

### `/submit`

`src/app/submit/page.tsx`

- Story submission form (name, optional email, story).
- Auto-resizing textarea.
- POSTs to `/api/stories`, then navigates to `/view/:id`.

### `/view`

`src/app/view/page.tsx`

- Story index grid.
- Paginates using `/api/stories?page=X&limit=12`.
- Clickable cards open a modal for full story text.

### `/view/[id]`

`src/app/view/[id]/page.tsx`

- Single story detail view fetched from `/api/stories/:id`.
- Includes a back button and link to `/view`.
- p5 integration is scaffolded but commented out.

### `/about`

`src/app/about/page.tsx`

- Static memorial copy and poem excerpt.

### `/poem`

`src/app/poem/page.tsx`

- Placeholder page with commented-out markup.

## Layout, Fonts, and Global Styling

- `src/app/layout.tsx`
  - Global metadata for title/description/icons/manifest.
  - Uses `goldenbook` and `montserrat` local fonts (`src/app/fonts.ts`).
  - Background color set to translucent white; gradient support commented out.
- `src/app/globals.css`
  - Imports Tailwind.
  - Sets CSS variables for background/foreground.
  - Defines base `body` font and full-height layout.

## Core UI Components

### `Header`

`src/app/components/Header.tsx`

- Navigation changes based on route context (garden, submit, about, view).
- Applies blur styling on non-garden pages.

### `StoryModal`

`src/app/components/StoryModal.tsx`

- Portal-based modal for displaying story text.
- Locks body scroll and closes on backdrop click or Escape.
- Displays author and optional import date.
- Uses decorative frame images from `public/ornaments`.

### `StoryDotsOverlay`

`src/app/components/StoryDotsOverlay.tsx`

- Positions a dot for each story in world space.
- Uses deterministic hashing of story IDs for placement.
- Generates a particle spiral effect on hover.
- Plays a random SFX on hover (preloaded audio pool).

### `InfiniteParallaxGarden`

`src/app/components/InfiniteParallaxGarden.tsx`

- Core renderer for the infinite parallax scene.
- Uses three repeating segments to create seamless scrolling.
- Maps vertical wheel input to horizontal scroll.
- Scales assets based on a logical scene height (1024px).
- Supports curved layers, per-sprite scaling, repeat-x layers, and debug wireframes.
- Emits viewport and pointer debug info for overlays.

## Garden System (Biome → Layers)

`src/app/garden/biomes.ts` and `src/app/garden/biomeLayout.ts`

- A biome defines asset groups and per-layer behavior.
- `buildLayersFromBiome` flattens the biome into renderable layer configs.
- Each layer supports parallax, opacity, baseline positioning, and sine-curve offsets.
- Current biome: `meadowBiome`, composed of:
  - Foreground flora (multiple groups, varied scales)
  - Mid-ground scenery (stream, path, trees, bench, church)
  - Background hills/clouds
  - Repeating skybox

## Data Model (MongoDB)

`src/models/Story.ts`

- Key fields: `authorName`, `authorEmail`, `textMarkdown`, `textPlain`
- Derived metrics: `storyLines`, `paragraphCount`, `wordCount`, `charCount`, `hasSalutation`
- Status: `pending | approved | rejected` (default `approved` in schema)
- Uniqueness: `uniqueKey` and compound index on `authorName + textHash32`
- Timestamps: `createdAt`, `updatedAt`

## API Routes

### `GET /api/stories`

`src/app/api/stories/route.ts`

- Accepts `page` and `limit` query params (limit capped at 100).
- Sorts by `importedAt`, `createdAt`, `_id` for stable order.
- Returns pagination metadata plus story list (lean documents).

### `POST /api/stories`

`src/app/api/stories/route.ts`

- Validates required fields and email format.
- Normalizes Markdown → plain text.
- Computes hashes and story metrics.
- Upserts by `uniqueKey` (author + content hash).
- Sets status to `pending` in the submitted doc.

### `GET /api/stories/:id`

`src/app/api/stories/[id]/route.ts`

- Validates ObjectId, returns 400 if invalid.
- Returns 404 if not found.

## Story Import Pipeline

`scripts/importStories.ts`

- Reads `data/stories.txt`.
- Parses by `### Name` headings.
- Detects and strips email lines.
- Derives text metrics and hashes, then bulk upserts into MongoDB.
- Uses `dotenv/config`; run via `npx tsx scripts/importStories.ts`.

## Audio

- Background music: `public/sound/flowers for molly theme.mp3`
- Hover SFX: `public/sound/sfx/sfx_0.mp3` ... `sfx_5.mp3`
- Audio auto-play is gated by first user interaction.

## Visual Assets

- `public/garden`: All runtime sprite assets for the meadow scene.
- `public/gradients`: Optional background gradients (currently commented out).
- `public/ornaments`: Modal frame UI elements.
- `public/fonts`: Local typefaces.
- `blender-photoshop`: Source art files (Blender, PSD, stock references).

## Notable Implementation Details

- The garden is rendered as three segments (`[A][B][C]`) and scroll wraps around the middle segment to simulate infinity.
- Dot positioning is deterministic: same story ID always maps to the same point.
- Modal scroll locking is implemented by mutating `document.body.style.overflow`.
- `/view/[id]` page uses inline styles, while most other pages rely on CSS Modules.
- The p5 sketch is currently unused in production, but provides a baseline generative flower algorithm prototype.

## Local Development

- Install: `npm install`
- Dev: `npm run dev`
- Build: `npm run build`
- Start: `npm run start`
- Lint: `npm run lint`

## Known Gaps / Placeholders

- `src/app/poem/page.tsx` is a stub with commented-out markup.
- Moderation flow is not exposed in UI (stories are stored with `pending` status on submission, but not filtered in GET).
- Some Roadmap items in `Roadmap.md` describe aspirational features not yet implemented.
