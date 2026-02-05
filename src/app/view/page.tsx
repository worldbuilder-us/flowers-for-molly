// src/app/view/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import DandelionParticles from "../components/DandelionParticles";
import StoryModal, { StoryListItem } from "../components/StoryModal";
import { goldenbookFont, montserratFont } from "../fonts";
import styles from "./ViewPage.module.css";

type ApiResp = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  stories: StoryListItem[];
};

const PAGE_SIZE = 12; // 3 columns × 4 rows on desktop

function hash32(s: string): number {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

export default function ViewIndex() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ApiResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeStory, setActiveStory] = useState<StoryListItem | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/stories?page=${page}&limit=${PAGE_SIZE}`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: ApiResp = await res.json();
        if (!cancelled) setData(json);
      } catch (e) {
        console.error(e);
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page]);

  const items = data?.stories ?? [];
  const totalPages = data?.totalPages ?? 1;

  const canPrev = page > 1;
  const canNext = page < totalPages;

  const skeletons = useMemo(() => Array.from({ length: PAGE_SIZE }), []);

  return (
    <>
      <Header />

      <main className={`${styles.viewMain} ${goldenbookFont.className}`}>
        <div className={styles.viewInner}>
          {/* Grid */}
          <div className={styles.grid}>
            {(loading ? skeletons : items).map((item, idx) => {
              if (loading) {
                return (
                  <div
                    key={`sk-${idx}`}
                    aria-hidden
                    className={styles.cardSkeleton}
                  />
                );
              }

              const story = item as StoryListItem;
              const snippet =
                story.textPlain.length > 140
                  ? story.textPlain.slice(0, 137) + "…"
                  : story.textPlain;

                return (
                  <button
                    key={story._id}
                    type="button"
                    className={styles.card}
                    aria-label={`Open story by ${story.authorName}`}
                    onClick={() => setActiveStory(story)}
                    onMouseEnter={() => setHoverId(story._id)}
                    onMouseLeave={() => setHoverId(null)}
                  >
                    <div className={styles.cardBody}>
                      <div className={styles.cardAuthor} title={story.authorName}>
                        {story.authorName}
                      </div>

                    {/* <div className={styles.cardSnippet}>{snippet}</div> */}

                    {/* <div className={styles.cardIndex}>
                      {data ? `${data.page}:${idx + 1}` : idx + 1}
                    </div> */}
                    </div>

                    {hoverId === story._id ? (
                      <DandelionParticles
                        seed={hash32(story._id)}
                        className={styles.cardParticles}
                        dotRadius={5}
                        style={{
                          left: "100%",
                          top: "50%",
                          transform: "translate(0, -50%)",
                        }}
                      />
                    ) : null}
                  </button>
                );
              })}
          </div>

          {/* Pager */}
          <div className={`${styles.pager} ${montserratFont.className}`}>
            <button
              aria-label="Previous page"
              disabled={!canPrev || loading}
              onClick={() => canPrev && setPage((p) => p - 1)}
              className={`${styles.pagerButton}`}
            >
              <svg viewBox="0 0 20 12" aria-hidden>
                <path
                  d="M10 2 L4 6 L10 10"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <div className={styles.pagerLabel}>
              {data ? `Page ${data.page} / ${data.totalPages}` : "Loading…"}
            </div>

            <button
              aria-label="Next page"
              disabled={!canNext || loading}
              onClick={() => canNext && setPage((p) => p + 1)}
              className={styles.pagerButton}
            >
              <svg viewBox="0 0 20 12" aria-hidden>
                <path
                  d="M10 2 L16 6 L10 10"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </main>

      <StoryModal story={activeStory} onClose={() => setActiveStory(null)} />
    </>
  );
}
