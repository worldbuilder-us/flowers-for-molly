// src/app/components/StoryDotsOverlay.tsx
"use client";

import React, { useMemo, useState, useCallback } from "react";
import styles from "./StoryDotsOverlay.module.css";
import type { GardenViewport } from "./InfiniteParallaxGarden";
import type { StoryListItem } from "./StoryModal";

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
  return () => (x = (x * 1664525 + 1013904223) >>> 0) / 0xffffffff;
}

type Dot = {
  id: string;
  x: number; // [0, segmentWidth)
  y: number; // px within overlay
  r: number; // radius px
  author: string;
  story: StoryListItem;
  parallax: number; // 0..1 (we'll lock to 1 to stick to world)
};

type Particle = {
  id: number;
  hx: number; // helix target position (x) relative to dot
  hy: number; // helix target position (y) relative to dot
  driftX: number; // drift from helix further out
  driftY: number;
  size: number;
  delay: number;
  depth: number; // 0..1, drives size/alpha
};

type StoryDotsOverlayProps = {
  stories: StoryListItem[];
  segmentWidth: number;
  viewport: GardenViewport;
  onDotClick: (s: StoryListItem) => void;
  /** Optional: min/max parallax range for dots */
  pMin?: number;
  pMax?: number;
};

/**
 * Sideways vortex:
 * - Axis runs along +X to the right of the dot.
 * - Particles start *at the dot* (0,0).
 * - They flow into positions along an implied helix, then drift
 *   gently outward, with randomness so the helix is visible but
 *   not rigid.
 */
function ParticleSpiral({
  dotRadius,
  seed,
}: {
  dotRadius: number;
  seed: number;
}) {
  const particles = React.useMemo<Particle[]>(() => {
    const count = 250;
    const helixLength = 240; // how far the helix runs along +X
    const rnd = rng01(seed ^ 0xabc123);

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const helixPos = (u: number, phase: number) => {
      // u: 0..1 along the helix axis
      const turns = 10; // number of rotations along the length
      const theta = u * turns * 2 * Math.PI + phase;

      const radiusMin = 4;
      const radiusMax = 60;
      const radius = radiusMin + (radiusMax - radiusMin) * easeOutCubic(u);

      const cy = radius * Math.sin(theta); // vertical swirl
      const cz = radius * Math.cos(theta); // depth swirl

      // project to screen: axis along +X with a slight depth tilt
      const centerX = helixLength * u;
      const x = centerX + cz * 0.45;
      const y = cy * 1;

      return { x, y };
    };

    const items: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const base = i / count;

      const depth = 0.4 + rnd() * 6; // 0.4..1.0
      const phase = rnd() * Math.PI * 5;

      // Where along the helix this particle will "settle"
      // Some near the origin, some further along +X.
      const uTarget = base * 0.85 + rnd() * 0.15; // 0..~1, biased forward
      const clampedU = Math.min(1, uTarget);

      const helix = helixPos(clampedU, phase);

      // Jitter around helix so it's implied, not perfectly traced
      const jitterX = (rnd() - 0.1) * 50;
      const jitterY = (rnd() - 0.1) * 50;

      const hx = helix.x + jitterX;
      const hy = helix.y + jitterY;

      // Drift direction: mostly to the right with a little vertical wiggle
      const driftMag = 30 + rnd() * 80; // how far to drift from the helix
      const driftAngle = (rnd() - 0.3) * 0.9; // small angle around +X
      const driftX = driftMag * Math.cos(driftAngle);
      const driftY = driftMag * Math.sin(driftAngle) * 0.5;

      const baseSize = 0.8 + rnd() * 2.0;
      const size = baseSize * (0.7 + depth * 0.1);

      // Particles that end closer to the dot appear earlier; those further
      // along the axis have slightly larger delays -> continuous stream.
      const delay = clampedU * 0.8 + rnd() * 0.25;

      items.push({
        id: i,
        hx,
        hy,
        driftX,
        driftY,
        size,
        delay,
        depth,
      });
    }

    return items;
  }, [dotRadius, seed]);

  return (
    <div
      className={styles.particleLayer}
      aria-hidden="true"
      style={{
        // helix origin sits just to the right of the dot
        left: dotRadius * 2 + 6,
      }}
    >
      {particles.map((p) => (
        <div
          key={p.id}
          className={styles.particleDot}
          style={{
            width: p.size,
            height: p.size,
            animationDelay: `${p.delay}s`,
            // keep durations reasonably long so motion feels like drift
            animationDuration: `${2.2 + p.depth * 1.3}s`,
            ["--hx" as any]: `${p.hx}px`,
            ["--hy" as any]: `${p.hy}px`,
            ["--driftX" as any]: `${p.driftX}px`,
            ["--driftY" as any]: `${p.driftY}px`,
            ["--depthScale" as any]: `${0.8 + p.depth * 0.6}`,
            ["--depthAlpha" as any]: `${0.4 + p.depth * 0.5}`,
          }}
        />
      ))}
    </div>
  );
}

