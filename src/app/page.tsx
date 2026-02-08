// src/app/page.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Header from "./components/Header";
import InfiniteParallaxGarden, {
  type PointerDebugInfo,
} from "./components/InfiniteParallaxGarden";
import StoryDotsOverlay from "./components/StoryDotsOverlay";
import StoryModal, { StoryListItem } from "./components/StoryModal";
import styles from "./Page.module.css";
import { getWorldConfig } from "./garden/biomeLoader";

const BACKGROUND_MUSIC_SRC = `/sound/${encodeURIComponent(
  "flowers for molly theme 0.1.mp3",
)}`;
const BACKGROUND_MUSIC_BASE_VOLUME = 0.2;
const BACKGROUND_MUSIC_FADE_DURATION = 4; // seconds

export default function Page() {
  const [stories, setStories] = useState<StoryListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewport, setViewport] = useState<{
    offsetX: number;
    logicalW: number;
    viewportW: number;
    viewportH: number;
  }>({
    offsetX: 0,
    logicalW: 0,
    viewportW: 0,
    viewportH: 0,
  });
  const [active, setActive] = useState<StoryListItem | null>(null);

  const [debugWireframesForeground, setDebugWireframesForeground] =
    useState(false);
  const [debugWireframesBackground, setDebugWireframesBackground] =
    useState(false);
  const [debugWireframesPinMode, setDebugWireframesPinMode] = useState(false);
  const [debugPointer, setDebugPointer] = useState(false);
  const [pointerDebug, setPointerDebug] = useState<PointerDebugInfo | null>(
    null,
  );
  const debugMode = process.env.NEXT_PUBLIC_DEBUG_MODE === "true";
  const [isMuted, setIsMuted] = useState(false);

  const worldConfig = useMemo(() => getWorldConfig(), []);
  const layers = worldConfig.layers;
  const activeBiome = worldConfig.layout.biomes[0];
  const activeBiomeName = activeBiome?.id ?? "meadow";

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const startMusic = () => {
      if (hasStartedRef.current) return;
      hasStartedRef.current = true;

      const audio = new Audio(BACKGROUND_MUSIC_SRC);
      audio.loop = true;
      audio.volume = 0;
      audio.muted = isMuted;

      const handleTimeUpdate = () => {
        if (!audio.duration || Number.isNaN(audio.duration)) return;
        if (audio.muted) {
          audio.volume = 0;
          return;
        }

        const t = audio.currentTime;
        const d = audio.duration;

        let volume = BACKGROUND_MUSIC_BASE_VOLUME;

        // Fade in at the start of each loop
        if (t < BACKGROUND_MUSIC_FADE_DURATION) {
          const progress = Math.min(1, t / BACKGROUND_MUSIC_FADE_DURATION);
          volume = BACKGROUND_MUSIC_BASE_VOLUME * progress;
        }

        // Fade out near the end of each loop
        const timeRemaining = d - t;
        if (timeRemaining < BACKGROUND_MUSIC_FADE_DURATION) {
          const progress = Math.max(
            0,
            timeRemaining / BACKGROUND_MUSIC_FADE_DURATION,
          );
          volume = BACKGROUND_MUSIC_BASE_VOLUME * progress;
        }

        audio.volume = Math.max(
          0,
          Math.min(BACKGROUND_MUSIC_BASE_VOLUME, volume),
        );
      };

      audio.addEventListener("timeupdate", handleTimeUpdate);

      audio.play().catch((err) => {
        // Autoplay can be blocked by the browser; in that case we just log.
        console.warn("Background music play blocked:", err);
      });

      audioRef.current = audio;
    };

    const interactionEvents: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
    ];

    interactionEvents.forEach((evt) =>
      window.addEventListener(evt, startMusic, { once: true }),
    );

    return () => {
      interactionEvents.forEach((evt) =>
        window.removeEventListener(evt, startMusic as EventListener),
      );
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current.load();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
      if (isMuted) {
        audioRef.current.volume = 0;
      }
    }
  }, [isMuted]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/stories?page=1&limit=1000`, {
          cache: "no-store",
        });
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
    return () => {
      cancelled = true;
    };
  }, []);

  const onViewportChange = useCallback(
    (v: {
      offsetX: number;
      logicalW: number;
      viewportW: number;
      viewportH: number;
    }) => {
      setViewport(v);
    },
    [],
  );

  const segmentWidth = worldConfig.layout.segmentWidth;

  // If pointer debug is turned off, clear any lingering pointer debug info
  useEffect(() => {
    if (!debugPointer) {
      setPointerDebug(null);
    }
  }, [debugPointer]);

  return (
    <>
      <main>
        {!debugWireframesForeground && !debugWireframesBackground && <Header />}
        <div
          className={styles.gardenContainer}
          style={{ position: "relative" }}
        >
          <button
            type="button"
            className={styles.muteButton}
            onClick={() => setIsMuted((prev) => !prev)}
            aria-label={isMuted ? "Unmute music" : "Mute music"}
            title={isMuted ? "Unmute music" : "Mute music"}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              {isMuted ? (
                <>
                  <path d="M4 9h4l5-4v14l-5-4H4z" />
                  <path d="M16 8l4 4m0-4l-4 4" strokeWidth="2" />
                </>
              ) : (
                <>
                  <path d="M4 9h4l5-4v14l-5-4H4z" />
                  <path d="M16 8a4 4 0 010 8" fill="none" strokeWidth="2" />
                  <path d="M18.5 6a7 7 0 010 12" fill="none" strokeWidth="2" />
                </>
              )}
            </svg>
          </button>
          {debugMode && (
            <div
              style={{
                position: "absolute",
                top: 100,
                right: 12,
                zIndex: 99999,
                padding: "10px 12px",
                background: "rgba(0,0,0,0.4)",
                color: "#fff",
                borderRadius: 8,
                fontSize: 13,
                lineHeight: 1.3,
                backdropFilter: "blur(2px)",
                WebkitBackdropFilter: "blur(2px)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
                userSelect: "none",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Debug</div>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={debugWireframesForeground}
                  onChange={(e) => setDebugWireframesForeground(e.target.checked)}
                />
                Wireframe foreground
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  marginTop: 6,
                }}
              >
                <input
                  type="checkbox"
                  checked={debugWireframesBackground}
                  onChange={(e) => setDebugWireframesBackground(e.target.checked)}
                />
                Wireframe background
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  marginTop: 6,
                }}
              >
                <input
                  type="checkbox"
                  checked={debugWireframesPinMode}
                  onChange={(e) => setDebugWireframesPinMode(e.target.checked)}
                />
                Pin wireframe on click
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  marginTop: 6,
                }}
              >
                <input
                  type="checkbox"
                  checked={debugPointer}
                  onChange={(e) => setDebugPointer(e.target.checked)}
                />
                Pointer debug
              </label>
            </div>
          )}

          <InfiniteParallaxGarden
            segmentWidth={segmentWidth}
            layers={layers}
            debugWireframesForeground={debugWireframesForeground}
            debugWireframesBackground={debugWireframesBackground}
            debugWireframesPinMode={debugWireframesPinMode}
            onViewportChange={onViewportChange}
            initialOffsetX={activeBiome?.startOffset ?? 0}
            // Only collect pointer debug info while pointer debug is on
            onPointerDebugChange={
              debugMode && debugPointer ? setPointerDebug : undefined
            }
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

          {/* Pointer debug tooltip (follows pointer, mouse + touch) */}
          {debugMode && debugPointer && pointerDebug && (
            <div
              style={{
                position: "fixed",
                left: pointerDebug.clientX + 12,
                top: pointerDebug.clientY + 12,
                zIndex: 100000,
                background: "rgba(0,0,0,0.85)",
                color: "#fff",
                padding: "6px 8px",
                borderRadius: 6,
                fontSize: 11,
                lineHeight: 1.3,
                maxWidth: 280,
                pointerEvents: "none",
                boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
              }}
            >
              <div>
                screen:{" "}
                {`${Math.round(pointerDebug.clientX)}, ${Math.round(
                  pointerDebug.clientY,
                )}`}
              </div>
              <div>
                garden:{" "}
                {`${Math.round(pointerDebug.containerX)}, ${Math.round(
                  pointerDebug.containerY,
                )}`}
              </div>
              <div>
                logicalX (scene):{" "}
                {`${pointerDebug.worldLogicalX.toFixed(1)} / ${
                  pointerDebug.segmentWidth
                }`}
              </div>
              <div>
                segment repeat: {pointerDebug.segmentRepeat} • localX:{" "}
                {pointerDebug.segmentLocalX.toFixed(1)}
              </div>
              <div>
                viewport offsetX:{" "}
                {pointerDebug.viewportLogicalOffsetX.toFixed(1)}
              </div>
              <div>sceneScale: {pointerDebug.sceneScale.toFixed(3)}</div>
              <div>biome: {activeBiomeName}</div>
            </div>
          )}
        </div>

        <StoryModal story={active} onClose={() => setActive(null)} />
      </main>
    </>
  );
}
