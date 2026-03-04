// src/app/components/InfiniteParallaxGarden.tsx
"use client";

import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import Image from "next/image";

const BASE_SCENE_HEIGHT = 1024; // logical reference height
const SCROLL_SPEED = 0.15;
const KEY_SCROLL_PX_PER_S = 900;
const COMPOSITOR_HINT_IDLE_MS = 180;
const COMPOSITOR_HINT_SEGMENT_PAD_PX = 256;
const SPRITE_CULL_PAD_PX = 320;
const LOAD_HIGH_PRIORITY_PAD_PX = 96;
const LOAD_EAGER_PAD_PX = 224;
const PREFETCH_LOOKAHEAD_PX = 1440;
const PREFETCH_CANDIDATE_LIMIT = 24;
const PREFETCH_ENQUEUE_PER_VIEWPORT_UPDATE = 6;
const PREFETCH_PUMP_INTERVAL_MS = 48;
const PREFETCH_MAX_IN_FLIGHT = 1;

// -----------------------------
// Types
// -----------------------------
export type SpriteSpec = {
  src: string;
  /** Logical source resolution in px (unscaled). */
  width: number;
  height: number;
  anchorY?: number;
  /** Logical pixel offset AFTER the band baseline + curve. */
  yOffsetPx?: number;
  /** Logical scale factor applied on top of width/height. */
  scale?: number;
  repeatX?: boolean;
  /** Optional repeat strip start in logical units. */
  repeatStartPx?: number;
  /** Optional repeat strip width in logical units. */
  repeatWidthPx?: number;
  /** Logical X positions within a single segment. */
  xPositions?: number[];
  /** Optional CSS blur in px. */
  blurPx?: number;
  /** Debug metadata for wireframes. */
  debug?: {
    name: string;
    index: number;
    groupId: string;
    role: string;
    xPositionsLocal?: number[];
  };
};

export type LayerCurveConfig = {
  type: "sine";
  /** 0..1, relative to scene height. */
  amplitudePct: number;
  /** Number of full waves per logical segment. */
  periodsPerSegment: number;
  phaseRad?: number;
};

export type LayerConfig = {
  id: string;
  parallax: number;
  zIndex?: number;
  role?: string;
  groupId?: string;
  /** Logical biome start offset in world space. */
  biomeStart?: number;
  /** Logical biome width. */
  biomeWidth?: number;
  /**
   * Preferred: baseline as 0..1 from bottom of scene.
   *   0 = bottom edge, 1 = top edge
   */
  baseYFromBottomPct?: number;
  /**
   * Back-compat: if given, used directly as px from top (logical units).
   * If both are set, baseYFromBottomPct wins.
   */
  baseYPx?: number;
  opacity?: number;
  curve?: LayerCurveConfig;
  sprites: SpriteSpec[];
};

export type GardenViewport = {
  /** Logical world offset in the [0, segmentWidth) space. */
  offsetX: number;
  /** Logical viewport width in units matching segmentWidth. */
  logicalW: number;
  /** Actual rendered viewport dimensions in CSS px. */
  viewportW: number;
  viewportH: number;
};

/**
 * PointerDebugInfo
 * ------------------------------------------------------------
 * Emitted on pointer move when debug is active.
 * Gives multiple coordinate systems for the point under the cursor
 * within the infinite scene.
 */
export type PointerDebugInfo = {
  /** Browser screen-space coordinates (CSS px). */
  clientX: number;
  clientY: number;
  /** Position inside the scroll container (CSS px). */
  containerX: number;
  containerY: number;
  /** Logical / scene metrics. */
  sceneScale: number;
  segmentWidth: number;
  segmentWidthPx: number;
  /** Horizontal scroll offset in CSS px. */
  scrollLeft: number;
  /** Local X within the middle segment in CSS px. */
  localXPx: number;
  /** Logical X position at the pointer, wrapped to [0, segmentWidth). */
  worldLogicalX: number;
  /** Integer repeat index of the segment the pointer is in. */
  segmentRepeat: number;
  /** Same as worldLogicalX but named explicitly for "segment" debugging. */
  segmentLocalX: number;
  /** Last reported viewport offsetX (logical), for context. */
  viewportLogicalOffsetX: number;
};

export type GardenProps = {
  /**
   * Logical width of a single repeating segment in units matching your
   * biome xPositions.
   */
  segmentWidth?: number;
  /**
   * Optional fixed *rendered* height of the scene in CSS px.
   * If omitted, the component will fill its parent (via 100% height)
   * and measure that height for scaling.
   */
  segmentHeight?: number;
  /** Declarative asset/layer template. */
  layers: LayerConfig[];
  /** Optional: start offset in logical units inside the middle segment. */
  initialOffsetX?: number; // default 0
  /** Optional: map vertical wheel to horizontal scroll (desktop-only UX). */
  wheelToHorizontal?: boolean; // default true
  /** Optional className for outer wrapper. */
  className?: string;
  /** Optional callback when viewport changes. */
  onViewportChange?: (v: GardenViewport) => void;
  /** When true, show wireframes for foreground layers on hover. */
  debugWireframesForeground?: boolean;
  /** When true, show wireframes for background/middle/sky layers on hover. */
  debugWireframesBackground?: boolean;
  /** When true, clicking an asset pins its wireframe until cleared. */
  debugWireframesPinMode?: boolean;
  /**
   * Optional: emit detailed pointer metrics for debug overlays.
   * When undefined, pointer debug is disabled.
   * When called with `null`, it means pointer left the garden.
   */
  onPointerDebugChange?: (info: PointerDebugInfo | null) => void;
  /** Optional callback fired once after the first real user scroll. */
  onFirstUserScroll?: () => void;
};

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const wrapMod = (v: number, mod: number) => {
  if (!mod) return 0;
  const x = v % mod;
  return x < 0 ? x + mod : x;
};

type Perf01CullSummary = {
  total: number;
  rendered: number;
  culledLeft: number;
  culledRight: number;
  leftBandRendered: number;
};

type Perf01WrapEvent = {
  ts: number;
  wrapDirection: "left" | "right";
  preScrollLeftPx: number;
  postScrollLeftPx: number;
  preUnwrappedScrollLeftPx: number;
  postUnwrappedScrollLeftPx: number;
  leftBoundaryPx: number;
  rightBoundaryPx: number;
  segmentWidthPx: number;
  preLogicalOffset: number;
  postLogicalOffset: number;
  preContinuousLogicalX: number;
  postContinuousLogicalX: number;
  domToRenderedStateGapPx: number;
  culling: {
    pre: Perf01CullSummary;
    post: Perf01CullSummary;
    overlapVisibleCount: number;
    droppedVisibleCount: number;
    newVisibleCount: number;
  };
};

type Perf01CommitEvent = {
  ts: number;
  committedScrollLeftPx: number;
  committedUnwrappedScrollLeftPx: number;
  mode: "sync" | "raf";
  pendingWrapId: number | null;
};

