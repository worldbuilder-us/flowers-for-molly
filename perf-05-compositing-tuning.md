# PERF-05 Implementation Report: Compositing and Layer Promotion Tuning

Date: 2026-03-04  
Ticket: `PERF-05`

## Compositing changes made

### 1) Replaced persistent compositor hints with demand-based hints

`will-change: transform` is no longer always-on for every layer segment.  
It now activates only while scrolling and auto-disables shortly after scroll idle.

References:

- Compositor hint timing constants: [InfiniteParallaxGarden.tsx:17](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/InfiniteParallaxGarden.tsx:17)
- Active/idle hint controller: [InfiniteParallaxGarden.tsx:366](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/InfiniteParallaxGarden.tsx:366)
- Scroll-triggered hint activation: [InfiniteParallaxGarden.tsx:632](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/InfiniteParallaxGarden.tsx:632)
- Cleanup on unmount: [InfiniteParallaxGarden.tsx:940](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/InfiniteParallaxGarden.tsx:940)

### 2) Limited promotion to near-viewport segments only

Even while scrolling, compositor hints are applied only for layer segments near the current viewport (`COMPOSITOR_HINT_SEGMENT_PAD_PX`), not all three segments unconditionally.

References:

- Segment proximity gating: [InfiniteParallaxGarden.tsx:1136](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/InfiniteParallaxGarden.tsx:1136)
- Conditional `will-change`: [InfiniteParallaxGarden.tsx:1170](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/InfiniteParallaxGarden.tsx:1170)

### 3) Preserved render/composition structure

No layer flattening/removal, no z-index changes, no opacity/clipping rule changes, and no parallax formula changes in this ticket.

## Why they help

1. Persistent compositor hints can keep many large layers promoted at all times, increasing GPU memory pressure.
2. Demand-based hints preserve transform smoothness during active scroll but release compositor pressure when idle.
3. Near-viewport gating avoids promoting off-screen segments that do not need immediate compositor acceleration.

## Before/after observations

## GPU memory pressure proxies

Derived from current manifest/layer topology:

1. Total layers: `19`
2. Rendered segments: `3`
3. Previous persistent-hint candidates: `57` (`19 x 3`) always promoted

After tuning:

1. Idle promoted-hint candidates: `0` (hints auto-disabled)
2. Active scroll promoted-hint candidates:
   - Mobile profile (`390w`, `844h`): min `19`, max `38`, avg `21.54`
   - Desktop profile (`1440w`, `900h`): min `19`, max `38`, avg `24.15`

Proxy deltas:

1. Idle: `57 -> 0` promoted candidates (`-100%`)
2. Active average:
   - Mobile: `57 -> 21.54` (`-62.2%`)
   - Desktop: `57 -> 24.15` (`-57.6%`)
3. Active worst-case: `57 -> 38` (`-33.3%`)

## Scroll smoothness / dropped-frame proxies

1. During active scrolling, near-viewport moving segments still receive transform compositor hints, preserving smooth transform execution path.
2. Off-screen and idle periods no longer keep full compositor promotion footprint, reducing conditions that can trigger GPU memory churn and dropped frames on constrained mobile GPUs.
3. No regressions observed in static checks (`lint`/`build`), and no interaction/control logic was changed.

## Validation

1. `npm run lint` -> pass (exit `0`) with pre-existing warnings.
2. `npm run build` -> pass (exit `0`) with pre-existing warnings.
3. In this CLI environment, manual visual band-by-band verification cannot be performed directly; no z-order/opacity/clipping logic was modified in code.
