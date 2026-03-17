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

          <section
            className={`${styles.descriptionSection} ${styles.aboutBodyBold}`}
          >
            <p>
              <em>Flowers for Molly</em> is a collaborative and generative
              artistic tribute to honor and celebrate the life of our dearest
              Molly Dowd. Built from the shared stories, memories, and moments
              offered by Molly&rsquo;s friends and family, we can weave the past
              into the present, preserving her legacy in the years to come.
            </p>

            <p>
              Each contribution generates a unique piece of visual content,
              which becomes part of a larger, evolving body of work—an
              ever-growing tribute to her life.
            </p>

            <p>
              The realization of this project would not be possible without the
              help of my creative partners Shirish Sarkar and Conor Behrens at
              <a href="https://marchen.studio">Marchen Studio</a>.
            </p>
          </section>

          <div className={styles.divider} aria-hidden="true">
            <svg
              className={styles.dividerLine}
              viewBox="0 0 160 2"
              preserveAspectRatio="xMidYMid meet"
            >
              <line x1="-60" y1="1" x2="220" y2="1" />
            </svg>
          </div>

          <section
            className={styles.poemSection}
            aria-label="Commemorative poem"
          >
            <div className={`${styles.poemText} ${styles.aboutBodyBold}`}>
              <p className={styles.poemLine}>
                The trees will remember your name.
              </p>
              <p className={styles.poemLine}>
                The things you grew up with, they will not forget you.
              </p>
              <p className={styles.poemLine}>
                Your friends, your family, the house in which you were born.
              </p>
              <p className={styles.poemLine}>The sunlight across the bay.</p>
              <p className={styles.poemLine}>The place where we met.</p>
              <p className={styles.poemLine}>
                The green field where you said yes.
              </p>
              <p className={styles.poemLine}>Your children.</p>
              <p className={styles.poemLine}>The garden we started to grow.</p>
              <p className={styles.poemLine}>
                I&rsquo;ll take them with me, I&rsquo;ll carry them{" "}
                <span className={styles.poemNoBreak}>from here.</span>
              </p>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
