import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { Story } from "@/models/Story";

type Params = { params: { id: string } };

export async function GET(_req: Request, { params }: Params) {
  await dbConnect();
  const story = await Story.findById(params.id).lean();
  if (!story) {
    return new NextResponse("Not found", { status: 404 });
  }
  return NextResponse.json(story);
}
