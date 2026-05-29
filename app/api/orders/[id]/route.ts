import { NextResponse } from "next/server";
import { ensureSchema, getSql, ORDER_STATUSES, type OrderRow, type OrderStatus } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { sendPaymentConfirmation } from "@/lib/email";
import { sendWhatsAppConfirmation, sendWhatsAppText } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PatchBody {
  status?: string;
  payment_confirmed?: boolean;
  tracking_number?: string;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = params.id;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as PatchBody;
  const nextStatus =
    body.status && (ORDER_STATUSES as string[]).includes(body.status) ? (body.status as OrderStatus) : undefined;
  const nextPaid = typeof body.payment_confirmed === "boolean" ? body.payment_confirmed : undefined;
  const tracking = typeof body.tracking_number === "string" && body.tracking_number.trim() ? body.tracking_number.trim() : undefined;

  if (nextStatus === undefined && nextPaid === undefined) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  await ensureSchema();
  const sql = getSql();

  const existing = (await sql`select payment_confirmed from orders where id = ${id} limit 1`) as Array<{
    payment_confirmed: boolean;
  }>;
  const wasPaid = existing[0]?.payment_confirmed === true;

  const nowIso = new Date().toISOString();
  const orderedAt = nextStatus === "ordered_selfridges" ? nowIso : null;
  const shippedAt = nextStatus === "shipped" ? nowIso : null;
  const deliveredAt = nextStatus === "delivered" ? nowIso : null;
  const trackingVal = nextStatus === "shipped" ? tracking ?? null : null;

  const updated = (await sql`
    update orders
    set status = coalesce(${nextStatus ?? null}, status),
        payment_confirmed = coalesce(${nextPaid ?? null}, payment_confirmed),
        ordered_selfridges_at = coalesce(${orderedAt}, ordered_selfridges_at),
        shipped_at = coalesce(${shippedAt}, shipped_at),
        delivered_at = coalesce(${deliveredAt}, delivered_at),
        tracking_number = coalesce(${trackingVal}, tracking_number),
        updated_at = now()
    where id = ${id}
    returning id, order_number, customer_id, customer_email, product_name, product_brand, product_url,
              price_gbp, price_usd, status, payment_method, payment_confirmed,
              payment_screenshot, notes, tracking_number, created_at, updated_at
  `) as OrderRow[];

  if (updated.length === 0) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  const order = updated[0];

  // Resolve customer phone/name for notifications.
  const joined = (await sql`
    select o.order_number, o.customer_email, o.product_name, o.price_usd, o.tracking_number,
           coalesce(c.full_name, '') as full_name,
           coalesce(c.phone, '') as phone,
           coalesce(c.address, '') as address
    from orders o left join customers c on c.id = o.customer_id
    where o.id = ${id} limit 1
  `) as Array<{
    order_number: string;
    customer_email: string | null;
    product_name: string;
    price_usd: string | number;
    tracking_number: string | null;
    full_name: string;
    phone: string;
    address: string;
  }>;
  const row = joined[0];
  const firstName = (row?.full_name || "there").split(" ")[0];

  try {
    // Manual payment toggle (legacy) — only when not driven by invoice flow.
    if (nextPaid === true && !wasPaid && row?.customer_email) {
      await Promise.all([
        sendPaymentConfirmation(
          { order_number: row.order_number, product_brand: order.product_brand ?? "", product_name: row.product_name, price_usd: row.price_usd },
          { full_name: row.full_name, phone: row.phone, email: row.customer_email, address: row.address }
        ).catch((err) => console.error("sendPaymentConfirmation error", err)),
        row.phone
          ? sendWhatsAppConfirmation(row.phone, row.order_number, row.product_name).catch((err) => console.error("sendWhatsAppConfirmation error", err))
          : Promise.resolve()
      ]);
    }

    // Workflow customer notifications.
    if (row?.phone) {
      if (nextStatus === "ordered_selfridges") {
        await sendWhatsAppText(
          row.phone,
          `Good news, ${firstName}! We've placed your order ${row.order_number} in London 🐝 We'll update you when it ships.`
        );
      } else if (nextStatus === "shipped") {
        const tn = row.tracking_number || "(provided separately)";
        await sendWhatsAppText(
          row.phone,
          `Your order ${row.order_number} is on its way! 🐝 Tracking: ${tn}. Est. arrival: 10-14 working days.`
        );
      } else if (nextStatus === "delivered") {
        await sendWhatsAppText(
          row.phone,
          `Your Seasons by B order ${row.order_number} has arrived! 🐝 We hope you love it. Please let us know if you need anything.`
        );
      }
    }
  } catch (err) {
    console.error("workflow notification dispatch failed", err);
  }

  return NextResponse.json({ order });
}
