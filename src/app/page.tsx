// src/app/page.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import type p5 from 'p5';
import { sketch } from '@/p5/sketch';
import Header from './components/Header';

const POEM_LINES = [
  'The trees will remember your name.',
  'The things you grew up with, they will not forget you.',
  'Your friends, your family, the house in which you were born.',
  'The sunlight across the bay.',
  'The place where we met.',
  'The green field where you said yes.',
  'Your children.',
  'The garden we started to grow.',
  "I’ll take them with me, I’ll carry them from here.",
];

export default function Page() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const p5InstanceRef = useRef<p5 | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { default: P5 } = await import('p5');

      if (!cancelled && hostRef.current) {
        p5InstanceRef.current = new P5(sketch, hostRef.current);
      }
    })();

    return () => {
      cancelled = true;
      p5InstanceRef.current?.remove();
      p5InstanceRef.current = null;
    };
  }, []);

  return (
    <>
      <Header />

      <div
        ref={hostRef}
        style={{
          position: 'fixed',
          inset: 0,
          overflow: 'hidden',
        }}
      />

      <main
        style={{
          width: '100%',
          height: 'calc(100vh - 150px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingTop: '6rem',
          position: 'relative',
          zIndex: 1000,
          gap: '1rem',
          boxSizing: 'border-box',
          paddingLeft: '1.25rem',
          paddingRight: '1.25rem',
          background: 'transparent',
        }}
      >
        <div style={{ marginTop: '5rem' }}>
          <h1
            style={{
              margin: 0,
              fontSize: '3rem',
              color: 'rgba(255, 243, 212, 0.95)',
              textShadow: '0 2px 8px rgba(106,115,116,0.45)',
              textAlign: 'center',
              lineHeight: 1.05,
              fontWeight: 700,
              letterSpacing: '20%',
            }}
          >
            flowers for molly.
          </h1>

          <section
            aria-label="Poem"
            style={{
              marginTop: '0.75rem',
              maxWidth: '60ch',
              width: '100%',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            {POEM_LINES.map((line, i) => (
              <p
                key={i}
                style={{
                  margin: 0,
                  fontSize: '1.5rem',
                  lineHeight: 1.6,
                  color: 'rgba(255, 243, 212, 0.95)',
                  textShadow: '0 2px 8px rgba(106,115,116,0.85)',
                  opacity: 0.95,
                  whiteSpace: 'pre-wrap',
                  letterSpacing: '10%',
                }}
              >
                {line}
              </p>
            ))}
          </section>
        </div>
      </main>
    </>
  );
}
