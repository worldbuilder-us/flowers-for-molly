# Contributor Guide

## Biome Manifests and World Layout

This project treats the entire scene as a single repeating world segment that
contains one or more biomes in a fixed order. Each biome defines its assets in a
JSON manifest, and the world layout utilities compute biome start offsets so the
garden can jump to the beginning of a biome.

### Files to Know
- `src/app/garden/biomeManifest.ts`: Types + validation for biome manifests.
- `src/app/garden/manifests/*.json`: Individual biome manifests.
- `src/app/garden/biomeRegistry.ts`: Registry of manifests and order.
- `src/app/garden/worldLayout.ts`: Computes biome start offsets + world width.
- `src/app/garden/biomeLoader.ts`: Builds the world layers from manifests.
- `src/app/garden/biomes.ts`: Converts a manifest into `LayerConfig[]`.

### Add a New Biome (Checklist)
1) Create a new manifest JSON in `src/app/garden/manifests/your-biome.json`.
2) Add its asset folder under `public/` (any path is OK as long as
   `assetBasePath` + `folder` resolves to real files).
3) Register the manifest in `src/app/garden/biomeRegistry.ts`.
4) Order matters: the array order defines the world order and biome start offsets.

### Manifest Fields (Quick Reference)
Root:
- `id`: Stable biome id (used in world layout and UI).
- `label`: Human-readable name.
- `segmentWidth`: Logical width of a single biome segment.
- `lengthInSegments`: How many segments the biome spans (default 1).
- `assetBasePath`: Public base path for assets (e.g. `/garden`).
- `groups`: Sprite groups and layer settings.

Group:
- `folder`: Path under `assetBasePath` where assets live.
- `role`: Layer band (`FOREGROUND_1`, `MIDDLEGROUND`, `SKYBOX`, etc.).
- `repeatX`: If true, draws a repeating strip instead of individual sprites.
- `repeatWithinBiome`: If true, repeat strips only within the biome width.

Asset:
- `name`, `index`, `width`, `height`: Sprite identity and source dimensions.
- `xPositions`: Logical X positions (only for non-repeating sprites).
- Optional offsets: `yOffset`, `scaleMultiplier`, `opacityMultiplier`, etc.

### How World Offsets Work
`buildWorldLayout` in `src/app/garden/worldLayout.ts` computes:
- `startOffset` for each biome (cumulative width of previous biomes).
- `segmentWidth` for the world (sum of all biome widths).

These offsets are applied by `buildLayersFromBiome` in
`src/app/garden/biomes.ts` so each biome renders in the correct world slice.

### Selecting a Biome (Future UI)
Use the biome's `startOffset` as the `initialOffsetX` when you want to jump to
the beginning of a biome. The world order is fixed, so this keeps the scene
consistent for all users.

## Viewport-Based Dot Culling

`StoryDotsOverlay` culls dots outside the viewport to reduce DOM load. The
garden reports the logical viewport width via `GardenViewport.logicalW`, so the
overlay can render only what is on-screen (plus a buffer).

Key logic:
- `logicalW = viewport.viewportW / sceneScale` (provided by the garden).
- `visibleStart = offsetX - buffer`
- `visibleEnd = offsetX + logicalW + buffer`
- Only render dots whose world X falls within that range.

If you change how the garden reports viewport metrics, update the culling logic
in `src/app/components/StoryDotsOverlay.tsx` accordingly.

## Debug Wireframes (Hover-Only)

The garden exposes hover-only wireframes for inspecting assets in context. Use
the debug toggles on the garden page:
- `Wireframe foreground`: shows hover targets for foreground layers.
- `Wireframe background`: shows hover targets for middle/background/sky layers.

When you hover an asset, its wireframe appears with:
- Asset name and index (matches the manifest file name).
- Group id and layer role.
- Source and rendered size.
- `x local` (from the biome manifest) and `x world` (global world space).

Pin mode:
- Enable "Pin wireframe on click".
- Click any asset to keep its wireframe visible while you move around.
- Click the same asset again to unpin.

Use `x local` to find the corresponding entry in the biome JSON, and use
`x world` to understand where it lands in the overall world layout.
