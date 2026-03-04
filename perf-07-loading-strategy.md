# PERF-07 Implementation Report: Image Loading + Decode Scheduling

Date: 2026-03-04  
Ticket: `PERF-07`

## Loading strategy changes

1. Added sprite loading priority tiers in the garden render hot path:
   - High priority (`fetchPriority="high"`, `loading="eager"`) for sprites within `96px` of viewport.
   - Eager/normal priority (`fetchPriority="auto"`, `loading="eager"`) for sprites within `224px`.
   - Deferred (`fetchPriority="low"`, `loading="lazy"`) for the rest of currently rendered sprites.
2. Added bounded decode prefetch scheduling for non-repeat sprite sources:
   - Lookahead window: `1440px` around viewport.
   - Candidate cap: `24` nearest sources.
   - Enqueue cap: `6` new sources per viewport update.
   - Decode pump: `1` source in flight, `48ms` interval.
3. Kept visual/interaction behavior unchanged:
   - Same layer composition, transforms, culling, story dot flow, and modal handling.
   - No content removal and no manifest/path changes.

## Measured impact

Method:

1. Added deterministic proxy simulation script for traversal decode pressure and priority distribution:
   - `scripts/perf07-loading-proxy.mjs`
   - Output snapshot: `perf-07-loading-metrics.json`
2. Because browser frame instrumentation is not available in this CLI environment, metrics below are proxy-based and explicitly labeled as such.

### Mobile proxy (`viewportWidth=480`, warm traversal excludes first 3 steps)

1. On-demand decode burst p95: `18.25 MB -> 0 MB` (`-100%`)
2. On-demand decode burst max: `32 MB -> 0 MB` (`-100%`)
3. Steps with burst > `8 MB`: `13 -> 0`
4. On-demand decoded volume: `512.81 MB -> 181.96 MB` (`-64.5%`)
   - Shifted to scheduled prefetch decode: `330.85 MB`
5. High-priority rendered sprite count (avg): `34.18 -> 26.09` (`-23.7%`)

### Desktop proxy (`viewportWidth=1280`, warm traversal excludes first 3 steps)

1. On-demand decode burst p95: `16 MB -> 0 MB` (`-100%`)
2. On-demand decode burst max: `32 MB -> 0 MB` (`-100%`)
3. Steps with burst > `8 MB`: `12 -> 0`
4. On-demand decoded volume: `512.81 MB -> 215.93 MB` (`-57.9%`)
   - Shifted to scheduled prefetch decode: `296.88 MB`
5. High-priority rendered sprite count (avg): `48.77 -> 40.85` (`-16.2%`)

Interpretation:

1. Decode work is shifted away from on-demand visibility edges into bounded prefetch, reducing burstiness during traversal.
2. Priority bucketing lowers the number of concurrently high-priority image loads in the render window.

## Behavior parity checks

1. Build/lint:
   - `npm run lint` pass (existing warnings only)
   - `npm run build` pass (existing warnings only)
2. Asset reference integrity:
   - Referenced meadow/forest assets checked: `88`
   - Missing files: `0`
3. Story interaction parity:
   - No changes in `StoryDotsOverlay` or modal open/close logic.
   - `onViewportChange` contract unchanged.

## Files changed

1. [InfiniteParallaxGarden.tsx](/Users/shirishsarkar/_CODE/flowers-for-molly/src/app/components/InfiniteParallaxGarden.tsx)
2. [scripts/perf07-loading-proxy.mjs](/Users/shirishsarkar/_CODE/flowers-for-molly/scripts/perf07-loading-proxy.mjs)
3. [perf-07-loading-metrics.json](/Users/shirishsarkar/_CODE/flowers-for-molly/perf-07-loading-metrics.json)

## Risks and unknowns

1. Proxy metrics are model-based and do not replace on-device frame trace validation.
2. `unoptimized` image delivery is now explicit for this hot path; visual output is unchanged, but network byte profile should be spot-checked on very small/mobile bandwidth-constrained devices.
3. Prefetch decode uses a steady interval pump; it is bounded, but still consumes background decode bandwidth and should be validated on low-memory mobile devices with remote profiling.
