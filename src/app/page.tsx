// src/app/page.tsx
'use client';

import React from 'react';
import Header from './components/Header';
import GardenArc from './components/GardenArc';

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
  return (
    <>
      <Header />

      <main
        style={{
          width: '100%',
          height: 'calc(100vh - 80px)',
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
        <div style={{ marginTop: '8rem' }}>
          <h1
            style={{
              margin: 0,
              fontSize: '3rem',
              color: 'rgba(255, 243, 212, 0.95)',
              textShadow: '0 2px 8px rgba(106,115,116,0.45)',
              textAlign: 'center',
              lineHeight: 1.05,
              fontWeight: 700,
              letterSpacing: '0.02em',
            }}
          >
            flowers for molly.
          </h1>

          <section
            aria-label="Poem"
            style={{
              marginTop: '1rem',
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
                  fontSize: '1.25rem',
                  lineHeight: 2.6,
                  color: 'rgba(255, 243, 212, 0.95)',
                  textShadow: '0 2px 8px rgba(106,115,116,0.85)',
                  opacity: 0.95,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {line}
              </p>
            ))}
          </section>

          {/* Garden arc, positioned to embrace the poem’s lower lines */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              bottom: '-1.25rem',
              transform: 'translateX(-50%)',
              zIndex: 0,
              opacity: 0.98,
            }}
          >
            <GardenArc width={760} seed={9183} count={58} offsetY={0} />
          </div>
        </div>
      </main>
    </>
  );
}
