// src/app/view/[num]/page.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type p5 from 'p5';
import { sketch } from '@/p5/sketch';
import Header from '../../components/Header';

export default function TilePage() {
    const params = useParams();
    const router = useRouter();
    const hostRef = useRef<HTMLDivElement | null>(null);
    const p5InstanceRef = useRef<p5 | null>(null);

    const num = (params?.num ?? '01').toString().padStart(2, '0');

    useEffect(() => {
        let cancelled = false;

        (async () => {
            const { default: P5 } = await import('p5');

            if (!cancelled && hostRef.current) {
                // create P5 instance and attach to host
                p5InstanceRef.current = new P5(sketch, hostRef.current);
            }
        })();

        return () => {
            cancelled = true;
            p5InstanceRef.current?.remove();
            p5InstanceRef.current = null;
        };
    }, [num]); // re-mount if num changes

    return (
        <>
            <Header />

            {/* host for p5 (canvas sits under content) */}
            <div
                ref={hostRef}
                style={{
                    position: 'fixed',
                    inset: 0,
                    overflow: 'hidden',
                    pointerEvents: 'none', // allow page UI to receive clicks
                    zIndex: 0,
                }}
            />

            {/* overlay UI */}
            <div
                style={{
                    position: 'relative',
                    zIndex: 1000,
                    minHeight: 'calc(100vh - 80px)',
                    paddingTop: '6rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <div style={{ width: '100%', maxWidth: 1100, padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button
                            onClick={() => router.back()}
                            style={{
                                padding: '8px 12px',
                                borderRadius: 8,
                                border: '1px solid rgba(0,0,0,0.08)',
                                background: 'white',
                                cursor: 'pointer',
                            }}
                        >
                            ← Back
                        </button>

                        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Tile {num}</h2>
                        <div style={{ marginLeft: 'auto' }}>
                            <Link href="/view" style={{ textDecoration: 'none', color: '#333' }}>
                                View index
                            </Link>
                        </div>
                    </div>

                    <p style={{ marginTop: 12, color: 'rgba(0,0,0,0.8)' }}>
                        This page renders the sketch (same as homepage). Replace or parameterize the
                        sketch by `num` to vary the output for each tile.
                    </p>
                </div>

                {/* Optionally add any controls for the sketch here. */}
            </div>
        </>
    );
}
