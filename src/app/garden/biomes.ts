// src/app/garden/biomes.ts
import type {
  LayerConfig,
  SpriteSpec,
} from "../components/InfiniteParallaxGarden";
import type { LayerRole, CurveConfig } from "./biomeLayout";
import { BAND_LAYOUT } from "./biomeLayout";

export type AssetInstanceConfig = {
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
};

export type AssetGroupConfig = {
  id: string;
  /** Path segment under /public, e.g. "meadow_foreground/flora_group_1". */
  groupFolder: string;
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
  assets: AssetInstanceConfig[];
};

export type BiomeConfig = {
  id: string;
  groups: AssetGroupConfig[];
};

/**
 * Convert a BiomeConfig into a flat LayerConfig[] for the renderer.
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
        // groupFolder is now like "meadow_foreground/flora_group_1"
        // and "meadow_background/sky", so we mount directly under `/`.
        src: `/${group.groupFolder}/${name}_${index}.png`,
        width,
        height,
        anchorY: anchorY ?? groupAnchorY,
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

export const meadowBiome: BiomeConfig = {
  id: "meadow",
  groups: [
    //
    // FOREGROUND_1 – closest flora
    //
    {
      id: "flora_fg1_g1",
      groupFolder: "garden/meadow_foreground/flora_group_1",
      role: "FOREGROUND_1",
      scale: 1,
      anchorY: 0.1,
      baseYOffsetPx: 0,
      opacity: 1.0,
      assets: [
        {
          name: "flower",
          index: 1,
          width: 520,
          height: 700,
          xPositions: [120, 520, 920, 1320, 1720, 2120, 2520, 2920, 3320, 3720],
        },
        {
          name: "flower",
          index: 2,
          width: 520,
          height: 520,
          xPositions: [
            320, 720, 1120, 1520, 1920, 2320, 2720, 3120, 3520, 3920,
          ],
        },
        {
          name: "grass",
          index: 1,
          width: 520,
          height: 520,
          xPositions: [40, 440, 840, 1240, 1640, 2040, 2440, 2840, 3240, 3640],
        },
        {
          name: "grass",
          index: 2,
          width: 520,
          height: 700,
          xPositions: [40, 440, 840, 1240, 1640, 2040, 2440, 2840, 3240, 3640],
        },
      ],
    },

    //
    // FOREGROUND_2 – mid-depth flora
    //
    {
      id: "flora_fg2_g2",
      groupFolder: "garden/meadow_foreground/flora_group_2",
      role: "FOREGROUND_2",
      scale: 1,
      anchorY: 0.2,
      baseYOffsetPx: 0,
      opacity: 1,
      assets: [
        {
          name: "flower",
          index: 1,
          width: 520,
          height: 700,
          xPositions: [80, 560, 1040, 1520, 2000, 2480, 2960, 3440, 3920],
        },
        {
          name: "flower",
          index: 2,
          width: 520,
          height: 520,
          xPositions: [280, 760, 1240, 1720, 2200, 2680, 3160, 3640, 4120],
        },
        {
          name: "grass",
          index: 1,
          width: 520,
          height: 520,
          xPositions: [160, 640, 1120, 1600, 2080, 2560, 3040, 3520, 4000],
        },
        {
          name: "grass",
          index: 2,
          width: 520,
          height: 700,
          xPositions: [440, 920, 1400, 1880, 2360, 2840, 3320, 3800],
        },
      ],
    },
    {
      id: "flora_fg2_g5",
      groupFolder: "garden/meadow_foreground/flora_group_5",
      role: "FOREGROUND_2",
      scale: 1,
      anchorY: 0.25,
      baseYOffsetPx: 0,
      opacity: 1,
      assets: [
        {
          name: "flower",
          index: 1,
          width: 520,
          height: 700,
          xPositions: [200, 680, 1160, 1640, 2120, 2600, 3080, 3560, 4040],
        },
        {
          name: "flower",
          index: 2,
          width: 520,
          height: 520,
          xPositions: [40, 520, 1000, 1480, 1960, 2440, 2920, 3400, 3880],
        },
        {
          name: "grass",
          index: 1,
          width: 520,
          height: 520,
          xPositions: [320, 800, 1280, 1760, 2240, 2720, 3200, 3680],
        },
        {
          name: "grass",
          index: 2,
          width: 240,
          height: 240,
          xPositions: [2000],
        },
        {
          name: "rock",
          index: 1,
          width: 520,
          height: 520,
          xPositions: [1900],
        },
      ],
    },

    //
    // FOREGROUND_3 – farther flora bands
    //
    {
      id: "flora_fg3_g3",
      groupFolder: "garden/meadow_foreground/flora_group_3",
      role: "FOREGROUND_3",
      scale: 1,
      anchorY: 0,
      baseYOffsetPx: 0,
      opacity: 1,
      assets: [
        {
          name: "flower",
          index: 1,
          width: 520,
          height: 700,
          xPositions: [120, 720, 1320, 1920, 2520, 3120, 3720],
        },
        {
          name: "flower",
          index: 2,
          width: 520,
          height: 520,
          xPositions: [360, 960, 1560, 2160, 2760, 3360, 3960],
        },
        {
          name: "grass",
          index: 1,
          width: 520,
          height: 520,
          xPositions: [40, 640, 1240, 1840, 2440, 3040, 3640],
        },
        {
          name: "grass",
          index: 2,
          width: 520,
          height: 700,
          xPositions: [520, 1120, 1720, 2320, 2920, 3520, 4120],
        },
        {
          name: "rock",
          index: 1,
          width: 520,
          height: 520,
          xPositions: [1200],
        },
      ],
    },
    {
      id: "flora_fg3_g4",
      groupFolder: "garden/meadow_foreground/flora_group_4",
      role: "FOREGROUND_3",
      scale: 1,
      anchorY: 0.01,
      baseYOffsetPx: 0,
      opacity: 1,
      assets: [
        {
          name: "flower",
          index: 1,
          width: 520,
          height: 700,
          xPositions: [220, 820, 1420, 2020, 2620, 3220, 3820],
        },
        {
          name: "flower",
          index: 2,
          width: 520,
          height: 520,
          xPositions: [100, 700, 1300, 1900, 2500, 3100, 3700],
        },
        {
          name: "grass",
          index: 2,
          width: 520,
          height: 520,
          xPositions: [480, 2880],
        },
        {
          name: "grass",
          index: 3,
          width: 520,
          height: 700,
          xPositions: [300, 900, 1500, 2100, 2700, 3300, 3900],
        },
      ],
    },

    //
    // MIDDLEGROUND
    //
    {
      id: "mid_ground",
      groupFolder: "garden/meadow_background/mid_ground",
      role: "MIDDLEGROUND",
      repeatX: true,
      scale: 0.8,
      anchorY: 0.1,
      baseYOffsetPx: 50,
      opacity: 0.8,
      assets: [
        {
          name: "mid_grass",
          index: 0,
          width: 2000,
          height: 2000,
        },
      ],
    },

    //
    // BACKGROUND – hills and sky
    //
    {
      id: "hills_near",
      groupFolder: "garden/meadow_background/hills_near",
      role: "BACKGROUND_NEAR",
      repeatX: true,
      scale: 0.75,
      anchorY: 0.4,
      baseYOffsetPx: 0,
      opacity: 0.8,
      assets: [
        {
          name: "hills_near",
          index: 0,
          width: 2048,
          height: 1800,
        },
      ],
    },
    {
      id: "hills_far",
      groupFolder: "garden/meadow_background/hills_far",
      role: "BACKGROUND_FAR",
      repeatX: true,
      scale: 0.5,
      anchorY: 0.35,
      baseYOffsetPx: 0,
      opacity: 0.25,
      assets: [
        {
          name: "hills_far",
          index: 0,
          width: 2048,
          height: 1024,
        },
      ],
    },
    {
      id: "sky",
      groupFolder: "garden/meadow_background/sky",
      role: "SKYBOX",
      repeatX: true,
      scale: 1,
      anchorY: 0,
      opacity: 0.8,
      assets: [
        {
          name: "sky",
          index: 5,
          width: 2048,
          height: 1024,
        },
      ],
    },
  ],
};
