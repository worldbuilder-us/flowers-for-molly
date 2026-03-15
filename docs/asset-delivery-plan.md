# Asset Delivery Plan

## Purpose
This document defines the Phase 4 asset-delivery strategy for the garden scene.

The goal is to reduce transfer cost and decoded bitmap memory without changing the visual composition or perceived quality of the experience.

## Current Findings
Use `npm run perf:assets` to refresh the audit.

Current audit highlights:
- `MIDDLEGROUND` assets are the most oversupplied overall, at about `17.4x` source pixels versus nominal render pixels.
- `FOREGROUND_2` is also heavily oversupplied, at about `16.5x`.
- Several individual assets are more than `10x` larger than their nominal render dimensions.

Examples:
- `public/garden/meadow_background/scenery/church_0.png`
  - source: `3297x4566`
  - nominal render at scene height 1024: about `240x300`
- `public/garden/meadow_background/scenery/pine_tree_1.png`
  - source: `2048x2048`
  - nominal render at scene height 1024: about `120x120`
- `public/garden/biomes/forest/foreground/flora_group_5/orlaya_0.png`
  - source: `2048x2048`
  - nominal render at scene height 1024: about `96x96`

## Delivery Principles
- Keep the original art as source-of-truth.
- Generate delivery assets from source art. Do not destructively replace masters.
- Optimize by role and actual render need, not by arbitrary global resizing.
- Preserve alpha and edge quality.
- Prefer explicit documented buckets over ad hoc one-off changes.

## Proposed Buckets
These buckets are based on the current renderer and audit script output.

- `skybox`
  - Keep high quality.
  - These are wide and visually sensitive but relatively few.
- `repeat-strip`
  - Preserve seamless tiling.
  - Optimize carefully to avoid visible seams.
- `background-far`
  - Aggressive downscaling is usually safe.
- `midground-small`
  - Strong downscale candidates.
- `midground-medium`
  - Moderate to strong downscale candidates.
- `midground-large`
  - Optimize case by case.
- `foreground-small`
  - Strong downscale candidates.
- `foreground-medium`
  - Moderate downscale candidates.
- `foreground-large`
  - Preserve more detail, but trim excess transparent bounds where possible.

## First-Wave Targets
These should be optimized first because they have the best risk-to-reward profile.

- `MIDDLEGROUND` non-repeating scenery
- `FOREGROUND_2` assets
- very small rendered decorative elements sourced from `2048x2048` PNGs

Examples from the current audit:
- `public/garden/meadow_background/scenery/church_0.png`
- `public/garden/meadow_background/scenery/pine_tree_1.png`
- `public/garden/meadow_background/scenery/bench_0.png`
- `public/garden/biomes/forest/foreground/flora_group_5/orlaya_0.png`
- `public/garden/biomes/forest/foreground/flora_group_5/floral_cluster_3.png`

## Workflow
1. Run `npm run perf:assets`.
2. Pick one bucket or one small set of high-value candidates.
3. Generate delivery variants from source art into a staging area.
4. Compare visual output in the actual scene at mobile and desktop sizes.
5. Approve only when no visible regression is detected.
6. Update manifests or delivery references in a controlled follow-up change.

## Suggested Generation Approach
Available local tooling includes ImageMagick via `magick`.

Recommended process:
- keep original assets unchanged
- generate staged outputs under a separate directory first
- use transparent-safe formats
- trim transparent bounds only after visual confirmation
- for repeat strips, explicitly verify seam continuity

Illustrative command pattern:

```bash
magick input.png -resize 50% output.png
```

This is only a placeholder pattern. Exact resize targets should come from the audit and visual review.

## Validation Checklist
For each optimized asset set:
- no visible softness at intended scene scale
- no haloing or edge artifacts
- no seam breaks for repeat strips
- no composition shift due to unexpected trimming
- no alpha-premultiplication artifacts

## Phase 4 Deliverables
Phase 4 is complete when the repo has:
- a repeatable audit command
- documented delivery buckets
- a prioritized candidate list
- a safe workflow for generating and validating optimized assets

Actual asset replacement can then proceed bucket by bucket in follow-up prompts.
