# Flowers for Molly — Current Overview

## Purpose

Flowers for Molly is a memorial, collaborative artwork built as a horizontally scrollable parallax garden.

Visitors can:
- explore the garden and interact with story dots
- open stories in a modal from the garden
- browse the story index view
- submit new stories for moderation

The project combines a custom DOM-based parallax renderer, a MongoDB-backed story archive, audio, and a large hand-authored sprite asset set.

## Tech Stack

- Framework: Next.js 15 App Router
- UI: React 19, CSS Modules, local fonts via `next/font/local`
- Data: MongoDB + Mongoose
- Language: TypeScript
- Tooling: ESLint, Tailwind imported but used minimally
- Art pipeline: PNG sprite delivery assets in `public/`, source artwork in `blender-photoshop/`

## High-Level Structure

- [`src/app`](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app)
  - routes, page components, layout, API routes
- [`src/app/components`](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components)
  - garden renderer, header, dots overlay, story modal, supporting UI
- [`src/app/garden`](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/garden)
  - biome manifests, world layout, layer construction
- [`src/models`](/Users/shirishsarkar/_CODE/flowers-for-molly/src/models)
  - Mongoose models
- [`src/lib`](/Users/shirishsarkar/_CODE/flowers-for-molly/src/lib)
  - DB and story utilities
- [`public/garden`](/Users/shirishsarkar/_CODE/flowers-for-molly/public/garden)
  - runtime garden assets
- [`public/sound`](/Users/shirishsarkar/_CODE/flowers-for-molly/public/sound)
  - background music and SFX
- [`scripts`](/Users/shirishsarkar/_CODE/flowers-for-molly/scripts)
  - import and performance/audit scripts
- [`docs`](/Users/shirishsarkar/_CODE/flowers-for-molly/docs)
  - performance and asset-delivery planning docs

## Routes

### `/`

Home is a client-rendered garden experience in [`src/app/page.tsx`](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/page.tsx).

Current behavior:
- renders the infinite parallax garden
- fetches story summaries only, not full story bodies
- places a deterministic dot for each story
- fetches full story content only when a modal is opened
- starts background music on first user interaction

### `/view`

The story index is implemented in [`src/app/view/page.tsx`](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/view/page.tsx).

Current behavior:
- paginates through `/api/stories`
- opens full story content in the same modal component

### `/view/[id]`

Single-story view in [`src/app/view/[id]/page.tsx`](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/view/[id]/page.tsx).

### `/submit`

Story submission form in [`src/app/submit/page.tsx`](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/submit/page.tsx).

### `/about`

Static memorial content in [`src/app/about/page.tsx`](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/about/page.tsx).

### `/poem`

Currently minimal / placeholder.

## API

### `GET /api/stories`

Implemented in [`src/app/api/stories/route.ts`](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/api/stories/route.ts).

Current behavior:
- supports pagination via `page` and `limit`
- supports `summary=1` for lightweight home-page fetches
- returns stable ordering by `importedAt`, `createdAt`, `_id`

### `GET /api/stories/[id]`

Implemented in [`src/app/api/stories/[id]/route.ts`](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/api/stories/[id]/route.ts).

Current behavior:
- awaits dynamic route params correctly for Next 15
- validates MongoDB ObjectId
- returns only full-story fields needed by the modal/detail view

### `POST /api/stories`

Implemented in [`src/app/api/stories/route.ts`](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/api/stories/route.ts).

Current behavior:
- validates input
- derives text metrics
- hashes content for dedupe
- stores submissions as `pending`

## Story Model

Defined in [`src/models/Story.ts`](/Users/shirishsarkar/_CODE/flowers-for-molly/src/models/Story.ts).

Important fields:
- `authorName`
- `authorEmail`
- `textMarkdown`
- `textPlain`
- `storyLines`
- `paragraphCount`
- `wordCount`
- `charCount`
- `hasSalutation`
- `status`
- `importedAt`
- `uniqueKey`

## Garden Renderer

The core renderer is [`src/app/components/InfiniteParallaxGarden.tsx`](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/InfiniteParallaxGarden.tsx).

Important characteristics:
- DOM-based layered renderer, not canvas/WebGL
- logical scene height of `1024`
- world width of `8192` logical px
- world composition is currently `4096` meadow + `4096` forest
- uses a 3-copy strip to support infinite horizontal scrolling
- supports repeat strips, positioned sprites, parallax, curved layers, and debug wireframes

The garden content is built from manifests in:
- [`src/app/garden/manifests/meadow.json`](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/garden/manifests/meadow.json)
- [`src/app/garden/manifests/forest.json`](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/garden/manifests/forest.json)

Layer construction lives in:
- [`src/app/garden/biomeLoader.ts`](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/garden/biomeLoader.ts)
- [`src/app/garden/biomes.ts`](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/garden/biomes.ts)
- [`src/app/garden/worldLayout.ts`](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/garden/worldLayout.ts)

## Story Overlay and Modal

### `StoryDotsOverlay`

Implemented in [`src/app/components/StoryDotsOverlay.tsx`](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/StoryDotsOverlay.tsx) and [`src/app/components/StoryDotsOverlay.module.css`](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/StoryDotsOverlay.module.css).

