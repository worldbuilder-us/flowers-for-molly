// src/app/page.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Header from './components/Header';
import InfiniteParallaxGarden, { exampleLayers } from './components/InfiniteParallaxGarden';
import StoryDotsOverlay from './components/StoryDotsOverlay';
import StoryModal, { StoryListItem } from './components/StoryModal';
import styles from './Page.module.css';

export default function Page() {
  const [stories, setStories] = useState<StoryListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewport, setViewport] = useState<{ offsetX: number; viewportW: number; viewportH: number }>({
    offsetX: 0, viewportW: 0, viewportH: 0
  });
  const [active, setActive] = useState<StoryListItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // pull a big batch; you can paginate or lazy-load later
        const res = await fetch(`/api/stories?page=1&limit=1000`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) setStories(json.stories || []);
      } catch (e) {
        console.error(e);
        if (!cancelled) setStories([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const onViewportChange = useCallback((v: { offsetX: number; viewportW: number; viewportH: number }) => {
    setViewport(v);
  }, []);

  const segmentWidth = 4096;

  return (
    <>
      <main>
        <Header />
        <div className={styles.gardenContainer} style={{ position: 'relative' }}>
          <InfiniteParallaxGarden
            segmentWidth={segmentWidth}
            layers={exampleLayers}
            initialOffsetX={1024}
            wheelToHorizontal
            onViewportChange={onViewportChange}   // ← keep overlay in sync
          />

          {/* dots overlay (hidden while loading to avoid pop-in, optional) */}
          {!loading && stories.length > 0 && (
            <StoryDotsOverlay
              stories={stories}
              segmentWidth={segmentWidth}
              viewport={viewport}
              onDotClick={(s) => setActive(s)}
            />
          )}
        </div>

        {/* modal */}
        <StoryModal story={active} onClose={() => setActive(null)} />
      </main>
    </>
  );
}
