// src/app/garden/biomeRegistry.ts
import type { BiomeManifest } from "./biomeManifest";
import meadow from "./manifests/meadow.json";
import meadowToForest from "./manifests/meadow_to_forest.json";
import forest from "./manifests/forest.json";
import forestToMeadow from "./manifests/forest_to_meadow.json";

export const BIOME_MANIFESTS: BiomeManifest[] = [
  meadow,
  meadowToForest,
  forest,
  forestToMeadow,
];

export const BIOME_ORDER = BIOME_MANIFESTS.map((b) => b.id);
