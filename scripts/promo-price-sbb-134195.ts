/**
 * SBB-134195 (Zainab Issa): set the Bubble Solar Mate SPF 30 line to a
 * special promo price of $22 (was $29 list). Order-only — the catalogue
 * price is unchanged.
 *
 * Run:  npx tsx scripts/promo-price-sbb-134195.ts
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

const ORDER_NUMBER = "SBB-134195";
const PRODUCT_NAME = "Solar Mate - Invisible Daily Mineral Sunscreen SPF 30";
const round2 = (n: number): number => Math.round(n * 100) / 100;
const SPECIAL_PRICE_USD = 22;
const SPECIAL_PRICE_GBP = round2(SPECIAL_PRICE_USD / 1.35);

async function main(): Promise<void> {
  const sql = getSql();

  const rows = (await sql`
    select oi.id, o.id as order_id, o.items_count, o.amount_paid_usd
    from order_items oi join orders o on o.id = oi.order_id
    where o.order_number = ${ORDER_NUMBER} and oi.product_name = ${PRODUCT_NAME}
  `) as Array<{ id: string; order_id: string; items_count: number; amount_paid_usd: string | null }>;
  if (rows.length !== 1) {
    console.error(`Expected exactly 1 line for ${ORDER_NUMBER} / "${PRODUCT_NAME}", found ${rows.length} — aborting, nothing changed.`);
    process.exit(1);
  }
  const r = rows[0];

  await sql`update order_items set price_usd = ${SPECIAL_PRICE_USD}, price_gbp = ${SPECIAL_PRICE_GBP} where id = ${r.id}`;

  const t = (await sql`
    select coalesce(sum(price_usd::float8 * quantity), 0) as total_usd,
           coalesce(sum(price_gbp::float8 * quantity), 0) as total_gbp
    from order_items where order_id = ${r.order_id}
  `) as Array<{ total_usd: number; total_gbp: number }>;
  const totalUsd = round2(Number(t[0].total_usd));
  const totalGbp = round2(Number(t[0].total_gbp));

  await sql`
    update orders
    set price_usd = ${totalUsd}, price_gbp = ${totalGbp}, total_usd = ${totalUsd}, total_gbp = ${totalGbp}, updated_at = now()
    where id = ${r.order_id}
  `;

  console.log(`OK  ${ORDER_NUMBER} — ${PRODUCT_NAME} → $${SPECIAL_PRICE_USD} (special promo price); order total now $${totalUsd}`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
