/**
 * Correct Patrick Ta Major Headlines Double-Take Crème & Powder Blush Duo:
 * $40 (Sephora US retail, used as a placeholder with no markup) -> $49,
 * the actual selling price per user instruction. Also fixes the one order
 * already placed at the wrong price (SBB-812745, Nour Akkouch) — its
 * Patrick Ta line item and order total are recomputed.
 *
 * Run:  npx ts-node scripts/reprice-patrick-ta-blush-duo-49.ts
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

const PRODUCT_ID = "65d89933-1be2-4347-804e-6578d72a6b1f";
const NEW_PRICE_USD = 49;
const NEW_PRICE_GBP = Math.round((NEW_PRICE_USD / 1.3) * 100) / 100;
const AFFECTED_ORDER = "SBB-812745";

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const sql = getSql();

  const p = (await sql`
    update products set price_usd = ${NEW_PRICE_USD}, price_gbp = ${NEW_PRICE_GBP}, price_locked = true, scraped_at = now()
    where id = ${PRODUCT_ID}
    returning brand, name, price_usd
  `) as Array<{ brand: string; name: string; price_usd: string }>;
  console.log(`REPRICED  ${p[0].brand} — ${p[0].name} -> $${p[0].price_usd}`);

  const items = (await sql`
    update order_items set price_usd = ${NEW_PRICE_USD}, price_gbp = ${NEW_PRICE_GBP}
    where order_id = (select id from orders where order_number = ${AFFECTED_ORDER})
      and product_name ilike 'Major Headlines%'
    returning product_name
  `) as Array<{ product_name: string }>;
  if (items.length) console.log(`  fixed order_items on ${AFFECTED_ORDER}: ${items[0].product_name}`);

  const sums = (await sql`
    select coalesce(sum(price_usd * quantity), 0)::numeric as usd, coalesce(sum(price_gbp * quantity), 0)::numeric as gbp
    from order_items where order_id = (select id from orders where order_number = ${AFFECTED_ORDER})
  `) as Array<{ usd: string; gbp: string }>;
  const { usd, gbp } = sums[0];

  const order = (await sql`
    update orders set price_usd = ${usd}, price_gbp = ${gbp}, total_usd = ${usd}, total_gbp = ${gbp}
    where order_number = ${AFFECTED_ORDER}
    returning order_number, total_usd
  `) as Array<{ order_number: string; total_usd: string }>;
  console.log(`  ${order[0].order_number} total -> $${order[0].total_usd}`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
