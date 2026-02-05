// src/app/garden/biomes.ts
import type { LayerConfig, SpriteSpec } from "../components/InfiniteParallaxGarden";
import type { CurveConfig } from "./biomeLayout";
import { BAND_LAYOUT } from "./biomeLayout";
import type { BiomeManifestNormalized } from "./biomeManifest";

type BuildBiomeOptions = {
  xOffset?: number;
  biomeWidth?: number;
  assetBasePath?: string;
};

function joinPath(a: string, b: string): string {
  const left = a.endsWith("/") ? a.slice(0, -1) : a;
  const right = b.startsWith("/") ? b.slice(1) : b;
  return `${left}/${right}`;
}

/**
 * Convert a BiomeConfig into a flat LayerConfig[] for the renderer.
 */
export function buildLayersFromBiome(
  biome: BiomeManifestNormalized,
  options: BuildBiomeOptions = {}
): LayerConfig[] {
  const xOffset = options.xOffset ?? 0;
  const biomeWidth =
    options.biomeWidth ?? biome.segmentWidth * biome.lengthInSegments;
  const assetBasePath = options.assetBasePath ?? biome.assetBasePath;

  const layers: LayerConfig[] = [];

  for (const group of biome.groups) {
    const band = BAND_LAYOUT[group.role];

    const groupParallax = group.parallax ?? band.defaultParallax;
    const groupZ = group.zIndex ?? band.defaultZIndex;
    const baseYFromBottomPct =
      group.baseYFromBottomPct ?? band.baseYFromBottomPct;
    const groupOpacity = group.opacity ?? 1;
    const groupAnchorY = group.anchorY ?? 1;
    const baseYOffsetPx = group.baseYOffsetPx ?? 0;
    const groupScale = group.scale ?? 1;
    const repeatX = group.repeatX ?? false;
    const repeatWithinBiome = group.repeatWithinBiome ?? true;
    const curve: CurveConfig | undefined =
      group.curveOverride ?? band.defaultCurve;

    type BucketKey = string;
    const layerBuckets = new Map<
      BucketKey,
      {
        id: string;
        parallax: number;
        zIndex: number;
        baseYFromBottomPct: number;
        opacity: number;
        curve?: CurveConfig;
        sprites: SpriteSpec[];
      }
    >();

    for (const asset of group.assets) {
      const {
        name,
        index,
        width,
        height,
        scaleMultiplier = 1,
        yOffset = 0,
        anchorY,
        opacityMultiplier = 1,
        parallaxOffset = 0,
        zIndexOffset = 0,
        xPositions,
        blurPx,
      } = asset;

      const effectiveParallax = groupParallax + parallaxOffset;
      const effectiveZ = groupZ + zIndexOffset;
      const effectiveOpacity = groupOpacity * opacityMultiplier;

      const key: BucketKey = `${effectiveParallax}|${effectiveZ}|${baseYFromBottomPct}|${effectiveOpacity}|${
        curve?.type ?? "none"
      }`;

      let bucket = layerBuckets.get(key);
      if (!bucket) {
        bucket = {
          id: `${biome.id}-${group.id}-${layers.length}-${layerBuckets.size}`,
          parallax: effectiveParallax,
          zIndex: effectiveZ,
          baseYFromBottomPct,
          opacity: effectiveOpacity,
          curve,
          sprites: [],
        };
        layerBuckets.set(key, bucket);
      }

      const spriteScale = groupScale * scaleMultiplier;
      const groupFolder = joinPath(assetBasePath, group.folder);
      const localPositions = xPositions ?? [];
      const worldPositions = repeatX
        ? undefined
        : localPositions.map((x) => x + xOffset);
      const sprite: SpriteSpec = {
        src: `${groupFolder}/${name}_${index}.png`,
        width,
        height,
        anchorY: anchorY ?? groupAnchorY,
        yOffsetPx: baseYOffsetPx + yOffset,
        scale: spriteScale,
        repeatX,
        repeatStartPx: repeatX
          ? repeatWithinBiome
            ? xOffset
            : 0
          : undefined,
        repeatWidthPx: repeatX && repeatWithinBiome ? biomeWidth : undefined,
        xPositions: worldPositions,
        blurPx,
        debug: {
          name,
          index,
          groupId: group.id,
          role: group.role,
          xPositionsLocal: localPositions,
        },
      };

      bucket.sprites.push(sprite);
    }

    for (const bucket of layerBuckets.values()) {
      layers.push({
        id: bucket.id,
        parallax: bucket.parallax,
        zIndex: bucket.zIndex,
        baseYFromBottomPct: bucket.baseYFromBottomPct,
        opacity: bucket.opacity,
        curve: bucket.curve,
        role: group.role,
        groupId: group.id,
        sprites: bucket.sprites,
      });
    }
  }

  return layers;
}
