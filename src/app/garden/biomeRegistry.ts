// src/app/garden/biomeRegistry.ts
import type { BiomeManifest } from "./biomeManifest";
import meadow from "./manifests/meadow.json";

export const BIOME_MANIFESTS: BiomeManifest[] = [meadow];

export const BIOME_ORDER = BIOME_MANIFESTS.map((b) => b.id);
