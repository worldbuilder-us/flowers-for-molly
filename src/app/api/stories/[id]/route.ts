import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { Story } from "@/models/Story";

import { NextRequest } from "next/server";

export async function GET(_req: NextRequest, context: { params: { id: string } }) {
  await dbConnect();
  const story = await Story.findById(context.params.id).lean();
  if (!story) {
    return new NextResponse("Not found", { status: 404 });
  }
  return NextResponse.json(story);
}
