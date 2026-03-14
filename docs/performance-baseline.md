# Performance Baseline

## Purpose
This document defines the Phase 0 baseline process for garden-performance work.

It is intentionally split into:
- local repeatable measurements that can be run in this repository
- real-device measurements that should be captured outside this shell

## Local Baseline Commands
Run these from the repo root.

```bash
npm run build
npm run perf:baseline
```

What they provide:
- production build size for `/`
- static scene structure counts
- referenced image footprint
- decoded RGBA memory model for referenced PNGs
- public asset footprint summaries

## Real-Device Measurement Checklist
These are required before and after major performance phases when device access is available.

### iPhone Safari
- connect Safari Web Inspector
- open the production build home page
- record a timeline for:
  - initial load to first interaction
  - first horizontal scroll
  - 15 seconds of continuous scroll
  - open and close 3 story modals
- capture:
  - memory graph
  - FPS
  - layer count if available
  - image decode spikes if visible
  - tab reloads or termination under memory pressure

### Android Chrome
- connect remote DevTools
- repeat the same scenarios as iPhone Safari
- capture:
  - memory
  - performance trace
  - layers/compositing view
  - FPS
  - crashes or tab kills

### Desktop Chrome or Safari
- record the same scenarios for comparison
- use this as the control environment, not the success target

## Test Scenarios
Use the same path and interaction order every time:

1. Load `/` and wait 10 seconds without interaction.
2. Trigger the first user interaction that enables audio.
3. Scroll continuously for 15 seconds in one direction.
4. Reverse direction and scroll back across the seam.
5. Trigger at least 3 story-dot interactions.
6. Open and close 3 story modals.

## Regression Checklist
Before and after each performance phase, visually verify:
- first viewport composition is unchanged
- scene scale is unchanged
- parallax relationship is unchanged
- infinite-scroll seam behavior is unchanged
- story-dot positions are unchanged
- modal behavior is unchanged
- audio affordances are unchanged

## Current Baseline Notes
Current locally measured baseline:
- `/` first-load JS is about `121 kB`
- `public/garden` is about `321 MB`
- referenced garden sources: `82`
- referenced compressed garden payload: about `209 MB`
- modeled decoded RGBA memory: about `867 MB`
- positioned sprite instances per world: about `145`
- non-repeating mounted nodes across 3 segments: about `435`

## Limitations
This repository environment cannot directly produce authoritative mobile browser memory traces.

Local measurements are still useful because they quantify:
- asset pressure
- decoded-memory risk
- scene complexity
- build size

Any statement about actual mobile tab crashes should still be treated as an inference unless confirmed on-device.
