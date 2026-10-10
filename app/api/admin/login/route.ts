import { NextResponse } from "next/server";
import { LOCKED_MESSAGE, clearFailures, isThrottled, recordFailure } from "@/lib/account";
import { ensureSchema } from "@/lib/db";
import { ADMIN_COOKIE, ADMIN_SESSION_SECONDS, createAdminSessionValue } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return NextResponse.json({ error: "ADMIN_PASSWORD not configured" }, { status: 500 });
  }
  // 10 wrong passwords from one IP → 15-minute lock.
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const key = `admin:${ip}`;
  await ensureSchema();
  if (await isThrottled(key)) {
    return NextResponse.json({ error: LOCKED_MESSAGE }, { status: 429 });
  }
  if (!password || password !== expected) {
    await recordFailure(key, 10);
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }
  await clearFailures(key);
  const session = createAdminSessionValue();
  if (!session) {
    return NextResponse.json({ error: "ADMIN_PASSWORD not configured" }, { status: 500 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, session, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_SECONDS
  });
  return res;
}
