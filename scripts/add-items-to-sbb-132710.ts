/**
 * Adds two catalogue items to existing order SBB-132710 (Zahia Krecht Khatoun):
 *   1x rhode Glazing Mist Hydrating Face Spray 80ml                 ($44)
 *   1x KAYALI Yum Boujee Marshmallow | 81 Silk Soufflé Body Cream   ($58)
 *
 * Prices / URLs / images are read from the products table.
 * Mirrors app/api/admin/orders/[id]/items/route.ts for totals recompute
 * (the recompute correctly nets the existing -$22 Loyalty Discount line).
 *
 * Run:  npx ts-node scripts/add-items-to-sbb-132710.ts
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

const ORDER_NUMBER = "SBB-132710";

const PRODUCT_URLS = [
  "https://www.sephora.com/product/glazing-mist-P517475",
  "https://www.sephora.com/product/yum-boujee-marshmallow-81-silk-souffle-body-cream-P525437"
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

  for (const url of PRODUCT_URLS) {
    const prod = (await sql`
      select brand, name, price_usd, price_gbp, product_url, image_url
      from products where product_url = ${url} limit 1
    `) as Array<{
      brand: string; name: string; price_usd: string; price_gbp: string;
      product_url: string | null; image_url: string | null;
    }>;
    if (!prod.length) {
      console.error(`Product not found: ${url}`);
      process.exit(1);
    }
    const p = prod[0];
    await sql`
      insert into order_items (
        order_id, product_brand, product_name, product_url, image_url,
        price_usd, price_gbp, quantity
      )
      values (
        ${orderId}, ${p.brand}, ${p.name}, ${p.product_url}, ${p.image_url},
        ${p.price_usd}, ${p.price_gbp}, ${1}
      )
    `;
    console.log(`  + ${p.brand} — ${p.name} ($${p.price_usd})`);
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
    returning o.order_number, o.total_usd, o.total_gbp, o.items_count
  `) as Array<Record<string, unknown>>;

  console.log("Updated:", rows[0]);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
