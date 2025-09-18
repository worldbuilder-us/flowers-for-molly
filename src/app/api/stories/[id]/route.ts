// src/app/api/stories/[id]/route.ts
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { Story } from "@/models/Story";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: unknown) {
  await dbConnect();

  // Narrow the unknown `ctx` to the shape Next provides
  const { id } = (ctx as { params?: { id?: string | string[] } }).params ?? {};
  const normalizedId = Array.isArray(id) ? id[0] : id;

  if (!normalizedId || !mongoose.Types.ObjectId.isValid(normalizedId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const story = await Story.findById(normalizedId).lean();
  if (!story) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(story);
}
