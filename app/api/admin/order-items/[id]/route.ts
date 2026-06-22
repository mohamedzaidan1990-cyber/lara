import { NextResponse } from "next/server";
import { ensureSchema, getSql, type StockItemRow } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    // Sourcing fields (existing)
    vendor?: string | null;
    cost_gbp?: number | string | null;
    cost_usd?: number | string | null;
    sourced?: boolean;
    // Product edit fields (new)
    product_name?: string;
    product_brand?: string;
    price_gbp?: number | string | null;
    price_usd?: number | string | null;
    product_url?: string | null;
    image_url?: string | null;
  };

  await ensureSchema();
  const sql = getSql();

  const isProductEdit = body.product_name !== undefined || body.product_brand !== undefined;

  if (isProductEdit) {
    if (!body.product_brand?.trim() || !body.product_name?.trim()) {
      return NextResponse.json({ error: "product_brand and product_name are required" }, { status: 400 });
    }
    const priceGbp = body.price_gbp != null ? Number(body.price_gbp) : 0;
    const priceUsd = body.price_usd != null ? Number(body.price_usd) : 0;

    await sql`
      UPDATE order_items SET
        product_brand = ${body.product_brand.trim()},
        product_name  = ${body.product_name.trim()},
        price_gbp     = ${priceGbp},
        price_usd     = ${priceUsd},
        product_url   = ${body.product_url ?? null},
        image_url     = ${body.image_url ?? null}
      WHERE id = ${params.id}
    `;

    const itemRows = (await sql`
      SELECT id, order_id, product_brand, product_name, price_gbp, price_usd, product_url
      FROM order_items WHERE id = ${params.id} LIMIT 1
    `) as Array<{ id: string; order_id: string; product_brand: string; product_name: string; price_gbp: string; price_usd: string; product_url: string | null }>;
    const item = itemRows[0];
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const totals = (await sql`
      UPDATE orders
      SET total_usd   = (SELECT COALESCE(SUM(price_usd * quantity), 0) FROM order_items WHERE order_id = ${item.order_id}),
          total_gbp   = (SELECT COALESCE(SUM(price_gbp * quantity), 0) FROM order_items WHERE order_id = ${item.order_id}),
          items_count = (SELECT COUNT(*)::int FROM order_items WHERE order_id = ${item.order_id}),
          updated_at  = now()
      WHERE id = ${item.order_id}
      RETURNING total_usd, total_gbp, items_count
    `) as Array<{ total_usd: string; total_gbp: string; items_count: number }>;

    return NextResponse.json({
      id: item.id,
      product_brand: item.product_brand,
      product_name: item.product_name,
      price_gbp: item.price_gbp,
      price_usd: item.price_usd,
      product_url: item.product_url,
      order_total_usd: totals[0]?.total_usd ?? null,
      order_total_gbp: totals[0]?.total_gbp ?? null,
      order_items_count: totals[0]?.items_count ?? null
    });
  }

  // --- Sourcing update (existing behaviour) ---
  const costGbp = body.cost_gbp != null && body.cost_gbp !== "" ? Number(body.cost_gbp) : null;
  const costUsd = body.cost_usd != null && body.cost_usd !== "" ? Number(body.cost_usd) : null;

  await sql`
    UPDATE order_items
    SET vendor   = ${body.vendor ?? null},
        cost_gbp = ${costGbp},
        cost_usd = ${costUsd},
        sourced  = ${body.sourced ?? false}
    WHERE id = ${params.id}
  `;

  const rows = (await sql`
    SELECT id, vendor, cost_gbp, cost_usd, sourced, order_id
    FROM order_items WHERE id = ${params.id} LIMIT 1
  `) as Array<{ id: string; vendor: string | null; cost_gbp: string | null; cost_usd: string | null; sourced: boolean; order_id: string }>;

  const row = rows[0];
  if (!row) return NextResponse.json({ ok: true });

  let orderStatus: string | null = null;
  if (body.sourced === true) {
    const orderRows = (await sql`
      SELECT status FROM orders WHERE id = ${row.order_id} LIMIT 1
    `) as Array<{ status: string }>;

    if (orderRows[0]?.status === "payment_confirmed") {
      const unsourced = (await sql`
        SELECT count(*)::int as cnt FROM order_items
        WHERE order_id = ${row.order_id} AND sourced = false
      `) as Array<{ cnt: number }>;

      if ((unsourced[0]?.cnt ?? 1) === 0) {
        await sql`
          UPDATE orders
          SET status = 'ordered_selfridges', ordered_selfridges_at = now(), updated_at = now()
          WHERE id = ${row.order_id}
        `;
        orderStatus = "ordered_selfridges";
      }
    }
  }

  return NextResponse.json({
    id: row.id,
    vendor: row.vendor,
    cost_gbp: row.cost_gbp,
    cost_usd: row.cost_usd,
    sourced: row.sourced,
    order_id: row.order_id,
    order_status: orderStatus
  });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sql = getSql();

  const itemRows = (await sql`
    SELECT id, order_id, product_name, product_brand, product_url, image_url,
           price_gbp, price_usd, quantity, sourced
    FROM order_items WHERE id = ${params.id} LIMIT 1
  `) as Array<{ id: string; order_id: string; product_name: string; product_brand: string; product_url: string | null; image_url: string | null; price_gbp: string; price_usd: string; quantity: number; sourced: boolean }>;

  if (!itemRows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const item = itemRows[0];

  let stockItem: StockItemRow | null = null;
  if (item.sourced) {
    const stock = (await sql`
      INSERT INTO stock_items (product_name, product_brand, product_url, image_url, cost_gbp, cost_usd, quantity, notes)
      VALUES (${item.product_name}, ${item.product_brand}, ${item.product_url}, ${item.image_url},
              ${item.price_gbp}, ${item.price_usd}, ${item.quantity}, 'Moved from cancelled order item')
      RETURNING id, product_id, product_name, product_brand, product_url, image_url,
                cost_gbp, cost_usd, quantity, notes, purchased_at::text, created_at
    `) as StockItemRow[];
    stockItem = stock[0] ?? null;
  }

  await sql`DELETE FROM order_items WHERE id = ${params.id}`;

  const totals = (await sql`
    UPDATE orders
    SET total_usd   = (SELECT COALESCE(SUM(price_usd * quantity), 0) FROM order_items WHERE order_id = ${item.order_id}),
        total_gbp   = (SELECT COALESCE(SUM(price_gbp * quantity), 0) FROM order_items WHERE order_id = ${item.order_id}),
        items_count = (SELECT COUNT(*)::int FROM order_items WHERE order_id = ${item.order_id}),
        updated_at  = now()
    WHERE id = ${item.order_id}
    RETURNING total_usd, total_gbp, items_count
  `) as Array<{ total_usd: string; total_gbp: string; items_count: number }>;

  return NextResponse.json({
    stockItem,
    order_total_usd: totals[0]?.total_usd ?? null,
    order_total_gbp: totals[0]?.total_gbp ?? null,
    order_items_count: totals[0]?.items_count ?? 0
  });
}
