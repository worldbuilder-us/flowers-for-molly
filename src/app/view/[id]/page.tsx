'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
// import type p5 from 'p5';
// import { sketch } from '@/p5/sketch';
import Header from '../../components/Header';

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
                const res = await fetch(`/api/stories/${id}`, { cache: 'no-store' });
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
        return () => { cancelled = true; };
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

            <div
                style={{
                    position: 'relative',
                    zIndex: 1,
                    minHeight: 'calc(100vh - 80px)',
                    paddingTop: '6rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <div style={{ width: '100%', maxWidth: 900, padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button
                            onClick={() => router.back()}
                            style={{
                                padding: '8px 12px',
                                borderRadius: 8,
                                border: '1px solid rgba(0,0,0,0.08)',
                                background: 'transparent',
                                cursor: 'pointer',
                            }}
                        >
                            ← Back
                        </button>

                        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>
                            {loading ? 'Loading…' : story ? story.authorName : 'Not found'}
                        </h2>

                        <div style={{ marginLeft: 'auto' }}>
                            <Link href="/view" style={{ textDecoration: 'none', color: '#333' }}>
                                View index
                            </Link>
                        </div>
                    </div>

                    {/* Meta / contact */}
                    {!loading && story && (
                        <div style={{ marginTop: 8, color: '#fff', fontSize: '0.95rem' }}>
                            {story.authorEmail ? (
                                <a href={`mailto:${story.authorEmail}`} style={{ color: '#fff' }}>
                                    {story.authorEmail}
                                </a>
                            ) : null}
                            {story.importedAt ? (
                                <span style={{ marginLeft: 10 }}>
                                    · Imported {new Date(story.importedAt).toLocaleDateString()}
                                </span>
                            ) : null}
                        </div>
                    )}

                    {/* Story panel */}
                    <div
                        style={{
                            marginTop: 16,
                            border: '1px solid rgba(0,0,0,0.08)',
                            borderRadius: 12,
                            background: 'transparent',
                            boxShadow: '0 6px 20px rgba(0,0,0,0.06)',
                            maxHeight: '65vh',
                            overflow: 'auto',
                            padding: '18px 20px',
                            lineHeight: 1.5,
                            fontSize: '1.05rem',
                            whiteSpace: 'pre-wrap',         // preserve line breaks
                            wordWrap: 'break-word',
                        }}
                    >
                        {loading ? (
                            <div style={{ opacity: 0.6 }}>Loading story…</div>
                        ) : story ? (
                            // Prefer Markdown? Swap to a renderer later.
                            // For now, keep original spacing and most formatting:
                            story.textMarkdown
                        ) : (
                            <div>Story not found.</div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
