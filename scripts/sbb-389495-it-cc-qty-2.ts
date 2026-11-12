/**
 * SBB-389495 (Marwa Jomaa): the IT Cosmetics CC+ Cream Fair is 2 pieces at $62
 * each (user: "it cosmetics is 2 pieces yes"). Sets quantity 2 and recomputes totals.
 *
 * Run:  npx tsx scripts/sbb-389495-it-cc-qty-2.ts
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

const ITEM_ID = "f9341103-4ee6-46d5-8c38-af811ea1ee69";
const round2 = (n: number): number => Math.round(n * 100) / 100;

async function main(): Promise<void> {
  const sql = getSql();
  const item = (await sql`
    select i.order_id, i.quantity from order_items i join orders o on o.id = i.order_id
    where i.id = ${ITEM_ID} and o.order_number = 'SBB-389495' and o.status not in ('cancelled', 'refunded', 'delivered')
  `) as Array<{ order_id: string; quantity: number }>;
  if (!item.length) {
    console.error("Item/order not found or not open — aborting, nothing changed.");
    process.exit(1);
  }
  const orderId = item[0].order_id;
  await sql`update order_items set quantity = 2 where id = ${ITEM_ID}`;

  const t = ((await sql`
    select coalesce(sum(price_usd::float8 * quantity), 0) as total_usd,
           coalesce(sum(price_gbp::float8 * quantity), 0) as total_gbp,
           count(*)::int as units  -- app convention: items_count = number of lines, not units
    from order_items where order_id = ${orderId}
  `) as Array<{ total_usd: number; total_gbp: number; units: number }>)[0];
  await sql`
    update orders
    set price_usd = ${round2(t.total_usd)}, price_gbp = ${round2(t.total_gbp)},
        total_usd = ${round2(t.total_usd)}, total_gbp = ${round2(t.total_gbp)},
        items_count = ${t.units}, product_name = ${t.units + " items"}, updated_at = now()
    where id = ${orderId}
  `;
  const o = ((await sql`select total_usd, items_count from orders where id = ${orderId}`) as Array<{ total_usd: string; items_count: number }>)[0];
  console.log(`OK  SBB-389495 — IT CC+ Fair x2 — ${o.items_count} items — $${Number(o.total_usd)} total`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
