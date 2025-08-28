// src/app/view/page.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import Header from '../components/Header';

export default function ViewIndex() {
    // create 25 tiles
    const tiles = Array.from({ length: 25 }).map((_, i) => i + 1);

    return (
        <>
            <Header />

            <div
                style={{
                    width: '100%',
                    minHeight: 'calc(100vh - 80px)',
                    paddingTop: '10%',
                    boxSizing: 'border-box',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    zIndex: 1000,
                }}
            >
                <div
                    style={{
                        width: 'min(1100px, 92%)',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(5, 1fr)',
                        gap: '20px',
                        paddingBottom: '4rem',
                    }}
                >
                    {tiles.map((n) => {
                        const label = String(n).padStart(2, '0');
                        return (
                            <Link
                                key={n}
                                href={`/view/${label}`}
                                style={{ textDecoration: 'none' }}
                            >
                                <div
                                    role="button"
                                    aria-label={`Open tile ${label}`}
                                    style={{
                                        height: 0,
                                        // aspect-ratio to keep square
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
                                    // hover effect via inline style with onMouseEnter/Leave
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
                                    {/* bottom-right number */}
                                    <div
                                        style={{
                                            position: 'absolute',
                                            right: 10,
                                            bottom: 10,
                                            fontSize: '1rem',
                                            fontWeight: 700,
                                            color: '#333',
                                            letterSpacing: '0.06em',
                                        }}
                                    >
                                        {label}
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
