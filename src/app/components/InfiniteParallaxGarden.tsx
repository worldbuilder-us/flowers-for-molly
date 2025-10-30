"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from "react";

/**
 * InfiniteParallaxGarden
 * ------------------------------------------------------------
 * A horizontally scrollable, seamless (wrap-around) panorama with
 * multi-layer parallax. Designed as the homepage "garden" scene.
 *
 * How it works
 * - The world is a single logical segment of fixed width (segmentWidth).
 * - We render THREE segments side-by-side: [A][B][C].
 * - The viewport starts centered on [B]. When the user scrolls beyond
 *   half a segment to the left or right, we jump the scroll position
 *   by exactly one segment back to the center. Because every segment
 *   is visually identical, the jump is imperceptible → infinite wrap.
 * - Each visual layer applies a parallax factor (0..1). Foreground
 *   layers use higher factors; distant backgrounds use smaller factors.
 * - Assets are configured via a declarative template (LayerConfig),
 *   so designers can keep dropping in new images without changing code.
 *
 * Notes
 * - This is DOM/CSS based (no WebGL) for simplicity and accessibility.
 * - Images can be tiled repeat-x or placed as single sprites.
 * - Wheel (vertical) movement is mapped to horizontal scroll for ease.
 */

// -----------------------------
// Types
// -----------------------------
export type SpriteSpec = {
    /** Path under /public (e.g. "/garden/grass_01.png") */
    src: string;
    /** Natural pixel size of the prepared asset */
    width: number;
    height: number;
    /**
     * Vertical alignment reference (0 = top, 0.5 = center, 1 = bottom).
     * Useful when mixing assets that "sit" on the ground vs float.
     */
    anchorY?: number; // default 1
    /**
     * Y offset in pixels AFTER anchor is applied (positive moves down).
     */
    yOffset?: number; // default 0
    /**
     * Optional scale multiplier applied to the sprite (1 = natural size).
     */
    scale?: number; // default 1
    /**
     * If true, this sprite is turned into a seamless repeat-x strip using CSS backgrounds.
     * If false/omitted, it will be placed as a single sprite at the given x positions.
     */
    repeatX?: boolean;
    /** For non-repeating sprites: the x positions (in pixels) within one segment. */
    xPositions?: number[]; // default []
};

export type LayerConfig = {
    id: string;
    /** 0..1. Smaller = farther (moves less), larger = closer (moves more). */
    parallax: number;
    /** Z stacking order: larger renders on top. */
    zIndex?: number;
    /** Vertical baseline of this layer within the segment (px from top). */
    baseY?: number; // default segmentHeight
    /** Optional global opacity for the whole layer. */
    opacity?: number; // 0..1
    /** Sprites that belong to this layer. */
    sprites: SpriteSpec[];
};

export type GardenViewport = { offsetX: number; viewportW: number; viewportH: number };


export type GardenProps = {
    /** Logical width of a single repeating segment in CSS px. */
    segmentWidth?: number;
    /** Fixed height of the scene in CSS px (set to your viewport height). */
    segmentHeight?: number;
    /** Declarative asset/layer template. */
    layers: LayerConfig[];
    /** Optional: start offset inside the middle segment. */
    initialOffsetX?: number; // default 0
    /** Optional: map vertical wheel to horizontal scroll (recommended). */
    wheelToHorizontal?: boolean; // default true
    /** Optional className for outer wrapper. */
    className?: string;
    /** Optional callback when viewport changes (passes scrollLeft). */
    onViewportChange?: (v: GardenViewport) => void;
};

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const HEIGHT_ANCHOR = 1024;

