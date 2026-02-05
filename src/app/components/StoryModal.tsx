// src/app/components/StoryModal.tsx
"use client";

import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import { goldenbookFont } from "../fonts";
import styles from "./StoryModal.module.css";

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
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = originalOverflow;
    };
  }, [story, onClose]);

  if (!story) return null;

  return ReactDOM.createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Story by ${story.authorName}`}
      onClick={onClose}
      className={styles.backdrop}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`${styles.modal} ${goldenbookFont.className}`}
      >
        {/* Decorative frame layers (temporarily disabled) */}
        {/*
        <div className={styles.borderLeft} aria-hidden="true" />
        <div className={styles.borderRight} aria-hidden="true" />
        <div className={styles.borderBottom} aria-hidden="true" />
        <div className={styles.borderTop} aria-hidden="true" />
        */}

        {/* Inner content, padded away from the decorative borders */}
        <div className={styles.inner}>
          <header className={styles.header}>
            <div className={styles.author}>{story.authorName}</div>

            {story.importedAt ? (
              <div className={styles.date}>
                {new Date(story.importedAt).toLocaleDateString()}
              </div>
            ) : (
              <div className={styles.dateSpacer} />
            )}

            <button
              aria-label="Close story"
              onClick={onClose}
              className={styles.closeButton}
            >
              ×
            </button>
          </header>

          <div className={styles.body}>
            {story.textPlain.split(/\n{2,}/).map((p, i) => (
              <p key={i} className={styles.paragraph}>
                {p}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
