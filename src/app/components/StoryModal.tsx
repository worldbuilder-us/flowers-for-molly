// src/app/components/StoryModal.tsx
"use client";

import React, { useEffect, useMemo } from "react";
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

type OrnamentSide = "top" | "bottom" | "left" | "right";

type OrnamentSlot = {
  id: string;
  side: OrnamentSide;
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  size: number;
};

const ORNAMENT_SLOTS: OrnamentSlot[] = [
  { id: "top-1", side: "top", top: "0%", left: "28%", size: 84 },
  { id: "top-2", side: "top", top: "0%", left: "72%", size: 72 },
  { id: "bottom-1", side: "bottom", bottom: "0%", left: "22%", size: 78 },
  { id: "bottom-right", side: "bottom", bottom: "0%", right: "0%", size: 96 },
  { id: "left-1", side: "left", left: "0%", top: "28%", size: 86 },
  { id: "left-2", side: "left", left: "0%", top: "70%", size: 72 },
  { id: "right-1", side: "right", right: "0%", top: "36%", size: 78 },
];

const ORNAMENT_IMAGES = Array.from(
  { length: 8 },
  (_, i) => `/ornaments/flower-border_${i}.png`,
);

function randomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

function sampleSlots(slots: OrnamentSlot[], count: number): OrnamentSlot[] {
  const pool = [...slots];
  const picked: OrnamentSlot[] = [];
  const pickCount = Math.min(count, pool.length);
  for (let i = 0; i < pickCount; i++) {
    const idx = randomInt(pool.length);
    picked.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return picked;
}

function buildOrnaments(): Array<{ slot: OrnamentSlot; src: string }> {
  const result: Array<{ slot: OrnamentSlot; src: string }> = [];
  const sides: OrnamentSide[] = ["top", "bottom", "left", "right"];
  const usedBySide: Record<OrnamentSide, Set<string>> = {
    top: new Set(),
    bottom: new Set(),
    left: new Set(),
    right: new Set(),
  };

  const pickImageForSide = (side: OrnamentSide): string => {
    const used = usedBySide[side];
    const available = ORNAMENT_IMAGES.filter((src) => !used.has(src));
    const pool = available.length ? available : ORNAMENT_IMAGES;
    const src = pool[randomInt(pool.length)];
    used.add(src);
    return src;
  };

  const mandatorySlot = ORNAMENT_SLOTS.find(
    (slot) => slot.id === "bottom-right",
  );
  if (mandatorySlot) {
    const src = pickImageForSide(mandatorySlot.side);
    result.push({ slot: mandatorySlot, src });
  }

  for (const side of sides) {
    const sideSlots = ORNAMENT_SLOTS.filter(
      (s) => s.side === side && s.id !== "bottom-right",
    );
    const count = randomInt(3); // 0-2 additional slots per side
    const picked = sampleSlots(sideSlots, count);
    for (const slot of picked) {
      const src = pickImageForSide(side);
      result.push({ slot, src });
    }
  }
  return result;
}

function formatSeasonYear(dateValue?: string): string | null {
  if (!dateValue) return null;

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;

  const month = date.getUTCMonth();
  const year = date.getUTCFullYear();

  let season = "Winter";
  if (month >= 2 && month <= 4) season = "Spring";
  else if (month >= 5 && month <= 7) season = "Summer";
  else if (month >= 8 && month <= 10) season = "Fall";

  return `${season}, ${year}`;
}

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

  const storyId = story?._id;
  const ornaments = useMemo(
    () => (storyId ? buildOrnaments() : []),
    [storyId],
  );
  const seasonYear = formatSeasonYear(story?.importedAt);

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
        {ornaments.map(({ slot, src }) => (
          <img
            key={slot.id}
            src={src}
            alt=""
            aria-hidden="true"
            className={`${styles.ornament} ${styles[`ornament${slot.side[0].toUpperCase()}${slot.side.slice(1)}`]} ${slot.id === "bottom-right" ? styles.ornamentCornerBr : ""}`}
            style={{
              top: slot.top,
              bottom: slot.bottom,
              left: slot.left,
              right: slot.right,
              width: `${slot.size}px`,
              height: `${slot.size}px`,
            }}
          />
        ))}

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

            {seasonYear ? (
              <div className={styles.date}>{seasonYear}</div>
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
    document.body,
  );
}
