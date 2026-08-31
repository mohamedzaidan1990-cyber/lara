/**
 * Adds 1x Charlotte Tilbury "Pillow Talk Glossy Lip Kit — Fair" ($38) to
 * existing order SBB-520503 (Maya Nehmeh). The order already carried the note
 * "add charlotte tilburry glossy lip kit".
 *
 * Mirrors app/api/admin/orders/[id]/items/route.ts: inserts the line item then
 * recomputes order totals / items_count from order_items. Also refreshes the
 * order's summary + headline price fields to stay consistent with the
 * manual-order path.
 *
 * Run:  npx ts-node scripts/add-item-to-sbb-520503.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadDotenv(file: string): void {
  let text: string;
  try {
    text = readFileSync(resolve(process.cwd(), file), "utf8");
  } catch {
    return;
  }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}
loadDotenv(".env.local");
loadDotenv(".env");

import { ensureSchema, getSql } from "../lib/db";

const ORDER_NUMBER = "SBB-520503";
const ITEM = {
  brand: "Charlotte Tilbury",
  name: "Pillow Talk Glossy Lip Kit — Fair",
  price_usd: 38,
  price_gbp: 29.23,
  quantity: 1,
  product_url: "https://www.charlottetilbury.com/us/product/glossy-lip-duo-pillow-talk-fair",
  image_url: "/ct-pillow-talk-glossy-lip-kit-fair.png"
};

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  await ensureSchema();
  const sql = getSql();

  const orderRows = (await sql`
    select id from orders where order_number = ${ORDER_NUMBER} limit 1
  `) as Array<{ id: string }>;
  if (!orderRows.length) {
    console.error(`Order ${ORDER_NUMBER} not found`);
    process.exit(1);
  }
  const orderId = orderRows[0].id;

  await sql`
    insert into order_items (
      order_id, product_brand, product_name, product_url, image_url,
      price_gbp, price_usd, quantity
    )
    values (
      ${orderId}, ${ITEM.brand}, ${ITEM.name}, ${ITEM.product_url}, ${ITEM.image_url},
      ${ITEM.price_gbp}, ${ITEM.price_usd}, ${ITEM.quantity}
    )
  `;

  const rows = (await sql`
    with agg as (
      select
        coalesce(sum(price_usd * quantity), 0) as total_usd,
        coalesce(sum(price_gbp * quantity), 0) as total_gbp,
        count(*)::int as items_count,
        count(distinct product_brand) as brand_count
      from order_items where order_id = ${orderId}
    )
    update orders o
    set total_usd    = agg.total_usd,
        total_gbp    = agg.total_gbp,
        price_usd    = agg.total_usd,
        price_gbp    = agg.total_gbp,
        items_count  = agg.items_count,
        product_name = agg.items_count || ' items',
        product_brand = case when agg.brand_count = 1
                             then (select product_brand from order_items where order_id = ${orderId} limit 1)
                             else 'Multiple brands' end,
        updated_at   = now()
    from agg
    where o.id = ${orderId}
    returning o.order_number, o.total_usd, o.total_gbp, o.items_count, o.product_brand, o.product_name
  `) as Array<Record<string, unknown>>;

  console.log("Updated:", rows[0]);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
