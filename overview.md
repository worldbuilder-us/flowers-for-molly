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

Issue Summary

The current bug is a world-boundary seam bug at the meadow/forest wrap, not a generic biome-layout problem.

What you see:

- App loads at meadow start with left edge at logicalX 0.
- Scrolling left or wrapping right-to-left causes a jump where the meadow appears to begin around the blue flower at logicalX ~960 instead of at 0.
- At the same time, the forest tail appears extended by about a screen width.
- After the left bound passes logicalX 8192, the meadow snaps back to its true beginning.

What that implies:

- The logical viewport offset and the rendered scene are temporarily disagreeing near the wrap.
- The error magnitude being about one screen width is a strong sign that seam normalization and viewport/render coordinate math are out of sync.

What We Tried And What Failed

1. Biome clipping fix.

- I tried wiring biome bounds into layer clipping and adjusting the render container to clip each biome slice.
- Result: it introduced the same class of error in reverse, with meadow/forest overlap.
- Conclusion: the manifests themselves are not the primary issue, and forcing biome clipping against the current world-space sprite layout is wrong.

2. Production-aligned seam fix.

- I restored the production-style wrap window and continuous worldXPx.
- Result: it removed the meadow/forest boundary problem you described, but reintroduced the older jump in the middle of the forest.
- Conclusion: production and current local each solve a different half of the problem. Neither version is correct end-to-end.

3. Reverts back to the “closest to fixed” local state.

- We reverted the last seam changes so the current workspace matches the version you said is currently closest.
- Conclusion: the fix is likely a hybrid, not a full revert to production and not the current local behavior as-is.

Current Technical Read

The most suspicious code paths are all in InfiniteParallaxGarden.tsx:

- Scroll recentering: InfiniteParallaxGarden.tsx#L287
- Wrapped local viewport position: InfiniteParallaxGarden.tsx#L476
- “Continuous” world position for parallax: InfiniteParallaxGarden.tsx#L485
- Render/parallax application: InfiniteParallaxGarden.tsx#L647

Why I think the bug lives there:

- The current local file recenters at the seam itself in handleScroll.
- The current local file also computes worldXPx from wrapped localXPx, even though the comment says it should be continuous.
- Production uses a wider recenter window and a continuous worldXPx, and that fixes the meadow/forest seam but revives the forest jump.
- That means the defect is probably the interaction between:
  - browser scrollLeft
  - wrapped logical offsetX
  - parallax base / rendered layer position
- In short: one coordinate system is being used where the other one should be.

There is also a secondary difference worth keeping in mind:

- The production file you pasted includes sprite culling tied to rendered position inside renderLayerSegment.
- Current local no longer has that same culling path.
- I do not think that is the first fix target, but it is the next subsystem to compare if hybrid wrap math alone is not enough.

What I Believe The Next Steps Should Be

1. Stop treating this as a biome problem.

- The evidence now points to seam math in the renderer, not meadow/forest asset data.

2. Instrument the seam before changing behavior again.

- Add temporary debug output for one frame path through the wrap showing:
  - scrollLeft
  - localXPx
  - worldXPx
  - left-edge logical viewport position
  - parallaxShift
  - whether recentering happened that frame
- Do this at two scenarios:
  - starting at meadow 0, then scrolling left
  - wrapping from forest end back into meadow near 8192

3. Build a hybrid fix, not a wholesale production revert.

- Keep the current local version as the base since it is closest overall.
- Then selectively reintroduce the production behavior only where it fixes the seam:
  - likely a continuous parallax/world coordinate
  - without reintroducing the earlier forest-midpoint jump
- That may mean separating:
  - wrapped coordinates for viewport reporting / overlays
  - continuous coordinates for render/parallax
  - recenter coordinates for browser scroll bookkeeping

4. Only after that, compare culling behavior with production.

- If the hybrid wrap/parallax fix still leaves a visual tail or premature meadow entry, the next place to inspect is the production culling logic that was removed from the local file.

5. Validate against the exact cases you described, not generic scrolling.

- Start at meadow 0, scroll left.
- Scroll right through forest into meadow.
- Watch the seam around 0 and 8192.
- Confirm both problems are gone:
  - no blue-flower-as-zero seam
  - no mid-forest jump

# What I Learned

