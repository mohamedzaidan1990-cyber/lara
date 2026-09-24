/**
 * Add Sol de Janeiro Leite Néctar Perfume Mist 90ml to Zahia Krecht
 * Khatoun's order SBB-887832, at a special promo price of $32 (not the
 * catalogue's $42). Recomputes order totals.
 *
 * Run:  npx ts-node scripts/add-leite-nectar-to-zahia-887832.ts
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
const PRODUCT_ID = "afb973d9-a856-4816-97a7-32be47a9e73b"; // SDJ Leite Nectar Perfume Mist 90ml
const SPECIAL_PRICE_USD = 32;
const round2 = (n: number): number => Math.round(n * 100) / 100;
const SPECIAL_PRICE_GBP = round2(SPECIAL_PRICE_USD / 1.35);

async function main() {
  const sql = getSql();
  const order = (await sql`select id from orders where order_number = ${ORDER_NUMBER}`) as Array<{ id: string }>;
  if (!order.length) {
    console.error(`${ORDER_NUMBER} not found.`);
    process.exit(1);
  }
  const orderId = order[0].id;

  const prod = (await sql`select brand, name, product_url, image_url from products where id = ${PRODUCT_ID}`) as Array<{ brand: string; name: string; product_url: string; image_url: string }>;
  if (!prod.length) {
    console.error("Product not found.");
    process.exit(1);
  }
  const p = prod[0];

  await sql`
    insert into order_items (order_id, product_name, product_brand, product_url, image_url, price_usd, price_gbp, quantity)
    values (${orderId}, ${p.name}, ${p.brand}, ${p.product_url}, ${p.image_url}, ${SPECIAL_PRICE_USD}, ${SPECIAL_PRICE_GBP}, ${1})
  `;
  console.log(`  + ${p.brand} — ${p.name} ($${SPECIAL_PRICE_USD}, special promo price)`);

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
        product_name = ${t.items_count + " items"}, product_brand = 'Multiple brands'
    where id = ${orderId}
    returning order_number, total_usd, items_count
  `) as Array<{ order_number: string; total_usd: string; items_count: number }>;

  console.log(`OK  ${updated[0].order_number} — ${updated[0].items_count} items — $${updated[0].total_usd} total`);
}
main().catch((err) => { console.error("Failed:", err); process.exit(1); });
