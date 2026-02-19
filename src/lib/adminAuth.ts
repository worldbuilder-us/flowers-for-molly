import { createHmac, timingSafeEqual } from "crypto";

export const ADMIN_SESSION_COOKIE = "ffm_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days

type SessionPayload = {
  exp: number;
};

function getAuthSecret(): string {
  return process.env.ADMIN_REVIEW_SECRET || process.env.ADMIN_REVIEW_PASSWORD || "";
}

export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_REVIEW_PASSWORD && getAuthSecret());
}

export function verifyAdminPassword(inputPassword: string): boolean {
  const expected = process.env.ADMIN_REVIEW_PASSWORD || "";
  if (!expected) return false;

  const inputBuffer = Buffer.from(inputPassword);
  const expectedBuffer = Buffer.from(expected);
  if (inputBuffer.length !== expectedBuffer.length) return false;

  return timingSafeEqual(inputBuffer, expectedBuffer);
}

function sign(payloadB64: string): string {
  const secret = getAuthSecret();
  return createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

export function createAdminSessionToken(nowMs = Date.now()): string {
  const payload: SessionPayload = {
    exp: nowMs + SESSION_TTL_SECONDS * 1000,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function verifyAdminSessionToken(token?: string | null, nowMs = Date.now()): boolean {
  if (!token) return false;
  const [payloadB64, providedSig] = token.split(".");
  if (!payloadB64 || !providedSig) return false;

  const expectedSig = sign(payloadB64);
  const providedSigBuffer = Buffer.from(providedSig);
  const expectedSigBuffer = Buffer.from(expectedSig);
  if (providedSigBuffer.length !== expectedSigBuffer.length) return false;
  if (!timingSafeEqual(providedSigBuffer, expectedSigBuffer)) return false;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as SessionPayload;
    return typeof payload.exp === "number" && payload.exp > nowMs;
  } catch {
    return false;
  }
}

export function adminSessionCookieOptions() {
  const secure = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}
