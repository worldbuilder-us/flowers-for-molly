#!/usr/bin/env ts-node
/**
 * Import stories from a CSV export into MongoDB.
 * Usage (recommended): npx tsx scripts/importStoriesCsv.ts [path/to/stories.csv]
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

function normalizeNewlines(input: string): string {
  return input
    .replace(/\r\n/g, "\n")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\/n/g, "\n");
}

function normalizeText(input: string | undefined | null): string {
  if (!input) return "";
  return normalizeNewlines(String(input)).trim();
}

function parseCsv(raw: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    const next = raw[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (ch === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
      continue;
    }

    field += ch;
  }

  row.push(field);
  if (row.length > 1 || row[0] !== "") rows.push(row);
  return rows;
}

type CsvRow = Record<string, string>;

function rowsToObjects(rows: string[][]): CsvRow[] {
  if (!rows.length) return [];
  const header = rows[0];
  return rows.slice(1).map((r) => {
    const obj: CsvRow = {};
    for (let i = 0; i < header.length; i++) {
      obj[header[i]] = r[i] ?? "";
    }
    return obj;
  });
}

function getStoryLines(row: CsvRow): string[] {
  const entries = Object.keys(row)
    .map((key) => {
      const match = key.match(/^storyLines\[(\d+)\]$/);
      if (!match) return null;
      return { key, index: Number(match[1]) };
    })
    .filter((v): v is { key: string; index: number } => Boolean(v))
    .sort((a, b) => a.index - b.index);

  const lines = entries
    .map((entry) => normalizeText(row[entry.key]))
    .map((line) => line.trim())
    .filter(Boolean);

  return lines;
}

function computeParagraphCount(markdown: string): number {
  return markdown
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean).length;
}

function computeWordCount(text: string): number {
  const words = text.match(/\b[\w’'-]+\b/g) ?? [];
  return words.length;
}

function toStoryDoc(row: CsvRow): Omit<StoryDoc, "_id" | "createdAt" | "updatedAt"> | null {
  const authorName = normalizeText(row.authorName);
  if (!authorName) return null;

  const authorEmail = normalizeText(row.authorEmail).toLowerCase() || undefined;
  const authorEmailRaw = normalizeText(row.authorEmailRaw) || undefined;

  const textMarkdown = normalizeText(row.textMarkdown);
  const fallbackPlain = stripMinimalMarkdown(textMarkdown);
  const textPlain = normalizeText(row.textPlain || fallbackPlain || textMarkdown);

  const csvStoryLines = getStoryLines(row);
  const storyLines = csvStoryLines.length
    ? csvStoryLines
    : textPlain.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);

  if (!textMarkdown && !textPlain) return null;

  const paragraphCount = computeParagraphCount(textMarkdown || textPlain);
  const wordCount = computeWordCount(textPlain);
  const charCount = textPlain.length;
  const hasSalutation = /^dear\b/i.test(storyLines[0] ?? "");

  const textKey = `${authorName.toLowerCase()}::${textPlain.toLowerCase()}`;
  const textHash32 = fnv1a32(textKey);
  const uniqueKey = `${authorName}::${textHash32}`;

  const status = normalizeText(row.status) || "approved";
  const source = normalizeText(row.source) || "import:stories.csv";
  const importedAt = row.importedAt ? new Date(row.importedAt) : TODAY;

  return {
    authorName,
    authorEmail,
    authorEmailRaw,
    textMarkdown,
    textPlain,
    storyLines,
    paragraphCount,
    wordCount,
    charCount,
    hasSalutation,
    status: status as "pending" | "approved" | "rejected",
    source,
    seed: fnv1a32(textPlain.toLowerCase()),
    textHash32,
    uniqueKey,
    importedAt: Number.isNaN(importedAt.getTime()) ? TODAY : importedAt,
  };
}

async function main(): Promise<void> {
  try {
    console.log("🔌 Connecting to MongoDB…");
    await mongoose.connect(MONGODB_URI!);

    const argPath = process.argv[2];
    const filePath = argPath
      ? path.resolve(process.cwd(), argPath)
      : path.resolve(process.cwd(), "data", "stories_02102026.csv");
    if (!fs.existsSync(filePath)) {
      throw new Error(`Cannot find ${filePath}`);
    }

    console.log("📖 Reading stories CSV…");
    const raw = fs.readFileSync(filePath, "utf8");
    const rows = parseCsv(raw);
    const objects = rowsToObjects(rows);

    if (!objects.length) {
      console.log("No rows found in CSV.");
      return;
    }

    const docs: Omit<StoryDoc, "_id" | "createdAt" | "updatedAt">[] = [];
    let skipped = 0;
    for (const row of objects) {
      const doc = toStoryDoc(row);
      if (!doc) {
        skipped++;
        continue;
      }
      docs.push(doc);
    }

    if (!docs.length) {
      console.log("No valid stories found to import.");
      return;
    }

    console.log(`📝 Prepared ${docs.length} stories${skipped ? ` (${skipped} skipped)` : ""}. Importing…`);

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
    await mongoose.disconnect().catch(() => {});
  }
}

main();