export default function InfiniteParallaxGarden({
    segmentWidth = 4096,
    segmentHeight = 4096,
    layers,
    initialOffsetX = 0,
    wheelToHorizontal = true,
    className,
    onViewportChange,
}: GardenProps) {
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const contentRef = useRef<HTMLDivElement | null>(null);
    const [measuredH, setMeasuredH] = useState<number | null>(null);
    const hostRef = useRef<HTMLDivElement | null>(null);
    const [viewport, setViewport] = useState<GardenViewport>({
        offsetX: initialOffsetX % segmentWidth,
        viewportW: 0,
        viewportH: 0,
    });

    // We'll keep the viewport anchored to the middle segment (B)
    const middleStart = segmentWidth; // [A][B][C] each = segmentWidth

    // Keep a reactive copy so we can style transforms cheaply.
    const [scrollLeft, setScrollLeft] = useState(0);

    // measure the parent height if segmentHeight is not provided
    useLayoutEffect(() => {
        if (segmentHeight) return;
        const el = scrollRef.current;
        if (!el) return;

        const ro = new ResizeObserver(entries => {
            for (const entry of entries) {
                const h = Math.round(entry.contentRect.height);
                if (h > 0) setMeasuredH(h);
            }
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, [segmentHeight]);

    const effectiveHeight = segmentHeight ?? measuredH ?? 720; // fallback

    // Initialize scroll position to center + initialOffsetX
    useLayoutEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const target = middleStart + initialOffsetX;
        el.scrollLeft = target;
        setScrollLeft(target);
    }, [middleStart, initialOffsetX]);

    // Handle wrapping: if user scrolls too far to either side, jump by ±segmentWidth
    const handleScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        let x = el.scrollLeft;

        const leftBoundary = middleStart * 0.5; // halfway into A
        const rightBoundary = middleStart * 1.5; // halfway into C

        if (x < leftBoundary) {
            x += segmentWidth; // jump right by one segment (A→B)
            el.scrollLeft = x;
        } else if (x > rightBoundary) {
            x -= segmentWidth; // jump left by one segment (C→B)
            el.scrollLeft = x;
        }
        setScrollLeft(el.scrollLeft);
    };

    // Map vertical wheel to horizontal scroll for natural navigation
    useEffect(() => {
        if (!wheelToHorizontal) return;
        const el = scrollRef.current;
        if (!el) return;

        const onWheel = (e: WheelEvent) => {
            // Allow native horizontal (Shift+Wheel) behavior
            if (e.shiftKey) return;

            // Only intercept if this element is visible on screen
            // (so we don’t hijack scrolls while scrolled away)
            if (!el) return;

            // Prevent vertical page scrolling
            e.preventDefault();

            // Translate vertical wheel → horizontal scroll
            const delta = e.deltaY + e.deltaX * 0.5;
            el.scrollLeft += delta;

            // Trigger your existing scroll update logic
            handleScroll();
        };

        // Attach to window so it fires even when overlay is on top
        window.addEventListener("wheel", onWheel, { passive: false });

        return () => {
            window.removeEventListener("wheel", onWheel);
        };
    }, [wheelToHorizontal, handleScroll]);


    // Compute parallax offsets for each layer given current scrollLeft.
    // We want a stable 0..segmentWidth range for the middle segment.
    const localX = useMemo(() => {
        // Normalize scrollLeft to the middle segment [0..segmentWidth)
        const x = (scrollLeft - middleStart) % segmentWidth;
        return x < 0 ? x + segmentWidth : x;
    }, [scrollLeft, middleStart, segmentWidth]);

    // Render a single segment worth of content for a layer
    const renderLayerSegment = (layer: LayerConfig, segmentIndex: number) => {
        const { sprites, parallax, baseY = segmentHeight, opacity = 1 } = layer;

        // Parallax shift: each layer offsets by localX * (parallax - 1)
        // - If parallax = 1 → foreground, moves 1:1 with scroll
        // - If parallax = 0 → skybox, fixed
        const parallaxShift = -localX * (1 - clamp(parallax, 0, 1));

        const style: React.CSSProperties = {
            position: "absolute",
            left: segmentIndex * segmentWidth,
            top: 0,
            width: segmentWidth,
            height: segmentHeight,
            transform: `translateX(${parallaxShift}px)`,
            willChange: "transform",
            opacity,
            pointerEvents: "none",
        };

        // Call this anytime scroll/resize repositions the world
        const notify = useCallback(() => {
            const el = hostRef.current;
            if (!el) return;
            const w = el.clientWidth;
            const h = el.clientHeight;
            const logicalOffsetX = (scrollLeft - middleStart + localX) % segmentWidth;

            const next = { offsetX: logicalOffsetX, viewportW: w, viewportH: h };
            setViewport(next);
            onViewportChange?.(next);    // ← NEW
        }, [onViewportChange, segmentWidth]);

        useEffect(() => {
            notify();
            const ro = new ResizeObserver(notify);
            if (hostRef.current) ro.observe(hostRef.current);
            return () => ro.disconnect();
        }, [notify]);


        return (
            <div

                key={`seg-${layer.id}-${segmentIndex}`}
                style={style}>
                {sprites.map((s, i) => {
                    const anchorY = s.anchorY ?? 1;
                    const yOffset = s.yOffset ?? 0;
                    const scale = s.scale ?? 1;
                    const h = s.height * scale;
                    const w = s.width * scale;

                    if (s.repeatX) {
                        // Use a single full-width strip with background-repeat: repeat-x
                        const stripStyle: React.CSSProperties = {
                            position: "absolute",
                            left: 0,
                            top: baseY - h * anchorY + yOffset,
                            width: segmentWidth,
                            height: h,
                            backgroundImage: `url(${s.src})`,
                            backgroundRepeat: "repeat-x",
                            backgroundSize: `${w}px ${h}px`,
                            // lock the background to world coords by offsetting based on segmentIndex
                            backgroundPositionX: `${-segmentIndex * segmentWidth}px`,
                            imageRendering: "auto",
                        };
                        return <div key={`rep-${i}`} style={stripStyle} />;
                    }

                    // Non-repeating: place at given x positions (within one segment)
                    const xs = s.xPositions ?? [];
                    return xs.map((x, j) => {
                        const spriteStyle: React.CSSProperties = {
                            position: "absolute",
                            left: x - w * 0.5,
                            top: baseY - h * anchorY + yOffset,
                            width: w,
                            height: h,
                        };
                        return <img key={`spr-${i}-${j}`} src={s.src} alt="" style={spriteStyle} />;
                    });
                })}
            </div>
        );
    };

    // Render THREE identical segments for each layer
    const renderLayer = (layer: LayerConfig) => {
        const z = layer.zIndex ?? 0;
        const layerStyle: React.CSSProperties = {
            position: "absolute",
            left: 0,
            top: 0,
            width: segmentWidth * 3,
            height: segmentHeight,
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
        height: effectiveHeight,
        overflowX: "scroll",
        overflowY: "hidden",
        overscrollBehavior: "none",
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none",
    };

    return (
        <div
            ref={scrollRef}
            className={className}
            style={containerStyle}
            onScroll={handleScroll}
        >
            <div
                ref={contentRef}
                style={{
                    position: "relative",
                    width: segmentWidth * 3,
                    height: effectiveHeight,
                }}
            >
                {layers.map(renderLayer)}
            </div>
        </div>
    );
}

// ------------------------------------------------------------
// Example preset (optional): you can remove this from production
// and define your own in the page that imports the component.
// ------------------------------------------------------------
export const exampleLayers: LayerConfig[] = [
    {
        id: "background",
        parallax: 0.9,
        zIndex: -100,
        baseY: HEIGHT_ANCHOR,
        opacity: 1,
        sprites: [
            { src: "/garden/bg_test.png", width: 2048, height: 720, repeatX: true, scale: 2 },
        ],
    },
    // {
    //     id: "sky",
    //     parallax: 0.6,
    //     zIndex: 0,
    //     baseY: HEIGHT_ANCHOR,
    //     opacity: 0.51,
    //     sprites: [
    //         { src: "/garden/sky_test.png", width: 1024, height: 720, repeatX: true, scale: 1.2 },
    //     ],
    // },
    {
        id: "far-hills",
        parallax: 0.7,
        zIndex: 10,
        opacity: 0.5,
        baseY: HEIGHT_ANCHOR,
        sprites: [
            { src: "/garden/hills_test.png", width: 1480, height: 720, repeatX: true, scale: 1 },
        ],
    },
    {
        id: "mid-grass",
        parallax: 0.25,
        zIndex: 100,
        opacity: 0.75,
        baseY: HEIGHT_ANCHOR,
        sprites: [
            { src: "/garden/thistle_test.png", width: 512, height: 1020, repeatX: true, scale: 0.51 },
        ],
    },
    {
        id: "flowers",
        parallax: 0.75,
        zIndex: 30,
        opacity: 0.8,
        baseY: HEIGHT_ANCHOR,
        sprites: [
            {
                src: "/garden/thistle_test.png",
                width: 1080,
                height: 1080,
                anchorY: 1,
                yOffset: 0,
                scale: 0.5,
                xPositions: [160, 560, 920, 1300, 1750, 2100, 2580, 3000, 3460],
            },
        ],
    },
    {
        id: "foreground",
        parallax: 0.75,
        zIndex: 10,
        baseY: HEIGHT_ANCHOR,
        sprites: [
            { src: "/garden/grass_test.png", width: 1024, height: 1200, repeatX: true, scale: 0.8 },
        ],
    },
];
