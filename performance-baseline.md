# PERF-00 Baseline and Experience Lock

Date: 2026-03-04  
Ticket: `PERF-00`  
Status: Baseline captured (no optimizations implemented in this ticket)

## Scope and Intent

This document locks the current behavior and performance profile before any optimization work.

Non-negotiable constraints for later tickets:

1. Preserve current experience and behavior exactly unless a ticket explicitly targets a bug.
2. No feature removals or UX simplification.
3. Desktop performance must not regress.
4. Mobile performance must improve without changing app identity, interaction model, or composition.

## 1. Experience Lock (Current Invariants)

### 1.1 Interaction invariants

1. The world is horizontally scrollable and uses infinite wrap illusion with three rendered segments (`[A][B][C]`).
2. Input modes currently supported:
   - Touch/pointer horizontal scrolling.
   - Desktop wheel mapped to horizontal movement (`deltaY + deltaX * 0.5`, multiplied by `SCROLL_SPEED = 0.15`).
   - Left/right arrow key continuous scrolling (`KEY_SCROLL_PX_PER_S = 900`).
3. The first user-driven scroll triggers the welcome overlay fade/hide state.
4. Story dots:
   - Dot placement is deterministic from story `_id` hash (stable between sessions for same dataset).
   - Dots are world-pinned (`parallax = 1`) and tiled across `[-1, 0, 1]` segments.
   - Hover starts particle spiral burst and random SFX playback.
   - Click opens story modal for the selected story.
5. Story modal behavior:
   - Opens in portal on top of scene.
   - Locks background scrolling by setting `document.body.style.overflow = "hidden"`.
   - Closes via backdrop click, close button, or `Escape`.
6. Background audio behavior:
   - Starts on first `pointerdown` or `keydown` user gesture.
   - Loops continuously.
   - Applies per-loop fade-in/fade-out windows (4 seconds) with base volume `0.2`.
   - Mute button toggles audio mute state without changing scene behavior.

### 1.2 Visual invariants

1. No intentional art/content composition change is allowed in performance tickets:
   - Same biome ordering and scenery population.
   - Same parallax depth relationships.
   - Same story-dot visual and interaction affordances.
2. Main scene container remains full-viewport height (`100vh`) with hidden overflow outside the garden viewport.
3. Welcome overlay, title treatment, and scroll hint behavior remain visually unchanged.
4. Modal visual frame/ornament behavior remains unchanged.

### 1.3 Technical invariants (as-is lock)

1. Active biome registry currently includes only:
   - `meadow`
   - `forest`
   Transition manifests are imported in `biomeRegistry.ts` but are not active in `BIOME_MANIFESTS`.
2. Current world layout:
   - `segmentWidth` (logical world width) = `8192`
   - `meadow`: start `0`, width `4096`
   - `forest`: start `4096`, width `4096`
3. Initial spawn:
   - Active biome is first biome in layout (`meadow`).
   - `initialOffsetX = activeBiome.startOffset` (currently `0`).
4. Infinite wrap logic (as implemented):
   - `middleStartPx = segmentWidthPx`
   - Left wrap threshold: `x < middleStartPx * 0.5` then `x += segmentWidthPx`
   - Right wrap threshold: `x > middleStartPx * 1.5` then `x -= segmentWidthPx`
5. Render topology:
   - Layer count produced from current manifests: `19`
   - Sprite definitions: `88`
   - Per-segment placement candidates: `153`
   - Across three rendered segments: `459` placement candidates iterated each render pass.
6. Scroll/render state propagation:
   - Scroll event schedules `setScrollLeft(...)` via `requestAnimationFrame`.
   - `scrollLeft` updates trigger viewport notification path and `setViewport(...)` in page component.
7. Biome clipping metadata:
   - Renderer supports optional `biomeStart`/`biomeWidth` clip fields.
   - Current layer builder does not populate these fields, so clipping defaults to full segment behavior.

## 2. Baseline Metrics (Before Optimization)

## 2.1 Measurement method and reliability

1. Measured directly in this environment:
   - Source-level architecture and behavior paths.
   - Manifest-derived world geometry and render workload proxies.
   - On-disk PNG compressed footprint.
   - Manifest-dimension-based decoded RGBA memory estimates.
2. Not directly measurable in this environment:
   - Real device/browser runtime FPS and dropped-frame traces.
   - Real main-thread flame charts from Safari/Chrome mobile.
   - Actual OS-level memory kill thresholds per device.
