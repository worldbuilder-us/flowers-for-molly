import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, adminSessionCookieOptions } from "@/lib/adminAuth";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, "", {
    ...adminSessionCookieOptions(),
    maxAge: 0,
  });

  return NextResponse.json({ ok: true });
}