export default function StoryDotsOverlay({
  stories,
  segmentWidth,
  viewport,
  onDotClick,
  pMin = 0.35,
  pMax = 0.95,
}: StoryDotsOverlayProps) {
  const dots = useMemo<Dot[]>(() => {
    const vh = Math.max(300, viewport.viewportH || 700);
    const topPad = Math.max(40, Math.round(vh * 0.08));
    const usableH = Math.max(120, Math.round(vh * 0.55));

    return stories.map((s) => {
      const h = hash32(s._id);
      const rnd = rng01(h);
      const x = Math.floor(rnd() * segmentWidth);
      const y = topPad + Math.floor(rnd() * usableH);
      const r = 8 + Math.floor(rnd() * 6);

      // We keep t/pMin/pMax around, but we *lock* parallax to 1 so that
      // dots are fixed in world space (no layer parallax).
      const t = (y - topPad) / Math.max(1, usableH);
      const _parallax = pMin + t * (pMax - pMin);
      const parallax = 1; // <- lock to world; no parallax vs layers

      return { id: s._id, x, y, r, author: s.authorName, story: s, parallax };
    });
  }, [stories, segmentWidth, viewport.viewportH, pMin, pMax]);

  const [hoverId, setHoverId] = useState<string | null>(null);
  const [triggeredSpirals, setTriggeredSpirals] = useState<
    Record<string, boolean>
  >({});

  // Logical world offset within one segment; we use this with parallax=1
  // so dots are pinned to world coordinates across the full segment.
  const offsetMod =
    ((viewport.offsetX % segmentWidth) + segmentWidth) % segmentWidth;

  const baseLeft = -segmentWidth;

  const onEnter = useCallback((key: string, storyId: string) => {
    setHoverId(key);
    setTriggeredSpirals((prev) =>
      prev[storyId] ? prev : { ...prev, [storyId]: true }
    );
  }, []);

  const onLeave = useCallback(() => setHoverId(null), []);

  return (
    <div className={styles.storyDotsOverlay}>
      <div
        className={styles.tiles}
        style={{
          left: baseLeft,
          width: segmentWidth * 3,
        }}
      >
        {[-1, 0, 1].flatMap((tile) =>
          dots.map((d) => {
            // World-locked dots: parallax is fixed to 1, so we use the
            // raw world offset here (no layer-relative parallax factor).
            const parallaxShift = offsetMod; // <- changed from offsetMod * d.parallax

            const left = d.x + tile * segmentWidth - d.r - parallaxShift;
            const top = d.y - d.r;
            const key = `${tile}:${d.id}`;
            const triggerKey = d.id;

            const isHover = hoverId === key;
            const hasTriggered = !!triggeredSpirals[triggerKey];

            return (
              <div
                key={key}
                className={styles.dotWrapper}
                style={{ left, top }}
              >
                <button
                  aria-label={`Open story by ${d.author}`}
                  onClick={() => onDotClick(d.story)}
                  onMouseEnter={() => onEnter(key, d.id)}
                  onMouseLeave={onLeave}
                  className={styles.dotButton}
                  style={{
                    width: d.r * 2,
                    height: d.r * 2,
                  }}
                  title={d.author}
                />

                {isHover && (
                  <div className={styles.tooltip}>
                    <span className={styles.tooltipText}>{d.author}</span>
                  </div>
                )}

                {hasTriggered && (
                  <ParticleSpiral dotRadius={d.r} seed={hash32(d.id)} />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
