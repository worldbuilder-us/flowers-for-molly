# PERF-01 Diagnostic Report: Forest Midpoint Reload/Reset/White-Gap

Date: 2026-03-04  
Ticket: `PERF-01`  
Status: Root cause instrumented and analyzed (no behavior fixes in this ticket)

## Reproduction steps

### Desktop (baseline repro, no diagnostics)

1. Start app normally (`npm run dev`, open `/`).
2. Scroll right continuously (wheel or right arrow).
3. Move from meadow into forest and keep scrolling right.
4. Observe deterministic reset event:
   - apparent jump/reset in position,
   - transient blank/white region on left side,
   - scene content appears to reload toward forest start.

### Mobile (baseline repro, no diagnostics)

1. Start app on mobile browser.
2. Swipe/drag right continuously across meadow into forest.
3. Continue until deterministic reset event appears.
4. Observe same pattern as desktop (jump + left blanking + reload-like swap).

### Instrumented repro (desktop/mobile)

1. Open app with diagnostics enabled:
   - URL flag: `/?perfTrace=1`, or
   - `localStorage.setItem("perfTrace","1")` then reload.
2. Reproduce scroll path above.
3. In DevTools console, inspect:
   - `window.__FFM_PERF01_TRACE__.wrapEvents.at(-1)`
   - `window.__FFM_PERF01_TRACE__.commitEvents.at(-1)`
4. Expected trigger region:
   - around wrapped logical offset `~4096` (forest boundary in current world).

## Root-cause evidence

## 1) Deterministic jump path is wrap branch, not random reload

Code path:

- Wrap thresholds are fixed at half-width around middle segment:  
  [InfiniteParallaxGarden.tsx:495](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/InfiniteParallaxGarden.tsx:495), [InfiniteParallaxGarden.tsx:496](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/InfiniteParallaxGarden.tsx:496)
- On right crossing, component immediately rewrites DOM scroll position by one segment width:  
  [InfiniteParallaxGarden.tsx:502](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/InfiniteParallaxGarden.tsx:502), [InfiniteParallaxGarden.tsx:503](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/InfiniteParallaxGarden.tsx:503), [InfiniteParallaxGarden.tsx:504](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/InfiniteParallaxGarden.tsx:504)

Deterministic simulation (same formulas + current manifests):

- World segment width: `8192` logical (`meadow: 0-4096`, `forest: 4096-8192`).
- Wrap event sampled just over right boundary:
  - Mobile profile (`390w`, scene `844h`):  
    pre logical `4097.2133` -> post logical `4097.2133` (same wrapped offset),  
    continuous logical jumps `4097.2133 -> -4094.7867`.
  - Desktop profile (`1440w`, scene `900h`):  
    pre logical `4097.1378` -> post logical `4097.1378` (same wrapped offset),  
    continuous logical jumps `4097.1378 -> -4094.8622`.

Interpretation: behavior is a deterministic wrap reset at the forest boundary range, not nondeterministic asset reload.

## 2) Timing gap: DOM scroll jump is immediate, React state commit is deferred

Code path:

- DOM scroll rewrite happens synchronously in scroll handler (`el.scrollLeft = x`):  
  [InfiniteParallaxGarden.tsx:500](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/InfiniteParallaxGarden.tsx:500), [InfiniteParallaxGarden.tsx:504](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/InfiniteParallaxGarden.tsx:504)
- React `scrollLeft` state commit is deferred to next `requestAnimationFrame`:  
  [InfiniteParallaxGarden.tsx:611](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/InfiniteParallaxGarden.tsx:611), [InfiniteParallaxGarden.tsx:626](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/InfiniteParallaxGarden.tsx:626)

Instrumentation captures this with:

- `domToRenderedStateGapPx` in wrap events:  
  [InfiniteParallaxGarden.tsx:567](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/InfiniteParallaxGarden.tsx:567)
- `commitEvents` for next-frame state reconciliation:  
  [InfiniteParallaxGarden.tsx:615](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/InfiniteParallaxGarden.tsx:615)

Interpretation: there is a wrap-frame where viewport position can change before React-dependent render/cull state catches up.

## 3) Left-side blanking is consistent with culling window discontinuity across wrap

Culling condition in renderer:

- Non-repeat sprites are dropped if:
  - `renderedXpx + w < visibleLeftPx - cullPadPx`, or
  - `renderedXpx - w > visibleRightPx + cullPadPx`  
  [InfiniteParallaxGarden.tsx:1189](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/InfiniteParallaxGarden.tsx:1189), [InfiniteParallaxGarden.tsx:1190](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/InfiniteParallaxGarden.tsx:1190)

Instrumented cull summaries around wrap are captured at:

- [InfiniteParallaxGarden.tsx:532](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/InfiniteParallaxGarden.tsx:532) to [InfiniteParallaxGarden.tsx:595](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/InfiniteParallaxGarden.tsx:595)

Deterministic cull-snapshot evidence (current manifests):

- Mobile profile:
  - pre-wrap rendered candidates: `38`
  - post-wrap rendered candidates: `46`
  - overlap visible candidates: `0`
  - dropped-on-wrap set: `38`, new-on-wrap set: `46`
- Desktop profile:
  - pre-wrap rendered candidates: `48`
  - post-wrap rendered candidates: `62`
  - overlap visible candidates: `0`
  - dropped-on-wrap set: `48`, new-on-wrap set: `62`

Interpretation: rendered candidate set flips entirely at wrap boundary; combined with DOM/state timing split, this explains transient left blanking/reload impression.

## Diagnostic conclusion

### Primary cause (high confidence)

1. **Right-boundary wrap writes `scrollLeft` backward by one full segment at a deterministic offset (~4096 logical)**, producing perceived reset in forest traversal.

Confidence: **High**

### Contributing causes

1. **One-frame DOM-vs-React scroll state gap during wrap** (`el.scrollLeft` immediate, `setScrollLeft` next RAF), which can transiently desynchronize render/cull assumptions.

Confidence: **High**

2. **Cull-window discontinuity at wrap boundary for non-repeat sprites**, where visible candidate membership changes abruptly (0 overlap in deterministic snapshots), amplifying left-side blanking.

Confidence: **Medium-High**

3. **Biome clipping metadata not currently populated (`biomeStart`/`biomeWidth`),** so renderer defaults to full-segment clipping; this does not directly create wrap reset but increases boundary fragility.

Confidence: **Medium**

## Confirmed causes vs ruled-out causes

### Confirmed

1. Wrap branch at right boundary is deterministic and triggers jump/reset perception.
2. Culling logic + timing separation can produce transient blanking around that jump.

### Ruled out for this specific bug

1. Story-dot overlay/modal/audio logic as primary trigger (not on critical wrap path).
2. Random network fetch behavior as primary trigger (event ties to fixed scroll thresholds, not request timing).

## Validation notes

1. No behavior fixes were implemented in this ticket.
2. Diagnostics are fully gated behind `?perfTrace=1` or `localStorage.perfTrace=1`; default app behavior is unchanged.
3. `npm run lint` passes (exit code `0`) with pre-existing warnings.
4. CLI environment cannot visually assert browser reproduction directly; deterministic numeric reproduction and code-path tracing were used as reliable proxies.

## Cleanup status

1. Temporary diagnostics were kept **intentionally** for PERF-02 verification.
2. They are read-only observers and dormant by default.
3. They can be removed after wrap fix verification is complete.
