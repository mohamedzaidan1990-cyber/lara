import { NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";
import { LOCKED_MESSAGE, clearFailures, isThrottled, normalizePhone, recordFailure, startSession, verifyPin } from "@/lib/account";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WRONG = "Wrong phone number or PIN.";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { phone?: string; pin?: string };
  await ensureSchema();
  const phone = await normalizePhone(String(body.phone ?? ""));
  const pin = String(body.pin ?? "").trim();
  if (!phone || !pin) return NextResponse.json({ error: WRONG }, { status: 401 });

  const key = `login:${phone}`;
  if (await isThrottled(key)) return NextResponse.json({ error: LOCKED_MESSAGE }, { status: 429 });

  const sql = getSql();
  const rows = (await sql`select id, pin_hash from accounts where phone = ${phone}`) as Array<{ id: string; pin_hash: string }>;
  if (!rows.length || !verifyPin(pin, rows[0].pin_hash)) {
    await recordFailure(key);
    return NextResponse.json({ error: WRONG }, { status: 401 });
  }
  await clearFailures(key);
  await startSession(rows[0].id);
  return NextResponse.json({ ok: true });
}
