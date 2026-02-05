// src/app/components/DandelionParticles.tsx
"use client";

import React from "react";
import styles from "./DandelionParticles.module.css";

type Particle = {
  id: number;
  hx: number;
  hy: number;
  driftX: number;
  driftY: number;
  size: number;
  delay: number;
  depth: number;
};

type DandelionParticlesProps = {
  seed: number;
  dotRadius?: number;
  className?: string;
  style?: React.CSSProperties;
};

function rng01(seed: number) {
  let x = (seed ^ 0x9e3779b9) >>> 0;
  return () => (x = (x * 1664525 + 1013904223) >>> 0) / 0xffffffff;
}

export default function DandelionParticles({
  seed,
  dotRadius = 4,
  className,
  style,
}: DandelionParticlesProps) {
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

      const depth = 0.4 + rnd() * 6; // 0.4..≈6.4
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
  }, [seed]);

  return (
    <div
      className={className ? `${styles.particleLayer} ${className}` : styles.particleLayer}
      aria-hidden="true"
      style={{
        // particles are purely visual; do not eat pointer events
        pointerEvents: "none",
        // helix origin sits just to the right of the dot by default
        left: dotRadius * 2 + 6,
        ...style,
      }}
    >
      {particles.map((p) => {
        const particleStyle: React.CSSProperties = {
          width: p.size,
          height: p.size,
          animationDelay: `${p.delay}s`,
          animationDuration: `${2.2 + p.depth * 1.3}s`,
          "--hx": `${p.hx}px`,
          "--hy": `${p.hy}px`,
          "--driftX": `${p.driftX}px`,
          "--driftY": `${p.driftY}px`,
          "--depthScale": `${0.8 + p.depth * 0.6}`,
          "--depthAlpha": `${0.4 + p.depth * 0.5}`,
        } as React.CSSProperties;

        return (
          <div
            key={p.id}
            className={styles.particleDot}
            style={particleStyle}
          />
        );
      })}
    </div>
  );
}
