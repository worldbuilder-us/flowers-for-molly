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

export default function InfiniteParallaxGarden({
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
  const lastObservedScrollLeftRef = useRef<number | null>(null);
  const hasInitializedScrollRef = useRef(false);
  const hasReportedFirstScrollRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const keyRafRef = useRef<number | null>(null);
  const keyDirRef = useRef<-1 | 0 | 1>(0);
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

  const activeWireframeId = pinnedWireframeId ?? hoveredWireframeId;

  /**
   * If segmentHeight is not provided, we fill the parent (height: 100%)
   * and use a ResizeObserver to measure the actual pixel height for scaling.
   */
  const [measuredH, setMeasuredH] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = Math.round(entry.contentRect.height);
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

  // Middle segment start in scroll coordinates.
  const middleStartPx = segmentWidthPx; // [A][B][C]

  const [scrollLeft, setScrollLeft] = useState(0);

  /**
   * Keep track of the last logical viewport offset so pointer debug can
   * reference it without re-deriving.
   */
  const lastLogicalOffsetRef = useRef(0);

  /**
   * Initialize scroll position so we start in the middle segment at
   * the requested *logical* offset.
   */
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const logicalInitial =
      ((initialOffsetX % segmentWidth) + segmentWidth) % segmentWidth;
    const target = middleStartPx + logicalInitial * sceneScale;

    el.scrollLeft = target;
    scrollLeftRef.current = target;
    setScrollLeft(target);
    lastObservedScrollLeftRef.current = target;
    hasInitializedScrollRef.current = true;
  }, [initialOffsetX, segmentWidth, middleStartPx, sceneScale]);

  /**
   * Wrap-around scroll behavior to maintain the infinite illusion.
   * Recenter only near the actual edges of the 3-copy strip, not at the
   * midpoint of the world. That keeps biome seams from doubling as reset
   * points while preserving the infinite-scroll illusion.
   */
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    let x = el.scrollLeft;
    let didRecenter = false;
    const recenterEpsilonPx = Math.max(8, Math.min(48, segmentWidthPx * 0.01));
    const leftBoundary = recenterEpsilonPx;
    const rightBoundary = segmentWidthPx * 2 - recenterEpsilonPx;

    if (x < leftBoundary) {
      x += segmentWidthPx;
      el.scrollLeft = x;
      didRecenter = true;
    } else if (x > rightBoundary) {
      x -= segmentWidthPx;
      el.scrollLeft = x;
      didRecenter = true;
    }
    scrollLeftRef.current = el.scrollLeft;
    const previousScroll = lastObservedScrollLeftRef.current;
    lastObservedScrollLeftRef.current = el.scrollLeft;

    if (
      onFirstUserScroll &&
      hasInitializedScrollRef.current &&
      !hasReportedFirstScrollRef.current &&
      typeof previousScroll === "number" &&
      Math.abs(el.scrollLeft - previousScroll) > 0.5
    ) {
      hasReportedFirstScrollRef.current = true;
      onFirstUserScroll();
    }

    if (didRecenter) {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setScrollLeft(el.scrollLeft);
      return;
    }

    if (rafRef.current == null) {
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        setScrollLeft(scrollLeftRef.current);
      });
    }
  }, [onFirstUserScroll, segmentWidthPx]);

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
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const uniqueSources = Array.from(
      new Set(
        layers.flatMap((layer) =>
          layer.sprites
            .filter((sprite) => !sprite.repeatX)
            .map((sprite) => sprite.src)
        )
      )
    );

    const preloaded: HTMLImageElement[] = [];
    for (const src of uniqueSources) {
      const img = new window.Image();
      img.decoding = "async";
      img.src = src;
      preloaded.push(img);
    }

    return () => {
      preloaded.forEach((img) => {
        img.src = "";
      });
    };
  }, [layers]);

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
   * This avoids modulo wrap for parallax so layers stay seamless
   * when the viewport straddles the world boundary.
   */
  const worldXPx = useMemo(() => localXPx, [localXPx]);

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
    scrollLeft,
    middleStartPx,
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
    const parallaxShift = -parallaxBasePx * (1 - clamp(parallax, 0, 1));
    const clipLeftPx = biomeStartPxRaw;
    const clipWidthPx = biomeWidthPx;
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
      willChange: "transform",
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
                  loading="eager"
                  sizes={`${Math.round(w)}px`}
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
