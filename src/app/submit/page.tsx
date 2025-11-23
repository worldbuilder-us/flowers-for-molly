// src/app/submit/page.tsx
"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import { goldenbookFont, montserratFont } from "../fonts";
import styles from "./SubmitPage.module.css";

export default function SubmitPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [story, setStory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        (err as Error)?.message || "Something went wrong while submitting."
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
            <p>
              In the field below, please share a story (or two, three, or more),
              a favorite memory, your favorite qualities, or an anecdote that
              comes to mind when you think of her. It can be anything—old tales,
              new tales, bits about her personality, her little
              idiosyncrasies—whatever holds meaning for you. The more, the
              better.
            </p>

            <p>
              Once you’ve added your story, hit share and watch it come to life
              as it’s added to the whole.
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
                value={story}
                onChange={(e) => setStory(e.target.value)}
                placeholder="Your story...big or small, it doesn't matter as long as it's important to you"
                rows={1}
                required
                className={styles.textarea}
              />
            </div>

            <div className={styles.actionsRow}>
              <button
                type="submit"
                disabled={submitting}
                className={`${styles.submitButton} ${montserratFont.className}`}
              >
                {submitting ? "Submitting…" : "Submit"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
