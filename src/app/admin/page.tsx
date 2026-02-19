"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/app/components/Header";
import { goldenbookFont, montserratFont } from "@/app/fonts";
import styles from "./page.module.css";

type StoryStatus = "pending" | "approved" | "rejected";

type AdminStory = {
  _id: string;
  authorName: string;
  authorEmail?: string;
  textMarkdown: string;
  textPlain: string;
  importedAt?: string;
  status: StoryStatus;
  createdAt?: string;
  updatedAt?: string;
};

type ListResponse = {
  stories: AdminStory[];
  total: number;
  page: number;
  totalPages: number;
};

const PAGE_SIZE = 25;

export default function AdminStoriesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storyIdFromQuery = searchParams.get("story");
  const [filter, setFilter] = useState<StoryStatus | "all">("pending");
  const [stories, setStories] = useState<AdminStory[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draftAuthor, setDraftAuthor] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [draftText, setDraftText] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadStories(nextPage = page, nextFilter = filter) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/admin/stories?status=${nextFilter}&page=${nextPage}&limit=${PAGE_SIZE}`,
        { cache: "no-store" },
      );

      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }

      const json: ListResponse & { error?: string } = await res.json();
      if (!res.ok) {
        throw new Error(
          json.error || `Failed to load stories (HTTP ${res.status})`,
        );
      }

      const nextStories = json.stories || [];
      setStories(nextStories);
      setTotal(json.total || 0);
      setTotalPages(Math.max(1, json.totalPages || 1));

      const first = nextStories[0] || null;
      const requested = storyIdFromQuery
        ? nextStories.find((s) => s._id === storyIdFromQuery)?._id
        : null;
      if (!activeId || !nextStories.some((s) => s._id === activeId)) {
        setActiveId(requested || first?._id || null);
      }
    } catch (err) {
      setError((err as Error).message || "Failed to load stories.");
      setStories([]);
      setTotal(0);
      setTotalPages(1);
      setActiveId(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStories(1, filter);
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, storyIdFromQuery]);

  useEffect(() => {
    loadStories(page, filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const activeStory = useMemo(
    () => stories.find((s) => s._id === activeId) || null,
    [stories, activeId],
  );

  useEffect(() => {
    if (!activeStory) return;
    setDraftAuthor(activeStory.authorName || "");
    setDraftEmail(activeStory.authorEmail || "");
    setDraftText(activeStory.textMarkdown || "");
  }, [activeStory]);

  async function updateStory(nextStatus: StoryStatus) {
    if (!activeStory) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/stories/${activeStory._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          authorName: draftAuthor,
          authorEmail: draftEmail,
          textMarkdown: draftText,
        }),
      });

      const json = await res.json();
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Save failed (HTTP ${res.status})`);
      }

      await loadStories(page, filter);
    } catch (err) {
      setError((err as Error).message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <>
      {/* <Header /> */}
      <main className={`${styles.main} ${goldenbookFont.className}`}>
        <section className={styles.topBar}>
          <h1 className={styles.title}>Story Review</h1>
          <button
            onClick={logout}
            className={`${styles.logout} ${montserratFont.className}`}
          >
            Log out
          </button>
        </section>

        <section className={styles.filters}>
          {(["pending", "approved", "rejected", "all"] as const).map(
            (value) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`${styles.filterButton} ${filter === value ? styles.filterActive : ""}`}
              >
                {value[0].toUpperCase() + value.slice(1)}
              </button>
            ),
          )}
          <p className={styles.count}>
            {loading ? "Loading..." : `${total} stories`}
          </p>
        </section>

        {error ? <p className={styles.error}>{error}</p> : null}

        <section className={styles.grid}>
          <aside className={styles.sidebar}>
            {stories.map((story) => (
              <button
                key={story._id}
                onClick={() => setActiveId(story._id)}
                className={`${styles.storyListItem} ${activeId === story._id ? styles.storyListItemActive : ""}`}
              >
                <span className={styles.storyListName}>{story.authorName}</span>
                <span className={styles.storyListMeta}>{story.status}</span>
              </button>
            ))}
          </aside>

          <article className={styles.editorPane}>
            {!activeStory ? (
              <p className={styles.empty}>No stories in this filter.</p>
            ) : (
              <>
                <div className={styles.fieldRow}>
                  <label>Name</label>
                  <input
                    value={draftAuthor}
                    onChange={(e) => setDraftAuthor(e.target.value)}
                    className={styles.input}
                  />
                </div>
                <div className={styles.fieldRow}>
                  <label>Email</label>
                  <input
                    value={draftEmail}
                    onChange={(e) => setDraftEmail(e.target.value)}
                    className={styles.input}
                  />
                </div>
                <div className={styles.fieldRow}>
                  <label>Story text (proofread here before approval)</label>
                  <textarea
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    rows={14}
                    className={styles.textarea}
                  />
                </div>

                <div className={styles.actions}>
                  <button
                    onClick={() => updateStory("approved")}
                    disabled={saving}
                    className={styles.approve}
                  >
                    {saving ? "Saving..." : "Save + Approve"}
                  </button>
                  <button
                    onClick={() => updateStory("pending")}
                    disabled={saving}
                    className={styles.pending}
                  >
                    Save as Pending
                  </button>
                  <button
                    onClick={() => updateStory("rejected")}
                    disabled={saving}
                    className={styles.reject}
                  >
                    Reject
                  </button>
                </div>
              </>
            )}
          </article>
        </section>

        <section className={styles.pager}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className={styles.pagerButton}
          >
            Previous
          </button>
          <p>
            Page {page} of {totalPages}
          </p>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className={styles.pagerButton}
          >
            Next
          </button>
        </section>
      </main>
    </>
  );
}
