// src/app/components/StoryModal.tsx
"use client";

import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import { goldenbookFont } from "../fonts";

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
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(255,255,255,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999, // ensure modal sits above header and captures taps
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={goldenbookFont.className}
        style={{
          width: "min(720px, 92vw)",
          height: "min(540px, 80vh)",
          background: "#ffffff",
          borderRadius: 20,
          boxShadow: "0 18px 45px rgba(0,0,0,0.35)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            flexShrink: 0,
            padding: "16px 20px",
            borderBottom: "1px solid rgba(0,0,0,0.07)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              fontWeight: 400,
              fontSize: "1.15rem",
              letterSpacing: "0.04em",
              color: "rgba(0,0,0,0.85)",
            }}
          >
            {story.authorName}
          </div>

          {story.importedAt ? (
            <div
              style={{
                marginLeft: "auto",
                fontSize: "0.8rem",
                opacity: 0.7,
                color: "rgba(0,0,0,0.85)",
              }}
            >
              {new Date(story.importedAt).toLocaleDateString()}
            </div>
          ) : (
            <div style={{ marginLeft: "auto" }} />
          )}

          <button
            aria-label="Close story"
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              fontSize: "1.4rem",
              lineHeight: 1,
              cursor: "pointer",
              padding: "4px 0 4px 8px",
              color: "rgba(0,0,0,0.85)",
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            padding: "18px 22px",
            flex: 1,
            overflowY: "auto",
            fontSize: "1.02rem",
            lineHeight: 1.6,
            color: "#111111",
          }}
        >
          {story.textPlain.split(/\n{2,}/).map((p, i) => (
            <p
              key={i}
              style={{
                margin: "0 0 1em 0",
                whiteSpace: "pre-wrap",
              }}
            >
              {p}
            </p>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
