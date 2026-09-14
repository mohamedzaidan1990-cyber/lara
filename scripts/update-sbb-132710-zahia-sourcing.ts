/**
 * Order SBB-132710 (Zahia Krecht Khatoun) — update sourcing on 3 existing
 * line items and add 2 new ones the customer also ordered:
 *
 * Existing lines updated (cost + arrival status per latest info):
 *   - Drunk Elephant B-Goldi Bright Drops 30ml       cost $35    in Lebanon
 *   - Rhode Glazing Mist Hydrating Face Spray 80ml   cost $30    NOT in Lebanon
 *   - Kayali Yum Boujee Marshmallow body cream       cost $51.60 in Lebanon
 *
 * New lines added (matched to their catalogue rows):
 *   - Rhode Glazing Milk Hydrating Ceramide Facial Essence 124ml  $46, cost $32,  NOT in Lebanon
 *   - Kayali Yum Pistachio Gelato body cream                     $58, cost $51.60, in Lebanon
 *
 * Order total/items_count recomputed from the full order_items sum after.
 *
 * Run:  npx ts-node scripts/update-sbb-132710-zahia-sourcing.ts
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

const ORDER_NUMBER = "SBB-132710";
const gbp = (usd: number): number => Math.round((usd / 1.3) * 100) / 100;

const KAYALI_PISTACHIO_ID = "f378f58b-920e-4bf9-8300-87a629493b61";
const RHODE_MILK_ID = "9b380f92-d6d5-424c-89de-2f4be2a687a7";

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const sql = getSql();

  const orderRows = (await sql`select id from orders where order_number = ${ORDER_NUMBER} limit 1`) as Array<{ id: string }>;
  if (!orderRows.length) {
    console.error(`Order not found: ${ORDER_NUMBER}`);
    process.exit(1);
  }
  const orderId = orderRows[0].id;

  // ---- Update the 3 existing lines ----
  await sql`
    update order_items set cost_usd = 35, cost_gbp = ${gbp(35)}, sourced = true, in_lebanon = true
    where order_id = ${orderId} and product_brand = 'Drunk Elephant' and product_name ilike 'B-Goldi%'
  `;
  await sql`
    update order_items set cost_usd = 30, cost_gbp = ${gbp(30)}, sourced = true, in_lebanon = false
    where order_id = ${orderId} and product_brand = 'Rhode' and product_name ilike 'Glazing Mist%'
  `;
  await sql`
    update order_items set cost_usd = 51.60, cost_gbp = ${gbp(51.6)}, sourced = true, in_lebanon = true
    where order_id = ${orderId} and product_brand = 'Kayali' and product_name ilike '%Boujee Marshmallow%'
  `;
  console.log("Updated sourcing on: B-Goldi, Rhode Glazing Mist, Kayali Boujee Marshmallow");

  // ---- Add the 2 new lines, matched to their catalogue rows ----
  const kayaliRows = (await sql`select brand, name, price_usd, price_gbp, product_url, image_url from products where id = ${KAYALI_PISTACHIO_ID}`) as Array<{
    brand: string; name: string; price_usd: string; price_gbp: string; product_url: string | null; image_url: string | null;
  }>;
  const rhodeRows = (await sql`select brand, name, price_usd, price_gbp, product_url, image_url from products where id = ${RHODE_MILK_ID}`) as Array<{
    brand: string; name: string; price_usd: string; price_gbp: string; product_url: string | null; image_url: string | null;
  }>;
  const kayali = kayaliRows[0];
  const rhode = rhodeRows[0];

  await sql`
    insert into order_items (
      order_id, product_name, product_brand, product_url, image_url,
      price_usd, price_gbp, quantity, cost_usd, cost_gbp, sourced, in_lebanon
    )
    values (
      ${orderId}, ${kayali.name}, ${kayali.brand}, ${kayali.product_url}, ${kayali.image_url},
      ${Number(kayali.price_usd)}, ${Number(kayali.price_gbp)}, 1, 51.60, ${gbp(51.6)}, true, true
    )
  `;
  await sql`
    insert into order_items (
      order_id, product_name, product_brand, product_url, image_url,
      price_usd, price_gbp, quantity, cost_usd, cost_gbp, sourced, in_lebanon
    )
    values (
      ${orderId}, ${rhode.name}, ${rhode.brand}, ${rhode.product_url}, ${rhode.image_url},
      ${Number(rhode.price_usd)}, ${Number(rhode.price_gbp)}, 1, 32, ${gbp(32)}, true, false
    )
  `;
  console.log(`Added: ${kayali.brand} — ${kayali.name}`);
  console.log(`Added: ${rhode.brand} — ${rhode.name}`);

  // ---- Recompute order total/items_count from all order_items ----
  const sums = (await sql`
    select coalesce(sum(price_usd * quantity), 0)::numeric as usd,
           coalesce(sum(price_gbp * quantity), 0)::numeric as gbp,
           count(*)::int as n
    from order_items where order_id = ${orderId}
  `) as Array<{ usd: string; gbp: string; n: number }>;
  const { usd, gbp: gbpTotal, n } = sums[0];

  const updated = (await sql`
    update orders set price_usd = ${usd}, price_gbp = ${gbpTotal}, total_usd = ${usd}, total_gbp = ${gbpTotal}, items_count = ${n}
    where id = ${orderId}
    returning order_number, total_usd, items_count
  `) as Array<{ order_number: string; total_usd: string; items_count: number }>;
  console.log(`${updated[0].order_number} -> total $${updated[0].total_usd}, ${updated[0].items_count} items`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