3. Closest reliable proxies are used where runtime capture is not possible.

## 2.2 Baseline table

| Area | Metric | Baseline (before) | How measured |
| --- | --- | --- | --- |
| World geometry | Total logical world width | `8192` | Manifest/layout derivation |
| Biome sequencing | Biome order | `meadow -> forest` | `BIOME_MANIFESTS` |
| Biome offsets | Start offsets | `meadow: 0`, `forest: 4096` | `buildWorldLayout` logic + manifests |
| Wrap trigger | Right threshold | `x > 1.5 * segmentWidthPx` | `handleScroll` logic |
| Wrap trigger | Left threshold | `x < 0.5 * segmentWidthPx` | `handleScroll` logic |
| Render topology | Layers | `19` | Manifest + layer bucketing logic |
| Render topology | Sprite definitions | `88` | Manifest aggregation |
| Render topology | Placement candidates per segment | `153` | Manifest positions + repeat strips |
| Render topology | Placement candidates across 3 segments | `459` | Per-segment value x 3 |
| Scroll update cadence proxy | React state update sources in active scroll | `2` primary paths (`setScrollLeft`, `setViewport`) | Source analysis |
| FPS/frame pacing | Runtime FPS snapshot | Not capturable in this CLI-only environment | Explicit gap; runtime capture required |
| Main-thread proxy | Per-scroll render work pressure | High: scroll-driven rerender path + 459 candidate placement iteration path | Source + derived counts |
| Active assets | Unique referenced PNGs (meadow+forest) | `82` | Manifest->file mapping |
| Asset footprint | Compressed PNG size (active assets) | `209.42 MB` | File stat totals |
| Asset memory proxy | Estimated decoded RGBA (active assets) | `455.95 MB` | `width * height * 4` aggregated |
| Meadow split | Meadow decoded estimate | `147.81 MB` | Manifest dimensions |
| Forest split | Forest decoded estimate | `308.14 MB` | Manifest dimensions |
| Total garden library | PNG count in `public/garden` | `165` | Filesystem scan |
| Total garden library | Compressed size in `public/garden` | `320.93 MB` | File stat totals |

### 2.3 Highest-cost decoded assets (top examples)

1. `/garden/biomes/forest/foreground/flora_group_1/treetrunk_0.png`  
   - `2800x2800`  
   - ~`29.91 MB` decoded RGBA
2. `/garden/meadow_background/hills_near/hills_near_4.png`  
   - `3048x1950`  
   - ~`22.67 MB` decoded RGBA
3. `/garden/meadow_background/hills_near/hills_near_5.png`  
   - `3048x1950`  
   - ~`22.67 MB` decoded RGBA
4. Multiple `2048x2048` forest assets  
   - ~`16.00 MB` decoded RGBA each

## 3. Reproduction Notes for Current Mobile Issues

These are baseline reproduction notes to keep future tickets comparable.

### 3.1 Deterministic forest reload/reset symptom

1. Open app on mobile device browser.
2. Start at initial spawn and scroll continuously rightward through meadow into forest.
3. Continue traversing forest until the repeatable reset event occurs.
4. Observed symptom to log:
   - Left-side blank white gap appears.
   - Position appears to jump/reset backward (reported as beginning of forest).
   - Right-side assets appear reloaded.
5. Logging target in later diagnostics:
   - Compare `scrollLeft`, `localXPx`, and wrapped logical offset immediately before/after event.

### 3.2 Mobile crash/reset risk during viewport height changes

1. On mobile browser, begin horizontal scrolling.
2. Trigger browser UI chrome show/hide (address bar collapse/expand) while scrolling.
3. Observe for abrupt scene repositioning/jump.
4. Baseline code condition to monitor:
   - Height/scale changes can retrigger initialization path that writes scroll position based on `initialOffsetX`.

## 4. Validation Run (No-Behavior-Change Check)

Validation command executed for this ticket:

- `npm run lint`

Result:

- Lint completes successfully (exit code `0`) with pre-existing warnings in multiple files.
- No code or behavior changes were made in this ticket.

## 5. Known Gaps and Assumptions

1. FPS and frame pacing values are not directly measured here because this environment does not provide browser/device profiling tools.
2. Main-thread workload section uses reliable structural proxies (state update paths, render candidate counts) rather than flame-chart timings.
3. Mobile crash behavior is documented via reproducible protocol and code-path risk areas; definitive runtime causality remains for `PERF-01` instrumentation ticket.
