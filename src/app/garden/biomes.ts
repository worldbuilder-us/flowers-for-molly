// ./src/app/garden/biomes.ts
import type { LayerConfig, SpriteSpec } from "../components/InfiniteParallaxGarden";
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
    scaleMultiplier?: number;       // multiplies group.scale
    yOffset?: number;               // added to group.yOffset
    anchorY?: number;               // overrides group.anchorY
    opacityMultiplier?: number;     // multiplies group.opacity

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
    /** Logical id; also used in layer ids. */
    id: string;

    /**
     * Folder name under /public/garden.
     * Example: "background", "flowers-near", "grass-mid"
     * Path becomes "/garden/{groupFolder}/{name}_{index}.png"
     */
    groupFolder: string;

    /** Layer-like defaults applied to all assets in this group. */
    parallax: number;
    zIndex: number;
    baseY: number;
    opacity?: number;
    anchorY?: number;
    yOffset?: number;
    scale?: number;

    /** If true, treat each asset as a repeat-x strip instead of positioned sprites. */
    repeatX?: boolean;

    /** Assets that belong to this group. */
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
        const {
            id: groupId,
            groupFolder,
            parallax: groupParallax,
            zIndex: groupZ,
            baseY,
            opacity: groupOpacity = 1,
            anchorY: groupAnchorY = 1,
            yOffset: groupYOffset = 0,
            scale: groupScale = 1,
            repeatX = false,
            assets,
        } = group;

        // Group assets by their *effective* layer properties
        const layerBuckets = new Map<
            string,
            {
                id: string;
                parallax: number;
                zIndex: number;
                baseY: number;
                opacity: number;
                sprites: SpriteSpec[];
            }
        >();

        for (const asset of assets) {
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
            const effectiveBaseY = baseY;
            const effectiveOpacity = groupOpacity * opacityMultiplier;

            const key = `${effectiveParallax}|${effectiveZ}|${effectiveBaseY}|${effectiveOpacity}`;
            let bucket = layerBuckets.get(key);
            if (!bucket) {
                bucket = {
                    id: `${groupId}-${layers.length}-${layerBuckets.size}`,
                    parallax: effectiveParallax,
                    zIndex: effectiveZ,
                    baseY: effectiveBaseY,
                    opacity: effectiveOpacity,
                    sprites: [],
                };
                layerBuckets.set(key, bucket);
            }

            const spriteScale = groupScale * scaleMultiplier;
            const sprite: SpriteSpec = {
                src: `/garden/${groupFolder}/${name}_${index}.png`,
                width,
                height,
                anchorY: anchorY ?? groupAnchorY,
                yOffset: groupYOffset + yOffset,
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
                baseY: bucket.baseY,
                opacity: bucket.opacity,
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
        // Background strip
        {
            id: "background",
            groupFolder: "background",
            parallax: 0.99,
            zIndex: -100,
            baseY: ANCHOR,
            opacity: 1,
            anchorY: 1,
            yOffset: 0,
            scale: 2,
            repeatX: true,
            assets: [
                {
                    name: "bg", // /garden/background/bg_0.png
                    index: 0,
                    width: 2048,
                    height: 720,
                },
            ],
        },

        // flora group 1 - farther
        {
            id: "flora_group_1_far",
            groupFolder: "flora_group_1",
            parallax: 0.25,
            zIndex: 28,
            baseY: ANCHOR,
            opacity: 1,
            anchorY: 1,
            scale: 0.4,
            assets: [
                {
                    name: "dandelion",
                    index: 1,
                    width: 520,
                    height: 520,
                    yOffset: -5,
                    xPositions: [20, 1920, 3520],
                },
                {
                    name: "dandelion",
                    index: 2,
                    width: 520,
                    height: 750,
                    yOffset: -2,
                    scaleMultiplier: 0.34 / 0.38, // to match your original per-asset scale
                    xPositions: [60, 2020, 3600],
                },
                {
                    name: "grass",
                    index: 1,
                    width: 520,
                    height: 520,
                    yOffset: 0,
                    scaleMultiplier: 0.36 / 0.38,
                    xPositions: [40, 2000, 3660],
                },
                {
                    name: "grass",
                    index: 2,
                    width: 520,
                    height: 520,
                    yOffset: 32,
                    scaleMultiplier: 0.4 / 0.38,
                    xPositions: [0, 1940, 3460],
                },
                // {
                //     name: "ground",
                //     index: 1,
                //     width: 1040,
                //     height: 520,
                //     yOffset: 20,
                //     scaleMultiplier: 0.42 / 0.38,
                //     xPositions: [240, 2180, 3700],
                // }
            ],
        },
        // flora group 2 - nearer
        {
            id: "flora_group_2_near",
            groupFolder: "flora_group_2",
            parallax: 0.9,
            zIndex: 50,
            baseY: ANCHOR,
            opacity: 0.65,
            anchorY: 1.5,
            scale: 0.5,
            assets: [
                {
                    name: "thistle",
                    index: 1,
                    width: 520,
                    height: 520,
                    yOffset: 0,
                    xPositions: [300, 1300, 2500, 3660],
                },
                {
                    name: "thistle",
                    index: 2,
                    width: 520,
                    height: 750,
                    yOffset: -50,
                    scaleMultiplier: 0.32 / 0.38,
                    xPositions: [350, 1320, 2520, 3650],
                },
                {
                    name: "grass",
                    index: 1,
                    width: 520,
                    height: 520,
                    yOffset: 10,
                    scaleMultiplier: 0.34 / 0.38,
                    xPositions: [300, 1290, 2490, 3600],
                },
                {
                    name: "grass",
                    index: 2,
                    width: 520,
                    height: 520,
                    yOffset: 40,
                    scaleMultiplier: 0.4 / 0.38,
                    xPositions: [280, 1250, 2550, 3700],
                },
            ],
        },
        //duplicate flora group 1 with different parallax/zIndex and placement
        {
            id: "flora_group_1_near",
            groupFolder: "flora_group_1",
            parallax: 0.95,
            zIndex: 40,
            baseY: ANCHOR,
            opacity: 0.75,
            anchorY: 1,
            scale: 0.6,
            assets: [
                {
                    name: "dandelion",
                    index: 1,
                    width: 520,
                    height: 520,
                    yOffset: -5,
                    xPositions: [400, 1600, 2800, 4000],
                },
                {
                    name: "dandelion",
                    index: 2,
                    width: 520,
                    height: 750,
                    yOffset: -2,
                    scaleMultiplier: 0.34 / 0.38, // to match your original per-asset scale
                    xPositions: [450, 1650, 2850, 3950],
                },
                {
                    name: "grass",
                    index: 1,
                    width: 520,
                    height: 520,
                    yOffset: 0,
                    scaleMultiplier: 0.36 / 0.38,
                    xPositions: [420, 1620, 2820, 3900],
                },
                {
                    name: "grass",
                    index: 2,
                    width: 520,
                    height: 520,
                    yOffset: 32,
                    scaleMultiplier: 0.4 / 0.38,
                    xPositions: [380, 1580, 2780, 3800],
                },
            ],
        },
        // duplicate flora group 2 with different scale, parallax/zIndex and placement
        {
            id: "flora_group_2_nearer",
            groupFolder: "flora_group_2",
            parallax: 0.15,
            zIndex: 2,
            baseY: ANCHOR,
            opacity: 0.7,
            anchorY: 1.5,
            scale: 0.25,
            assets: [
                {
                    name: "thistle",
                    index: 1,
                    width: 520,
                    height: 520,
                    yOffset: 0,
                    xPositions: [500, 1400, 2600, 3800],
                },
                {
                    name: "thistle",
                    index: 2,
                    width: 520,
                    height: 750,
                    yOffset: -50,
                    scaleMultiplier: 0.32 / 0.38,
                    xPositions: [550, 1450, 2550, 3750],
                },
                {
                    name: "grass",
                    index: 1,
                    width: 520,
                    height: 520,
                    yOffset: 10,
                    scaleMultiplier: 0.34 / 0.38,
                    xPositions: [520, 1420, 2620, 3720],
                },
                {
                    name: "grass",
                    index: 2,
                    width: 520,
                    height: 520,
                    yOffset: 40,
                    scaleMultiplier: 0.4 / 0.38,
                    xPositions: [480, 1380, 2580, 3680],
                },
            ],
        },
    ],
};