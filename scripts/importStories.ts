#!/usr/bin/env ts-node
/**
 * Import stories from /data/stories.txt into MongoDB.
 * Usage (recommended): npx tsx scripts/importStories.ts
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { Story, StoryDoc } from "../src/models/Story";

const { MONGODB_URI } = process.env;
if (!MONGODB_URI) {
    console.error("❌ Missing MONGODB_URI in .env");
    process.exit(1);
}

const TODAY = new Date();

/** Simple 32-bit FNV-1a hash (no deps). Returns unsigned 32-bit. */
function fnv1a32(str: string): number {
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        // 32-bit multiply by FNV prime (via shifts) and keep as uint32
        hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
    }
    return hash >>> 0;
}

/** Minimal markdown stripper for our needs. */
function stripMinimalMarkdown(md: string): string {
    let s = md;
    // [text](mailto:foo@bar)
    s = s.replace(/\[([^\]]+)\]\(mailto:[^)]+\)/gi, "$1");
    // [text](url)
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");
    // bold/italics markers
    s = s.replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1");
    // heading hashes
    s = s.replace(/^#+\s+/gm, "");
    // decode common entities
    s = s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
    return s;
}

type ParsedBlock = {
    authorName: string;
    authorEmail?: string;
    authorEmailRaw?: string;
    textMarkdown: string;
};

/** Parse /data/stories.txt into blocks keyed by ### Name headings. */
function parseStories(raw: string): ParsedBlock[] {
    const lines = raw.split(/\r?\n/);
    const blocks: ParsedBlock[] = [];

    let current: { authorName: string; lines: string[] } | null = null;

    const pushCurrent = () => {
        if (!current) return;
        const joined = current.lines.join("\n").trim();

        const mailtoMatch = joined.match(/\((mailto:)?([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\)/i);
        const plainEmailMatch = joined.match(/\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/i);

        let authorEmailRaw: string | undefined;
        let authorEmail: string | undefined;

        if (mailtoMatch) {
            authorEmailRaw = mailtoMatch[0];
            authorEmail = (mailtoMatch[2] || "").toLowerCase();
        } else if (plainEmailMatch) {
            authorEmailRaw = plainEmailMatch[0];
            authorEmail = (plainEmailMatch[1] || "").toLowerCase();
        }

        // Remove pure email lines
        const filteredLines = current.lines.filter((ln) => {
            const t = ln.trim();
            if (!t) return true;
            if (/\(mailto:.*@.*\)/i.test(t)) return false;
            if (/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(t)) return false;
            return true;
        });

        const textMarkdown = filteredLines.join("\n").trim();

        if (current.authorName && textMarkdown) {
            blocks.push({
                authorName: current.authorName.trim(),
                authorEmail,
                authorEmailRaw,
                textMarkdown,
            });
        }
    };

    for (const ln of lines) {
        const heading = ln.match(/^###\s+(.+?)\s*$/);
        if (heading) {
            if (current) pushCurrent();
            current = { authorName: heading[1], lines: [] };
        } else {
            if (!current) continue;
            current.lines.push(ln);
        }
    }
    if (current) pushCurrent();

    return blocks;
}

function toStoryDoc(block: ParsedBlock): Omit<StoryDoc, "_id" | "createdAt" | "updatedAt"> {
    const textPlain = stripMinimalMarkdown(block.textMarkdown).trim();
    const storyLines = textPlain.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);

    const paragraphCount = block.textMarkdown
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean).length;

    const words = textPlain.match(/\b[\w’'-]+\b/g) ?? [];
    const wordCount = words.length;
    const charCount = textPlain.length;
    const hasSalutation = /^dear\b/i.test(storyLines[0] ?? "");

    const textKey = `${(block.authorName || "").toLowerCase()}::${textPlain.toLowerCase()}`;
    const textHash32 = fnv1a32(textKey);
    const uniqueKey = `${block.authorName}::${textHash32}`;

    return {
        authorName: block.authorName,
        authorEmail: block.authorEmail,
        authorEmailRaw: block.authorEmailRaw,
        textMarkdown: block.textMarkdown,
        textPlain,
        storyLines,
        paragraphCount,
        wordCount,
        charCount,
        hasSalutation,
        status: "approved",
        source: "import:stories.txt",
        seed: fnv1a32(textPlain.toLowerCase()),
        textHash32,
        uniqueKey,
        importedAt: TODAY,
    };
}


async function main(): Promise<void> {
    try {
        console.log("🔌 Connecting to MongoDB…");
        await mongoose.connect(MONGODB_URI!);

        const filePath = path.resolve(process.cwd(), "data", "stories.txt");
        if (!fs.existsSync(filePath)) {
            throw new Error(`Cannot find ${filePath}`);
        }

        console.log("📖 Reading stories file…");
        const raw = fs.readFileSync(filePath, "utf8");
        const parsed = parseStories(raw);

        if (!parsed.length) {
            console.log("No stories found. Ensure each entry starts with '### Name'.");
            return;
        }

        const docs = parsed.map(toStoryDoc);
        console.log(`📝 Prepared ${docs.length} stories. Importing…`);

        const ops = docs.map((doc) => ({
            updateOne: {
                filter: { uniqueKey: doc.uniqueKey },
                update: { $setOnInsert: doc },
                upsert: true,
            },
        }));

        const result = await Story.bulkWrite(ops, { ordered: false });
        console.log("✅ Import complete.");
        console.log(JSON.stringify(result, null, 2));
    } catch (err: any) {
        console.error("❌ Import failed:", err?.message || err);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect().catch(() => { });
    }
}

main();
