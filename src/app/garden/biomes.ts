// ./src/app/garden/biomes.ts
import type {
  LayerConfig,
  SpriteSpec,
} from "../components/InfiniteParallaxGarden";
import type { LayerRole, CurveConfig } from "./biomeLayout";
import { BAND_LAYOUT } from "./biomeLayout";
// import type { BiomeConfig } from "./biomes";

// -----------------------------
// High-level biome/group model
// -----------------------------

export type AssetInstanceConfig = {
  /**
   * Logical asset name (before the index); the file path becomes:
   *   /garden/{groupFolder}/{assetName}_{index}.png
   *
   * Example: name="flower", index=3 → "/garden/flowers/flower_3.png"
   */
  name: string;
  /** Numeric suffix in the filename (assetName_index.png). */
  index: number;

  /** Natural sprite size (before any scale). */
  width: number;
  height: number;

  /** Optional sprite-level override/multiplier relative to the group defaults. */
  scaleMultiplier?: number; // multiplies group.scale
  yOffset?: number; // added to group.yOffset
  anchorY?: number; // overrides group.anchorY
  opacityMultiplier?: number; // multiplies group.opacity

  /**
   * Optional parallax/zIndex tweaks relative to the group; if any of these
   * differ from other instances, they are automatically placed into separate
   * internal layers with their own parallax/zIndex.
   */
  parallaxOffset?: number;
  zIndexOffset?: number;

  /**
   * X positions within one segment. For non-repeating sprites.
   * For repeat strips (group.repeatX=true), leave this undefined.
   */
  xPositions?: number[];
};

export type AssetGroupConfig = {
  id: string;
  groupFolder: string;

  /** Which canonical band this group belongs to. */
  role: LayerRole;

  /**
   * Optional overrides; if omitted we use the band's defaults.
   * These are in normalized or relative units now.
   */
  parallax?: number;
  baseYFromBottomPct?: number;
  zIndex?: number;
  opacity?: number;
  anchorY?: number;
  baseYOffsetPx?: number;
  scale?: number;
  curveOverride?: CurveConfig;

  repeatX?: boolean;

  assets: AssetInstanceConfig[];
};

export type BiomeConfig = {
  id: string;
  groups: AssetGroupConfig[];
};

// -----------------------------
// Builder: BiomeConfig → LayerConfig[]
// -----------------------------

/**
 * Builds a flat LayerConfig[] from a BiomeConfig. Assets within a group that
 * share the same (parallax,zIndex,baseY,opacity) end up in the same layer.
 * Any asset that changes parallax/zIndex via offsets will be split out into
 * its own layer automatically.
 */
export function buildLayersFromBiome(biome: BiomeConfig): LayerConfig[] {
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
          id: `${group.id}-${layers.length}-${layerBuckets.size}`,
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
      const sprite: SpriteSpec = {
        src: `/garden/${group.groupFolder}/${name}_${index}.png`,
        width,
        height,
        anchorY: anchorY ?? groupAnchorY,
        // This remains in pixels but is purely an adjustment on top of the curved baseline.
        yOffsetPx: baseYOffsetPx + yOffset,
        scale: spriteScale,
        repeatX,
        xPositions: repeatX ? undefined : xPositions ?? [],
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
        sprites: bucket.sprites,
      });
    }
  }

  return layers;
}

const ANCHOR = 1024;

export const meadowBiome: BiomeConfig = {
  id: "meadow",
  groups: [
    // SKYBOX
    {
      id: "sky",
      groupFolder: "sky",
      role: "SKYBOX",
      repeatX: true,
      scale: 1.0,
      anchorY: 0, // top
      assets: [
        {
          name: "sky",
          index: 0,
          width: 2048,
          height: 1024,
        },
      ],
    },

    // FAR HILLS (BACKGROUND_FAR)
    {
      id: "hills_far",
      groupFolder: "hills_far",
      role: "BACKGROUND_FAR",
      repeatX: true,
      scale: 1.2,
      anchorY: 1,
      baseYOffsetPx: -40,
      assets: [
        {
          name: "hills_far",
          index: 0,
          width: 2048,
          height: 600,
        },
      ],
    },

    // NEAR HILLS (BACKGROUND_NEAR)
    {
      id: "hills_near",
      groupFolder: "hills_near",
      role: "BACKGROUND_NEAR",
      repeatX: true,
      scale: 1.3,
      anchorY: 1,
      baseYOffsetPx: -20,
      assets: [
        {
          name: "hills_near",
          index: 0,
          width: 2048,
          height: 700,
        },
      ],
    },

    // MIDDLEGROUND (broad grass strip, no curve)
    {
      id: "mid_ground",
      groupFolder: "mid_ground",
      role: "MIDDLEGROUND",
      repeatX: true,
      scale: 1.0,
      anchorY: 1,
      assets: [
        {
          name: "mid_grass",
          index: 0,
          width: 2048,
          height: 400,
        },
      ],
    },

    // FOREGROUND_3 – sparse farther flora
    {
      id: "flora_fg3",
      groupFolder: "flora_group_1",
      role: "FOREGROUND_3",
      scale: 0.45,
      anchorY: 1,
      assets: [
        {
          name: "dandelion",
          index: 1,
          width: 520,
          height: 520,
          xPositions: [300, 1300, 2500, 3700],
        },
        {
          name: "grass",
          index: 2,
          width: 520,
          height: 520,
          xPositions: [200, 1200, 2400, 3600],
        },
      ],
    },

    // FOREGROUND_2 – denser, closer flora
    {
      id: "flora_fg2",
      groupFolder: "flora_group_2",
      role: "FOREGROUND_2",
      scale: 0.55,
      anchorY: 1.2,
      opacity: 0.85,
      assets: [
        {
          name: "thistle",
          index: 1,
          width: 520,
          height: 520,
          xPositions: [400, 1500, 2600, 3800],
        },
        {
          name: "grass",
          index: 1,
          width: 520,
          height: 520,
          xPositions: [350, 1450, 2550, 3750],
        },
      ],
    },

    // FOREGROUND_1 – very near, maybe slightly larger / more opaque
    {
      id: "flora_fg1",
      groupFolder: "flora_group_2",
      role: "FOREGROUND_1",
      scale: 0.7,
      anchorY: 1.3,
      opacity: 1.0,
      // Optionally override the curve for this band if you want it more dramatic:
      // curveOverride: { type: "sine", amplitudePct: 0.04, periodsPerSegment: 1, phaseRad: 0 },
      assets: [
        {
          name: "thistle",
          index: 2,
          width: 520,
          height: 750,
          xPositions: [500, 1600, 2800, 4000],
        },
        {
          name: "grass",
          index: 2,
          width: 520,
          height: 520,
          xPositions: [450, 1550, 2750, 3950],
        },
      ],
    },
  ],
};
