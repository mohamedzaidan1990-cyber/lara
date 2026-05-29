import { NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TrackRow {
  order_number: string;
  status: string;
  tracking_number: string | null;
  created_at: string;
  invoice_sent_at: string | null;
  ordered_selfridges_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  items: Array<{ brand: string; name: string; quantity: number }>;
}

export async function GET(req: Request) {
  const orderNumber = (new URL(req.url).searchParams.get("order") ?? "").trim().toUpperCase();
  if (!/^LARA-\d{4,8}$/.test(orderNumber)) {
    return NextResponse.json({ error: "Enter a valid order number (e.g. LARA-123456)." }, { status: 400 });
  }

  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`
    select o.order_number, o.status, o.tracking_number, o.created_at,
           o.invoice_sent_at, o.ordered_selfridges_at, o.shipped_at, o.delivered_at,
           coalesce(
             (select json_agg(json_build_object('brand', oi.product_brand, 'name', oi.product_name, 'quantity', oi.quantity))
              from order_items oi where oi.order_id = o.id),
             '[]'
           ) as items
    from orders o
    where upper(o.order_number) = ${orderNumber}
    limit 1
  `) as TrackRow[];

  const row = rows[0];
  if (!row) {
    return NextResponse.json({ error: "We couldn't find that order number." }, { status: 404 });
  }

  // No customer PII — only fulfilment state.
  return NextResponse.json({
    order_number: row.order_number,
    status: row.status,
    tracking_number: row.tracking_number,
    items: row.items ?? [],
    timestamps: {
      placed: row.created_at,
      payment_confirmed: row.invoice_sent_at,
      ordered: row.ordered_selfridges_at,
      shipped: row.shipped_at,
      delivered: row.delivered_at
    }
  });
}
