# PERF-06 Implementation Report: Meadow + Forest Asset Budget Pass

Date: 2026-03-04  
Ticket: `PERF-06`

## Scope and constraints followed

1. No scene content removed.
2. No manifest path/name changes.
3. No behavior logic changes.
4. Optimization limited to asset resolution tuning for existing PNG files.

## Budget targets

All budgets below are for **active referenced meadow + forest assets** from `meadow.json` and `forest.json`.

| Device class | Budget target | Result after PERF-06 | Status |
| --- | --- | --- | --- |
| Mobile | Combined compressed footprint <= 150 MB | 139.89 MB | Met |
| Mobile | Per-biome decoded footprint <= 330 MB | Meadow 243.25 MB, Forest 320.99 MB | Met |
| Mobile | Largest decoded single texture <= 8 MB | 6.59 MB (`church_1.png`) | Met |
| Desktop | Combined compressed footprint <= 220 MB | 139.89 MB | Met |
| Desktop | Combined decoded footprint <= 700 MB | 564.24 MB | Met |

## Assets changed and rationale

Rationale used for selection:

1. Prioritize high decoded-cost files with large oversampling vs intended logical render size.
2. Keep conservative headroom for scaling: changed assets remain at least `2.64x` logical width (max `5.33x`).
3. Preserve asset paths so all manifest references remain stable.

### Optimized assets (26 files)

| Asset | Dimensions (before -> after) | Compressed MB (before -> after) | Decoded MB (before -> after) |
| --- | --- | --- | --- |
| `garden/meadow_background/scenery/church_0.png` | 3297x4566 -> 650x900 | 8.25 -> 0.50 | 57.43 -> 2.23 |
| `garden/meadow_background/scenery/stone_path_0.png` | 3519x1521 -> 1080x467 | 5.66 -> 0.63 | 20.42 -> 1.92 |
| `garden/biomes/forest/foreground/flora_group_5/orlaya_0.png` | 2048x2048 -> 512x512 | 2.02 -> 0.22 | 16.00 -> 1.00 |
| `garden/meadow_background/scenery/elm_tree_1.png` | 2048x2048 -> 720x720 | 5.10 -> 0.71 | 16.00 -> 1.98 |
| `garden/meadow_background/scenery/pine_tree_1.png` | 2048x2048 -> 720x720 | 4.08 -> 0.52 | 16.00 -> 1.98 |
| `garden/meadow_background/scenery/willow_0.png` | 2048x2048 -> 720x720 | 6.20 -> 0.79 | 16.00 -> 1.98 |
| `garden/meadow_background/scenery/rocksflowers_0.png` | 2048x2048 -> 756x756 | 3.97 -> 0.58 | 16.00 -> 2.18 |
| `garden/biomes/forest/foreground/flora_group_5/floral_cluster_2.png` | 2048x2048 -> 768x768 | 3.45 -> 0.55 | 16.00 -> 2.25 |
| `garden/meadow_background/scenery/floral_cluster_5.png` | 2048x2048 -> 922x922 | 2.56 -> 0.54 | 16.00 -> 3.24 |
| `garden/meadow_foreground/flora_group_3/cornflower_0.png` | 2048x2048 -> 960x960 | 3.70 -> 0.89 | 16.00 -> 3.52 |
| `garden/meadow_background/scenery/bench_0.png` | 2048x1581 -> 512x395 | 2.68 -> 0.19 | 12.35 -> 0.77 |
| `garden/meadow_background/scenery/blazingstar_0.png` | 1766x1821 -> 497x512 | 5.24 -> 0.53 | 12.27 -> 0.97 |
| `garden/biomes/forest/foreground/flora_group_5/floral_cluster_3.png` | 2048x2048 -> 1152x1152 | 5.45 -> 1.77 | 16.00 -> 5.06 |
| `garden/biomes/forest/foreground/flora_group_2/saplings_1.png` | 2048x2048 -> 1229x1229 | 1.96 -> 0.88 | 16.00 -> 5.76 |
| `garden/biomes/forest/foreground/flora_group_2/tall_thin_stemmed_plants_1.png` | 2048x2048 -> 1229x1229 | 2.12 -> 0.97 | 16.00 -> 5.76 |
| `garden/biomes/forest/foreground/flora_group_5/rocksflowers_0.png` | 2048x2048 -> 1229x1229 | 3.97 -> 1.52 | 16.00 -> 5.76 |
| `garden/meadow_foreground/flora_group_5/blazingstar_0.png` | 1766x1821 -> 931x960 | 5.24 -> 1.71 | 12.27 -> 3.41 |
| `garden/meadow_background/scenery/stormking_0.png` | 2240x1260 -> 990x557 | 1.30 -> 0.15 | 10.77 -> 2.10 |
| `garden/meadow_background/scenery/stream_0.png` | 2048x1535 -> 1080x809 | 3.90 -> 1.18 | 11.99 -> 3.33 |
| `garden/biomes/forest/foreground/flora_group_5/rocksmoss_0.png` | 2048x1535 -> 1229x921 | 3.99 -> 1.43 | 11.99 -> 4.32 |
| `garden/meadow_foreground/flora_group_3/peonies_0.png` | 1517x1723 -> 845x960 | 2.01 -> 0.68 | 9.97 -> 3.09 |
| `garden/meadow_background/scenery/church_1.png` | 2221x1185 -> 1800x960 | 2.90 -> 2.03 | 10.04 -> 6.59 |
| `garden/meadow_background/hills_far/hills_far_2.png` | 2048x1024 -> 1690x845 | 1.28 -> 0.63 | 8.00 -> 5.45 |
| `garden/meadow_background/hills_far/hills_far_3.png` | 2048x1024 -> 1690x845 | 1.25 -> 0.62 | 8.00 -> 5.45 |
| `garden/meadow_background/hills_far/hills_far_5.png` | 2048x1024 -> 1690x845 | 1.50 -> 0.80 | 8.00 -> 5.45 |
| `garden/meadow_background/hills_far/hills_far_6.png` | 2048x1024 -> 1690x845 | 1.70 -> 0.95 | 8.00 -> 5.45 |

## Before/after asset metrics

| Scope | Compressed MB (before) | Compressed MB (after) | Decoded MB (before) | Decoded MB (after) |
| --- | --- | --- | --- | --- |
| Meadow + Forest (combined) | 209.42 | 139.89 | 866.73 | 564.24 |
| Meadow only | 106.17 | 52.27 | 467.66 | 243.25 |
| Forest only | 103.25 | 87.62 | 399.07 | 320.99 |

Reduction summary:

1. Combined compressed: `-69.53 MB` (`-33.2%`)
2. Combined decoded estimate: `-302.49 MB` (`-34.9%`)
3. Meadow compressed/decoded: `-50.8%` / `-48.0%`
4. Forest compressed/decoded: `-15.1%` / `-19.6%`

## Validation

1. Reference integrity check: `82/82` referenced meadow+forest assets resolve on disk (`missingCurrent = 0`).
2. Build/lint checks:
   - `npm run lint` pass (existing warnings only)
   - `npm run build` pass (existing warnings only)
3. Visual parity proxy:
   - All changed assets remain oversampled relative to logical width (`2.64x` to `5.33x`), reducing risk of visible blur at intended render sizes.

## Risks and unknowns

1. CLI environment cannot do final visual QA at runtime; on-device pass is still required for shimmer/aliasing checks during motion.
2. Decoded memory numbers are estimates (`w x h x 4`) and do not include browser-specific mipmap/compositor overhead.
3. This ticket intentionally avoids format migration (`webp/avif`) to reduce behavior risk; further gains remain available in a future ticket.
