// src/app/garden/worldLayout.ts
import type { BiomeManifestNormalized } from "./biomeManifest";
import { normalizeBiomeManifest } from "./biomeManifest";

export type WorldBiome = BiomeManifestNormalized & {
  startOffset: number;
  biomeWidth: number;
};

export type WorldLayout = {
  segmentWidth: number;
  biomes: WorldBiome[];
};

export function buildWorldLayout(
  manifests: BiomeManifestNormalized[]
): WorldLayout {
  let cursor = 0;
  const biomes: WorldBiome[] = manifests.map((biome) => {
    const normalized = normalizeBiomeManifest(biome);
    const biomeWidth = normalized.segmentWidth * normalized.lengthInSegments;
    const startOffset = cursor;
    cursor += biomeWidth;
    return { ...normalized, biomeWidth, startOffset };
  });

  return {
    segmentWidth: cursor,
    biomes,
  };
}
