// src/app/about/page.tsx
'use client';

import React from 'react';
import Header from '../components/Header';

export default function AboutPage() {
    return (
        <>
            <Header />

            <main
                aria-labelledby="about-title"
                style={{
                    minHeight: 'calc(100vh - 80px)', // fill area below header
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingTop: '4rem', // breathing room under the fixed header
                    boxSizing: 'border-box',
                    zIndex: 1000,
                }}
            >
                <div
                    style={{
                        width: '100%',
                        maxWidth: '64ch',
                        padding: '2rem',
                        margin: '0 1rem',
                        color: 'rgba(255, 243, 212, 0.95)',
                        textAlign: 'left', // left-aligned text inside a centered container
                        lineHeight: 1.7,
                        fontSize: '1.125rem',
                        textShadow: '0 1px 6px rgba(0,0,0,0.35)',
                        background: 'transparent',
                    }}
                >
                    <h1
                        id="about-title"
                        style={{
                            margin: 0,
                            marginBottom: '1rem',
                            fontSize: '1.5rem',
                            fontWeight: 700,
                            color: 'rgba(255, 243, 212, 0.98)',
                        }}
                    >
                        About the artwork
                    </h1>

                    <p style={{ marginTop: '0.75rem', marginBottom: '0.75rem' }}>
                        <em>Flowers for Molly</em> is a collaborative and generative artistic
                        tribute to honor and celebrate the life of our dearest Molly Dowd.
                        Built from the shared stories, memories, and moments offered by
                        Molly’s friends and family, we can weave the past into the present,
                        preserving her legacy in the years to come.
                    </p>

                    <p style={{ marginTop: '0.75rem', marginBottom: '0.75rem' }}>
                        Each contribution generates a unique piece of visual content, which
                        becomes part of a larger, evolving body of work—an ever-growing
                        tribute to her life.
                    </p>

                    <p style={{ marginTop: '0.75rem', marginBottom: '0.75rem' }}>
                        Thank you so much, and don’t forget…be kind, be loving.
                    </p>

                    <p style={{ marginTop: '1rem', marginBottom: 0, fontWeight: 600 }}>
                        MIB
                    </p>
                </div>
            </main>
        </>
    );
}
