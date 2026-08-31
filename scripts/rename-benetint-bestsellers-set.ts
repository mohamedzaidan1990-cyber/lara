/**
 * Renames the Benefit "Benetint and Bestsellers Gift Set Worth Over £38"
 * catalogue product to "Benetint Best Sellers Gift set" and reprices it to
 * $63 / £48.46 (price-locked).
 *
 * The matching line item on order SBB-104830 is renamed to match, but its
 * price is left untouched ($39 / £21.50) per explicit user instruction — so
 * that order's total does not change.
 *
 * Run:  npx ts-node scripts/rename-benetint-bestsellers-set.ts
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

const PRODUCT_ID = "99f98e70-566a-4673-be12-53c7f373df27";
const OLD_NAME = "Benetint and Bestsellers Gift Set Worth Over £38";
const NEW_NAME = "Benetint Best Sellers Gift set";
const NEW_PRICE_USD = 63;
const NEW_PRICE_GBP = 48.46;
const KEEP_PRICE_ORDER = "SBB-104830";

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  await ensureSchema();
  const sql = getSql();

  const prod = (await sql`
    update products
    set name = ${NEW_NAME},
        price_usd = ${NEW_PRICE_USD},
        price_gbp = ${NEW_PRICE_GBP},
        price_locked = true,
        scraped_at = now()
    where id = ${PRODUCT_ID}
    returning id, name, price_usd, price_gbp, price_locked
  `) as Array<Record<string, unknown>>;
  if (!prod.length) {
    console.error(`Product ${PRODUCT_ID} not found`);
    process.exit(1);
  }
  console.log("Product:", prod[0]);

  // Rename the SBB-104830 line item but keep its price snapshot untouched.
  const item = (await sql`
    update order_items
    set product_name = ${NEW_NAME}
    where order_id = (select id from orders where order_number = ${KEEP_PRICE_ORDER})
      and product_name = ${OLD_NAME}
    returning id, product_name, price_usd, price_gbp
  `) as Array<Record<string, unknown>>;
  console.log(`Order ${KEEP_PRICE_ORDER} line item (price kept):`, item[0] ?? "(no matching line)");
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
