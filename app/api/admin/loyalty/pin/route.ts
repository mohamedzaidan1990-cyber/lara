import { NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { endAllSessions, generatePin, hashPin, normalizePhone, pinWhatsAppLink } from "@/lib/account";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Creates an account for a client (or resets their PIN) and returns a fresh
// 6-digit PIN plus a WhatsApp link to send it. The PIN is shown once and only
// its hash is stored. A reset signs the client out everywhere.
export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { phone?: string; full_name?: string };

  await ensureSchema();
  const phone = await normalizePhone(String(body.phone ?? ""));
  if (!phone) return NextResponse.json({ error: "Not a valid phone number." }, { status: 400 });

  const sql = getSql();
  const pin = generatePin();
  const known = (await sql`
    select full_name from customers where phone_norm = ${phone} order by created_at desc limit 1
  `) as Array<{ full_name: string }>;
  const name = String(body.full_name ?? "").trim() || known[0]?.full_name?.trim() || "Client";

  const rows = (await sql`
    insert into accounts (phone, full_name, pin_hash, created_by)
    values (${phone}, ${name}, ${hashPin(pin)}, 'admin')
    on conflict (phone) do update set pin_hash = excluded.pin_hash
    returning id, full_name, (xmax <> 0) as was_reset
  `) as Array<{ id: string; full_name: string; was_reset: boolean }>;
  const account = rows[0];
  if (account.was_reset) await endAllSessions(account.id);
  await sql`delete from auth_throttle where key in (${`login:${phone}`}, ${`signup:${phone}`})`;

  return NextResponse.json({
    phone,
    full_name: account.full_name,
    pin,
    reset: account.was_reset,
    whatsapp_url: pinWhatsAppLink(phone, account.full_name, pin)
  });
}
