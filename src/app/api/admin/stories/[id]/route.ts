import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { cookies } from "next/headers";
import { dbConnect } from "@/lib/mongoose";
import { Story } from "@/models/Story";
import {
  ADMIN_SESSION_COOKIE,
  isAdminConfigured,
  verifyAdminSessionToken,
} from "@/lib/adminAuth";
import { deriveStoryTextMetrics } from "@/lib/storyText";

function isAuthed(cookieValue?: string): boolean {
  return isAdminConfigured() && verifyAdminSessionToken(cookieValue);
}

function fnv1a32(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash =
      (hash +
        ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>>
      0;
  }
  return hash >>> 0;
}

export async function PATCH(req: Request, ctx: unknown) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!isAuthed(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = (ctx as { params?: { id?: string | string[] } }).params ?? {};
  const normalizedId = Array.isArray(id) ? id[0] : id;
  if (!normalizedId || !mongoose.Types.ObjectId.isValid(normalizedId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  await dbConnect();

  let body: {
    status?: string;
    textMarkdown?: string;
    authorName?: string;
    authorEmail?: string;
  } = {};

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const nextStatus = (body.status || "").trim();
  const allowedStatuses = new Set(["pending", "approved", "rejected"]);
  if (!allowedStatuses.has(nextStatus)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const update: Record<string, unknown> = {
    status: nextStatus,
    reviewedAt: new Date(),
  };

  if (nextStatus === "approved") {
    update.approvedAt = new Date();
    update.rejectedAt = null;
  }

  if (nextStatus === "rejected") {
    update.rejectedAt = new Date();
    update.approvedAt = null;
  }

  if (nextStatus === "pending") {
    update.approvedAt = null;
    update.rejectedAt = null;
  }

  if (typeof body.authorName === "string") {
    const authorName = body.authorName.trim();
    if (!authorName) {
      return NextResponse.json({ error: "Author name cannot be empty." }, { status: 400 });
    }
    update.authorName = authorName;
  }

  if (typeof body.authorEmail === "string") {
    const authorEmail = body.authorEmail.trim().toLowerCase();
    if (authorEmail && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(authorEmail)) {
      return NextResponse.json({ error: "Invalid email." }, { status: 400 });
    }

    update.authorEmail = authorEmail || undefined;
    update.authorEmailRaw = authorEmail || undefined;
  }

  if (typeof body.textMarkdown === "string") {
    const textMarkdown = body.textMarkdown.trim();
    if (!textMarkdown) {
      return NextResponse.json({ error: "Story text cannot be empty." }, { status: 400 });
    }

    const metrics = deriveStoryTextMetrics(textMarkdown);
    update.textMarkdown = textMarkdown;
    update.textPlain = metrics.textPlain;
    update.storyLines = metrics.storyLines;
    update.paragraphCount = metrics.paragraphCount;
    update.wordCount = metrics.wordCount;
    update.charCount = metrics.charCount;
    update.hasSalutation = metrics.hasSalutation;
  }

  if (typeof update.authorName === "string" || typeof update.textPlain === "string") {
    const existing = await Story.findById(normalizedId)
      .select({ authorName: 1, textPlain: 1 })
      .lean();
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const authorName = (update.authorName as string) || existing.authorName;
    const textPlain = (update.textPlain as string) || existing.textPlain;
    const textKey = `${authorName.toLowerCase()}::${textPlain.toLowerCase()}`;
    const textHash32 = fnv1a32(textKey);

    update.textHash32 = textHash32;
    update.uniqueKey = `${authorName}::${textHash32}`;
    update.seed = fnv1a32(textPlain.toLowerCase());
  }

  const updated = await Story.findByIdAndUpdate(
    normalizedId,
    { $set: update },
    { new: true },
  )
    .select({
      authorName: 1,
      authorEmail: 1,
      textPlain: 1,
      textMarkdown: 1,
      importedAt: 1,
      status: 1,
      createdAt: 1,
      updatedAt: 1,
      approvedAt: 1,
      rejectedAt: 1,
      reviewedAt: 1,
    })
    .lean();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, story: updated });
}
