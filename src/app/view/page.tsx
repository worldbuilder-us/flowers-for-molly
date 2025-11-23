// src/app/view/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import StoryModal, { StoryListItem } from "../components/StoryModal";
import { goldenbookFont } from "../fonts";
import styles from "./ViewPage.module.css";

type ApiResp = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  stories: StoryListItem[];
};

const PAGE_SIZE = 12; // 3 columns × 4 rows on desktop

export default function ViewIndex() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ApiResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeStory, setActiveStory] = useState<StoryListItem | null>(null);

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
                </button>
              );
            })}
          </div>

          {/* Pager */}
          <div className={styles.pager}>
            <button
              aria-label="Previous page"
              disabled={!canPrev || loading}
              onClick={() => canPrev && setPage((p) => p - 1)}
              className={styles.pagerButton}
            >
              <svg width="44" height="28" viewBox="0 0 44 28" aria-hidden>
                <path
                  d="M18 3 L4 14 L18 25"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <line
                  x1="6"
                  y1="14"
                  x2="40"
                  y2="14"
                  stroke="white"
                  strokeWidth="3"
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
              <svg width="44" height="28" viewBox="0 0 44 28" aria-hidden>
                <path
                  d="M26 3 L40 14 L26 25"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <line
                  x1="4"
                  y1="14"
                  x2="38"
                  y2="14"
                  stroke="white"
                  strokeWidth="3"
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
