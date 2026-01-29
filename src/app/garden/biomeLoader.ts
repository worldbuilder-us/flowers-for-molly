// src/app/garden/biomeLoader.ts
import { BIOME_MANIFESTS } from "./biomeRegistry";
import {
  type BiomeManifestNormalized,
  validateBiomeManifest,
} from "./biomeManifest";
import { buildWorldLayout, type WorldLayout } from "./worldLayout";
import { buildLayersFromBiome } from "./biomes";
import type { LayerConfig } from "../components/InfiniteParallaxGarden";

export type WorldConfig = {
  manifests: BiomeManifestNormalized[];
  layout: WorldLayout;
  layers: LayerConfig[];
};

let cached: WorldConfig | null = null;

export function getWorldConfig(): WorldConfig {
  if (cached) return cached;

  const manifests = BIOME_MANIFESTS.map(validateBiomeManifest);
  const layout = buildWorldLayout(manifests);

  const layers = layout.biomes.flatMap((biome) =>
    buildLayersFromBiome(biome, {
      xOffset: biome.startOffset,
      biomeWidth: biome.biomeWidth,
      assetBasePath: biome.assetBasePath,
    })
  );

  cached = { manifests, layout, layers };
  return cached;
}
