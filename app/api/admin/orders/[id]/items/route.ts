import { NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    brand?: string;
    name?: string;
    price_gbp?: number | string;
    price_usd?: number | string;
    quantity?: number | string;
    product_url?: string | null;
  };

  if (!body.brand?.trim() || !body.name?.trim()) {
    return NextResponse.json({ error: "brand and name are required" }, { status: 400 });
  }

  await ensureSchema();
  const sql = getSql();

  const orderRows = (await sql`SELECT id FROM orders WHERE id = ${params.id} LIMIT 1`) as Array<{ id: string }>;
  if (!orderRows.length) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const priceGbp = Number(body.price_gbp) || 0;
  const priceUsd = Number(body.price_usd) || 0;
  const quantity = Math.max(1, Math.floor(Number(body.quantity) || 1));

  const newRows = (await sql`
    INSERT INTO order_items (order_id, product_brand, product_name, price_gbp, price_usd, quantity, product_url)
    VALUES (${params.id}, ${body.brand.trim()}, ${body.name.trim()}, ${priceGbp}, ${priceUsd}, ${quantity}, ${body.product_url ?? null})
    RETURNING id, product_brand AS brand, product_name AS name, price_gbp, price_usd, quantity, product_url
  `) as Array<{ id: string; brand: string; name: string; price_gbp: string; price_usd: string; quantity: number; product_url: string | null }>;

  const totals = (await sql`
    UPDATE orders
    SET total_usd   = (SELECT COALESCE(SUM(price_usd * quantity), 0) FROM order_items WHERE order_id = ${params.id}),
        total_gbp   = (SELECT COALESCE(SUM(price_gbp * quantity), 0) FROM order_items WHERE order_id = ${params.id}),
        items_count = (SELECT COUNT(*)::int FROM order_items WHERE order_id = ${params.id}),
        updated_at  = now()
    WHERE id = ${params.id}
    RETURNING total_usd, total_gbp, items_count
  `) as Array<{ total_usd: string; total_gbp: string; items_count: number }>;

  const item = newRows[0];
  return NextResponse.json({
    item: {
      id: item.id,
      brand: item.brand,
      name: item.name,
      price_gbp: item.price_gbp,
      price_usd: item.price_usd,
      quantity: item.quantity,
      product_url: item.product_url,
      sourced: false,
      vendor: null,
      cost_gbp: null,
      cost_usd: null,
    },
    order_total_usd: totals[0]?.total_usd ?? null,
    order_total_gbp: totals[0]?.total_gbp ?? null,
    order_items_count: totals[0]?.items_count ?? null,
  });
}
