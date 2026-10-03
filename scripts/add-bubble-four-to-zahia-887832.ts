/**
 * Add 4 Bubble items to Zahia Krecht Khatoun's order SBB-887832 at
 * discounted prices (user-given). The discount is written into each line's
 * product name ("— Discounted price (was $X)") so it prints on the invoice,
 * which has no separate discount column.
 *
 * Run:  npx tsx scripts/add-bubble-four-to-zahia-887832.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
function loadDotenv(file: string): void {
  let text: string;
  try { text = readFileSync(resolve(process.cwd(), file), "utf8"); } catch { return; }
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

const ORDER_NUMBER = "SBB-887832";
const LINES: Array<{ productId: string; priceUsd: number }> = [
  { productId: "fcc5c01f-55e0-49a1-bb58-d4c17218304a", priceUsd: 22 }, // Power Wave - Super Hydrating Moisturizer
  { productId: "803a223a-b4d3-4d27-b9e9-61c095a96660", priceUsd: 22 }, // Cosmic Silk - Hydrating Milky Toner
  { productId: "efd1ebe3-63d6-4de1-8252-79d00cb58d36", priceUsd: 23 }, // Day Dream - Vitamin C + Niacinamide Serum
  { productId: "02c6709a-5183-4694-bd9d-e16cae83eec5", priceUsd: 27 }  // Over Night - Hydrating Sleep Mask
];
const round2 = (n: number): number => Math.round(n * 100) / 100;

async function main() {
  const sql = getSql();
  const order = (await sql`select id, invoice_sent_at from orders where order_number = ${ORDER_NUMBER} and status not in ('cancelled', 'refunded')`) as Array<{ id: string; invoice_sent_at: string | null }>;
  if (!order.length) {
    console.error(`${ORDER_NUMBER} not found (or cancelled).`);
    process.exit(1);
  }
  const orderId = order[0].id;

  // Validate everything before writing anything.
  const prods = [];
  for (const l of LINES) {
    const prod = (await sql`select brand, name, price_usd, product_url, image_url from products where id = ${l.productId}`) as Array<{ brand: string; name: string; price_usd: string; product_url: string; image_url: string }>;
    if (!prod.length) {
      console.error(`Product ${l.productId} not found — aborting, nothing changed.`);
      process.exit(1);
    }
    const p = prod[0];
    const already = (await sql`select 1 from order_items where order_id = ${orderId} and product_url = ${p.product_url}`) as unknown[];
    if (already.length) {
      console.error(`${p.name} is already on ${ORDER_NUMBER} — aborting, nothing changed.`);
      process.exit(1);
    }
    prods.push({ ...p, priceUsd: l.priceUsd });
  }

  for (const p of prods) {
    const name = `${p.name} — Discounted price (was $${Number(p.price_usd)})`;
    await sql`
      insert into order_items (order_id, product_name, product_brand, product_url, image_url, price_usd, price_gbp, quantity)
      values (${orderId}, ${name}, ${p.brand}, ${p.product_url}, ${p.image_url}, ${p.priceUsd}, ${round2(p.priceUsd / 1.35)}, ${1})
    `;
    console.log(`  + ${p.brand} — ${name} — $${p.priceUsd}`);
  }

  const totals = (await sql`
    select coalesce(sum(price_usd::float8 * quantity), 0) as total_usd,
           coalesce(sum(price_gbp::float8 * quantity), 0) as total_gbp,
           count(*)::int as items_count
    from order_items where order_id = ${orderId}
  `) as Array<{ total_usd: number; total_gbp: number; items_count: number }>;
  const t = totals[0];

  const updated = (await sql`
    update orders
    set price_usd = ${t.total_usd}, price_gbp = ${round2(t.total_gbp)},
        total_usd = ${t.total_usd}, total_gbp = ${round2(t.total_gbp)},
        items_count = ${t.items_count},
        product_name = ${t.items_count + " items"}, product_brand = 'Multiple brands',
        updated_at = now()
    where id = ${orderId}
    returning order_number, total_usd, items_count
  `) as Array<{ order_number: string; total_usd: string; items_count: number }>;

  console.log(`OK  ${updated[0].order_number} — ${updated[0].items_count} items — $${updated[0].total_usd} total`);
}
main().catch((err) => { console.error("Failed:", err); process.exit(1); });
