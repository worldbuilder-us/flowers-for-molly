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

  // NEW: debug state
  const [wireframeMode, setWireframeMode] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
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
          {/* NEW: Debug panel */}
          <div
            style={{
              position: 'absolute',
              top: 100,
              right: 12,
              zIndex: 99999,
              padding: '10px 12px',
              background: 'rgba(0,0,0,0.4)',
              color: '#fff',
              borderRadius: 8,
              fontSize: 13,
              lineHeight: 1.3,
              backdropFilter: 'blur(2px)',
              WebkitBackdropFilter: 'blur(2px)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
              userSelect: 'none'
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Debug</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={wireframeMode}
                onChange={(e) => setWireframeMode(e.target.checked)}
              />
              Wireframe sprites
            </label>
          </div>

          <InfiniteParallaxGarden
            segmentWidth={segmentWidth}
            layers={exampleLayers}
            initialOffsetX={1024}
            wheelToHorizontal
            onViewportChange={onViewportChange}
            debugWireframes={wireframeMode}
          />

          {/* dots overlay */}
          {!loading && stories.length > 0 && (
            <StoryDotsOverlay
              stories={stories}
              segmentWidth={segmentWidth}
              viewport={viewport}
              onDotClick={(s) => setActive(s)}
            />
          )}
        </div>

        <StoryModal story={active} onClose={() => setActive(null)} />
      </main>
    </>
  );
}
