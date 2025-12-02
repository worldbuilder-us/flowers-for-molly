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

/**
 * InfiniteParallaxGarden
 * ------------------------------------------------------------
 * A horizontally scrollable, seamless (wrap-around) panorama with
 * multi-layer parallax. Designed as the homepage "garden" scene.
 *
 * Responsiveness model:
 * - Treat `segmentWidth`, sprite sizes, xPositions, and offsets as *logical*
 *   coordinates.
 * - Use a base logical scene height (BASE_SCENE_HEIGHT).
 * - Compute `sceneScale = effectiveHeight / BASE_SCENE_HEIGHT`.
 * - All logical geometry is multiplied by `sceneScale` so the composition
 *   stays consistent across desktop and mobile.
 */

const BASE_SCENE_HEIGHT = 1024; // logical reference height

// Tune this to control how "fast" the walk feels.
// Smaller = slower, smoother motion.
const SCROLL_SPEED = 0.3;

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
  /** Logical X positions within a single segment. */
  xPositions?: number[];
  /** Optional CSS blur in px. */
  blurPx?: number;
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
  /** Actual rendered viewport dimensions in CSS px. */
  viewportW: number;
  viewportH: number;
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
  /** When true, swap images for outlined boxes with labels. */
  debugWireframes?: boolean;
};

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export default function InfiniteParallaxGarden({
  segmentWidth = 4096, // logical
  segmentHeight,
  layers,
  initialOffsetX = 0,
  wheelToHorizontal = true,
  className,
  onViewportChange,
  debugWireframes = false,
}: GardenProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  /**
   * Touch drag state for mobile horizontal scrolling.
   */
  const touchStateRef = useRef<{
    startX: number;
    startY: number;
    startScrollLeft: number;
    isDragging: boolean;
    isLockedDirection: boolean;
    isHorizontal: boolean;
  }>({
    startX: 0,
    startY: 0,
    startScrollLeft: 0,
    isDragging: false,
    isLockedDirection: false,
    isHorizontal: false,
  });

  /**
   * If segmentHeight is not provided, we fill the parent (height: 100%)
   * and use a ResizeObserver to measure the actual pixel height for scaling.
   */
  const [measuredH, setMeasuredH] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (segmentHeight) return;
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
    setScrollLeft(target);
  }, [initialOffsetX, segmentWidth, middleStartPx, sceneScale]);

  /**
   * Wrap-around scroll behavior to maintain the infinite illusion.
   * Uses rendered segmentWidth in CSS px so it stays correct on all screens.
   */
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    let x = el.scrollLeft;

    const leftBoundary = middleStartPx * 0.5;
    const rightBoundary = middleStartPx * 1.5;

    if (x < leftBoundary) {
      x += segmentWidthPx;
      el.scrollLeft = x;
    } else if (x > rightBoundary) {
      x -= segmentWidthPx;
      el.scrollLeft = x;
    }
    setScrollLeft(el.scrollLeft);
  }, [middleStartPx, segmentWidthPx]);

  /**
   * Map vertical wheel to horizontal scroll.
   *
   * To get back your previous "global" feeling (scroll anywhere on the page
   * and the garden moves), we bind to `window` again, but we:
   * - apply a SCROLL_SPEED multiplier for a slower, smoother walk.
   * - still respect Shift+scroll for standard horizontal scroll.
   */
  useEffect(() => {
    if (!wheelToHorizontal) return;
    const el = scrollRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (e.shiftKey) return;

      // If the garden isn't mounted or sized yet, skip.
      if (!scrollRef.current) return;

      // Slow, smoothed walk.
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

  /**
   * Local X position within the middle segment, in rendered CSS px.
   */
  const localXPx = useMemo(() => {
    if (segmentWidthPx === 0) return 0;
    const x = (scrollLeft - middleStartPx) % segmentWidthPx;
    return x < 0 ? x + segmentWidthPx : x;
  }, [scrollLeft, middleStartPx, segmentWidthPx]);

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

    const worldOffsetPx = scrollLeft - middleStartPx + localXPx;
    let logicalOffsetX = worldOffsetPx / sceneScale;

    logicalOffsetX %= segmentWidth;
    if (logicalOffsetX < 0) logicalOffsetX += segmentWidth;

    onViewportChange({ offsetX: logicalOffsetX, viewportW: w, viewportH: h });
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
   * Touch handlers to support horizontal drag scrolling on mobile.
   * We only intercept when the gesture is predominantly horizontal,
   * so vertical scrolling on the page still feels natural.
   */
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    touchStateRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startScrollLeft: el.scrollLeft,
      isDragging: true,
      isLockedDirection: false,
      isHorizontal: false,
    };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;

    const state = touchStateRef.current;
    if (!state.isDragging || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const dx = touch.clientX - state.startX;
    const dy = touch.clientY - state.startY;

    // Lock gesture direction once movement is significant
    if (!state.isLockedDirection) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        state.isLockedDirection = true;
        state.isHorizontal = Math.abs(dx) > Math.abs(dy);
      }
    }

    if (!state.isLockedDirection || !state.isHorizontal) {
      // Let vertical scroll behave normally.
      return;
    }

    // Horizontal gesture: prevent default vertical scroll and move garden.
    e.preventDefault();

    const target = state.startScrollLeft - dx;
    el.scrollLeft = target;
    handleScroll();
  };

  const endTouchDrag = () => {
    touchStateRef.current.isDragging = false;
    touchStateRef.current.isLockedDirection = false;
  };

  const handleTouchEnd = () => {
    endTouchDrag();
  };

  const handleTouchCancel = () => {
    endTouchDrag();
  };

  /**
   * Render a single segment of a layer.
   * All sprite geometry is converted from logical units to CSS px
   * using `sceneScale`, so the composition remains consistent.
   */
  const renderLayerSegment = (layer: LayerConfig, segmentIndex: number) => {
    const { sprites, parallax, opacity = 1, curve } = layer;

    const parallaxShift = -localXPx * (1 - clamp(parallax, 0, 1));

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

    const style: React.CSSProperties = {
      position: "absolute",
      left: segmentIndex * segmentWidthPx,
      top: 0,
      width: segmentWidthPx,
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

    const WireLabel = ({ text }: { text: string }) => (
      <div
        style={{
          position: "absolute",
          top: -18,
          left: 0,
          fontSize: 10,
          fontWeight: 600,
          padding: "2px 6px",
          borderRadius: 6,
          background: "rgba(0,0,0,0.95)",
          color: "#fff",
          pointerEvents: "none",
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </div>
    );

    return (
      <div key={`seg-${layer.id}-${segmentIndex}`} style={style}>
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
            if (debugWireframes) {
              const wfStyle: React.CSSProperties = {
                position: "absolute",
                left: 0,
                top: baseYpx - h * anchorY + yOffsetPx,
                width: segmentWidthPx,
                height: h,
                outline: "2px dashed rgba(0, 0, 200, 0.8)",
                background: "rgba(255,255,200,0.08)",
              };
              return (
                <div key={`repwf-${i}`} style={wfStyle}>
                  <WireLabel
                    text={`${layer.id} • src: ${s.width}×${
                      s.height
                    }px • rendered: ${Math.round(w)}×${Math.round(
                      h
                    )} • parallax: ${parallax}`}
                  />
                </div>
              );
            }

            const stripStyle: React.CSSProperties = {
              position: "absolute",
              left: 0,
              top: baseYpx - h * anchorY + yOffsetPx,
              width: segmentWidthPx,
              height: h,
              backgroundImage: `url(${s.src})`,
              backgroundRepeat: "repeat-x",
              backgroundSize: `${w}px ${h}px`,
              backgroundPositionX: `${-segmentIndex * segmentWidthPx}px`,
              imageRendering: "auto",
            };
            return <div key={`rep-${i}`} style={stripStyle} />;
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

            if (debugWireframes) {
              const wfStyle: React.CSSProperties = {
                position: "absolute",
                left: leftX,
                top: topY,
                width: w,
                height: h,
                outline: "1px solid rgba(255, 180, 0, 0.9)",
                background: "rgba(255,180,0,0.08)",
              };
              return (
                <div key={`sprwf-${i}-${j}`} style={wfStyle}>
                  <WireLabel
                    text={`${layer.id} • src: ${s.width}×${
                      s.height
                    }px • rendered: ${Math.round(w)}×${Math.round(
                      h
                    )} • scale: ${spriteLogicalScale.toFixed(
                      2
                    )}x • sceneScale: ${sceneScale.toFixed(
                      2
                    )} • parallax: ${parallax}`}
                  />
                </div>
              );
            }

            const spriteStyle: React.CSSProperties = {
              position: "absolute",
              left: leftX,
              top: topY,
              width: w,
              height: h,
              pointerEvents: "none",
            };

            return (
              <Image
                key={`spr-${i}-${j}`}
                src={s.src}
                alt=""
                width={Math.round(w)}
                height={Math.round(h)}
                style={spriteStyle}
                draggable={false}
                priority={false}
                sizes="100vw"
              />
            );
          });
        })}
      </div>
    );
  };

  const renderLayer = (layer: LayerConfig) => {
    const z = layer.zIndex ?? 0;
    const layerStyle: React.CSSProperties = {
      position: "absolute",
      left: 0,
      top: 0,
      width: segmentWidthPx * 3,
      height: effectiveHeight,
      zIndex: z,
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
    // Allow vertical scrolling gestures by default, but our touch handler
    // will preventDefault when we detect a horizontal drag.
    touchAction: "pan-y",
  };

  return (
    <div
      ref={scrollRef}
      className={className}
      style={containerStyle}
      onScroll={handleScroll}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
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
