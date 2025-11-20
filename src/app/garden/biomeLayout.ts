// Path: ./src/app/garden/biomeLayout.ts
import type { LayerConfig } from "../components/InfiniteParallaxGarden";

export type LayerRole =
  | "FOREGROUND_1" // closest to viewer, lowest in frame
  | "FOREGROUND_2"
  | "FOREGROUND_3"
  | "MIDDLEGROUND"
  | "BACKGROUND_NEAR"
  | "BACKGROUND_FAR"
  | "SKYBOX";

export type CurveConfig = {
  type: "sine";
  /** 0..1, relative to scene height. 0.05 = 5% of scene height peak amplitude. */
  amplitudePct: number;
  /**
   * Number of full sine periods across ONE logical segment (segmentWidth).
   * 1 = one wave across the scene; 2 = two smaller waves, etc.
   */
  periodsPerSegment: number;
  /** Optional phase offset in radians. */
  phaseRad?: number;
};

export type BandLayout = {
  /** 0..1 from *bottom* of the scene. 0 = bottom, 1 = top. */
  baseYFromBottomPct: number;
  /** Default parallax if none is specified at group level. */
  defaultParallax: number;
  /** Default zIndex if none is specified at group level. */
  defaultZIndex: number;
  /** Optional default curve for this band. */
  defaultCurve?: CurveConfig;
};

export const BAND_LAYOUT: Record<LayerRole, BandLayout> = {
  FOREGROUND_1: {
    baseYFromBottomPct: 0.9,
    defaultParallax: 0.5,
    defaultZIndex: 100,
    defaultCurve: {
      type: "sine",
      amplitudePct: 0.05,
      periodsPerSegment: 1,
      phaseRad: 0,
    },
  },
  FOREGROUND_2: {
    baseYFromBottomPct: 0.9,
    defaultParallax: 0.125,
    defaultZIndex: 80,
    defaultCurve: {
      type: "sine",
      amplitudePct: 0.015,
      periodsPerSegment: 1,
      phaseRad: Math.PI / 4,
    },
  },
  FOREGROUND_3: {
    baseYFromBottomPct: 0.9,
    defaultParallax: 0.1,
    defaultZIndex: 60,
    defaultCurve: {
      type: "sine",
      amplitudePct: 0.004,
      periodsPerSegment: 0.5,
      phaseRad: Math.PI / 2,
    },
  },
  MIDDLEGROUND: {
    baseYFromBottomPct: 0.9,
    defaultParallax: 0.08,
    defaultZIndex: 0,
  },
  BACKGROUND_NEAR: {
    baseYFromBottomPct: 0.9,
    defaultParallax: 0.075,
    defaultZIndex: -10,
  },
  BACKGROUND_FAR: {
    baseYFromBottomPct: 0.9,
    defaultParallax: 0.055,
    defaultZIndex: -100,
  },
  SKYBOX: {
    // Sky just fills; the base line is not very meaningful here.
    baseYFromBottomPct: 1.0,
    defaultParallax: 0.05,
    defaultZIndex: -1000,
  },
};
