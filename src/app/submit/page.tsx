// src/app/submit/page.tsx
'use client';

import React, { useState } from 'react';
import Header from '../components/Header';

export default function SubmitPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [story, setStory] = useState('');

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        // placeholder behavior for now
        alert('submission coming soon');
    }

    return (
        <>
            <Header />

            <main
                style={{
                    minHeight: 'calc(100vh - 80px)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    paddingTop: '10%',
                    paddingBottom: '4rem',
                    boxSizing: 'border-box',
                    zIndex: 1000,
                }}
            >
                <div
                    style={{
                        width: '100%',
                        maxWidth: '800px',
                        padding: '2rem',
                        margin: '0 1rem',
                        color: 'rgba(255, 243, 212, 0.95)',
                        textAlign: 'left',
                        background: 'transparent',
                    }}
                >
                    <h1 style={{ margin: 0, marginBottom: '1rem', fontSize: '1.75rem' }}>
                        Share A Story
                    </h1>

                    <p style={{ marginTop: '0.75rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                        In the field below, please share a story (or two, three, or more), a favorite memory, your favorite qualities, or an anecdote that comes to mind when you think of her. It can be anything—old tales, new tales, bits about her personality, her little idiosyncrasies—whatever holds meaning for you. The more, the better.
                    </p>

                    <p style={{ marginTop: 0, marginBottom: '1.5rem', lineHeight: 1.6 }}>
                        Once you’ve added your story, hit share and watch it come to life as it’s added to the whole.
                    </p>

                    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '1rem',
                                marginBottom: '1rem',
                            }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                <label htmlFor="name" style={{ marginBottom: '0.5rem', fontWeight: 600 }}>
                                    Name
                                </label>
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Your name"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 1rem',
                                        borderRadius: 10,
                                        border: '2px solid rgba(0,0,0,0.9)',
                                        background: 'white',
                                        boxSizing: 'border-box',
                                        fontSize: '1rem',
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                <label htmlFor="email" style={{ marginBottom: '0.5rem', fontWeight: 600 }}>
                                    Email
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 1rem',
                                        borderRadius: 10,
                                        border: '2px solid rgba(0,0,0,0.9)',
                                        background: 'white',
                                        boxSizing: 'border-box',
                                        fontSize: '1rem',
                                    }}
                                />
                            </div>
                        </div>
                        /*
                        * Story textarea
                        */
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginBottom: '1rem' }}>
                            <label htmlFor="story" style={{ marginBottom: '0.5rem', fontWeight: 600 }}>
                                Your story
                            </label>
                            <textarea
                                id="story"
                                name="story"
                                value={story}
                                onChange={(e) => setStory(e.target.value)}
                                placeholder="Share a memory, anecdote, or anything you wish to contribute..."
                                rows={8}
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    borderRadius: 10,
                                    border: '2px solid rgba(0,0,0,0.9)',
                                    background: 'white',
                                    boxSizing: 'border-box',
                                    fontSize: '1rem',
                                    resize: 'vertical',
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                            <button
                                type="submit"
                                style={{
                                    padding: '0.75rem 1.25rem',
                                    borderRadius: 10,
                                    border: '2px solid rgba(0,0,0,0.9)',
                                    background: 'white',
                                    color: 'black',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    boxShadow: '0 6px 18px rgba(0,0,0,0.2)',
                                }}
                            >
                                Share
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </>
    );
}
