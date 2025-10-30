// src/app/components/StoryDotsOverlay.tsx
'use client';

import React, { useMemo, useState, useCallback } from 'react';
import type { GardenViewport } from './InfiniteParallaxGarden';
import type { StoryListItem } from './StoryModal';

function hash32(s: string): number {
    let h = 0x811c9dc5 >>> 0;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h >>> 0;
}

function rng01(seed: number) {
    let x = (seed ^ 0x9e3779b9) >>> 0;
    return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 0xffffffff);
}

type Dot = {
    id: string;
    x: number; // [0, segmentWidth)
    y: number; // px within overlay
    r: number; // radius px
    author: string;
    story: StoryListItem;
    parallax: number; // 0..1
};

export default function StoryDotsOverlay({
    stories,
    segmentWidth,
    viewport,
    onDotClick,
    pMin = 0.35, // far band (top) moves 35% of world
    pMax = 0.95, // near band (bottom) moves 95% of world
}: {
    stories: StoryListItem[];
    segmentWidth: number;
    viewport: GardenViewport;
    onDotClick: (s: StoryListItem) => void;
    /** Optional: min/max parallax range for dots */
    pMin?: number;
    pMax?: number;
}) {
    // Build dots with y + per-dot parallax mapped from y position
    const dots = useMemo<Dot[]>(() => {
        const vh = Math.max(300, viewport.viewportH || 700);
        const topPad = Math.max(40, Math.round(vh * 0.08));
        const usableH = Math.max(120, Math.round(vh * 0.55)); // where dots can live

        return stories.map((s) => {
            const h = hash32(s._id);
            const rnd = rng01(h);
            const x = Math.floor(rnd() * segmentWidth);
            const y = topPad + Math.floor(rnd() * usableH);
            const r = 3 + Math.floor(rnd() * 6); // 3..9 px

            // Map y→parallax: top of band = pMin (farther), bottom = pMax (nearer)
            const t = (y - topPad) / Math.max(1, usableH); // 0..1
            const parallax = pMin + t * (pMax - pMin);

            return { id: s._id, x, y, r, author: s.authorName, story: s, parallax };
        });
    }, [stories, segmentWidth, viewport.viewportH, pMin, pMax]);

    const [hoverId, setHoverId] = useState<string | null>(null);

    // Garden's logical offset within one segment
    const offsetMod = ((viewport.offsetX % segmentWidth) + segmentWidth) % segmentWidth;

    // We still render 3 tiles for seamless wrap, but the overlay container itself
    // is *not* shifted by offset anymore. Each dot applies its own parallax shift.
    const baseLeft = -segmentWidth; // static; per-dot applies offset

    const onEnter = useCallback((id: string) => setHoverId(id), []);
    const onLeave = useCallback(() => setHoverId(null), []);

    const idx = Math.floor(Math.random() * 5) + 1;
    const bgFilename = `/gradients/bg-gradient-${String(idx).padStart(2, '0')}.png`;

    return (
        <div
            style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'auto',
                zIndex: 9999,
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: baseLeft,
                    width: segmentWidth * 3,
                    height: '100%',
                }}
            >
                {[-1, 0, 1].flatMap((tile) =>
                    dots.map((d) => {
                        // Parallaxed horizontal shift for this dot
                        // p=1 → follow world exactly, p=0 → fixed to screen
                        const parallaxShift = offsetMod * d.parallax;

                        const left = d.x + tile * segmentWidth - d.r - parallaxShift;
                        const top = d.y - d.r;
                        const key = `${tile}:${d.id}`;
                        const isHover = hoverId === key;

                        return (
                            <div key={key} style={{ position: 'absolute', left, top }}>
                                <button
                                    aria-label={`Open story by ${d.author}`}
                                    onClick={() => onDotClick(d.story)}
                                    onMouseEnter={() => onEnter(key)}
                                    onMouseLeave={onLeave}
                                    style={{
                                        width: d.r * 2,
                                        height: d.r * 2,
                                        borderRadius: '50%',
                                        background: '#fff',
                                        border: '4px solid #ffe',
                                        boxShadow: '0px 0px 20px rgba(255,255,255,0.75)',
                                        opacity: 0.95,
                                        pointerEvents: 'auto',
                                        cursor: 'pointer',
                                    }}
                                    title={d.author}
                                />
                                {isHover && (
                                    <div
                                        role="tooltip"
                                        style={{
                                            position: 'absolute',
                                            left: Math.max(-120, -60 + d.r),
                                            top: -34,
                                            padding: '6px 10px',
                                            background: 'white',
                                            border: '2px solid black',
                                            borderRadius: 10,
                                            whiteSpace: 'nowrap',
                                            fontSize: 12,
                                            fontWeight: 700,
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                            userSelect: 'none',
                                            pointerEvents: 'none',
                                            backgroundImage: `url(${bgFilename})`,
                                        }}
                                    >
                                        {d.author}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