This is not one bug. It is two separate regressions layered on top of each other in the same file.

1. The old “jump/reset in the forest” problem comes from wrap boundaries that were effectively calibrated for half the world.
2. The newer meadow/forest seam problem comes from parallax/render math being switched from continuous world space to wrapped local space.

Those two issues got conflated because they were changed in the same renderer over time.

Repository Evidence

The app now treats one full repeating segment as the entire combined world, not a single biome:

- worldLayout.ts:15 sums biome widths into one segmentWidth
- page.tsx:186 passes that full width into the garden
- With meadow 4096 + forest 4096, the actual repeating segment is 8192

That matters because the older production-style wrap window:

- leftBoundary = middleStartPx \* 0.5
- rightBoundary = middleStartPx \* 1.5

lands at logical 4096 and 12288 when segmentWidth = 8192. That means it recenters at the midpoint of the full world, not at the edge of the repeated strip. That explains the old forest reset issue.

I verified the regression window in history:

- 94e6bf9: production-style wrap, continuous worldXPx
- 3a313f1: changed two things together
  - moved recentering away from the midpoint toward strip edges
  - changed worldXPx from continuous scroll-space to wrapped localXPx
- Later local/uncommitted changes then moved recentering again so it now happens exactly at the world seam in the current working tree

The most important line-level facts in the current file are:

- current wrap recenter is at the seam itself: InfiniteParallaxGarden.tsx#L287
- current worldXPx is wrapped, not continuous, despite the comment saying the opposite: InfiniteParallaxGarden.tsx#L485
- render transforms use that wrapped value for parallax: InfiniteParallaxGarden.tsx#L647

That exact combination explains your current symptom:

- recenter happens exactly at 0/8192
- parallax also wraps exactly at 0/8192
- so the viewport and rendered scene disagree by about one screen width right where the seam becomes visible

What We Ruled Out

These are not the root cause:

- biome manifests
- world ordering
- biome offsets in biomeLoader
- story dot placement logic
- generic overlap in the world data

The biome-clipping experiment failed because it was trying to force a biome-slice solution onto a renderer whose sprite positions are already laid out in repeated full-world space.

Why Each Attempt Failed

Biome clipping:

- wrong layer of abstraction
- produced overlap because it fought the renderer’s repeated-strip assumptions

Production-aligned revert:

- fixed the seam because continuous worldXPx is correct for rendering
- reintroduced the older bug because the old wrap boundaries recenter at full-world midpoint when segmentWidth = 8192

Visual-scroll accumulator experiment:

- conceptually attacked the right area
- but it introduced new overlap because it changed continuity without fully reconciling the renderer’s repeated-copy assumptions

What I Now Believe Is Actually Happening

The renderer needs three coordinate systems, and right now two of them are being mixed:

- wrapped logical world position for offsetX and overlay logic
- browser strip scroll position for the 3-copy container
- continuous render-space position for parallax

The old bug came from wrong recenter thresholds.
The new bug came from using wrapped logical position as continuous render-space position.

Most Likely Correct Fix

The fix should be a historically-grounded hybrid that we have not yet tried in the exact right combination:

- Keep wrap boundaries near the actual strip edges, not at the world midpoint and not at the seam itself
- Restore continuous worldXPx for rendering/parallax
- Keep localXPx and offsetX wrapped for viewport reporting and overlays
- Do not touch biome data

Concretely, the strongest next candidate is:

- wrap-window behavior from the post-production optimization work that fixed midpoint resets
- continuous worldXPx behavior from the pre-3a313f1 renderer

That combination is supported by the repo history and explains both symptom clusters better than any code we tried ad hoc.

We are debugging a seam bug in `src/app/components/InfiniteParallaxGarden.tsx` for a world that is now one full repeating segment wide at `8192` logical px (`4096` meadow + `4096` forest), as built in `src/app/
  garden/worldLayout.ts` and passed from `src/app/page.tsx` into `InfiniteParallaxGarden` as `segmentWidth`. The observed bug is: the app loads at meadow start with left bound at logical `0`, but when wrapping across
the meadow/forest world boundary the visible scene and reported logical position disagree. Scrolling left from meadow start or wrapping right-to-left causes the meadow to appear to begin around the blue flower at
logical `~960` instead of `0`, while the forest tail appears extended by about one viewport width; after passing logical `8192`, the meadow snaps back to its real beginning. Historically there was also an older bug
where the scene “jumped” in the middle of the forest.

