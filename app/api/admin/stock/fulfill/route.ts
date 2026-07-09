import { NextResponse } from "next/server";
import { getSql, type StockItemRow, type OrderWithCustomer } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { stock_item_id?: string; order_id?: string };
  if (!body.stock_item_id || !body.order_id) {
    return NextResponse.json({ error: "stock_item_id and order_id are required" }, { status: 400 });
  }

  const sql = getSql();

  const stockRows = (await sql`
    SELECT id, quantity, cost_gbp, cost_usd FROM stock_items WHERE id = ${body.stock_item_id}
  `) as Array<{ id: string; quantity: number; cost_gbp: string | null; cost_usd: string | null }>;
  if (!stockRows.length) return NextResponse.json({ error: "Stock item not found" }, { status: 404 });
  if (stockRows[0].quantity < 1) return NextResponse.json({ error: "No quantity available" }, { status: 409 });

  const orderCheck = (await sql`
    SELECT id, coalesce(total_usd, price_usd, 0) as total_usd, coalesce(platform_fee_usd, 0) as platform_fee_usd
    FROM orders WHERE id = ${body.order_id}
  `) as Array<{ id: string; total_usd: string | number; platform_fee_usd: string | number }>;
  if (!orderCheck.length) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  let updatedStockItem: StockItemRow | null = null;
  if (stockRows[0].quantity === 1) {
    await sql`DELETE FROM stock_items WHERE id = ${body.stock_item_id}`;
  } else {
    const updated = (await sql`
      UPDATE stock_items SET quantity = quantity - 1 WHERE id = ${body.stock_item_id}
      RETURNING id, product_id, product_name, product_brand, product_url, image_url,
                cost_gbp, cost_usd, quantity, notes, purchased_at::text, created_at
    `) as StockItemRow[];
    updatedStockItem = updated[0] ?? null;
  }

  await sql`UPDATE order_items SET sourced = true WHERE order_id = ${body.order_id}`;

  // Transfer cost from stock item to order and recalculate profit.
  const stockCostGbp = stockRows[0].cost_gbp != null ? Number(stockRows[0].cost_gbp) : null;
  const stockCostUsd = stockRows[0].cost_usd != null ? Number(stockRows[0].cost_usd) : null;
  if (stockCostGbp != null && stockCostUsd != null) {
    const revenueUsd = Number(orderCheck[0].total_usd) || 0;
    const platformFee = Number(orderCheck[0].platform_fee_usd) || 0;
    const profitUsd = Math.round((revenueUsd - stockCostUsd - platformFee) * 100) / 100;
    await sql`
      UPDATE orders
      SET status = 'fulfilled_from_stock', cost_gbp = ${stockCostGbp}, cost_usd = ${stockCostUsd},
          profit_usd = ${profitUsd}, updated_at = now()
      WHERE id = ${body.order_id}
    `;
  } else {
    await sql`UPDATE orders SET status = 'fulfilled_from_stock', updated_at = now() WHERE id = ${body.order_id}`;
  }

  const orderRows = (await sql`
    SELECT o.id, o.order_number, o.customer_id, o.customer_email, o.product_name, o.product_brand, o.product_url,
           o.price_gbp, o.price_usd, o.total_usd, o.total_gbp, o.items_count,
           o.status, o.payment_method, o.payment_confirmed,
           o.payment_screenshot, o.notes, o.created_at, o.updated_at,
           o.invoice_sent_at, o.tracking_number,
           o.cost_gbp, o.cost_usd, o.platform_fee_usd, o.profit_usd, o.profit_notes, o.source,
           o.amount_paid_usd,
           coalesce(c.full_name, '') as full_name,
           coalesce(c.phone, '') as phone,
           coalesce(c.address, '') as address,
           coalesce(
             (select json_agg(json_build_object(
               'id', oi.id, 'brand', oi.product_brand, 'name', oi.product_name, 'quantity', oi.quantity,
               'price_usd', oi.price_usd, 'price_gbp', oi.price_gbp, 'product_url', oi.product_url,
               'vendor', oi.vendor, 'cost_gbp', oi.cost_gbp, 'cost_usd', oi.cost_usd, 'sourced', oi.sourced
             )) from order_items oi where oi.order_id = o.id),
             '[]'
           ) as items
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    WHERE o.id = ${body.order_id}
  `) as OrderWithCustomer[];

  return NextResponse.json({ order: orderRows[0], stockItem: updatedStockItem });
}
