// ./src/app/components/InfiniteParallaxGarden.tsx
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
 * See original header comments for details.
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
    /** When true, swap images for outlined boxes with labels */
    debugWireframes?: boolean;
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
    debugWireframes = false,
}: GardenProps) {
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const [measuredH, setMeasuredH] = useState<number | null>(null);

    // Keep the viewport anchored to the middle segment (B)
    const middleStart = segmentWidth; // [A][B][C] each = segmentWidth

    // Keep a reactive copy so we can style transforms cheaply.
    const [scrollLeft, setScrollLeft] = useState(0);

    // measure the parent height if segmentHeight is not provided
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

    const effectiveHeight = segmentHeight ?? measuredH ?? 720; // fallback

    // Initialize scroll position to center + initialOffsetX
    useLayoutEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const target = middleStart + (initialOffsetX % segmentWidth);
        el.scrollLeft = target;
        setScrollLeft(target);
    }, [middleStart, initialOffsetX, segmentWidth]);

    // Handle wrapping: if user scrolls too far to either side, jump by ±segmentWidth
    const handleScroll = useCallback(() => {
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
    }, [middleStart, segmentWidth]);

    // Map vertical wheel to horizontal scroll for natural navigation
    useEffect(() => {
        if (!wheelToHorizontal) return;
        const el = scrollRef.current;
        if (!el) return;

        const onWheel = (e: WheelEvent) => {
            // Allow native horizontal (Shift+Wheel) behavior
            if (e.shiftKey) return;

            // Prevent vertical page scrolling
            e.preventDefault();

            // Translate vertical wheel → horizontal scroll
            const delta = e.deltaY + e.deltaX * 0.5;
            el.scrollLeft += delta;

            // Trigger our scroll update logic
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
        const x = (scrollLeft - middleStart) % segmentWidth;
        return x < 0 ? x + segmentWidth : x;
    }, [scrollLeft, middleStart, segmentWidth]);

    // Notify consumer about viewport changes (offset + size) on scroll/resize
    const notifyViewport = useCallback(() => {
        if (!onViewportChange) return;
        const el = scrollRef.current;
        if (!el) return;
        const w = el.clientWidth;
        const h = el.clientHeight;
        const logicalOffsetX = (scrollLeft - middleStart + localX) % segmentWidth;
        onViewportChange({ offsetX: logicalOffsetX, viewportW: w, viewportH: h });
    }, [onViewportChange, scrollLeft, middleStart, localX, segmentWidth]);

    useEffect(() => {
        // Notify whenever scroll-derived values change
        notifyViewport();
    }, [notifyViewport]);

    useEffect(() => {
        // Also notify on resize of the scroll container
        if (!onViewportChange) return;
        const el = scrollRef.current;
        if (!el) return;
        const ro = new ResizeObserver(() => notifyViewport());
        ro.observe(el);
        return () => ro.disconnect();
    }, [onViewportChange, notifyViewport]);

    // Render a single segment worth of content for a layer
    const renderLayerSegment = (layer: LayerConfig, segmentIndex: number) => {
        const { sprites, parallax, baseY = segmentHeight, opacity = 1 } = layer;

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

        return (
            <div key={`seg-${layer.id}-${segmentIndex}`} style={style}>
                {sprites.map((s, i) => {
                    const anchorY = s.anchorY ?? 1;
                    const yOffset = s.yOffset ?? 0;
                    const scale = s.scale ?? 1;
                    const h = s.height * scale;
                    const w = s.width * scale;
                    const topY = (baseY ?? segmentHeight) - h * anchorY + yOffset;

                    // Helper: common label bubble for wireframes
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

                    if (s.repeatX) {
                        if (debugWireframes) {
                            const wfStyle: React.CSSProperties = {
                                position: "absolute",
                                left: 0,
                                top: topY,
                                width: segmentWidth,
                                height: h,
                                outline: "2px dashed rgba(0, 0, 200, 0.8)",
                                background: "rgba(255,255,200,0.08)",
                            };
                            return (
                                <div key={`repwf-${i}`} style={wfStyle}>
                                    <WireLabel
                                        text={`${layer.id} • ${s.width}×${s.height}px • scale: ${scale.toFixed(2)}x parallax: ${parallax}`}
                                    />
                                </div>
                            );
                        }


                        // Image/strip version
                        const stripStyle: React.CSSProperties = {
                            position: "absolute",
                            left: 0,
                            top: topY,
                            width: segmentWidth,
                            height: h,
                            backgroundImage: `url(${s.src})`,
                            backgroundRepeat: "repeat-x",
                            backgroundSize: `${w}px ${h}px`,
                            backgroundPositionX: `${-segmentIndex * segmentWidth}px`,
                            imageRendering: "auto",
                        };
                        return <div key={`rep-${i}`} style={stripStyle} />;
                    }

                    // Non-repeating sprites
                    const xs = s.xPositions ?? [];
                    return xs.map((x, j) => {
                        const leftX = x - w * 0.5;

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
                                        text={`${layer.id} • ${s.width}×${s.height}px • scale: ${scale.toFixed(2)}x parallax: ${parallax}`}
                                    />
                                </div>
                            );
                        }

                        // Normal image sprite
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
                            />
                        );
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
// Example preset (optional)
// ------------------------------------------------------------
export const exampleLayers: LayerConfig[] = [
    {
        id: "background",
        parallax: 0.99,
        zIndex: -100,
        baseY: HEIGHT_ANCHOR,
        opacity: 1,
        sprites: [
            { src: "/garden/bg_test.png", width: 2048, height: 720, repeatX: true, scale: 2 },
        ],
    },
    // {
    //   id: "sky",
    //   parallax: 0.6,
    //   zIndex: 0,
    //   baseY: HEIGHT_ANCHOR,
    //   opacity: 0.51,
    //   sprites: [
    //     { src: "/garden/sky_test.png", width: 1024, height: 720, repeatX: true, scale: 1.2 },
    //   ],
    // },
    {
        id: "far-hills",
        parallax: 0.8,
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
        parallax: 0.15,
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
        parallax: 0.5,
        zIndex: 10,
        baseY: HEIGHT_ANCHOR,
        sprites: [
            { src: "/garden/grass_test.png", width: 1024, height: 1200, repeatX: true, scale: 0.8 },
        ],
    },
    // Additional depth layers
    {
        id: "flowers-far",
        parallax: 0.75,
        zIndex: 28,
        opacity: 0.5,
        baseY: HEIGHT_ANCHOR * 0.8,
        sprites: [
            {
                src: "/garden/flower_0.png",
                width: 520, height: 520,
                anchorY: 1, yOffset: -18, scale: 0.38,
                xPositions: [120, 520, 940, 1320, 1680, 2060, 2440, 2820, 3200, 3600],
            },
            {
                src: "/garden/flower_1.png",
                width: 520, height: 520,
                anchorY: 1, yOffset: -8, scale: 0.34,
                xPositions: [300, 700, 1110, 1500, 1860, 2240, 2620, 3000, 3380, 3800],
            },
            {
                src: "/garden/flower_2.png",
                width: 520, height: 520,
                anchorY: 1, yOffset: -24, scale: 0.36,
                xPositions: [180, 600, 980, 1400, 1760, 2140, 2520, 2900, 3280, 3660],
            },
        ],
    },
    {
        id: "flowers-near",
        parallax: 0.05,
        zIndex: 38,
        opacity: 0.95,
        baseY: HEIGHT_ANCHOR,
        sprites: [
            {
                src: "/garden/flower_3.png",
                width: 270, height: 270,
                anchorY: 1, yOffset: 6, scale: 0.62,
                xPositions: [180, 560, 920, 1300, 1750, 2100, 2580, 3000, 3460],
            },
            {
                src: "/garden/flower_4.png",
                width: 270, height: 270,
                anchorY: 1, yOffset: -10, scale: 0.58,
                xPositions: [360, 760, 1100, 1480, 1920, 2280, 2700, 3140, 3540],
            },
            {
                src: "/garden/thistle_test.png",
                width: 270, height: 270,
                anchorY: 1, yOffset: 0, scale: 0.5,
                xPositions: [160, 560, 920, 1300, 1750, 2100, 2580, 3000, 3460],
            },
        ],
    },
    // Keep a distinct id to avoid key duplication
    {
        id: "foreground-2",
        parallax: 0.25,
        zIndex: 10,
        opacity: 0.6,
        baseY: HEIGHT_ANCHOR * 0.9,
        sprites: [
            { src: "/garden/grass_test.png", width: 1024, height: 1200, repeatX: true, scale: 0.8 },
        ],
    },
];
