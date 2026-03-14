import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { Story } from "@/models/Story";
import { deriveStoryTextMetrics } from "@/lib/storyText";
import { notifyPendingStory } from "@/lib/adminNotifications";

// --- helpers reused from importer (minimal) ---
function fnv1a32(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
  }
  return hash >>> 0;
}

// GET /api/stories?page=1&limit=25
export async function GET(req: Request) {
  await dbConnect();

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 25)));
  const summaryOnly = searchParams.get("summary") === "1";

  const skip = (page - 1) * limit;
  const publicQuery = { status: "approved" };

  const [total, stories] = await Promise.all([
    Story.countDocuments(publicQuery),
    Story.find(publicQuery)
      .sort({ importedAt: 1, createdAt: 1, _id: 1 }) // stable order
      .skip(skip)
      .limit(limit)
      .select(
        summaryOnly
          ? {
              authorName: 1,
              importedAt: 1,
            }
          : {
              authorName: 1,
              authorEmail: 1,
              textPlain: 1,
              textMarkdown: 1,
              importedAt: 1,
            },
      )
      .lean()
  ]);

  return NextResponse.json({
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    stories
  });
}

// POST /api/stories
export async function POST(req: Request) {
  await dbConnect();

  let body: { name?: string; email?: string; story?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const authorName = (body.name || "").trim();
  const authorEmail = (body.email || "").trim().toLowerCase();
  const textMarkdown = (body.story || "").trim();

  // Basic validation
  if (!authorName || !textMarkdown) {
    return NextResponse.json(
      { error: "Name and story are required." },
      { status: 400 }
    );
  }
  if (authorEmail && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(authorEmail)) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }

  // Normalize text
  const {
    textPlain,
    storyLines,
    paragraphCount,
    wordCount,
    charCount,
    hasSalutation,
  } = deriveStoryTextMetrics(textMarkdown);

  const textKey = `${authorName.toLowerCase()}::${textPlain.toLowerCase()}`;
  const textHash32 = fnv1a32(textKey);
  const uniqueKey = `${authorName}::${textHash32}`;
  const seed = fnv1a32(textPlain.toLowerCase());
  const TODAY = new Date();

  const doc = {
    authorName,
    authorEmail: authorEmail || undefined,
    authorEmailRaw: authorEmail || undefined,
    textMarkdown,
    textPlain,
    storyLines,
    paragraphCount,
    wordCount,
    charCount,
    hasSalutation,
    status: "pending",           // change to "approved" if you want auto-publish
    source: "form:submit",
    seed,
    textHash32,
    uniqueKey,
    importedAt: TODAY,
  };

  // Upsert by (authorName + content hash) to avoid exact duplicates
  // Note: returns the doc (existing or newly inserted)
  try {
    const created = await Story.findOneAndUpdate(
      { uniqueKey },
      { $setOnInsert: doc },
      { upsert: true, new: true, setDefaultsOnInsert: true }
      // If you don't want updatedAt to bump on duplicates, add: , timestamps: false (Mongoose 7+)
    ).lean();

    if (created?._id && created?.status === "pending") {
      notifyPendingStory({
        storyId: String(created._id),
        authorName: created.authorName,
      }).catch((err) => {
        console.error("Pending story notification failed:", err);
      });
    }

    return NextResponse.json(
      {
        ok: true,
        id: created?._id,
        status: created?.status,
      },
      { status: 201 }
    );
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error)?.message || "Failed to save story." },
      { status: 500 }
    );
  }
}
