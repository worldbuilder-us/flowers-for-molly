// src/app/view/[id]/page.tsx

"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
// import type p5 from 'p5';
// import { sketch } from '@/p5/sketch';
import Header from "../../components/Header";
import { goldenbookFont, montserratFont } from "../../fonts";
import styles from "../StoryDetailPage.module.css";

type Story = {
  _id: string;
  authorName: string;
  authorEmail?: string;
  authorEmailRaw?: string;
  textMarkdown: string;
  textPlain: string;
  importedAt?: string;
};

export default function StoryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  // const hostRef = useRef<HTMLDivElement | null>(null);
  // const p5InstanceRef = useRef<p5 | null>(null);

  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/stories/${id}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: Story = await res.json();
        if (!cancelled) setStory(json);
      } catch (e) {
        console.error(e);
        if (!cancelled) setStory(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Optional p5 background (uncomment to enable)
  // useEffect(() => {
  //   let cancelled = false;
  //   (async () => {
  //     const { default: P5 } = await import('p5');
  //     if (!cancelled && hostRef.current) {
  //       p5InstanceRef.current = new P5(sketch, hostRef.current);
  //     }
  //   })();
  //   return () => {
  //     cancelled = true;
  //     p5InstanceRef.current?.remove();
  //     p5InstanceRef.current = null;
  //   };
  // }, [id]);

  return (
    <>
      <Header />

      {/* host for p5 (canvas sits under content) */}
      {/* <div
        ref={hostRef}
        style={{
          position: 'fixed',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      /> */}

      <main className={`${styles.storyMain} ${goldenbookFont.className}`}>
        <div className={styles.storyContent}>
          <div className={styles.headerRow}>
            <button
              onClick={() => router.back()}
              className={`${styles.backButton} ${montserratFont.className}`}
            >
              ← Back
            </button>

            <h2 className={styles.headerTitle}>
              {loading ? "Loading…" : story ? story.authorName : "Not found"}
            </h2>

            <Link href="/view" className={styles.indexLink}>
              View index
            </Link>
          </div>

          {/* Meta / contact */}
          {!loading && story && (
            <div className={styles.metaRow}>
              {story.authorEmail ? (
                <a href={`mailto:${story.authorEmail}`}>
                  {story.authorEmail}
                </a>
              ) : null}
              {story.importedAt ? (
                <span>
                  {" "}
                  · Imported {new Date(story.importedAt).toLocaleDateString()}
                </span>
              ) : null}
            </div>
          )}

          {/* Story panel */}
          <div className={styles.storyPanel}>
            {loading ? (
              <div className={styles.loadingText}>Loading story…</div>
            ) : story ? (
              // Prefer Markdown? Swap to a renderer later.
              // For now, keep original spacing and most formatting:
              story.textMarkdown
            ) : (
              <div>Story not found.</div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
