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

# 03/05/26

We are debugging a seam/render bug in `src/app/components/InfiniteParallaxGarden.tsx` for a world that is one full repeating segment wide at `8192` logical px: `4096` meadow + `4096` forest. This segment width is
built in `src/app/garden/worldLayout.ts` and passed from `src/app/page.tsx` into `InfiniteParallaxGarden` as `segmentWidth`. The app renders a 3-copy strip `[A][B][C]` and starts in the middle copy. The intended UX
is: load at meadow start (`logicalX 0` at the left edge), scroll left to see the forest tail wrap in from the other side, and scroll right through the forest back into meadow without visible jumps or biome overlap.

The original bug was: on load, the meadow begins correctly at `logicalX 0`, but the first wrap is wrong. Scrolling left from meadow start causes the visible meadow beginning to shift to around the blue flower at
logical `~960` instead of `0`, while the end of the forest appears extended by about one viewport width. Scrolling right produces the same class of bug in reverse. Historically there was also a separate older bug
where the scene jumped in the middle of the forest. After many attempts, we learned these are not the same bug.

What is definitely not the root cause: biome manifests, world ordering, story dot placement, or biome offsets. `src/app/garden/biomes.ts` already flattens biome data into world-space sprite positions using
`xOffset`, and `src/app/garden/biomeLoader.ts` builds one combined layer list for the whole world. Attempts to “solve” this in biome data or by treating the world as a single super-biome are almost certainly the
wrong layer. The failed biome-clipping experiments proved that. We also ruled out simple recenter-threshold tuning as a complete solution: changing thresholds alone only moves the visible failure point between the
meadow/forest seam and a midpoint jump.

The biggest confirmed finding came from seam instrumentation added to `InfiniteParallaxGarden.tsx`. We logged `scrollLeft`, wrapped logical `offsetX`, `localXPx`, render phase, seam distance, viewport width, and
whether recentering occurred. Those logs proved the original jump happened before any recentering. Example: from meadow start, a tiny left move changed wrapped logical position from `0` to near `8192` with
`didRecenter: false`, and the renderer phase jumped with it. So the primary seam jump was not caused by `handleScroll` recenter timing. It was caused by the renderer using wrapped `localXPx` both for logical
viewport reporting and for parallax/render phase. That meant the visual world snapped on the very first seam-adjacent step.

What worked: separating logical wrapping from render phase enough to remove the obvious seam jump. The current best progress came from keeping wrapped `localXPx` / `offsetX` for viewport reporting and overlays,
while changing the parallax basis so it no longer blindly followed wrapped `localXPx` at the seam. The first attempt used a continuous accumulator from scroll deltas; that removed the seam jump but introduced a new
bug where the outgoing biome extended one full world length farther each loop, then doubled each loop, because render phase drifted by full segments over time. That approach is wrong long-term. The next attempt
replaced the unbounded accumulator with a seam-local phase mapping: use wrapped `localXPx`, but remap the last seam-adjacent window to a negative equivalent so render phase stays visually continuous at the wrap.
That got us the closest we have been: the major jump disappeared, and the app behaved more correctly in both directions.

The key remaining bug in that near-fixed state is this: the outgoing biome visually persists too long past the seam, and then foreground or mid/background assets appear/disappear abruptly. Going left-to-right, the
forest extends into the meadow longer than it should; after a certain point some foreground assets render back in even though they already appeared earlier in the forest. Going right-to-left, the forest ending
initially looks correct, but once the seam passes the right border some assets disappear and the scene falls into an “extended forest ending.” This remaining bug is symmetrical by direction, but it is no longer a
jump bug. Seam logs from that state show `didRecenter: false`, stable `logicalOffsetX`, and bounded `renderPhasePx`. That means the remaining problem is no longer scroll bookkeeping. It is now a pure render/
compositing issue.

What failed and should not be retried in the same form:

1. Biome clipping metadata plus clip-container adjustments. Early attempts to wire `biomeStart` / `biomeWidth` into rendering and/or move clip/content containers caused meadow/forest overlap or reverse overlap.
2. Restoring production behavior wholesale. The production version used continuous `worldXPx`, which fixes the seam snap, but its wrap window (`middleStartPx * 0.5` / `middleStartPx * 1.5`) is effectively calibrated
   for a half-world assumption and reintroduces the old mid-forest jump now that the full world is `8192`.
3. Using wrapped `localXPx` directly as render/parallax phase. This was the direct cause of the original seam jump and is proven wrong by logs.
4. Using a continuous accumulator that is allowed to drift across loops. This removed the jump but caused the outgoing biome to grow by one segment each full wrap.
5. Brute-force primitive duplication / overscan in the renderer. That created severe regressions: biome overlap, performance degradation, missing assets, white flashes, or skybox bleed, without solving the
   underlying seam behavior.
6. Passing `biomeStart` / `biomeWidth` into layers without fully reconciling the renderer’s clip coordinate system. One attempt made the entire forest render blank white, proving the current clip stack does not
   simply accept world-space biome bounds as-is.
7. The later attempt to align clip coordinates by shifting `contentStyle.left = -clipLeftPx` and widening content to `segmentWidthPx` also did not solve the remaining issue and was reverted.

What the repo tells us historically: the important regression window is around commit `3a313f1` in `InfiniteParallaxGarden.tsx`. Two things changed together there: wrap behavior moved away from earlier assumptions,
and `worldXPx` switched from continuous scroll-space to wrapped `localXPx`. Those two changes solved one symptom while creating another. The current local file also has its own uncommitted evolution on top of that.
The app today already treats the whole world as one `8192` segment. This is not fundamentally a “two biomes clashing” problem; it is a renderer seam/compositing problem.

Current best understanding of the remaining issue: the seam jump problem is mostly solved by seam-local render phase mapping, but some render layers still persist past the biome seam longer than they should. The
likely cause is in how parallax transforms are applied to a clip-local content slab in `renderLayerSegment` inside `InfiniteParallaxGarden.tsx`. Right now the renderer computes `parallaxShift` per layer and applies
it to a content container inside a clip region. Because layers have different parallax values, they enter/exit seam conditions at different times. That appears to be why some background or foreground assets deload/
reload late, producing the “extended biome” effect even though logical position and seam phase are now stable. The remaining issue is probably not in `handleScroll`, not in `offsetX`, and not in world data. It is
likely in per-layer render alignment near the seam, especially the relationship between `clipLeftPx`, `clipWidthPx`, `contentStyle`, and `parallaxShift` in `renderLayerSegment`.

If starting fresh in a new chat, the best next step is not to guess another global fix. Start from the current near-fixed state and inspect `renderLayerSegment` in `src/app/components/InfiniteParallaxGarden.tsx` as
the primary remaining suspect. Keep the seam instrumentation pattern, but focus on layer-level rendering behavior rather than scroll bookkeeping. In particular, compare how the visible outgoing biome persists after
`renderPhasePx` is already correct, and examine whether the layer content transform itself is causing some layers to stay visible or re-enter late. Do not touch biome manifests, world layout, or overlay logic unless
new evidence proves they are involved.
