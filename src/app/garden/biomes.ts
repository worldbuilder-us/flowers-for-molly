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
  blurPx?: number;
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
      scale: 1.25,
      anchorY: 0.25,
      baseYOffsetPx: 0,
      opacity: 1.0,
      assets: [
        {
          name: "flower",
          index: 1,
          width: 520,
          height: 600,
          xPositions: [120, 360, 920, 1320, 2120, 2520, 3320, 3720],
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
          name: "flower",
          index: 3,
          width: 200,
          height: 200,
          xPositions: [720, 1920, 3120],
          yOffset: 320,
        },
        {
          name: "flower",
          index: 4,
          width: 220,
          height: 220,
          xPositions: [460, 600, 1920, 3520],
          yOffset: 300,
        },
        {
          name: "flower",
          index: 5,
          width: 220,
          height: 220,
          xPositions: [750, 1470],
          yOffset: 150,
        },
        {
          name: "grass",
          index: 1,
          width: 520,
          height: 520,
          xPositions: [
            240, 300, 360, 650, 720, 840, 1240, 1640, 2040, 2840, 3240, 3640,
          ],
        },
        {
          name: "grass",
          index: 2,
          width: 520,
          height: 700,
          xPositions: [40, 840, 1240, 1640, 2840, 3240, 3640],
        },
        {
          name: "grass",
          index: 3,
          width: 360,
          height: 420,
          xPositions: [500, 800, 1840, 1680, 3640],
          yOffset: 180,
        },
      ],
    },

    //
    // FOREGROUND_2 – mid-depth flora
    //
    {
      id: "flora_fg2_g2",
      groupFolder: "garden/meadow_foreground/flora_group_2",
      role: "FOREGROUND_1",
      scale: 1.2,
      anchorY: 0.1,
      baseYOffsetPx: 0,
      opacity: 1,
      assets: [
        {
          name: "flower",
          index: 1,
          width: 520,
          height: 700,
          xPositions: [80, 360, 1040, 2000, 2960, 3920],
        },
        {
          name: "flower",
          index: 2,
          width: 520,
          height: 520,
          xPositions: [280, 360, 760, 1240, 2200, 2680, 3640, 4120],
        },
        {
          name: "flower",
          index: 3,
          width: 320,
          height: 320,
          xPositions: [1440, 2780, 320],
          yOffset: 200,
        },
        {
          name: "grass",
          index: 1,
          width: 520,
          height: 520,
          xPositions: [
            160, 240, 640, 720, 800, 860, 900, 960, 1120, 1600, 3040, 3520,
            4000,
          ],
        },
        {
          name: "grass",
          index: 2,
          width: 520,
          height: 700,
          xPositions: [
            720, 920, 1000, 1280, 1400, 1540, 1600, 1720, 1880, 3320, 3800,
          ],
        },
      ],
    },
    {
      id: "flora_fg2_g5",
      groupFolder: "garden/meadow_foreground/flora_group_5",
      role: "FOREGROUND_2",
      scale: 1,
      anchorY: 0.2,
      baseYOffsetPx: 0,
      opacity: 1,
      assets: [
        {
          name: "rock",
          index: 1,
          width: 520,
          height: 520,
          xPositions: [1000],
          yOffset: -200,
        },
        {
          name: "grass",
          index: 1,
          width: 520,
          height: 520,
          xPositions: [40, 1240, 1840, 3040, 3640],
        },
        {
          name: "flower",
          index: 1,
          width: 520,
          height: 700,
          xPositions: [200, 1160, 1640, 2120, 3080, 3560, 4040],
        },
        {
          name: "flower",
          index: 2,
          width: 520,
          height: 520,
          xPositions: [
            40, 1000, 1480, 1880, 1900, 1920, 1910, 1960, 2920, 3400, 3880,
          ],
        },
        {
          name: "flower",
          index: 3,
          width: 220,
          height: 240,
          xPositions: [1675, 2230, 3470],
          yOffset: -50,
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
      scale: 0.8,
      anchorY: 0,
      baseYOffsetPx: 0,
      opacity: 1,
      assets: [
        {
          name: "flower",
          index: 1,
          width: 520,
          height: 700,
          xPositions: [120, 1320, 1920, 1800, 3120, 3720],
        },
        {
          name: "flower",
          index: 2,
          width: 520,
          height: 520,
          xPositions: [680, 960, 1560, 2160, 2760, 3360, 3960],
        },
        {
          name: "flower",
          index: 3,
          width: 520,
          height: 520,
          xPositions: [1620, 2760],
        },
        // {
        //   name: "grass",
        //   index: 1,
        //   width: 520,
        //   height: 520,
        //   xPositions: [40, 1240, 1840, 2440, 3040, 3640],
        // },
        // {
        //   name: "grass",
        //   index: 2,
        //   width: 520,
        //   height: 700,
        //   xPositions: [1120, 1200, 1180, 1220, 1720, 2320, 2920, 3520, 4120],
        // },
        {
          name: "rock",
          index: 1,
          width: 520,
          height: 520,
          xPositions: [1820],
          yOffset: -120,
        },
        {
          name: "rock",
          index: 2,
          width: 520,
          height: 520,
          xPositions: [1680],
          yOffset: 250,
        },
      ],
    },
    {
      id: "flora_fg3_g4",
      groupFolder: "garden/meadow_foreground/flora_group_4",
      role: "FOREGROUND_1",
      scale: 1.25,
      anchorY: 0.125,
      baseYOffsetPx: 0,
      opacity: 0.9,
      assets: [
        {
          name: "flower",
          index: 1,
          width: 520,
          height: 700,
          xPositions: [820, 1420, 2020, 2620, 3220, 3820],
        },
        {
          name: "flower",
          index: 2,
          width: 520,
          height: 520,
          xPositions: [100, 700, 1300, 1900, 2500, 3100, 3700],
        },
        {
          name: "flower",
          index: 3,
          width: 180,
          height: 240,
          xPositions: [1140, 240, 1740],
          yOffset: 250,
        },
        {
          name: "grass",
          index: 1,
          width: 520,
          height: 520,
          xPositions: [
            800, 960, 1400, 1600, 1780, 2000, 2200, 2450, 2650, 2880,
          ],
        },
        {
          name: "grass",
          index: 2,
          width: 520,
          height: 700,
          xPositions: [300, 900, 1500, 2100, 2700, 3300, 3900],
        },
        {
          name: "grass",
          index: 3,
          width: 520,
          height: 520,
          xPositions: [320, 800, 1280, 1760, 2240, 2720, 3200, 3680],
        },
        {
          name: "grass",
          index: 4,
          width: 240,
          height: 240,
          xPositions: [
            250, 370, 450, 700, 890, 1050, 1280, 1520, 1600, 1810, 1940, 2000,
          ],
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
      scale: 0.6,
      anchorY: 0.3,
      baseYOffsetPx: 50,
      opacity: 1,
      assets: [
        {
          name: "mid_grass",
          index: 0,
          width: 2000,
          height: 2000,
        },
        // {
        //   name: "mid_grass",
        //   index: 1,
        //   width: 1600,
        //   height: 1600,
        // },
      ],
    },
    {
      id: "mid_ground",
      groupFolder: "garden/meadow_background/scenery",
      role: "MIDDLEGROUND",
      repeatX: false,
      scale: 0.6,
      anchorY: 0.1,
      baseYOffsetPx: 0,
      opacity: 1,
      assets: [
        {
          name: "stream",
          index: 0,
          width: 600,
          height: 1000,
          xPositions: [500],
          yOffset: 290,
        },
        {
          name: "stone_path",
          index: 0,
          width: 600,
          height: 1000,
          xPositions: [2400],
          yOffset: 300,
        },
        {
          name: "moss",
          index: 0,
          width: 120,
          height: 80,
          xPositions: [500],
          yOffset: 225,
        },
        {
          name: "moss",
          index: 0,
          width: 150,
          height: 100,
          xPositions: [550],
          yOffset: 220,
        },
        {
          name: "willow",
          index: 0,
          width: 400,
          height: 400,
          xPositions: [2590],
          yOffset: 120,
        },
        {
          name: "willow",
          index: 1,
          width: 200,
          height: 200,
          xPositions: [2420],
          yOffset: 175,
        },
        {
          name: "bench",
          index: 0,
          width: 80,
          height: 60,
          xPositions: [2450],
          yOffset: 260,
        },
        {
          name: "church",
          index: 0,
          width: 400,
          height: 500,
          xPositions: [650],
          yOffset: 10,
        },

        // {
        //   name: "rock",
        //   index: 0,
        //   width: 200,
        //   height: 100,
        //   xPositions: [360],
        //   yOffset: 250,
        // },
        {
          name: "willow",
          index: 0,
          width: 400,
          height: 400,
          xPositions: [300],
          yOffset: 120,
        },
        {
          name: "willow",
          index: 1,
          width: 400,
          height: 400,
          xPositions: [780],
          yOffset: 85,
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
      repeatX: false,
      scale: 0.5,
      anchorY: 0.6,
      baseYOffsetPx: 0,
      opacity: 1,
      assets: [
        {
          name: "hills_near",
          index: 0,
          width: 3048,
          height: 1950,
          xPositions: [800, 3000],
        },
      ],
    },
    {
      id: "hills_near_2",
      groupFolder: "garden/meadow_background/scenery",
      role: "BACKGROUND_NEAR",
      repeatX: false,
      scale: 0.5,
      anchorY: 0.1,
      baseYOffsetPx: 0,
      opacity: 1,
      assets: [
        {
          name: "church",
          index: 1,
          width: 1200,
          height: 820,
          xPositions: [2850],
          yOffset: 140,
        },
      ],
    },
    {
      id: "hills_near",
      groupFolder: "garden/meadow_background/hills_near",
      role: "BACKGROUND_NEAR",
      repeatX: false,
      scale: 0.5,
      anchorY: 0.6,
      baseYOffsetPx: 0,
      opacity: 1,
      assets: [
        {
          name: "hills_near",
          index: 0,
          width: 2048,
          height: 1800,
          xPositions: [0, 1800],
        },
      ],
    },
    {
      id: "hills_far",
      groupFolder: "garden/meadow_background/hills_far",
      role: "BACKGROUND_FAR",
      repeatX: false,
      scale: 0.5,
      anchorY: 0.35,
      baseYOffsetPx: 0,
      opacity: 0.25,
      assets: [
        {
          name: "clouds",
          index: 0,
          width: 1600,
          height: 1600,
          xPositions: [300, 1200, 2000, 2700, 3900],
        },
        {
          name: "clouds",
          index: 1,
          width: 1200,
          height: 800,
          xPositions: [600, 1800, 2500, 3300, 3600],
          yOffset: 250,
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
