// src/app/submit/page.tsx
"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import DandelionButton from "../components/DandelionButton";
import { goldenbookFont, montserratFont } from "../fonts";
import styles from "./SubmitPage.module.css";

export default function SubmitPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [story, setStory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const storyRef = useRef<HTMLTextAreaElement | null>(null);
  const MAX_ROWS = 8;

  const autoResize = (el: HTMLTextAreaElement) => {
    if (typeof window === "undefined") return;

    const computed = window.getComputedStyle(el);
    const lineHeight = parseFloat(computed.lineHeight || "0") || 0;
    const paddingTop = parseFloat(computed.paddingTop || "0") || 0;
    const paddingBottom = parseFloat(computed.paddingBottom || "0") || 0;
    const borderTop = parseFloat(computed.borderTopWidth || "0") || 0;
    const borderBottom = parseFloat(computed.borderBottomWidth || "0") || 0;

    const extra = paddingTop + paddingBottom + borderTop + borderBottom;
    const maxHeight = lineHeight * MAX_ROWS + extra;

    // Reset to auto so scrollHeight is measured correctly
    el.style.height = "auto";

    const newHeight = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${newHeight}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  };

  useEffect(() => {
    if (storyRef.current) {
      autoResize(storyRef.current);
    }
  }, []);

  function handleStoryChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setStory(e.target.value);
    autoResize(e.target);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !story.trim()) {
      setError("Please provide both your name and a story.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ name, email, story }),
      });

      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Submit failed (HTTP ${res.status})`);
      }

      router.push(`/view/${json.id}`);
    } catch (err) {
      setError(
        (err as Error)?.message || "Something went wrong while submitting.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Header />

      <main aria-labelledby="submit-title" className={styles.submitMain}>
        <div className={`${styles.submitContent} ${goldenbookFont.className}`}>
          <h1 id="submit-title" className={styles.submitTitle}>
            <span className={styles.submitTitleWord}>SHARE</span>
            <span className={styles.submitTitleWord}>A STORY</span>
          </h1>

          <section
            className={`${styles.introSection} ${goldenbookFont.className}`}
          >
            <p className={styles.introLead}>
              In the field below, please share a story (or two, or three), a
              favorite memory, your favorite qualities, or an anecdote that
              comes to mind when you think of her. It can be anything—old tales,
              new tales, bits about her personality, her little
              idiosyncrasies—whatever holds meaning for you. The more, the
              better.
            </p>

            <p>
              Once you&rsquo;ve added your story, hit submit, and it&rsquo;ll be
              added to the garden.
            </p>
          </section>

          {error ? <div className={styles.errorBox}>{error}</div> : null}

          <form
            onSubmit={handleSubmit}
            className={`${styles.form} ${goldenbookFont.className}`}
          >
            <div className={styles.formRowTwoUp}>
              <div className={styles.formField}>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  className={styles.input}
                />
              </div>

              <div className={styles.formField}>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email"
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.formField}>
              <textarea
                id="story"
                name="story"
                ref={storyRef}
                value={story}
                onChange={handleStoryChange}
                placeholder="Your story...big or small, it doesn't matter as long as it's important to you"
                rows={1}
                required
                className={styles.textarea}
              />
            </div>

            <div className={styles.actionsRow}>
              <DandelionButton
                type="submit"
                disabled={submitting}
                className={`${styles.submitButton} ${montserratFont.className}`}
              >
                {submitting ? "Submitting…" : "Submit"}
              </DandelionButton>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
