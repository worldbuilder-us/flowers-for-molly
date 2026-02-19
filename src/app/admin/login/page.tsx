"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/app/components/Header";
import { goldenbookFont, montserratFont } from "@/app/fonts";
import styles from "./page.module.css";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Login failed.");
      }

      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError((err as Error).message || "Login failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Header />
      <main className={`${styles.main} ${goldenbookFont.className}`}>
        <section className={styles.panel}>
          <h1 className={styles.title}>Story Review Login</h1>
          <p className={styles.subtitle}>Enter the review password to access pending submissions.</p>

          {error ? <p className={styles.error}>{error}</p> : null}

          <form onSubmit={onSubmit} className={styles.form}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${styles.input} ${montserratFont.className}`}
              required
            />
            <button
              type="submit"
              disabled={submitting}
              className={`${styles.button} ${montserratFont.className}`}
            >
              {submitting ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </section>
      </main>
    </>
  );
}
