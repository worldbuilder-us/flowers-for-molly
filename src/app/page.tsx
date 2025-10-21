// src/app/page.tsx
'use client';

import React from 'react';
import Header from './components/Header';
import InfiniteParallaxGarden, { exampleLayers } from './components/InfiniteParallaxGarden';
import styles from './Page.module.css';

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
      <main>
        <Header />
        <div className={styles.gardenContainer}>
          <InfiniteParallaxGarden
            segmentWidth={4096}
            layers={exampleLayers}
            initialOffsetX={1024}
            wheelToHorizontal
          />
        </div>
      </main>
    </>
  );
}
