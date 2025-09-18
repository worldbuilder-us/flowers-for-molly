'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Header from '../components/Header';

type StoryListItem = {
    _id: string;
    authorName: string;
    authorEmail?: string;
    textPlain: string;
    textMarkdown: string;
    importedAt?: string;
};

type ApiResp = {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    stories: StoryListItem[];
};

const PAGE_SIZE = 25;

export default function ViewIndex() {
    const [page, setPage] = useState(1);
    const [data, setData] = useState<ApiResp | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/stories?page=${page}&limit=${PAGE_SIZE}`, { cache: 'no-store' });
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
        return () => { cancelled = true; };
    }, [page]);

    const items = data?.stories ?? [];
    const totalPages = data?.totalPages ?? 1;

    const canPrev = page > 1;
    const canNext = page < totalPages;

    // 5x5 grid placeholder if loading
    const skeletons = useMemo(() => Array.from({ length: PAGE_SIZE }), []);

    return (
        <>
            <Header />

            <div
                style={{
                    width: '100%',
                    minHeight: 'calc(100vh - 80px)',
                    boxSizing: 'border-box',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                }}
            >
                <div
                    style={{
                        width: 'min(1100px, 92%)',
                        marginTop: '8%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                    }}
                >
                    {/* Grid */}
                    <div
                        style={{
                            width: '100%',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(5, 1fr)',
                            gap: 20,
                        }}
                    >
                        {(loading ? skeletons : items).map((item, idx) => {
                            if (loading) {
                                return (
                                    <div
                                        key={`sk-${idx}`}
                                        aria-hidden
                                        style={{
                                            height: 0,
                                            paddingBottom: '100%',
                                            position: 'relative',
                                            borderRadius: 18,
                                            border: '6px solid black',
                                            background:
                                                'repeating-linear-gradient(45deg, #f5f5f5, #f5f5f5 10px, #efefef 10px, #efefef 20px)',
                                            opacity: 0.7,
                                        }}
                                    />
                                );
                            }

                            const story = item as StoryListItem;
                            const snippet =
                                story.textPlain.length > 120
                                    ? story.textPlain.slice(0, 117) + '…'
                                    : story.textPlain;

                            return (
                                <Link
                                    key={story._id}
                                    href={`/view/${story._id}`}
                                    style={{ textDecoration: 'none' }}
                                >
                                    <div
                                        role="button"
                                        aria-label={`Open story by ${(item as StoryListItem).authorName}`}
                                        style={{
                                            height: 0,
                                            paddingBottom: '100%',
                                            position: 'relative',
                                            borderRadius: 18,
                                            border: '6px solid black',
                                            background: 'transparent',
                                            overflow: 'hidden',
                                            boxShadow:
                                                '0 6px 20px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.3)',
                                            transition: 'transform 160ms ease, background-color 160ms ease',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                        onMouseEnter={(e) => {
                                            const el = e.currentTarget as HTMLDivElement;
                                            el.style.background = 'linear-gradient(135deg, #fef3c7, #ffe4e1)';
                                            el.style.transform = 'translateY(-6px)';
                                        }}
                                        onMouseLeave={(e) => {
                                            const el = e.currentTarget as HTMLDivElement;
                                            el.style.background = 'transparent';
                                            el.style.transform = 'none';
                                        }}
                                    >
                                        {/* author + snippet */}
                                        <div
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                padding: 14,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    fontWeight: 700,
                                                    fontSize: '0.95rem',
                                                    color: '#111',
                                                    lineHeight: 1.15,
                                                    textShadow: '0 1px 0 rgba(255,255,255,0.6)',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}
                                                title={(item as StoryListItem).authorName}
                                            >
                                                {(item as StoryListItem).authorName}
                                            </div>

                                            <div
                                                style={{
                                                    marginTop: 8,
                                                    fontSize: '0.85rem',
                                                    color: '#333',
                                                    lineHeight: 1.25,
                                                    overflow: 'hidden',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 5,
                                                    WebkitBoxOrient: 'vertical',
                                                }}
                                            >
                                                {snippet}
                                            </div>

                                            {/* corner “index” look */}
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    right: 10,
                                                    bottom: 10,
                                                    fontSize: '0.9rem',
                                                    fontWeight: 700,
                                                    color: '#333',
                                                    letterSpacing: '0.06em',
                                                }}
                                            >
                                                {String((data?.page ?? 1) - 1)}:{idx + 1}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Pager */}
                    <div
                        style={{
                            marginTop: 24,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 18,
                            userSelect: 'none',
                        }}
                    >
                        <button
                            aria-label="Previous page"
                            disabled={!canPrev || loading}
                            onClick={() => canPrev && setPage((p) => p - 1)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: canPrev && !loading ? 'pointer' : 'not-allowed',
                                opacity: canPrev && !loading ? 1 : 0.4,
                                padding: 6,
                            }}
                        >
                            {/* Left SVG arrow */}
                            <svg width="44" height="28" viewBox="0 0 44 28" aria-hidden>
                                <path d="M18 3 L4 14 L18 25" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" />
                                <line x1="6" y1="14" x2="40" y2="14" stroke="black" strokeWidth="3" strokeLinecap="round" />
                            </svg>
                        </button>

                        <div style={{ fontWeight: 700 }}>
                            {data ? `Page ${data.page} / ${data.totalPages}` : 'Loading…'}
                        </div>

                        <button
                            aria-label="Next page"
                            disabled={!canNext || loading}
                            onClick={() => canNext && setPage((p) => p + 1)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: canNext && !loading ? 'pointer' : 'not-allowed',
                                opacity: canNext && !loading ? 1 : 0.4,
                                padding: 6,
                            }}
                        >
                            {/* Right SVG arrow */}
                            <svg width="44" height="28" viewBox="0 0 44 28" aria-hidden>
                                <path d="M26 3 L40 14 L26 25" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" />
                                <line x1="4" y1="14" x2="38" y2="14" stroke="black" strokeWidth="3" strokeLinecap="round" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
