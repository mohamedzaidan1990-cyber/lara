/**
 * Rosa Wehbe added Kilian Paris Angels' Share Eau de Parfum 30ml to SBB-214086
 * for $200 (user's price; Sephora QA lists QAR 619). Not in the catalogue, so
 * it's added first, price locked; image cropped from the client's screenshot.
 * Order totals recomputed.
 *
 * Run:  npx tsx scripts/add-kilian-angels-share-to-rosa-214086.ts
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

const ORDER_NUMBER = "SBB-214086";
const round2 = (n: number): number => Math.round(n * 100) / 100;

const PRODUCT = {
  brand: "Kilian",
  name: "Angels' Share Eau de Parfum 30ml",
  category: "Fragrance",
  price_usd: 200,
  product_url: "https://www.sephora.qa/brand/kilian-paris/#angels-share-eau-de-parfum-30ml",
  image_url: "/kilian-angels-share-edp-30ml.webp"
};
const SHADE = "";

async function main(): Promise<void> {
  const sql = getSql();
  const order = (await sql`
    select id from orders where order_number = ${ORDER_NUMBER} and status not in ('cancelled', 'refunded', 'delivered')
  `) as Array<{ id: string }>;
  if (!order.length) {
    console.error(`${ORDER_NUMBER} not found or not open — aborting, nothing changed.`);
    process.exit(1);
  }
  const orderId = order[0].id;
  const p = PRODUCT;
  const priceGbp = round2(p.price_usd / (1.35 * 1.2)); // fragrance markup

  const prod = (await sql`
    insert into products (brand, name, category, price_gbp, price_usd, deliverable_lebanon, product_url, image_url, price_locked)
    values (${p.brand}, ${p.name}, ${p.category}, ${priceGbp}, ${p.price_usd}, true, ${p.product_url}, ${p.image_url}, true)
    on conflict (product_url) do update set
      price_gbp = excluded.price_gbp, price_usd = excluded.price_usd, image_url = excluded.image_url, price_locked = true, archived = false
    returning id
  `) as Array<{ id: string }>;
  console.log(`  product ${prod[0].id} — ${p.brand} — ${p.name} — $${p.price_usd}`);

  const itemName = SHADE ? `${p.name} — Shade: ${SHADE}` : p.name;
  const already = (await sql`select 1 from order_items where order_id = ${orderId} and product_name = ${itemName}`) as unknown[];
  if (already.length) {
    console.error(`${itemName} is already on ${ORDER_NUMBER} — nothing changed.`);
    process.exit(1);
  }
  await sql`
    insert into order_items (order_id, product_name, product_brand, product_url, image_url, price_usd, price_gbp, quantity, sourced, in_lebanon)
    values (${orderId}, ${itemName}, ${p.brand}, ${p.product_url}, ${p.image_url}, ${p.price_usd}, ${priceGbp}, ${1}, false, false)
  `;
  console.log(`  + ${p.brand} — ${itemName} — $${p.price_usd}`);

  const t = ((await sql`
    select coalesce(sum(price_usd::float8 * quantity), 0) as total_usd,
           coalesce(sum(price_gbp::float8 * quantity), 0) as total_gbp,
           count(*)::int as items_count
    from order_items where order_id = ${orderId}
  `) as Array<{ total_usd: number; total_gbp: number; items_count: number }>)[0];
  await sql`
    update orders
    set price_usd = ${round2(t.total_usd)}, price_gbp = ${round2(t.total_gbp)},
        total_usd = ${round2(t.total_usd)}, total_gbp = ${round2(t.total_gbp)},
        items_count = ${t.items_count},
        product_name = ${t.items_count + " items"}, product_brand = 'Multiple brands',
        updated_at = now()
    where id = ${orderId}
  `;
  const o = ((await sql`select total_usd, amount_paid_usd, items_count, status from orders where id = ${orderId}`) as Array<{
    total_usd: string; amount_paid_usd: string; items_count: number; status: string;
  }>)[0];
  console.log(`OK  ${ORDER_NUMBER} — ${o.items_count} items — $${Number(o.total_usd)} total, paid $${Number(o.amount_paid_usd)} — ${o.status}`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