What we learned from the repo and failed attempts: this is not a biome manifest or world-layout problem. The biome data, biome offsets, and story placement logic are not the root cause. The failed biome-clipping
experiment proved that trying to solve this in `biomes.ts` / `biomeLoader.ts` is the wrong layer and causes meadow/forest overlap. The real problem is inside `InfiniteParallaxGarden.tsx`, where three coordinate
systems are being mixed incorrectly: raw DOM `scrollLeft` for the 3-copy strip, wrapped logical viewport position (`localXPx` / `offsetX`) for overlays and debug, and render/parallax position (`worldXPx`) for visual
continuity. In the current “closest to fixed” state, `handleScroll` recenters using near-edge boundaries (`recenterEpsilonPx`, `leftBoundary`, `rightBoundary`) and `worldXPx` is incorrectly derived from wrapped
`localXPx` even though the comment says it should be continuous. That wrapped `worldXPx` is then used for `parallaxShift` in `renderLayerSegment`, which is why the meadow/forest seam snaps visually. In the older
production-style version, `worldXPx` was continuous (`scrollLeft - middleStartPx`), which fixes the meadow/forest seam, but the wrap window logic (`middleStartPx * 0.5` / `middleStartPx * 1.5`) was effectively
calibrated for a half-world assumption and causes a jump at the midpoint of the full `8192` world, i.e. the old forest-midpoint reset.

What definitely does not work: (1) adding biome clipping metadata and shifting clip/content containers, because that introduces reverse overlap; (2) restoring production wholesale, because it fixes the boundary seam
but reintroduces the old forest-midpoint jump; (3) keeping current local wrap logic while using wrapped `localXPx` as `worldXPx`, because that preserves the current seam bug; (4) using continuous parallax without
also solving renderer coverage, because it exposes rectangular holes / missing-assets regions at the beginning of the forest and degrades performance if done by brute-force overscan; (5) moving recenter thresholds
around blindly, because that only moves the location of the visible jump between meadow seam, forest midpoint, and meadow midpoint.

The key historical regression appears around commit `3a313f1`, where two important things changed together in `InfiniteParallaxGarden.tsx`: wrap behavior moved away from the earlier midpoint-based logic, and
`worldXPx` was changed from continuous scroll-space to wrapped `localXPx`. Those two changes solved one symptom while creating another. The correct fix is likely a careful hybrid in `InfiniteParallaxGarden.tsx`
only: wrapped coordinates (`localXPx`, `offsetX`) should remain the source of truth for logical viewport reporting and overlays like `StoryDotsOverlay`, while render/parallax must use a continuous world coordinate
that does not jump at the seam. At the same time, recenter must not happen at a visual midpoint inside the full world. The next investigation should start by instrumenting `handleScroll`, `localXPx`, `worldXPx`,
`offsetX`, `parallaxShift`, and recenter events immediately before and after the seam event in both directions, using the current “closest to fixed” version as baseline. The explicit goal is to prove exactly where
DOM scroll, logical offset, and render-space diverge. Do not touch biome manifests, world layout, or story dot logic until that instrumentation proves they are involved. The problem is in the renderer’s seam
bookkeeping, not in the world data.

# new

On load, the user starts at the true beginning of the meadow, with the left edge of the viewport at logical x = 0. The first screen looks correct.

When the user scrolls left from that starting point, the app should wrap cleanly into the end of the forest: the forest tail should enter from the left, and the meadow’s true beginning should remain on the right
side of the seam. Instead, the viewport eventually behaves as if the meadow begins around the blue flower at logical x ~= 960, while the forest appears stretched by about one viewport width. After the seam moves
fully past the viewport and the left edge passes logical 8192, the meadow suddenly snaps back to its true start.

When the user scrolls right from the meadow through the world and returns toward the meadow/forest seam from the other direction, the same disagreement appears in reverse: the forest tail looks extended, the
incoming meadow starts at the wrong internal point instead of 0, and once the wrap completes the world snaps back to the correct meadow beginning. Earlier variants of the renderer also produced a separate jump in
the middle of the forest, which means we are dealing with both seam continuity and recenter bookkeeping, not bad biome data.
