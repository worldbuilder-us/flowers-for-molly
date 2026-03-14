// src/app/api/stories/[id]/route.ts
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { Story } from "@/models/Story";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id?: string | string[] }> },
) {
  await dbConnect();

  const { id } = await ctx.params;
  const normalizedId = Array.isArray(id) ? id[0] : id;

  if (!normalizedId || !mongoose.Types.ObjectId.isValid(normalizedId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const story = await Story.findOne({
    _id: normalizedId,
    status: "approved",
  })
    .select({
      authorName: 1,
      authorEmail: 1,
      textPlain: 1,
      textMarkdown: 1,
      importedAt: 1,
    })
    .lean();
  if (!story) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(story);
}
