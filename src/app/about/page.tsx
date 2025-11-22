// src/app/about/page.tsx
"use client";

import React from "react";
import Header from "../components/Header";
import { goldenbookFont } from "../fonts";
import styles from "./AboutPage.module.css";

export default function AboutPage() {
  return (
    <>
      <Header />

      <main aria-labelledby="about-title" className={styles.aboutMain}>
        <div className={`${styles.aboutContent} ${goldenbookFont.className}`}>
          <h1 id="about-title" className={styles.aboutTitle}>
            <span className={styles.aboutTitleWord}>ABOUT</span>
            <span className={styles.aboutTitleWord}>THE</span>
            <span className={styles.aboutTitleWord}>ARTWORK</span>
          </h1>

          <section className={styles.descriptionSection}>
            <p>
              <em>Flowers for Molly</em> is a collaborative and generative
              artistic tribute to honor and celebrate the life of our dearest
              Molly Dowd. Built from the shared stories, memories, and moments
              offered by Molly’s friends and family, we can weave the past into
              the present, preserving her legacy in the years to come.
            </p>

            <p>
              Each contribution generates a unique piece of visual content,
              which becomes part of a larger, evolving body of work—an
              ever-growing tribute to her life.
            </p>
          </section>

          <div className={styles.divider} aria-hidden="true">
            <svg
              className={styles.dividerLine}
              viewBox="0 0 120 2"
              preserveAspectRatio="xMidYMid meet"
            >
              <line x1="0" y1="1" x2="120" y2="1" />
            </svg>
          </div>

          <section
            className={styles.poemSection}
            aria-label="Commemorative poem"
          >
            <p className={styles.poemText}>
              The trees will remember your name.
              <br />
              The things you grew up with, they will not forget you.
              <br />
              Your friends, your family, the house in which you were born.
              <br />
              The sunlight across the bay.
              <br />
              The place where we met.
              <br />
              The green field where you said yes.
              <br />
              Your children.
              <br />
              The garden we started to grow.
              <br />
              I'll take them with me, I'll carry them from here.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
