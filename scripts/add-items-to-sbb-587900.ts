/**
 * Adds two line items to existing order SBB-587900 (Rabab Baydoun):
 *   1x Sephora Collection 12H Colorful Waterproof Retractable Eyeliner
 *      — 01 Matte Black  ($28)
 *   1x Sephora Collection Mixed Tool Set  ($55)
 *      (catalogue product 024d4417-ec7c-4e2a-b1ad-298b57bb0bfb)
 *
 * Mirrors app/api/admin/orders/[id]/items/route.ts: inserts the items then
 * recomputes order totals / items_count / summary from order_items.
 *
 * Run:  npx ts-node scripts/add-items-to-sbb-587900.ts
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

const ORDER_NUMBER = "SBB-587900";

const ITEMS = [
  {
    brand: "Sephora Collection",
    name: "12H Colorful Waterproof Retractable Eyeliner — 01 Matte Black",
    price_usd: 28,
    price_gbp: 21.54,
    quantity: 1,
    product_url: "https://www.sephora.com/product/12h-colorful-waterproof-retractable-eyeliner-P520015",
    image_url: "/sephora-collection-12h-colorful-retractable-eyeliner-matte-black.jpg"
  },
  {
    brand: "Sephora Collection",
    name: "Mixed Tool Set",
    price_usd: 55,
    price_gbp: 43.5,
    quantity: 1,
    product_url: "https://www.sephora.qa/brand/sephora-collection/#mixed-tool-set",
    image_url: "/sephora-collection-mixed-tool-set.avif"
  }
];

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

  for (const it of ITEMS) {
    await sql`
      insert into order_items (
        order_id, product_brand, product_name, product_url, image_url,
        price_gbp, price_usd, quantity
      )
      values (
        ${orderId}, ${it.brand}, ${it.name}, ${it.product_url}, ${it.image_url},
        ${it.price_gbp}, ${it.price_usd}, ${it.quantity}
      )
    `;
    console.log(`  + ${it.brand} — ${it.name} ($${it.price_usd})`);
  }

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
    set total_usd     = agg.total_usd,
        total_gbp     = agg.total_gbp,
        price_usd     = agg.total_usd,
        price_gbp     = agg.total_gbp,
        items_count   = agg.items_count,
        product_name  = agg.items_count || ' items',
        product_brand = case when agg.brand_count = 1
                            then (select product_brand from order_items where order_id = ${orderId} limit 1)
                            else 'Multiple brands' end,
        updated_at    = now()
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
