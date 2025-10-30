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
    // Tiny LCG → [0,1)
    let x = (seed ^ 0x9e3779b9) >>> 0;
    return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 0xffffffff);
}

type Dot = {
    id: string;
    x: number; // 0..segmentWidth
    y: number; // px within viewport
    r: number; // radius px
    author: string;
    story: StoryListItem;
};

export default function StoryDotsOverlay({
    stories,
    segmentWidth,
    viewport,
    onDotClick,
}: {
    stories: StoryListItem[];
    segmentWidth: number;
    viewport: GardenViewport;
    onDotClick: (s: StoryListItem) => void;
}) {
    const dots = useMemo<Dot[]>(() => {
        const vh = Math.max(300, viewport.viewportH || 700);
        const topPad = Math.max(40, Math.round(vh * 0.08));
        const usableH = Math.max(120, Math.round(vh * 0.55)); // keep dots mostly upper half (over poem/garden)
        return stories.map((s) => {
            const h = hash32(s._id);
            const rnd = rng01(h);
            const x = Math.floor(rnd() * segmentWidth);
            const y = topPad + Math.floor(rnd() * usableH);
            const r = 3 + Math.floor(rnd() * 6); // 3..9 px
            return { id: s._id, x, y, r, author: s.authorName, story: s };
        });
    }, [stories, segmentWidth, viewport.viewportH]);

    const [hoverId, setHoverId] = useState<string | null>(null);
    const offsetMod = ((viewport.offsetX % segmentWidth) + segmentWidth) % segmentWidth;

    // We render 3 tiles wide, shifted so the middle tile is the current world
    const baseLeft = -segmentWidth - offsetMod;

    const onEnter = useCallback((id: string) => setHoverId(id), []);
    const onLeave = useCallback(() => setHoverId(null), []);

    const idx = Math.floor(Math.random() * 5) + 1;
    // filenames like bg-gradient-01.png ... bg-gradient-05.png
    const bgFilename = `/gradients/bg-gradient-${String(idx).padStart(2, "0")}.png`;

    return (
        <div
            // full overlay on top of garden
            aria-hidden
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
                        const left = d.x + tile * segmentWidth - d.r;
                        const top = d.y - d.r + 120;
                        const isHover = hoverId === `${tile}:${d.id}`;
                        return (
                            <div key={`${tile}:${d.id}`} style={{ position: 'absolute', left, top }}>
                                {/* dot */}
                                <button
                                    aria-label={`Open story by ${d.author}`}
                                    onClick={() => onDotClick(d.story)}
                                    onMouseEnter={() => onEnter(`${tile}:${d.id}`)}
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
                                />
                                {/* tooltip */}
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
