import { NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";
import { PIN_RE, LOCKED_MESSAGE, clearFailures, hashPin, isThrottled, normalizePhone, recordFailure, startSession } from "@/lib/account";
import { syncPoints } from "@/lib/loyalty";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Anyone can open an account. If the phone already has orders with us, the
// person must prove it's theirs with one of their order numbers (SBB-xxxxxx,
// from their invoice) — otherwise anyone could type a client's number and see
// their orders and address. Without one, the team sets a PIN from the admin.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { full_name?: string; phone?: string; pin?: string; order_number?: string };
  const fullName = String(body.full_name ?? "").trim();
  const pin = String(body.pin ?? "").trim();
  if (!fullName) return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  if (!PIN_RE.test(pin)) return NextResponse.json({ error: "Your PIN must be exactly 6 digits." }, { status: 400 });

  await ensureSchema();
  const phone = await normalizePhone(String(body.phone ?? ""));
  if (!phone) {
    return NextResponse.json(
      { error: "Please enter a valid phone number (e.g. 70 123 456, or +44… for numbers outside Lebanon)." },
      { status: 400 }
    );
  }

  const sql = getSql();
  const existing = (await sql`select id from accounts where phone = ${phone}`) as Array<{ id: string }>;
  if (existing.length) {
    return NextResponse.json({ error: "This number already has an account. Please log in instead." }, { status: 409 });
  }

  const orders = (await sql`
    select upper(o.order_number) as order_number
    from orders o join customers c on c.id = o.customer_id
    where c.phone_norm = ${phone}
  `) as Array<{ order_number: string }>;

  if (orders.length) {
    const key = `signup:${phone}`;
    if (await isThrottled(key)) return NextResponse.json({ error: LOCKED_MESSAGE }, { status: 429 });
    const given = String(body.order_number ?? "").trim().toUpperCase().replace(/\s+/g, "");
    if (!given) {
      return NextResponse.json(
        {
          needs_order_number: true,
          error: "You've ordered with us before. To protect your details, please enter one of your order numbers (it starts with SBB-)."
        },
        { status: 403 }
      );
    }
    const normalized = `SBB-${given.replace(/^SBB-?/, "")}`;
    if (!orders.some((o) => o.order_number === normalized)) {
      await recordFailure(key);
      return NextResponse.json(
        {
          needs_order_number: true,
          error: "That order number doesn't match this phone number. Check your invoice, or message us and we'll set up your PIN."
        },
        { status: 403 }
      );
    }
    await clearFailures(key);
  }

  const created = (await sql`
    insert into accounts (phone, full_name, pin_hash, created_by)
    values (${phone}, ${fullName}, ${hashPin(pin)}, 'self')
    on conflict (phone) do nothing
    returning id
  `) as Array<{ id: string }>;
  if (!created.length) {
    return NextResponse.json({ error: "This number already has an account. Please log in instead." }, { status: 409 });
  }
  await syncPoints(phone);
  await startSession(created[0].id);
  return NextResponse.json({ ok: true });
}
