// src/app/garden/biomeManifest.ts
import type { LayerRole, CurveConfig } from "./biomeLayout";

export type AssetInstanceManifest = {
  name: string;
  index: number;
  width: number;
  height: number;
  scaleMultiplier?: number;
  yOffset?: number;
  anchorY?: number;
  opacityMultiplier?: number;
  parallaxOffset?: number;
  zIndexOffset?: number;
  xPositions?: number[];
  blurPx?: number;
};

export type AssetGroupManifest = {
  id: string;
  /** Path segment under assetBasePath, e.g. "meadow_foreground/flora_group_1". */
  folder: string;
  role: LayerRole;
  parallax?: number;
  baseYFromBottomPct?: number;
  zIndex?: number;
  opacity?: number;
  anchorY?: number;
  baseYOffsetPx?: number;
  scale?: number;
  curveOverride?: CurveConfig;
  repeatX?: boolean;
  /** When true, repeat strips only within the biome width. */
  repeatWithinBiome?: boolean;
  assets: AssetInstanceManifest[];
};

export type BiomeManifest = {
  id: string;
  label: string;
  /** Logical width of a single biome segment. */
  segmentWidth: number;
  /** How many segments this biome spans in the world. */
  lengthInSegments?: number;
  /** Base path for assets, e.g. "/garden" or "/garden/biomes/meadow". */
  assetBasePath: string;
  groups: AssetGroupManifest[];
};

export type BiomeManifestNormalized = BiomeManifest & {
  lengthInSegments: number;
};

export function normalizeBiomeManifest(
  biome: BiomeManifest
): BiomeManifestNormalized {
  return {
    ...biome,
    lengthInSegments:
      typeof biome.lengthInSegments === "number" && biome.lengthInSegments > 0
        ? biome.lengthInSegments
        : 1,
  };
}

export function validateBiomeManifest(
  biome: BiomeManifest
): BiomeManifestNormalized {
  if (!biome.id) {
    throw new Error("Biome manifest missing id");
  }
  if (!biome.label) {
    throw new Error(`Biome "${biome.id}" missing label`);
  }
  if (!biome.segmentWidth || biome.segmentWidth <= 0) {
    throw new Error(`Biome "${biome.id}" has invalid segmentWidth`);
  }
  if (!biome.assetBasePath) {
    throw new Error(`Biome "${biome.id}" missing assetBasePath`);
  }
  if (!Array.isArray(biome.groups) || biome.groups.length === 0) {
    throw new Error(`Biome "${biome.id}" has no groups`);
  }

  return normalizeBiomeManifest(biome);
}
