import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { Story } from "@/models/Story";

// --- helpers reused from importer (minimal) ---
function fnv1a32(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
  }
  return hash >>> 0;
}

function stripMinimalMarkdown(md: string): string {
  let s = md || "";
  s = s.replace(/\[([^\]]+)\]\(mailto:[^)]+\)/gi, "$1"); // [text](mailto:..)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");        // [text](url)
  s = s.replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1");     // **bold** / _em_
  s = s.replace(/^#+\s+/gm, "");                          // # headings
  s = s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  return s;
}

// GET /api/stories?page=1&limit=25
export async function GET(req: Request) {
  await dbConnect();

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 25)));

  const skip = (page - 1) * limit;

  const [total, stories] = await Promise.all([
    Story.countDocuments({}),
    Story.find({})
      .sort({ importedAt: 1, createdAt: 1, _id: 1 }) // stable order
      .skip(skip)
      .limit(limit)
      .select({
        authorName: 1,
        authorEmail: 1,
        textPlain: 1,
        textMarkdown: 1,
        importedAt: 1,
      })
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
  const textPlain = stripMinimalMarkdown(textMarkdown).trim();
  const storyLines = textPlain.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const paragraphCount = textMarkdown.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).length;
  const words = textPlain.match(/\b[\w’'-]+\b/g) ?? [];
  const wordCount = words.length;
  const charCount = textPlain.length;
  const hasSalutation = /^dear\b/i.test(storyLines[0] ?? "");

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

    return NextResponse.json(
      {
        ok: true,
        id: created?._id,
        status: created?.status,
      },
      { status: 201 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to save story." },
      { status: 500 }
    );
  }
}