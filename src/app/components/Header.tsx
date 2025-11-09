// src/app/components/Header.tsx
'use client';

import React from 'react';
import Link from 'next/link';

const linkStyle: React.CSSProperties = {
    color: 'black',
    textDecoration: 'none',
    fontSize: '1.1rem',
    fontWeight: 600,
    padding: '6px 12px',
    letterSpacing: '0.04em',
};

// TODO: MAKE HOME BUTTON FIXED LEFT ON HEADER

// const homeStyle: React.CSSProperties = {
//     color: 'black',
//     textDecoration: 'none',
//     fontSize: '1.1rem',
//     fontWeight: 600,
//     letterSpacing: '0.04em',
//     display: 'fixed',
//     left: '10%',
//     transform: 'translateX(-50%)',
// }

function Divider() {
    return (
        <svg
            width="18"
            height="48"
            viewBox="0 0 2 48"
            aria-hidden="true"
            style={{ display: 'block', margin: '0 8px' }}
        >
            <line
                x1="1"
                y1="8"
                x2="1"
                y2="40"
                stroke="rgba(0,0,0,0.85)"
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    );
}

export default function Header() {
    return (
        <header
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                height: 80,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1100,
                pointerEvents: 'auto',
                background: 'transparent',
                color: 'black',
                backdropFilter: 'blur(6px)',
            }}
        >
            <nav
                role="navigation"
                aria-label="Main"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Link href="/" style={linkStyle}>
                    home
                </Link>

                <Divider />

                <Link href="/submit" style={linkStyle}>
                    submit
                </Link>

                <Divider />

                <Link href="/view" style={linkStyle}>
                    view
                </Link>

                <Divider />

                <Link href="/about" style={linkStyle}>
                    about
                </Link>
            </nav>
        </header>
    );
}
