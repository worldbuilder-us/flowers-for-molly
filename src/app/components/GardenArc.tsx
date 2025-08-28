'use client';

import React, { memo, useMemo } from 'react';

type GardenArcProps = {
    /** Overall width in CSS pixels; height is derived from the viewBox. */
    width?: number | string;
    /** Deterministic randomization of plant choices/variation. */
    seed?: number;
    /** How dense the ring is. 36–72 is a nice range. */
    count?: number;
    /** Additional vertical nudge (px) for fine placement around your poem. */
    offsetY?: number;
};

function makeRng(seed = 1) {
    // Small LCG for deterministic “random”
    let s = (seed >>> 0) || 1;
    return () => {
        s = (1664525 * s + 1013904223) >>> 0;
        return (s & 0xffffffff) / 0x100000000;
    };
}

/** Simple helpers */
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const rad2deg = (r: number) => (r * 180) / Math.PI;

const GardenArc: React.FC<GardenArcProps> = memo(({ width = 760, seed = 7_189, count = 56, offsetY = 200 }) => {
    // ViewBox coords (virtual drawing space)
    const vb = { w: 1000, h: 420 };

    // Ellipse parameters for the perspective half-ring
    const cx = 500;   // center x
    const cy = 175;   // center y (close to bottom of viewBox)
    const rx = 100;   // horizontal radius
    const ry = 100;   // vertical radius (taller = deeper perspective)

    // We’ll place plants from theta_start..theta_end across the **lower** half of the ellipse.
    // Trim a little off the edges so it doesn't look too flat.
    const thetaStart = Math.PI + 0.22;       // ~200.6°
    const thetaEnd = 2 * Math.PI - 0.22;   // ~339.4°

    const rng = useMemo(() => makeRng(seed), [seed]);

    // Precompute placements
    const placements = useMemo(() => {
        const arr: Array<{
            x: number; y: number; s: number; rotDeg: number; kind: 'grass' | 'wildflower' | 'milkweed' | 'thistle';
        }> = [];
        for (let i = 0; i < count; i++) {
            const t = i / (count - 1);
            const th = lerp(thetaStart, thetaEnd, t);

            const x = cx + rx * Math.cos(th);
            const y = cy + ry * Math.sin(th);

            // Scale: larger near bottom-center (th ≈ 3π/2), smaller at edges
            const center = 1.5 * Math.PI;
            const span = (thetaEnd - thetaStart) / 2; // half-span
            const closeness = 1 - Math.min(1, Math.abs(th - center) / span); // 1 at center, 0 at edges
            const baseS = lerp(0.45, 1.15, Math.pow(closeness, 0.7));
            const jitter = lerp(0.9, 1.12, rng());
            const s = clamp(baseS * jitter, 0.4, 1.25);

            // Rotate each plant a touch to lean “outward”
            // Approx outward angle ~ vector from center to point + 90°
            const outward = Math.atan2(y - cy, x - cx) + Math.PI / 2;
            const rotDeg = rad2deg(outward) + lerp(-7, 7, rng());

            // Choose plant type with tasteful distribution
            const r = rng();
            const kind =
                r < 0.38 ? 'grass'
                    : r < 0.60 ? 'wildflower'
                        : r < 0.82 ? 'milkweed'
                            : 'thistle';

            arr.push({ x, y, s, rotDeg, kind });
        }
        return arr;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [count, seed]);

    return (
        <svg
            aria-label="Impressionist garden arc"
            width={typeof width === 'number' ? `${width}px` : width}
            viewBox={`0 0 ${vb.w} ${vb.h}`}
            role="img"
            style={{
                display: 'block',
                pointerEvents: 'none',
                // Subtle compositing helps it sit into the page
                mixBlendMode: 'multiply',
                transform: `translateY(${offsetY}px)`,
            }}
        >
            <defs>
                {/* A nearly-black that reads as elegant ink on warm backgrounds */}
                <style>{`
          .ink { fill: #0b0b0b; }
          .ink-muted { fill: #111; opacity: 0.85; }
        `}</style>

                {/* A whisper of drop shadow to suggest depth without breaking silhouette feel */}
                <filter id="soft-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" flood-color="#000" flood-opacity="0.35" />
                </filter>

                {/* --- Silhouette library -------------------------------------------------- */}

                {/* GRASS tufts: overlapping blades */}
                <g id="sil-grass" className="ink">
                    {/* base mound */}
                    {/* <path d="M-22,8 C-14,2 -8,1 0,0 C8,1 14,2 22,8 C22,12 -22,12 -22,8 Z" /> */}
                    {/* blades (cubic swoops) */}
                    <path d="M-16,8 C-14,-8 -10,-18 -8,-26" />
                    <path d="M-8,8 C-6,-10 -1,-20 0,-32" />
                    <path d="M-1,8 C1,-7 6,-18 9,-28" />
                    <path d="M7,8 C9,-9 14,-18 18,-25" />
                </g>

                {/* WILDFLOWER: simple five-petal bloom on a slender stem */}
                <g id="sil-wildflower" className="ink">
                    {/* stem */}
                    <path d="M0,12 C-1,6 -1,2 0,-16" />
                    {/* leaves */}
                    <path d="M-2,0 C-10,-2 -14,-6 -16,-10 C-8,-8 -5,-6 -2,0 Z" />
                    <path d="M2,-6 C10,-4 14,-8 16,-12 C8,-10 5,-8 2,-6 Z" />
                    {/* bloom */}
                    <g transform="translate(0,-22)">
                        <path d="M0,-7 C3,-7 5,-5 5,-2 C5,1 3,3 0,3 C-3,3 -5,1 -5,-2 C-5,-5 -3,-7 0,-7 Z" />
                        <path d="M0,-7 C-2,-10 0,-13 3,-13 C6,-13 8,-10 6,-7 C4,-5 2,-5 0,-7 Z" />
                        <path d="M0,-7 C2,-10 0,-13 -3,-13 C-6,-13 -8,-10 -6,-7 C-4,-5 -2,-5 0,-7 Z" />
                        <path d="M0,-7 C3,-6 5,-4 5,0 C5,4 3,6 0,7 C-3,6 -5,4 -5,0 C-5,-4 -3,-6 0,-7 Z" />
                        <circle cx="0" cy="-6.5" r="1.6" />
                    </g>
                </g>

                {/* MILKWEED: tall stalk with opposite leaves + umbel (cluster) */}
                <g id="sil-milkweed" className="ink">
                    {/* stalk */}
                    <path d="M0,18 C0,0 0,-8 0,-28" />
                    {/* opposite leaves (broad, smooth) */}
                    <path d="M-1,4 C-14,2 -20,-3 -22,-10 C-12,-8 -6,-6 -1,4 Z" />
                    <path d="M1,-2 C14,-4 20,-9 22,-16 C12,-14 6,-12 1,-2 Z" />
                    <path d="M-1,-12 C-16,-12 -22,-18 -24,-24 C-12,-22 -6,-20 -1,-12 Z" />
                    <path d="M1,-18 C16,-18 22,-24 24,-30 C12,-28 6,-26 1,-18 Z" />
                    {/* umbel: many small florets as a single dense silhouette */}
                    <g transform="translate(0,-34)">
                        <path d="M0,-2 C14,-2 22,6 22,12 C22,16 -22,16 -22,12 C-22,6 -14,-2 0,-2 Z" />
                    </g>
                </g>

                {/* THISTLE: serrated leaves + spiky head */}
                <g id="sil-thistle" className="ink">
                    {/* stem */}
                    <path d="M0,16 C0,6 0,-4 0,-22" />
                    {/* jagged leaves */}
                    <path d="M0,2 C-10,0 -18,-4 -22,-8 C-14,-8 -8,-10 0,-12 C-8,-14 -14,-18 -20,-24 C-10,-22 -4,-20 0,-18 Z" />
                    <path d="M0,-4 C10,-6 18,-10 22,-14 C14,-14 8,-16 0,-18 C8,-20 14,-24 20,-30 C10,-28 4,-26 0,-24 Z" />
                    {/* head (ovoid) */}
                    <path d="M0,-28 C8,-28 12,-20 12,-14 C12,-10 -12,-10 -12,-14 C-12,-20 -8,-28 0,-28 Z" />
                    {/* crown spikes */}
                    <path d="M-12,-14 l-3,-5 M-8,-15 l-2,-6 M-4,-16 l-1,-6 M0,-16 l0,-6 M4,-16 l1,-6 M8,-15 l2,-6 M12,-14 l3,-5" stroke="#0b0b0b" strokeWidth="1.3" />
                </g>
            </defs>

            {/* A faint filled ground beneath the ring to “seat” the silhouettes */}
            {/* <path
                className="ink-muted"
                d={`
          M ${cx - rx}, ${cy}
          Q ${cx}, ${cy + ry * 0.22} ${cx + rx}, ${cy}
          L ${cx + rx}, ${vb.h}
          L ${cx - rx}, ${vb.h}
          Z
        `}
            /> */}

            {/* The arc: render back-to-front so center plants overlap edges nicely */}
            {placements.map((p, idx) => {
                const id =
                    p.kind === 'grass' ? 'sil-grass' : 'sil-grass'
                // : p.kind === 'wildflower' ? 'sil-wildflower'
                // : p.kind === 'milkweed' ? 'sil-milkweed'
                // : 'sil-thistle';

                // Slight vertical sink so bases interlock and “fill in”
                const baseSink = lerp(2, 10, Math.min(1, p.s));
                const transform = `
          translate(${p.x.toFixed(2)} ${(p.y + 4 + baseSink).toFixed(2)})
          rotate(${p.rotDeg.toFixed(2)})
          scale(${(p.s * 1.0).toFixed(2)})
        `;

                return (
                    <use
                        key={idx}
                        href={`#${id}`}
                        transform={transform}
                        filter="url(#soft-shadow)"
                    />
                );
            })}

            {/* A foreground cluster near the viewer for a little extra depth */}
            {/*
            <g opacity={0.95}>
                <use href="#sil-grass" transform={`translate(${cx}, ${cy + 8}) scale(2.35)`} filter="url(#soft-shadow)" />
                <use href="#sil-wildflower" transform={`translate(${cx - 30}, ${cy + 4}) rotate(-6) scale(1.1)`} filter="url(#soft-shadow)" />
                <use href="#sil-thistle" transform={`translate(${cx + 34}, ${cy + 2}) rotate(8) scale(1.08)`} filter="url(#soft-shadow)" />
                <use href="#sil-grass" transform={`translate(${cx - 90}, ${cy + 12}) scale(1.6)`} filter="url(#soft-shadow)" />
                <use href="#sil-grass" transform={`translate(${cx + 88}, ${cy + 12}) scale(1.6)`} filter="url(#soft-shadow)" />

            </g>
*/}
        </svg>
    );
});

GardenArc.displayName = 'GardenArc';
export default GardenArc;