Current behavior:
- deterministic dot placement from story IDs
- enlarged minimum hit target for mobile interaction
- lazy SFX initialization
- hover/tap burst effect
- pulse and burst styling optimized to reduce paint-heavy shadow animation

### `StoryModal`

Implemented in [`src/app/components/StoryModal.tsx`](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/StoryModal.tsx).

Current behavior:
- portal-based modal
- closes on backdrop or Escape
- locks body scroll
- resolves full story content on demand when invoked from summary-only contexts

## Performance Work Completed

The repository now includes a phased performance investigation and optimization workflow.

Primary control docs:
- [`AGENTS.md`](/Users/shirishsarkar/_CODE/flowers-for-molly/AGENTS.md)
- [`docs/performance-baseline.md`](/Users/shirishsarkar/_CODE/flowers-for-molly/docs/performance-baseline.md)
- [`docs/asset-delivery-plan.md`](/Users/shirishsarkar/_CODE/flowers-for-molly/docs/asset-delivery-plan.md)

Added scripts:
- `npm run perf:baseline`
- `npm run perf:assets`
- `npm run perf:assets:first-wave`
- `npm run perf:assets:next-wave`

### Phase Summary

#### Phase 0

Baseline instrumentation added:
- repo-local asset and scene baseline reporting
- documented real-device profiling checklist

#### Phase 1

Startup memory pressure reduced by:
- removing full-scene image preloading
- removing blanket eager loading for positioned sprites
- fetching story summaries on home instead of full story bodies
- fetching full story text only when modal/detail view needs it
- lazy-loading SFX players

#### Phase 2

Viewport-based virtualization added:
- positioned sprites are mounted only when they intersect the viewport plus overscan
- repeat strips and seam logic were left unchanged

#### Phase 3

Compositor cleanup:
- removed blanket `will-change: transform` on parallax layer content
- removed blanket `will-change` from particles

#### Phase 4

Asset delivery optimization:
- asset audit tooling added
- first-wave and next-wave delivery asset downsizing completed
- optimization focused on high-oversupply, low-risk small/midground assets

#### Phase 5

Overlay paint optimization:
- dot pulse changed from animated shadow-heavy styling to transform/opacity-first layered glow
- particle visuals simplified to flatter radial-gradient styling

## Current Measured Status

These are the current local measurements after the completed work above.

From `npm run build`:
- `/` route size: about `17.7 kB`
- `/` first-load JS: about `121 kB`

From `npm run perf:baseline`:
- referenced garden sources: `82`
- referenced compressed garden payload: about `170 MB`
- modeled decoded RGBA footprint: about `689 MB`
- `public/garden` total compressed footprint: about `282 MB`
- positioned sprite instances per world: `145`
- non-repeating positioned instances across 3 segments before runtime culling: `435`

From the viewport-culling model used during Phase 2:
- mobile viewport expected positioned mounted nodes: about `18-51`
- desktop viewport expected positioned mounted nodes: about `38-87`

From `npm run perf:assets`:
- `midground-small` bucket: `12.75 MB`, oversupply `17.36`
- `foreground-small` bucket: `3.46 MB`, oversupply `34.67`
- `MIDDLEGROUND` role total: `26.61 MB`, oversupply `6.09`

## Remaining Highest-Value Performance Opportunities

The largest remaining asset/runtime opportunities now are:
- `foreground-medium` assets such as meadow foreground flowers and peonies
- `FOREGROUND_2` assets, still oversupplied overall
- selected `midground-medium` assets like `stone_path_0.png` and `stormking_0.png`
- real-device verification on iPhone Safari and Android Chrome for actual tab-memory and FPS outcomes

Examples of current top asset candidates from the audit:
- [`public/garden/meadow_foreground/flora_group_3/cornflower_0.png`](/Users/shirishsarkar/_CODE/flowers-for-molly/public/garden/meadow_foreground/flora_group_3/cornflower_0.png)
- [`public/garden/meadow_foreground/flora_group_5/blazingstar_0.png`](/Users/shirishsarkar/_CODE/flowers-for-molly/public/garden/meadow_foreground/flora_group_5/blazingstar_0.png)
- [`public/garden/meadow_background/scenery/stormking_0.png`](/Users/shirishsarkar/_CODE/flowers-for-molly/public/garden/meadow_background/scenery/stormking_0.png)
- [`public/garden/meadow_background/scenery/stone_path_0.png`](/Users/shirishsarkar/_CODE/flowers-for-molly/public/garden/meadow_background/scenery/stone_path_0.png)

## Audio

- Background music: [`public/sound/flowers for molly theme.mp3`](/Users/shirishsarkar/_CODE/flowers-for-molly/public/sound/flowers%20for%20molly%20theme.mp3)
- Hover/tap SFX: [`public/sound/sfx`](/Users/shirishsarkar/_CODE/flowers-for-molly/public/sound/sfx)

Audio remains interaction-gated.

## Local Development

- Install: `npm install`
- Dev: `npm run dev`
- Build: `npm run build`
- Start: `npm run start`
- Lint: `npm run lint`
- Baseline: `npm run perf:baseline`
- Asset audit: `npm run perf:assets`

## Notes

- This environment still does not provide authoritative mobile browser memory traces.
- Local performance conclusions are strongest for asset footprint, decoded-memory modeling, runtime loading strategy, and DOM/render structure.
- Final confirmation for crash reduction still needs real-device profiling.
