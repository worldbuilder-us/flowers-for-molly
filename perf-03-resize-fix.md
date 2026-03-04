# PERF-03 Implementation Report: Resize and Mobile UI-Bar Stability

Date: 2026-03-04  
Ticket: `PERF-03`

## Root issue addressed

The garden was unintentionally reinitializing scroll position on viewport-height/scale changes because initial positioning logic depended on `sceneScale` and reran on resize. This reset users to spawn (`initialOffsetX`) during:

1. mobile browser address-bar show/hide,
2. orientation changes,
3. dynamic viewport height shifts.

## Implementation summary

### 1) One-time initial spawn

Initial spawn behavior remains unchanged, but now executes once per mount:

- Spawn still uses `initialOffsetX` exactly as before.
- Guarded by `hasAppliedInitialSpawnRef` so resize no longer replays spawn.

Reference:

- [InfiniteParallaxGarden.tsx:522](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/InfiniteParallaxGarden.tsx:522)

### 2) Geometry-change reconciliation instead of reset

On subsequent geometry changes (`sceneScale`, `middleStartPx`, `segmentWidthPx`, `segmentWidth`), component now:

1. Reads prior wrapped/unwrapped position.
2. Converts to logical coordinates using previous geometry.
3. Recomputes new pixel positions in new geometry.
4. Applies new wrapped and unwrapped scroll targets without resetting to spawn.

References:

- Geometry-change detection: [InfiniteParallaxGarden.tsx:543](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/InfiniteParallaxGarden.tsx:543)
- Logical preservation math: [InfiniteParallaxGarden.tsx:553](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/InfiniteParallaxGarden.tsx:553)
- Reapplied wrapped/unwrapped targets: [InfiniteParallaxGarden.tsx:569](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/InfiniteParallaxGarden.tsx:569)

### 3) Trace support for resize verification

`perfTrace` now logs resize events (`resizeEvents`) with before/after logical values for validation.

References:

- Resize trace type/store fields: [InfiniteParallaxGarden.tsx:220](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/InfiniteParallaxGarden.tsx:220), [InfiniteParallaxGarden.tsx:230](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/InfiniteParallaxGarden.tsx:230)
- Resize event push: [InfiniteParallaxGarden.tsx:577](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/InfiniteParallaxGarden.tsx:577)

## Before/after behavior notes

Deterministic examples (current world, `segmentWidth=8192`, `initialOffsetX=0`):

### Scenario A: Mobile address-bar collapse (portrait)

1. Height `844 -> 780`, user logical position `6123.45`.
2. Before fix: logical position after resize `0` (drift `-6123.45`).
3. After fix: logical position after resize `6123.45` (drift `0`).

### Scenario B: Mobile orientation change (portrait to landscape)

1. Height `844 -> 390`, user logical position `7120.9`.
2. Before fix: logical position after resize `0` (drift `-7120.9`).
3. After fix: logical position after resize `7120.9` (drift `0`).

### Scenario C: Desktop height resize

1. Height `900 -> 860`, user logical position `5300.25`.
2. Before fix: logical position after resize `0` (drift `-5300.25`).
3. After fix: logical position after resize `5300.25` (drift `0`).

## Validation run

1. `npm run lint` -> pass (exit code `0`) with pre-existing warnings.
2. `npm run build` -> pass (exit code `0`) with same pre-existing warnings.

## First-load and welcome flow regression check

1. Intended initial spawn location is preserved (`initialOffsetX` path unchanged for first mount).
2. Welcome overlay/first-scroll flow logic is untouched (`onFirstUserScroll` behavior unchanged).

## Notes for manual device verification

1. Enable diagnostics via `?perfTrace=1`.
2. Trigger mobile UI-bar and orientation changes.
3. Inspect `window.__FFM_PERF01_TRACE__.resizeEvents`; verify `prevWrappedLogicalOffset` and `nextWrappedLogicalOffset` remain equal (or within tiny floating-point tolerance).