type Perf01ScrollSample = {
  ts: number;
  rawScrollLeftPx: number;
  finalScrollLeftPx: number;
  unwrappedScrollLeftPx: number;
  logicalOffset: number;
  wrapDirection: "none" | "left" | "right";
};

type Perf03ResizeEvent = {
  ts: number;
  prevSceneScale: number;
  nextSceneScale: number;
  prevWrappedLogicalOffset: number;
  nextWrappedLogicalOffset: number;
  prevContinuousLogicalX: number;
  nextContinuousLogicalX: number;
};

type Perf01TraceStore = {
  version: "PERF-01";
  enabledAtISO: string;
  notes: string[];
  scrollSamples: Perf01ScrollSample[];
  wrapEvents: Perf01WrapEvent[];
  commitEvents: Perf01CommitEvent[];
  resizeEvents: Perf03ResizeEvent[];
};

type Perf01Placement = {
  id: string;
  parallax: number;
  worldXLogical: number;
  widthLogical: number;
};

const PERF01_SCROLL_SAMPLE_MAX = 400;
const PERF01_WRAP_EVENT_MAX = 120;
const PERF01_COMMIT_EVENT_MAX = 120;
const PERF03_RESIZE_EVENT_MAX = 120;

const pushLimited = <T,>(arr: T[], item: T, max: number) => {
  arr.push(item);
  if (arr.length > max) {
    arr.splice(0, arr.length - max);
  }
};

const logicalOffsetFromScroll = (
  scrollPx: number,
  middleStartPx: number,
  segmentWidthPx: number,
  sceneScale: number
) => {
  if (!segmentWidthPx || !sceneScale) return 0;
  return wrapMod(scrollPx - middleStartPx, segmentWidthPx) / sceneScale;
};

const unwrapDelta = (deltaWrappedPx: number, segmentWidthPx: number) => {
  if (!segmentWidthPx) return deltaWrappedPx;
  if (deltaWrappedPx > segmentWidthPx * 0.5) {
    return deltaWrappedPx - segmentWidthPx;
  }
  if (deltaWrappedPx < -segmentWidthPx * 0.5) {
    return deltaWrappedPx + segmentWidthPx;
  }
  return deltaWrappedPx;
};

const distanceToViewportPx = (
  left: number,
  right: number,
  visibleLeft: number,
  visibleRight: number
) => {
  if (right < visibleLeft) return visibleLeft - right;
  if (left > visibleRight) return left - visibleRight;
  return 0;
};

declare global {
  interface Window {
    __FFM_PERF01_TRACE__?: Perf01TraceStore;
  }
}

type GardenGeometrySnapshot = {
  sceneScale: number;
  middleStartPx: number;
  segmentWidthPx: number;
  segmentWidth: number;
};

type ScrollFrameState = {
  wrapped: number;
  unwrapped: number;
};

type PrefetchCandidate = {
  src: string;
  distancePx: number;
};

const FOREGROUND_ROLES = new Set([
  "FOREGROUND_1",
  "FOREGROUND_2",
  "FOREGROUND_3",
]);
const BACKGROUND_ROLES = new Set([
  "MIDDLEGROUND",
  "BACKGROUND_NEAR",
  "BACKGROUND_FAR",
  "SKYBOX",
]);

