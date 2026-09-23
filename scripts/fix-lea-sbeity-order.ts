/**
 * Correction: the Phlur + Kiehl's order was mistakenly created as a new
 * order for Lea Naboulsi (SBB-447002) — it should have gone onto Lea
 * Sbeity's existing undelivered order (SBB-335181). Also add Charlotte's
 * Magic Cream 15ml, per the follow-up request.
 *
 * 1) Delete the mistaken SBB-447002 order (order_items + orders row).
 * 2) Add to SBB-335181 (Lea Sbeity, status=payment_confirmed, not yet
 *    delivered):
 *      - Phlur Vanilla Skin hair and body fragrance mist 90ml ($34, repriced earlier)
 *      - Kiehl's Creamy Eye Treatment with Avocado 14ml ($51)
 *      - Charlotte Tilbury Charlotte's Magic Cream 15ml ($47)
 *    Recompute price_usd/price_gbp/total_usd/total_gbp/items_count on the
 *    order to include the new items alongside the 2 already there.
 *
 * Run:  npx ts-node scripts/fix-lea-sbeity-order.ts
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

import { getSql } from "../lib/db";

const WRONG_ORDER_NUMBER = "SBB-447002";
const TARGET_ORDER_NUMBER = "SBB-335181";

const PHLUR_ID = "c41a1946-c2db-48d1-8d3e-a17fb9e3774c";
const KIEHLS_ID = "777612e3-88ba-4009-ba55-b23e91c63410";
const MAGIC_CREAM_ID = "21fd8402-61c9-4be7-9512-534447faf739";

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const sql = getSql();

  // ---- 1) delete the mistaken order ----
  const wrongOrder = (await sql`select id from orders where order_number = ${WRONG_ORDER_NUMBER}`) as Array<{ id: string }>;
  if (wrongOrder.length) {
    await sql`delete from order_items where order_id = ${wrongOrder[0].id}`;
    await sql`delete from orders where id = ${wrongOrder[0].id}`;
    console.log(`Deleted mistaken order ${WRONG_ORDER_NUMBER}`);
  } else {
    console.log(`${WRONG_ORDER_NUMBER} not found (already gone?) — skipping delete`);
  }

  // ---- 2) look up the 3 products to add ----
  const prodRows = (await sql`
    select id, brand, name, price_usd, price_gbp, product_url, image_url
    from products where id in (${PHLUR_ID}, ${KIEHLS_ID}, ${MAGIC_CREAM_ID})
  `) as Array<{ id: string; brand: string; name: string; price_usd: string; price_gbp: string; product_url: string; image_url: string }>;
  if (prodRows.length !== 3) {
    console.error("Expected 3 products, found", prodRows.length);
    process.exit(1);
  }
  const byId = Object.fromEntries(prodRows.map((p) => [p.id, p]));

  const target = (await sql`select id from orders where order_number = ${TARGET_ORDER_NUMBER}`) as Array<{ id: string }>;
  if (!target.length) {
    console.error(`${TARGET_ORDER_NUMBER} not found.`);
    process.exit(1);
  }
  const orderId = target[0].id;

  const newItems = [byId[PHLUR_ID], byId[KIEHLS_ID], byId[MAGIC_CREAM_ID]];
  for (const p of newItems) {
    await sql`
      insert into order_items (order_id, product_name, product_brand, product_url, image_url, price_usd, price_gbp, quantity)
      values (${orderId}, ${p.name}, ${p.brand}, ${p.product_url}, ${p.image_url}, ${p.price_usd}, ${p.price_gbp}, ${1})
    `;
    console.log(`  + ${p.brand} — ${p.name} ($${p.price_usd})`);
  }

  // ---- recompute order totals from all items now on it ----
  const allItems = (await sql`
    select price_usd::float8 as usd, price_gbp::float8 as gbp, quantity
    from order_items where order_id = ${orderId}
  `) as Array<{ usd: number; gbp: number; quantity: number }>;
  const totalUsd = allItems.reduce((s, i) => s + i.usd * i.quantity, 0);
  const totalGbp = allItems.reduce((s, i) => s + i.gbp * i.quantity, 0);
  const itemsCount = allItems.reduce((s, i) => s + i.quantity, 0);

  const updated = (await sql`
    update orders
    set price_usd = ${totalUsd}, price_gbp = ${totalGbp},
        total_usd = ${totalUsd}, total_gbp = ${totalGbp},
        items_count = ${itemsCount},
        product_name = ${itemsCount + " items"}, product_brand = 'Multiple brands'
    where id = ${orderId}
    returning order_number, total_usd, items_count
  `) as Array<{ order_number: string; total_usd: string; items_count: number }>;

  console.log(`OK  ${updated[0].order_number} — ${updated[0].items_count} items — $${updated[0].total_usd} total`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
