# PERF-04 Implementation Report: Scroll Hot-Path React Rerender Reduction

Date: 2026-03-04  
Ticket: `PERF-04`

## Optimization approach

### 1) Decoupled viewport propagation from `page.tsx` React state

`page.tsx` no longer stores scroll viewport in component state.  
A lightweight external viewport store now receives `onViewportChange` updates and notifies only subscribers.

Result:

1. Removes per-scroll `setViewport(...)` on the page component.
2. Prevents full page rerender on every scroll tick.

References:

- Viewport store creation and update path: [page.tsx:37](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/page.tsx:37), [page.tsx:202](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/page.tsx:202)
- Overlay now receives `viewportStore` instead of `viewport` state: [page.tsx:396](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/page.tsx:396)

### 2) Made StoryDotsOverlay subscribe directly via `useSyncExternalStore`

Story dots rerender only from viewport-store notifications and relevant props, not from parent page rerenders.

References:

- Store subscription in overlay: [StoryDotsOverlay.tsx:201](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/StoryDotsOverlay.tsx:201)
- Overlay memoization boundary: [StoryDotsOverlay.tsx:404](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/StoryDotsOverlay.tsx:404)

### 3) Reduced garden hot-path state writes from 2 to 1 per frame

Merged wrapped/unwrapped scroll states into one `scrollFrame` state object (`setScrollFrame`), replacing dual setters.

References:

- Unified scroll state: [InfiniteParallaxGarden.tsx:395](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/InfiniteParallaxGarden.tsx:395)
- Hot-path updates now use `setScrollFrame(...)`: [InfiniteParallaxGarden.tsx:582](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/InfiniteParallaxGarden.tsx:582), [InfiniteParallaxGarden.tsx:801](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/InfiniteParallaxGarden.tsx:801)

### 4) Added component memoization boundaries

1. `InfiniteParallaxGarden` is now memoized to avoid rerenders from unrelated parent state changes.
2. `StoryDotsOverlay` is memoized similarly.

References:

- Garden memo export: [InfiniteParallaxGarden.tsx:1523](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/InfiniteParallaxGarden.tsx:1523)
- Dots overlay memo export: [StoryDotsOverlay.tsx:404](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/StoryDotsOverlay.tsx:404)

## Metrics before/after (measurable proxies)

Because this environment cannot run browser React Profiler sessions, these are reliable code-path metrics tied to hot-path behavior.

| Metric | Before | After | Delta |
| --- | ---: | ---: | ---: |
| Page React state writes per scroll frame (`setViewport`) | 1 | 0 | -100% |
| Garden React state writes per scroll frame (wrapped + unwrapped) | 2 | 1 | -50% |
| Total hot-path React state writes per scroll frame | 3 | 1 | -66.7% |
| Scroll-triggered React render fan-out (page + garden + dots) | 3 components | 2 components | -33.3% |

Main-thread activity proxy:

1. Removed page-level reconciliation from continuous scroll path.
2. Reduced scroll-path React setter calls from 3 to 1.

User-perceived smoothness proxy:

1. Lower React work per frame should reduce scroll jank risk.
2. Visual math paths (parallax, wrap continuity, story-dot placement) remain unchanged.

## Behavior parity checks

1. Story dot positions remain derived from `viewport.offsetX` with unchanged formula.  
   - [StoryDotsOverlay.tsx:275](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/StoryDotsOverlay.tsx:275)
2. Story dot click -> modal opening remains unchanged.  
   - [StoryDotsOverlay.tsx:365](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/StoryDotsOverlay.tsx:365)
3. Pointer debug behavior remains wired through garden callback props.  
   - [page.tsx:388](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/page.tsx:388)
4. Scrolling controls (wheel/touch/keys) were not modified in this ticket.

## Validation

1. `npm run lint` -> pass (exit code `0`) with pre-existing warnings.
2. `npm run build` -> pass (exit code `0`) with pre-existing warnings.
