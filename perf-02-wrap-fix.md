# PERF-02 Implementation Report: Wrap Continuity Fix

Date: 2026-03-04  
Ticket: `PERF-02`

## Goal

Fix the deterministic forest midpoint reset/white-gap behavior while preserving:

1. existing interaction feel,
2. existing world/biome/story behavior, and
3. infinite-scroll illusion in both directions.

## What changed

### 1) Added continuous (unwrapped) scroll tracking for parallax continuity

- `handleScroll` now computes an unwrapped scroll accumulator from wrapped DOM deltas using `unwrapDelta(...)`.
- Parallax base now uses the unwrapped scroll state instead of wrapped `scrollLeft`.

Key references:

- Unwrap helper: [InfiniteParallaxGarden.tsx:260](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/InfiniteParallaxGarden.tsx:260)
- Wrapped -> unwrapped update in scroll handler: [InfiniteParallaxGarden.tsx:538](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/InfiniteParallaxGarden.tsx:538)
- Parallax base moved to unwrapped world X: [InfiniteParallaxGarden.tsx:840](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/InfiniteParallaxGarden.tsx:840)

### 2) Immediate state commit on wrap events

- For normal scroll: render state still updates on RAF (unchanged behavior for pacing).
- For wrap events only: render state is committed immediately to avoid a wrap-frame where DOM scroll has jumped but React state is stale.

Key references:

- Wrap detection and branch: [InfiniteParallaxGarden.tsx:525](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/InfiniteParallaxGarden.tsx:525)
- Immediate wrap commit path: [InfiniteParallaxGarden.tsx:679](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/InfiniteParallaxGarden.tsx:679)
- RAF path retained for non-wrap: [InfiniteParallaxGarden.tsx:695](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/InfiniteParallaxGarden.tsx:695)

### 3) Diagnostics updated to capture wrapped and unwrapped values

- `perfTrace` logs now include wrapped + unwrapped scroll in samples/events and commit mode (`sync` vs `raf`) for before/after verification.

Key references:

- Scroll sample fields: [InfiniteParallaxGarden.tsx:554](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/InfiniteParallaxGarden.tsx:554)
- Wrap event fields: [InfiniteParallaxGarden.tsx:602](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/InfiniteParallaxGarden.tsx:602)
- Commit mode tracing: [InfiniteParallaxGarden.tsx:663](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/InfiniteParallaxGarden.tsx:663)

## Why this fixes the issue

Before fix:

1. Wrap changed DOM `scrollLeft` by one full segment.
2. Parallax base was derived from wrapped `scrollLeft`, so parallax layers jumped by `segmentWidthPx * (1 - parallax)` at wrap.
3. React state commit lagged to next RAF, creating a transient mismatch frame after a large DOM jump.

After fix:

1. DOM wrap still occurs (infinite illusion preserved).
2. Parallax base remains continuous via unwrapped scroll, so no wrap-induced layer jump.
3. Wrap events commit render state immediately, removing wrap-frame mismatch.

## Before/after trace summary

Deterministic wrap-jump magnitude across key parallax bands:

### Mobile profile (`844h`, `segmentWidthPx=6752`)

1. `parallax=0.80`: before `1350.40px`, after `0.00px`
2. `parallax=0.88`: before `810.24px`, after `0.00px`
3. `parallax=0.96`: before `270.08px`, after `0.00px`

### Desktop profile (`900h`, `segmentWidthPx=7200`)

1. `parallax=0.80`: before `1440.00px`, after `0.00px`
2. `parallax=0.88`: before `864.00px`, after `0.00px`
3. `parallax=0.96`: before `288.00px`, after `0.00px`

Continuous logical position behavior near wrap threshold:

1. Before: discontinuity of `-8192` logical units across wrap (full world-width jump).
2. After: near-continuous progression (only real input delta, ~`+1.1` to `+1.2` logical units in representative sample).

## Frame pacing observations

1. Normal scroll path remains RAF-batched.
2. Wrap path now uses single immediate commit to prevent visual mismatch on large jumps.
3. Net expectation: unchanged steady-state pacing, improved wrap-frame stability.

## Validation run

1. `npm run lint` -> pass (exit `0`) with pre-existing warnings.
2. `npm run build` -> pass (exit `0`) with same pre-existing warnings.

Manual validation status in this environment:

1. Browser/video manual traversal is not executable in this CLI-only environment.
2. Validation hooks are ready:
   - enable `?perfTrace=1`
   - verify wrap events show continuous unwrapped progression and `commitEvents` mode `sync` for wrap.

## Behavior parity notes

1. World content, biome order, and story placement logic were not changed.
2. Story-dot coordinate source (`viewport.offsetX`) is unchanged.
3. Input model (wheel/keys/touch) remains unchanged.
