/**
 * Zahraa Khalifeh added three items (from her seasonsbyb.co.uk cart, catalogue
 * prices) to SBB-296329:
 *   - Tarte Face Card Never Declines CC Undereye & Brush, shade TBC ($48)
 *   - Huda Beauty Bronze Nudes Lip & Cheek Best-Seller Gift Set ($64)
 *   - Sephora Favorites All About Lips Set ($60)
 * Order totals recomputed (items_count = number of lines, app convention).
 *
 * Run:  npx tsx scripts/add-three-to-zahraa-khalifeh-296329.ts
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

const ORDER_NUMBER = "SBB-296329";
const round2 = (n: number): number => Math.round(n * 100) / 100;

const LINES: Array<{ productId: string; shade: string }> = [
  { productId: "f4f74a5d-213a-4ab6-b561-0c0f26f01337", shade: "TBC" }, // Tarte Face Card Never Declines CC Undereye & Brush
  { productId: "6da9d9e7-888e-40f3-8d50-5407af9c186f", shade: "" },    // Huda Bronze Nudes Lip & Cheek Best-Seller Gift Set
  { productId: "72fc86f7-45d2-47d0-a82f-60cf70388dfa", shade: "" }     // Sephora Favorites All About Lips Set
];

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

  // Validate all products before writing anything.
  const rows = [];
  for (const l of LINES) {
    const p = (await sql`select brand, name, price_usd, price_gbp, product_url, image_url from products where id = ${l.productId} and not archived`) as Array<{
      brand: string; name: string; price_usd: string; price_gbp: string; product_url: string; image_url: string;
    }>;
    if (!p.length) {
      console.error(`Product ${l.productId} not found — aborting, nothing changed.`);
      process.exit(1);
    }
    rows.push({ ...p[0], itemName: l.shade ? `${p[0].name} — Shade: ${l.shade}` : p[0].name });
  }

  for (const r of rows) {
    const already = (await sql`select 1 from order_items where order_id = ${orderId} and product_name = ${r.itemName}`) as unknown[];
    if (already.length) {
      console.log(`  = ${r.itemName} already on ${ORDER_NUMBER} — skipped`);
      continue;
    }
    await sql`
      insert into order_items (order_id, product_name, product_brand, product_url, image_url, price_usd, price_gbp, quantity, sourced, in_lebanon)
      values (${orderId}, ${r.itemName}, ${r.brand}, ${r.product_url}, ${r.image_url}, ${Number(r.price_usd)}, ${Number(r.price_gbp)}, ${1}, false, false)
    `;
    console.log(`  + ${r.brand} — ${r.itemName} — $${Number(r.price_usd)}`);
  }

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
        items_count = ${t.items_count}, product_name = ${t.items_count + " items"}, product_brand = 'Multiple brands',
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
