// src/app/components/StoryModal.tsx
'use client';

import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';

export type StoryListItem = {
    _id: string;
    authorName: string;
    authorEmail?: string;
    textPlain: string;
    textMarkdown: string;
    importedAt?: string;
};

export default function StoryModal({
    story,
    onClose,
}: {
    story: StoryListItem | null;
    onClose: () => void;
}) {
    useEffect(() => {
        if (!story) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [story, onClose]);

    const idx = Math.floor(Math.random() * 5) + 1;
    // filenames like bg-gradient-01.png ... bg-gradient-05.png
    const bgFilename = `/gradients/bg-gradient-${String(idx).padStart(2, "0")}.png`;

    if (!story) return null;
    return ReactDOM.createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-label={`Story by ${story.authorName}`}
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60,
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: 'min(860px, 92vw)',
                    maxHeight: '80vh',
                    background: 'white',
                    border: '6px solid black',
                    borderRadius: 18,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundImage: `url(${bgFilename})`,
                }}
            >
                <div style={{ padding: '14px 18px', borderBottom: '6px solid black', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{story.authorName}</div>
                    <button
                        aria-label="Close story"
                        onClick={onClose}
                        style={{ background: 'transparent', border: 'none', fontSize: '1.4rem', cursor: 'pointer' }}
                    >
                        ×
                    </button>
                </div>
                <div style={{ padding: 18, overflowY: 'auto', lineHeight: 1.5, fontSize: '1.02rem' }}>
                    {story.textPlain.split(/\n{2,}/).map((p, i) => (
                        <p key={i} style={{ margin: '0 0 1em 0', whiteSpace: 'pre-wrap' }}>{p}</p>
                    ))}
                </div>
            </div>
        </div>,
        document.body
    );
}