function InfiniteParallaxGarden({
  segmentWidth = 4096, // logical
  segmentHeight,
  layers,
  initialOffsetX = 0,
  wheelToHorizontal = true,
  className,
  onViewportChange,
  debugWireframesForeground = false,
  debugWireframesBackground = false,
  debugWireframesPinMode = false,
  onPointerDebugChange,
  onFirstUserScroll,
}: GardenProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const scrollLeftRef = useRef(0);
  const unwrappedScrollLeftRef = useRef<number | null>(null);
  const renderedScrollLeftRef = useRef(0);
  const lastObservedScrollLeftRef = useRef<number | null>(null);
  const hasInitializedScrollRef = useRef(false);
  const hasReportedFirstScrollRef = useRef(false);
  const hasAppliedInitialSpawnRef = useRef(false);
  const lastGeometryRef = useRef<GardenGeometrySnapshot | null>(null);
  const perf01TraceEnabledRef = useRef(false);
  const perf01TraceRef = useRef<Perf01TraceStore | null>(null);
  const perf01PendingWrapIdRef = useRef<number | null>(null);
  const perf01NextWrapIdRef = useRef(1);
  const rafRef = useRef<number | null>(null);
  const keyRafRef = useRef<number | null>(null);
  const keyDirRef = useRef<-1 | 0 | 1>(0);
  const compositorHintTimerRef = useRef<number | null>(null);
  const compositorHintsActiveRef = useRef(false);
  const prefetchQueueRef = useRef<string[]>([]);
  const prefetchQueuedSetRef = useRef<Set<string>>(new Set());
  const prefetchedSrcSetRef = useRef<Set<string>>(new Set());
  const prefetchInFlightRef = useRef(0);
  const prefetchPumpIntervalRef = useRef<number | null>(null);
  const [compositorHintsActive, setCompositorHintsActive] = useState(false);
  const [hoveredWireframeId, setHoveredWireframeId] = useState<string | null>(
    null
  );
  const [pinnedWireframeId, setPinnedWireframeId] = useState<string | null>(
    null
  );

  const allowDebugForRole = useCallback(
    (role: string) =>
      (debugWireframesForeground && FOREGROUND_ROLES.has(role)) ||
      (debugWireframesBackground && BACKGROUND_ROLES.has(role)),
    [debugWireframesForeground, debugWireframesBackground]
  );

  useEffect(() => {
    if (!debugWireframesForeground && !debugWireframesBackground) {
      setHoveredWireframeId(null);
      setPinnedWireframeId(null);
    }
  }, [debugWireframesForeground, debugWireframesBackground]);

  const activateCompositorHints = useCallback(() => {
    if (!compositorHintsActiveRef.current) {
      compositorHintsActiveRef.current = true;
      setCompositorHintsActive(true);
    }
    if (compositorHintTimerRef.current != null) {
      window.clearTimeout(compositorHintTimerRef.current);
    }
    compositorHintTimerRef.current = window.setTimeout(() => {
      compositorHintTimerRef.current = null;
      compositorHintsActiveRef.current = false;
      setCompositorHintsActive(false);
    }, COMPOSITOR_HINT_IDLE_MS);
  }, []);

  const activeWireframeId = pinnedWireframeId ?? hoveredWireframeId;

  /**
   * If segmentHeight is not provided, we fill the parent (height: 100%)
   * and use a ResizeObserver to measure the actual pixel height for scaling.
   */
  const [measuredW, setMeasuredW] = useState<number | null>(null);
  const [measuredH, setMeasuredH] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.round(entry.contentRect.width);
        const h = Math.round(entry.contentRect.height);
        if (w > 0) setMeasuredW(w);
        if (h > 0) setMeasuredH(h);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [segmentHeight]);

  // Actual rendered height in CSS px.
  const effectiveHeight = segmentHeight ?? measuredH ?? 720;

  // Scene-wide scale factor: logical → physical pixels.
  const sceneScale = effectiveHeight / BASE_SCENE_HEIGHT;

  // Rendered segment width in CSS px.
  const segmentWidthPx = segmentWidth * sceneScale;
  const viewportWidthPx = measuredW ?? scrollRef.current?.clientWidth ?? 0;

  // Middle segment start in scroll coordinates.
  const middleStartPx = segmentWidthPx; // [A][B][C]

  const [scrollFrame, setScrollFrame] = useState<ScrollFrameState>({
    wrapped: 0,
    unwrapped: 0,
  });
  const scrollLeft = scrollFrame.wrapped;
  const unwrappedScrollLeft = scrollFrame.unwrapped;

  const nonRepeatPlacements = useMemo<Perf01Placement[]>(() => {
    const placements: Perf01Placement[] = [];
    layers.forEach((layer) => {
      const layerParallax = clamp(layer.parallax, 0, 1);
      layer.sprites.forEach((sprite, spriteIdx) => {
        if (sprite.repeatX) return;
        const widthLogical = sprite.width * (sprite.scale ?? 1);
        const xs = sprite.xPositions ?? [];
        xs.forEach((xLogical, xIdx) => {
          for (let segmentIndex = 0; segmentIndex < 3; segmentIndex++) {
            placements.push({
              id: `${layer.id}:${spriteIdx}:${xIdx}:seg${segmentIndex}`,
              parallax: layerParallax,
              worldXLogical: xLogical + segmentIndex * segmentWidth,
              widthLogical,
            });
          }
        });
      });
    });
    return placements;
  }, [layers, segmentWidth]);

  const summarizeCull = useCallback(
    (
      visibleScrollPx: number,
      viewportW: number,
      parallaxBasePx: number
    ): Perf01CullSummary & { visibleIds: Set<string> } => {
      const visibleIds = new Set<string>();
      const visibleLeftPx = visibleScrollPx;
      const visibleRightPx = visibleScrollPx + viewportW;
      const leftBandPx = visibleLeftPx + viewportW * 0.33;
      let total = 0;
      let rendered = 0;
      let culledLeft = 0;
      let culledRight = 0;
      let leftBandRendered = 0;

      nonRepeatPlacements.forEach((placement) => {
        total += 1;
        const wPx = placement.widthLogical * sceneScale;
        const worldXpx = placement.worldXLogical * sceneScale;
        const parallaxShift = -parallaxBasePx * (1 - placement.parallax);
        const renderedXpx = worldXpx + parallaxShift;
        const isCulledLeft =
          renderedXpx + wPx < visibleLeftPx - SPRITE_CULL_PAD_PX;
        const isCulledRight =
          renderedXpx - wPx > visibleRightPx + SPRITE_CULL_PAD_PX;
        if (isCulledLeft || isCulledRight) {
          if (isCulledLeft) culledLeft += 1;
          if (isCulledRight) culledRight += 1;
          return;
        }
        rendered += 1;
        visibleIds.add(placement.id);
        const touchesLeftBand =
          renderedXpx + wPx >= visibleLeftPx &&
          renderedXpx - wPx <= leftBandPx;
        if (touchesLeftBand) {
          leftBandRendered += 1;
        }
      });

      return { total, rendered, culledLeft, culledRight, leftBandRendered, visibleIds };
    },
    [nonRepeatPlacements, sceneScale]
  );

  useEffect(() => {
    renderedScrollLeftRef.current = scrollLeft;
  }, [scrollLeft]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const fromQuery =
      new URLSearchParams(window.location.search).get("perfTrace") === "1";
    const fromStorage = window.localStorage.getItem("perfTrace") === "1";
    if (!fromQuery && !fromStorage) return;

    const store: Perf01TraceStore = {
      version: "PERF-01",
      enabledAtISO: new Date().toISOString(),
      notes: [
        "Enable by adding ?perfTrace=1 or localStorage.perfTrace=1.",
        "Read trace at window.__FFM_PERF01_TRACE__ in DevTools.",
      ],
      scrollSamples: [],
      wrapEvents: [],
      commitEvents: [],
      resizeEvents: [],
    };

    window.__FFM_PERF01_TRACE__ = store;
    perf01TraceEnabledRef.current = true;
    perf01TraceRef.current = store;
    console.info(
      "[PERF-01] wrap/cull diagnostics enabled. Inspect window.__FFM_PERF01_TRACE__."
    );

    return () => {
      perf01TraceEnabledRef.current = false;
      perf01TraceRef.current = null;
    };
  }, []);

  /**
   * Keep track of the last logical viewport offset so pointer debug can
   * reference it without re-deriving.
   */
  const lastLogicalOffsetRef = useRef(0);

  /**
   * Initial positioning + resize reconciliation
   * ------------------------------------------------------------
   * - First mount: spawn at initialOffsetX (current intended behavior).
   * - Later geometry changes (mobile UI bar, orientation, resize):
   *   preserve current logical position instead of snapping back to spawn.
   */
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const geometry: GardenGeometrySnapshot = {
      sceneScale,
      middleStartPx,
      segmentWidthPx,
      segmentWidth,
    };

    if (!hasAppliedInitialSpawnRef.current) {
      const logicalInitial = wrapMod(initialOffsetX, segmentWidth);
      const target = middleStartPx + logicalInitial * sceneScale;

      el.scrollLeft = target;
      scrollLeftRef.current = target;
      unwrappedScrollLeftRef.current = target;
      renderedScrollLeftRef.current = target;
      setScrollFrame({ wrapped: target, unwrapped: target });
      lastObservedScrollLeftRef.current = target;
      hasInitializedScrollRef.current = true;
      hasAppliedInitialSpawnRef.current = true;
      lastGeometryRef.current = geometry;
      return;
    }

    const prevGeometry = lastGeometryRef.current;
    lastGeometryRef.current = geometry;
    if (!prevGeometry) return;

    const geometryChanged =
      prevGeometry.sceneScale !== sceneScale ||
      prevGeometry.middleStartPx !== middleStartPx ||
      prevGeometry.segmentWidthPx !== segmentWidthPx ||
      prevGeometry.segmentWidth !== segmentWidth;
    if (!geometryChanged) return;

    const prevWrappedScrollLeft = scrollLeftRef.current || el.scrollLeft;
    const prevUnwrappedScrollLeft =
      unwrappedScrollLeftRef.current ?? prevWrappedScrollLeft;
    const prevWrappedLogicalOffset = logicalOffsetFromScroll(
      prevWrappedScrollLeft,
      prevGeometry.middleStartPx,
      prevGeometry.segmentWidthPx,
      prevGeometry.sceneScale
    );
    const prevContinuousLogicalX =
      (prevUnwrappedScrollLeft - prevGeometry.middleStartPx) /
      prevGeometry.sceneScale;

    const nextWrappedLogicalOffset = wrapMod(prevWrappedLogicalOffset, segmentWidth);
    const nextWrappedScrollLeft =
      middleStartPx + nextWrappedLogicalOffset * sceneScale;
    const nextUnwrappedScrollLeft =
      middleStartPx + prevContinuousLogicalX * sceneScale;

    el.scrollLeft = nextWrappedScrollLeft;
    scrollLeftRef.current = nextWrappedScrollLeft;
    unwrappedScrollLeftRef.current = nextUnwrappedScrollLeft;
    renderedScrollLeftRef.current = nextWrappedScrollLeft;
    lastObservedScrollLeftRef.current = nextWrappedScrollLeft;
    setScrollFrame({
      wrapped: nextWrappedScrollLeft,
      unwrapped: nextUnwrappedScrollLeft,
    });

    if (perf01TraceEnabledRef.current && perf01TraceRef.current) {
      pushLimited(
        perf01TraceRef.current.resizeEvents,
        {
          ts: performance.now(),
          prevSceneScale: prevGeometry.sceneScale,
          nextSceneScale: sceneScale,
          prevWrappedLogicalOffset,
          nextWrappedLogicalOffset,
          prevContinuousLogicalX,
          nextContinuousLogicalX:
            (nextUnwrappedScrollLeft - middleStartPx) / sceneScale,
        },
        PERF03_RESIZE_EVENT_MAX
      );
    }
  }, [initialOffsetX, middleStartPx, sceneScale, segmentWidth, segmentWidthPx]);

  /**
   * Wrap-around scroll behavior to maintain the infinite illusion.
   * Uses rendered segmentWidth in CSS px so it stays correct on all screens.
   */
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    activateCompositorHints();
    const rawScrollLeft = el.scrollLeft;
    const previousWrappedScrollLeft =
      typeof lastObservedScrollLeftRef.current === "number"
        ? lastObservedScrollLeftRef.current
        : rawScrollLeft;
    if (unwrappedScrollLeftRef.current == null) {
      unwrappedScrollLeftRef.current = previousWrappedScrollLeft;
    }

    let x = rawScrollLeft;
    let wrapDirection: "none" | "left" | "right" = "none";

    // Same wrap logic as 10d3fff: keep the viewport anchored around the
    // middle segment, but allow it to straddle the boundary without seams.
    const leftBoundary = middleStartPx * 0.5;
    const rightBoundary = middleStartPx * 1.5;

    if (x < leftBoundary) {
      x += segmentWidthPx;
      el.scrollLeft = x;
      wrapDirection = "left";
    } else if (x > rightBoundary) {
      x -= segmentWidthPx;
      el.scrollLeft = x;
      wrapDirection = "right";
    }

    const wrappedScrollLeft = el.scrollLeft;
    const wrappedDeltaPx = wrappedScrollLeft - previousWrappedScrollLeft;
    const unwrappedDeltaPx = unwrapDelta(wrappedDeltaPx, segmentWidthPx);
    const previousUnwrappedScrollLeft =
      unwrappedScrollLeftRef.current ?? previousWrappedScrollLeft;
    const nextUnwrappedScrollLeft =
      previousUnwrappedScrollLeft + unwrappedDeltaPx;

    scrollLeftRef.current = wrappedScrollLeft;
    unwrappedScrollLeftRef.current = nextUnwrappedScrollLeft;
    const previousScroll = lastObservedScrollLeftRef.current;
    lastObservedScrollLeftRef.current = wrappedScrollLeft;

    if (perf01TraceEnabledRef.current && perf01TraceRef.current) {
      const trace = perf01TraceRef.current;
      pushLimited(
        trace.scrollSamples,
        {
          ts: performance.now(),
          rawScrollLeftPx: rawScrollLeft,
          finalScrollLeftPx: wrappedScrollLeft,
          unwrappedScrollLeftPx: nextUnwrappedScrollLeft,
          logicalOffset: logicalOffsetFromScroll(
            wrappedScrollLeft,
            middleStartPx,
            segmentWidthPx,
            sceneScale
          ),
          wrapDirection,
        },
        PERF01_SCROLL_SAMPLE_MAX
      );

      if (wrapDirection !== "none") {
        const viewportW = el.clientWidth;
        // Use the same continuous parallax base for both pre/post visibility
        // snapshots so this isolates the effect of the DOM wrap jump itself.
        const wrapParallaxBasePx = nextUnwrappedScrollLeft - middleStartPx;
        const preCull = summarizeCull(rawScrollLeft, viewportW, wrapParallaxBasePx);
        const postCull = summarizeCull(
          wrappedScrollLeft,
          viewportW,
          wrapParallaxBasePx
        );
        let overlapVisibleCount = 0;
        preCull.visibleIds.forEach((id) => {
          if (postCull.visibleIds.has(id)) overlapVisibleCount += 1;
        });

        const wrapId = perf01NextWrapIdRef.current++;
        perf01PendingWrapIdRef.current = wrapId;
        const preLogicalOffset = logicalOffsetFromScroll(
          rawScrollLeft,
          middleStartPx,
          segmentWidthPx,
          sceneScale
        );
        const postLogicalOffset = logicalOffsetFromScroll(
          el.scrollLeft,
          middleStartPx,
          segmentWidthPx,
          sceneScale
        );
        pushLimited(
          trace.wrapEvents,
          {
            ts: performance.now(),
            wrapDirection,
            preScrollLeftPx: rawScrollLeft,
            postScrollLeftPx: wrappedScrollLeft,
            preUnwrappedScrollLeftPx: previousUnwrappedScrollLeft,
            postUnwrappedScrollLeftPx: nextUnwrappedScrollLeft,
            leftBoundaryPx: leftBoundary,
            rightBoundaryPx: rightBoundary,
            segmentWidthPx,
            preLogicalOffset,
            postLogicalOffset,
            preContinuousLogicalX:
              (previousUnwrappedScrollLeft - middleStartPx) / sceneScale,
            postContinuousLogicalX:
              (nextUnwrappedScrollLeft - middleStartPx) / sceneScale,
            domToRenderedStateGapPx:
              wrappedScrollLeft - renderedScrollLeftRef.current,
            culling: {
              pre: {
                total: preCull.total,
                rendered: preCull.rendered,
                culledLeft: preCull.culledLeft,
                culledRight: preCull.culledRight,
                leftBandRendered: preCull.leftBandRendered,
              },
              post: {
                total: postCull.total,
                rendered: postCull.rendered,
                culledLeft: postCull.culledLeft,
                culledRight: postCull.culledRight,
                leftBandRendered: postCull.leftBandRendered,
              },
              overlapVisibleCount,
              droppedVisibleCount: Math.max(
                0,
                preCull.rendered - overlapVisibleCount
              ),
              newVisibleCount: Math.max(
                0,
                postCull.rendered - overlapVisibleCount
              ),
            },
          },
          PERF01_WRAP_EVENT_MAX
        );
      }
    }

    if (
      onFirstUserScroll &&
      hasInitializedScrollRef.current &&
      !hasReportedFirstScrollRef.current &&
      typeof previousScroll === "number" &&
      Math.abs(wrappedScrollLeft - previousScroll) > 0.5
    ) {
      hasReportedFirstScrollRef.current = true;
      onFirstUserScroll();
    }

    const recordCommitEvent = (mode: "sync" | "raf") => {
      if (!perf01TraceEnabledRef.current || !perf01TraceRef.current) return;
      pushLimited(
        perf01TraceRef.current.commitEvents,
        {
          ts: performance.now(),
          committedScrollLeftPx: scrollLeftRef.current,
          committedUnwrappedScrollLeftPx:
            unwrappedScrollLeftRef.current ?? scrollLeftRef.current,
          mode,
          pendingWrapId: perf01PendingWrapIdRef.current,
        },
        PERF01_COMMIT_EVENT_MAX
      );
    };

    if (wrapDirection !== "none") {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      // Wrap jumps are large in pixel space; commit render state immediately
      // so the next paint does not mix wrapped DOM position with stale state.
      recordCommitEvent("sync");
      perf01PendingWrapIdRef.current = null;
      setScrollFrame({
        wrapped: scrollLeftRef.current,
        unwrapped: unwrappedScrollLeftRef.current ?? scrollLeftRef.current,
      });
      return;
    }

    if (rafRef.current == null) {
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        recordCommitEvent("raf");
        perf01PendingWrapIdRef.current = null;
        setScrollFrame({
          wrapped: scrollLeftRef.current,
          unwrapped: unwrappedScrollLeftRef.current ?? scrollLeftRef.current,
        });
      });
    }
  }, [
    activateCompositorHints,
    middleStartPx,
    onFirstUserScroll,
    sceneScale,
    segmentWidthPx,
    summarizeCull,
  ]);

  /**
   * Map vertical wheel to horizontal scroll on desktop,
   * but don't interfere when a modal has locked body scroll.
   */
  useEffect(() => {
    if (!wheelToHorizontal) return;
    const el = scrollRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (e.shiftKey) return;

      // If StoryModal has set body overflow to hidden, let it consume scroll.
      if (document.body.style.overflow === "hidden") {
        return;
      }

      if (!scrollRef.current) return;

      const rawDelta = e.deltaY + e.deltaX * 0.5;
      const delta = rawDelta * SCROLL_SPEED;

      if (delta === 0) return;

      e.preventDefault();

      scrollRef.current.scrollLeft += delta;
      handleScroll();
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [wheelToHorizontal, handleScroll]);

  useEffect(() => {
    const isTypingTarget = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName.toLowerCase();
      return tag === "input" || tag === "textarea" || el.isContentEditable;
    };

    const step = (ts: number, lastTs: number) => {
      const dir = keyDirRef.current;
      if (!dir || !scrollRef.current) return lastTs;
      const dt = Math.min(32, Math.max(0, ts - lastTs));
      const delta = (KEY_SCROLL_PX_PER_S * dt * dir) / 1000;
      scrollRef.current.scrollLeft += delta;
      handleScroll();
      return ts;
    };

    const startLoop = () => {
      if (keyRafRef.current != null) return;
      let last = performance.now();
      const tick = (t: number) => {
        last = step(t, last);
        if (keyDirRef.current) {
          keyRafRef.current = window.requestAnimationFrame(tick);
        } else {
          keyRafRef.current = null;
        }
      };
      keyRafRef.current = window.requestAnimationFrame(tick);
    };

    const stopLoop = () => {
      if (keyRafRef.current != null) {
        cancelAnimationFrame(keyRafRef.current);
        keyRafRef.current = null;
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (document.body.style.overflow === "hidden") return;
      if (isTypingTarget(e.target)) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        keyDirRef.current = -1;
        startLoop();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        keyDirRef.current = 1;
        startLoop();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        keyDirRef.current = 0;
        stopLoop();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      keyDirRef.current = 0;
      stopLoop();
    };
  }, [handleScroll]);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (compositorHintTimerRef.current != null) {
        window.clearTimeout(compositorHintTimerRef.current);
        compositorHintTimerRef.current = null;
      }
    };
  }, []);

  /**
   * Local X position within the middle segment, in rendered CSS px.
   */
  const localXPx = useMemo(() => {
    if (segmentWidthPx === 0) return 0;
    const x = (scrollLeft - middleStartPx) % segmentWidthPx;
    return x < 0 ? x + segmentWidthPx : x;
  }, [scrollLeft, middleStartPx, segmentWidthPx]);

  /**
   * Continuous world X relative to the middle segment origin (CSS px).
   * This uses the unwrapped scroll accumulator so parallax remains
   * continuous across DOM wrap jumps.
   */
  const worldXPx = useMemo(
    () => unwrappedScrollLeft - middleStartPx,
    [unwrappedScrollLeft, middleStartPx]
  );

  const prefetchCandidates = useMemo<PrefetchCandidate[]>(() => {
    if (segmentWidthPx <= 0 || viewportWidthPx <= 0 || sceneScale <= 0) {
      return [];
    }

    const visibleLeftPx = scrollLeft;
    const visibleRightPx = scrollLeft + viewportWidthPx;
    const prefetchLeftPx = visibleLeftPx - PREFETCH_LOOKAHEAD_PX;
    const prefetchRightPx = visibleRightPx + PREFETCH_LOOKAHEAD_PX;
    const parallaxBasePx = worldXPx;
    const nearestBySrc = new Map<string, number>();

    layers.forEach((layer) => {
      const clampedParallax = clamp(layer.parallax, 0, 1);
      const parallaxShift = -parallaxBasePx * (1 - clampedParallax);
      layer.sprites.forEach((sprite) => {
        if (sprite.repeatX) return;
        const spriteScale = (sprite.scale ?? 1) * sceneScale;
        const widthPx = sprite.width * spriteScale;
        const xs = sprite.xPositions ?? [];
        xs.forEach((xLogical) => {
          const xPx = xLogical * sceneScale;
          for (let segmentIndex = 0; segmentIndex < 3; segmentIndex += 1) {
            const worldXpx = segmentIndex * segmentWidthPx + xPx;
            const renderedCenterPx = worldXpx + parallaxShift;
            const leftPx = renderedCenterPx - widthPx * 0.5;
            const rightPx = renderedCenterPx + widthPx * 0.5;
            if (rightPx < prefetchLeftPx || leftPx > prefetchRightPx) {
              continue;
            }
            const distancePx = distanceToViewportPx(
              leftPx,
              rightPx,
              visibleLeftPx,
              visibleRightPx
            );
            if (distancePx === 0) continue;
            const prevDistance = nearestBySrc.get(sprite.src);
            if (prevDistance == null || distancePx < prevDistance) {
              nearestBySrc.set(sprite.src, distancePx);
            }
          }
        });
      });
    });

    return [...nearestBySrc.entries()]
      .sort((a, b) => a[1] - b[1])
      .slice(0, PREFETCH_CANDIDATE_LIMIT)
      .map(([src, distancePx]) => ({ src, distancePx }));
  }, [layers, sceneScale, scrollLeft, segmentWidthPx, viewportWidthPx, worldXPx]);

  useEffect(() => {
    let enqueued = 0;
    for (const candidate of prefetchCandidates) {
      const { src } = candidate;
      if (prefetchedSrcSetRef.current.has(src)) continue;
      if (prefetchQueuedSetRef.current.has(src)) continue;
      prefetchQueuedSetRef.current.add(src);
      prefetchQueueRef.current.push(src);
      enqueued += 1;
      if (enqueued >= PREFETCH_ENQUEUE_PER_VIEWPORT_UPDATE) {
        break;
      }
    }
  }, [prefetchCandidates]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const startPrefetchDecode = (src: string) => {
      prefetchInFlightRef.current += 1;
      const img = new window.Image();
      img.decoding = "async";
      let done = false;
      const finalize = () => {
        if (done) return;
        done = true;
        prefetchedSrcSetRef.current.add(src);
        prefetchInFlightRef.current = Math.max(0, prefetchInFlightRef.current - 1);
      };
      img.onload = finalize;
      img.onerror = finalize;
      img.src = src;
      if (typeof img.decode === "function") {
        img.decode().then(finalize).catch(finalize);
      }
    };

    const pump = () => {
      if (document.visibilityState !== "visible") return;
      while (
        prefetchInFlightRef.current < PREFETCH_MAX_IN_FLIGHT &&
        prefetchQueueRef.current.length > 0
      ) {
        const nextSrc = prefetchQueueRef.current.shift();
        if (!nextSrc) break;
        prefetchQueuedSetRef.current.delete(nextSrc);
        if (prefetchedSrcSetRef.current.has(nextSrc)) continue;
        startPrefetchDecode(nextSrc);
      }
    };

    const intervalId = window.setInterval(pump, PREFETCH_PUMP_INTERVAL_MS);
    prefetchPumpIntervalRef.current = intervalId;
    return () => {
      window.clearInterval(intervalId);
      if (prefetchPumpIntervalRef.current === intervalId) {
        prefetchPumpIntervalRef.current = null;
      }
    };
  }, []);

  /**
   * Report viewport to consumers (e.g. StoryDotsOverlay) using:
   * - logical offsetX in [0, segmentWidth)
   * - physical viewport width/height in CSS px
   */
  const notifyViewport = useCallback(() => {
    if (!onViewportChange) return;
    const el = scrollRef.current;
    if (!el || sceneScale === 0) return;

    const w = el.clientWidth;
    const h = el.clientHeight;
    const logicalW = w / sceneScale;

    let logicalOffsetX = localXPx / sceneScale;

    logicalOffsetX %= segmentWidth;
    if (logicalOffsetX < 0) logicalOffsetX += segmentWidth;

    lastLogicalOffsetRef.current = logicalOffsetX;
    onViewportChange({
      offsetX: logicalOffsetX,
      logicalW,
      viewportW: w,
      viewportH: h,
    });
  }, [
    onViewportChange,
    localXPx,
    sceneScale,
    segmentWidth,
  ]);

  useEffect(() => {
    notifyViewport();
  }, [notifyViewport]);

  useEffect(() => {
    if (!onViewportChange) return;
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => notifyViewport());
    ro.observe(el);
    return () => ro.disconnect();
  }, [onViewportChange, notifyViewport]);

  /**
   * Pointer → debug info
   * ------------------------------------------------------------
   * Emits detailed coordinate info when onPointerDebugChange is provided.
   * Works for both mouse and touch thanks to PointerEvents.
   */
  const handlePointerMove = useCallback(
    (ev: React.PointerEvent<HTMLDivElement>) => {
      if (!onPointerDebugChange) return;
      const el = scrollRef.current;
      if (!el || sceneScale === 0) {
        onPointerDebugChange(null);
        return;
      }

      const rect = el.getBoundingClientRect();
      const containerX = ev.clientX - rect.left;
      const containerY = ev.clientY - rect.top;

      // If pointer is outside the container, treat as "no debug".
      if (
        containerX < 0 ||
        containerX > rect.width ||
        containerY < 0 ||
        containerY > rect.height
      ) {
        onPointerDebugChange(null);
        return;
      }

      // World X in scroll pixels from left edge of [A][B][C]
      const worldPx = scrollLeft + containerX;
      // Offset from canonical middle segment origin
      const worldPxFromMiddle = worldPx - middleStartPx;
      const worldLogical = worldPxFromMiddle / sceneScale;

      // Segment repeat index (can be negative)
      const segmentRepeat = Math.floor(worldLogical / segmentWidth);

      // Wrap logical X into [0, segmentWidth)
      const wrappedLogical =
        ((worldLogical % segmentWidth) + segmentWidth) % segmentWidth;

      onPointerDebugChange({
        clientX: ev.clientX,
        clientY: ev.clientY,
        containerX,
        containerY,
        sceneScale,
        segmentWidth,
        segmentWidthPx,
        scrollLeft,
        localXPx,
        worldLogicalX: wrappedLogical,
        segmentRepeat,
        segmentLocalX: wrappedLogical,
        viewportLogicalOffsetX: lastLogicalOffsetRef.current,
      });
    },
    [
      onPointerDebugChange,
      sceneScale,
      scrollLeft,
      middleStartPx,
      segmentWidth,
      segmentWidthPx,
      localXPx,
    ]
  );

  const handlePointerLeave = useCallback(() => {
    if (onPointerDebugChange) {
      onPointerDebugChange(null);
    }
  }, [onPointerDebugChange]);

  /**
   * Render a single segment of a layer.
   * All sprite geometry is converted from logical units to CSS px
   * using `sceneScale`, so the composition remains consistent.
   */
  const renderLayerSegment = (layer: LayerConfig, segmentIndex: number) => {
    const { sprites, parallax, opacity = 1, curve } = layer;
    const role = layer.role ?? "";
    const allowDebugWireframes = allowDebugForRole(role);

    const computeBaseYpx = (): number => {
      if (typeof layer.baseYFromBottomPct === "number") {
        const fromBottom = clamp(layer.baseYFromBottomPct, 0, 1);
        return effectiveHeight * (1 - fromBottom);
      }
      if (typeof layer.baseYPx === "number") {
        // Interpret baseYPx as logical.
        return layer.baseYPx * sceneScale;
      }
      return effectiveHeight;
    };

    const baseYpx = computeBaseYpx();

    const segmentLeftPx = segmentIndex * segmentWidthPx;
    const biomeStartPxRaw =
      typeof layer.biomeStart === "number"
        ? layer.biomeStart * sceneScale
        : 0;
    const biomeWidthPx =
      typeof layer.biomeWidth === "number"
        ? layer.biomeWidth * sceneScale
        : segmentWidthPx;
    const parallaxBasePx = worldXPx;
    const clampedParallax = clamp(parallax, 0, 1);
    const parallaxShift = -parallaxBasePx * (1 - clampedParallax);
    const viewportW = viewportWidthPx;
    const visibleLeftPx = scrollLeft;
    const visibleRightPx = scrollLeft + viewportW;
    const clipLeftPx = biomeStartPxRaw;
    const clipWidthPx = biomeWidthPx;
    const segmentNearViewport =
      segmentLeftPx + segmentWidthPx >
        visibleLeftPx - COMPOSITOR_HINT_SEGMENT_PAD_PX &&
      segmentLeftPx < visibleRightPx + COMPOSITOR_HINT_SEGMENT_PAD_PX;
    // Promote only while actively scrolling and only for segments near view.
    // This avoids keeping dozens of compositor layers pinned when idle.
    const shouldHintTransform =
      compositorHintsActive &&
      segmentNearViewport &&
      Math.abs(1 - clampedParallax) > 0.0005;
    const segmentStyle: React.CSSProperties = {
      position: "absolute",
      left: segmentLeftPx,
      top: 0,
      width: segmentWidthPx,
      height: effectiveHeight,
      pointerEvents: "none",
    };
    const clipStyle: React.CSSProperties = {
      position: "absolute",
      left: clipLeftPx,
      top: 0,
      width: clipWidthPx,
      height: effectiveHeight,
      overflow: "hidden",
      pointerEvents: "none",
    };
    const contentStyle: React.CSSProperties = {
      position: "absolute",
      left: 0,
      top: 0,
      width: clipWidthPx,
      height: effectiveHeight,
      transform: `translateX(${parallaxShift}px)`,
      willChange: shouldHintTransform ? "transform" : undefined,
      opacity,
      pointerEvents: "none",
    };

    const curveAmplitudePx =
      curve && curve.type === "sine" ? curve.amplitudePct * effectiveHeight : 0;

    const curvePhase = curve?.phaseRad ?? 0;
    const periodsPerSegment = curve?.periodsPerSegment ?? 1;

    const WireLabel = ({ lines }: { lines: string[] }) => (
      <div
        style={{
          position: "absolute",
          top: -18,
          left: 0,
          fontSize: 10,
          fontWeight: 600,
          padding: "2px 6px",
          borderRadius: 6,
          background: "rgba(0, 0, 0, 0.95)",
          color: "#fff",
          pointerEvents: "none",
          whiteSpace: "nowrap",
        }}
      >
        {lines.map((line, idx) => (
          <div key={idx}>{line}</div>
        ))}
      </div>
    );

    return (
      <div key={`seg-${layer.id}-${segmentIndex}`} style={segmentStyle}>
        <div style={clipStyle}>
          <div style={contentStyle}>
        {sprites.map((s, i) => {
          const anchorY = s.anchorY ?? 1;
          const logicalYOffset = s.yOffsetPx ?? 0;
          const spriteLogicalScale = s.scale ?? 1;

          // Final sprite render scale = sprite scale * scene scale.
          const effectiveSpriteScale = spriteLogicalScale * sceneScale;
          const h = s.height * effectiveSpriteScale;
          const w = s.width * effectiveSpriteScale;
          const yOffsetPx = logicalYOffset * sceneScale;

          if (s.repeatX) {
            const repeatStartPx = (s.repeatStartPx ?? 0) * sceneScale;
            const repeatWidthPx =
              (s.repeatWidthPx ?? segmentWidth) * sceneScale;
            const stripStartPx = repeatStartPx;
            const stripWidthPx = repeatWidthPx;
            const boundedRepeat = typeof s.repeatWidthPx === "number";
            const wireId = `rep-${layer.id}-${segmentIndex}-${i}`;
            const shouldShowWireframe =
              allowDebugWireframes && activeWireframeId === wireId;
            const topY = baseYpx - h * anchorY + yOffsetPx;

            const stripStyle: React.CSSProperties = {
              position: "absolute",
              left: stripStartPx,
              top: topY,
              width: stripWidthPx,
              height: h,
              backgroundImage: `url(${s.src})`,
              backgroundRepeat: "repeat-x",
              backgroundSize: `${w}px ${h}px`,
              backgroundPositionX: `${-(
                segmentIndex * segmentWidthPx +
                stripStartPx
              )}px`,
              imageRendering: "auto",
            };

            if (boundedRepeat) {
              const innerLeft = stripStartPx - stripWidthPx;
              const innerWidth = stripWidthPx * 3;
              const clipStyle: React.CSSProperties = {
                position: "absolute",
                left: stripStartPx,
                top: topY,
                width: stripWidthPx,
                height: h,
                overflow: "hidden",
                pointerEvents: "none",
                transform: `translateX(${-parallaxShift}px)`,
              };
              const innerStyle: React.CSSProperties = {
                position: "absolute",
                left: innerLeft,
                top: 0,
                width: innerWidth,
                height: h,
                backgroundImage: `url(${s.src})`,
                backgroundRepeat: "repeat-x",
                backgroundSize: `${w}px ${h}px`,
                backgroundPositionX: `${-(
                  segmentIndex * segmentWidthPx +
                  innerLeft
                )}px`,
                imageRendering: "auto",
                transform: `translateX(${parallaxShift}px)`,
              };
              return (
                <React.Fragment key={`rep-${i}`}>
                  <div style={clipStyle}>
                    <div style={innerStyle} />
                  </div>
                  {allowDebugWireframes && (
                    <div
                      style={{
                        position: "absolute",
                        left: stripStartPx,
                        top: topY,
                        width: stripWidthPx,
                        height: h,
                        pointerEvents: "auto",
                        background: "transparent",
                      }}
                      onPointerEnter={() => setHoveredWireframeId(wireId)}
                      onPointerLeave={() => setHoveredWireframeId(null)}
                      onClick={() => {
                        if (!debugWireframesPinMode) return;
                        setPinnedWireframeId((prev) =>
                          prev === wireId ? null : wireId
                        );
                      }}
                    >
                      {shouldShowWireframe && (
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            outline: "2px dashed rgba(0, 0, 200, 0.8)",
                            background: "rgba(255, 255, 200, 0.08)",
                          }}
                        >
                          <WireLabel
                            lines={[
                              `${s.debug?.name ?? "asset"}_${
                                s.debug?.index ?? "?"
                              }`,
                              `group: ${s.debug?.groupId ?? "unknown"} • role: ${
                                s.debug?.role ?? "unknown"
                              }`,
                              `layer: ${layer.id} • parallax: ${parallax}`,
                              `src: ${s.width}×${s.height}px • render: ${Math.round(
                                w
                              )}×${Math.round(h)}px`,
                              `repeat: start=${(
                                s.repeatStartPx ?? 0
                              ).toFixed(1)} width=${(
                                s.repeatWidthPx ?? segmentWidth
                              ).toFixed(1)} (logical)`,
                            ]}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </React.Fragment>
              );
            }
            return (
              <React.Fragment key={`rep-${i}`}>
                <div style={stripStyle} />
                {allowDebugWireframes && (
                  <div
                    style={{
                      position: "absolute",
                      left: stripStartPx,
                      top: topY,
                      width: stripWidthPx,
                      height: h,
                      pointerEvents: "auto",
                      background: "transparent",
                    }}
                    onPointerEnter={() => setHoveredWireframeId(wireId)}
                    onPointerLeave={() => setHoveredWireframeId(null)}
                    onClick={() => {
                      if (!debugWireframesPinMode) return;
                      setPinnedWireframeId((prev) =>
                        prev === wireId ? null : wireId
                      );
                    }}
                  >
                    {shouldShowWireframe && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          outline: "2px dashed rgba(0, 0, 200, 0.8)",
                          background: "rgba(255, 255, 200, 0.08)",
                        }}
                      >
                        <WireLabel
                          lines={[
                            `${s.debug?.name ?? "asset"}_${
                              s.debug?.index ?? "?"
                            }`,
                            `group: ${s.debug?.groupId ?? "unknown"} • role: ${
                              s.debug?.role ?? "unknown"
                            }`,
                            `layer: ${layer.id} • parallax: ${parallax}`,
                            `src: ${s.width}×${s.height}px • render: ${Math.round(
                              w
                            )}×${Math.round(h)}px`,
                            `repeat: start=${(
                              s.repeatStartPx ?? 0
                            ).toFixed(1)} width=${(
                              s.repeatWidthPx ?? segmentWidth
                            ).toFixed(1)} (logical)`,
                          ]}
                        />
                      </div>
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          }

          const xs = s.xPositions ?? [];
          return xs.map((xLogical, j) => {
            const xPx = xLogical * sceneScale;
            const leftX = xPx - w * 0.5;

            const worldXpx = segmentIndex * segmentWidthPx + xPx;
            const renderedXpx = worldXpx + parallaxShift;
            const renderedLeftPx = renderedXpx - w * 0.5;
            const renderedRightPx = renderedXpx + w * 0.5;
            if (
              renderedRightPx < visibleLeftPx - SPRITE_CULL_PAD_PX ||
              renderedLeftPx > visibleRightPx + SPRITE_CULL_PAD_PX
            ) {
              return null;
            }
            const loadDistancePx = distanceToViewportPx(
              renderedLeftPx,
              renderedRightPx,
              visibleLeftPx,
              visibleRightPx
            );
            const loadingMode: "eager" | "lazy" =
              loadDistancePx <= LOAD_EAGER_PAD_PX ? "eager" : "lazy";
            const fetchPriorityMode: "high" | "auto" | "low" =
              loadDistancePx <= LOAD_HIGH_PRIORITY_PAD_PX
                ? "high"
                : loadDistancePx <= LOAD_EAGER_PAD_PX
                  ? "auto"
                  : "low";
            const decodingMode: "auto" | "async" =
              loadDistancePx <= LOAD_HIGH_PRIORITY_PAD_PX ? "auto" : "async";
            const t =
              (2 * Math.PI * periodsPerSegment * worldXpx) / segmentWidthPx +
              curvePhase;

            const curveYOffset = curveAmplitudePx
              ? curveAmplitudePx * Math.sin(t)
              : 0;

            const topY = baseYpx - h * anchorY + yOffsetPx + curveYOffset;

            const wireId = `spr-${layer.id}-${segmentIndex}-${i}-${j}`;
            const shouldShowWireframe =
              allowDebugWireframes && activeWireframeId === wireId;
            const localX = s.debug?.xPositionsLocal?.[j];
            const spriteStyle: React.CSSProperties = {
              position: "absolute",
              left: leftX,
              top: topY,
              width: w,
              height: h,
              pointerEvents: "none",
            };

            return (
              <React.Fragment key={`spr-${i}-${j}`}>
                <Image
                  src={s.src}
                  alt=""
                  width={Math.round(w)}
                  height={Math.round(h)}
                  style={spriteStyle}
                  draggable={false}
                  priority={false}
                  sizes={`${Math.round(w)}px`}
                  loading={loadingMode}
                  fetchPriority={fetchPriorityMode}
                  decoding={decodingMode}
                  unoptimized
                />
                {allowDebugWireframes && (
                  <div
                    style={{
                      position: "absolute",
                      left: leftX,
                      top: topY,
                      width: w,
                      height: h,
                      outline: shouldShowWireframe
                        ? "1px solid rgba(255, 180, 0, 0.9)"
                        : "1px solid transparent",
                      background: shouldShowWireframe
                        ? "rgba(255, 180, 0, 0.08)"
                        : "transparent",
                      pointerEvents: "auto",
                    }}
                    onPointerEnter={() => setHoveredWireframeId(wireId)}
                    onPointerLeave={() => setHoveredWireframeId(null)}
                    onClick={() => {
                      if (!debugWireframesPinMode) return;
                      setPinnedWireframeId((prev) =>
                        prev === wireId ? null : wireId
                      );
                    }}
                  >
                    {shouldShowWireframe && (
                      <WireLabel
                        lines={[
                          `${s.debug?.name ?? "asset"}_${
                            s.debug?.index ?? "?"
                          }`,
                          `group: ${s.debug?.groupId ?? "unknown"} • role: ${
                            s.debug?.role ?? "unknown"
                          }`,
                          `layer: ${layer.id} • parallax: ${parallax}`,
                          `src: ${s.width}×${s.height}px • render: ${Math.round(
                            w
                          )}×${Math.round(h)}px`,
                          `x local: ${
                            typeof localX === "number"
                              ? localX.toFixed(1)
                              : "n/a"
                          } • x world: ${xLogical.toFixed(1)}`,
                          `segment: ${segmentIndex} • sceneScale: ${sceneScale.toFixed(
                            3
                          )}`,
                        ]}
                      />
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          });
        })}
          </div>
        </div>
      </div>
    );
  };

  const renderLayer = (layer: LayerConfig) => {
    const z = layer.zIndex ?? 0;
    const role = layer.role ?? "";
    const allowDebugWireframes = allowDebugForRole(role);
    const layerStyle: React.CSSProperties = {
      position: "absolute",
      left: 0,
      top: 0,
      width: segmentWidthPx * 3,
      height: effectiveHeight,
      zIndex: z,
      pointerEvents: allowDebugWireframes ? "auto" : "none",
    };

    return (
      <div key={layer.id} style={layerStyle}>
        {renderLayerSegment(layer, 0)}
        {renderLayerSegment(layer, 1)}
        {renderLayerSegment(layer, 2)}
      </div>
    );
  };

  const containerStyle: React.CSSProperties & { scrollbarWidth?: string } = {
    position: "relative",
    width: "100%",
    height: segmentHeight ?? "100%", // fill parent when no explicit height
    overflowX: "scroll",
    overflowY: "hidden",
    overscrollBehavior: "none",
    WebkitOverflowScrolling: "touch",
    scrollbarWidth: "none", // Firefox
  };

  return (
    <div
      ref={scrollRef}
      className={className}
      style={containerStyle}
      onScroll={handleScroll}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerLeave}
    >
      <div
        style={{
          position: "relative",
          width: segmentWidthPx * 3,
          height: effectiveHeight,
        }}
      >
        {layers.map(renderLayer)}
      </div>
    </div>
  );
}

const MemoizedInfiniteParallaxGarden = React.memo(InfiniteParallaxGarden);
MemoizedInfiniteParallaxGarden.displayName = "InfiniteParallaxGarden";

export default MemoizedInfiniteParallaxGarden;
