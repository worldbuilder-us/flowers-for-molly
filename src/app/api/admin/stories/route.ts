import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { dbConnect } from "@/lib/mongoose";
import { Story } from "@/models/Story";
import {
  ADMIN_SESSION_COOKIE,
  isAdminConfigured,
  verifyAdminSessionToken,
} from "@/lib/adminAuth";

function isAuthed(cookieValue?: string): boolean {
  return isAdminConfigured() && verifyAdminSessionToken(cookieValue);
}

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!isAuthed(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const { searchParams } = new URL(req.url);
  const requestedStatus = (searchParams.get("status") || "pending").trim();
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 25)));

  const allowedStatuses = new Set(["pending", "approved", "rejected", "all"]);
  const status = allowedStatuses.has(requestedStatus) ? requestedStatus : "pending";

  const query = status === "all" ? {} : { status };
  const skip = (page - 1) * limit;

  const [total, stories] = await Promise.all([
    Story.countDocuments(query),
    Story.find(query)
      .sort({ importedAt: -1, createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .select({
        authorName: 1,
        authorEmail: 1,
        textPlain: 1,
        textMarkdown: 1,
        importedAt: 1,
        status: 1,
        createdAt: 1,
        updatedAt: 1,
      })
      .lean(),
  ]);

  return NextResponse.json({
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    status,
    stories,
  });
}
