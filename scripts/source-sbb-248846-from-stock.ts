/**
 * Fulfils the NARS Talc-Free Powder Blush — Dolce Vita 888 line on order
 * SBB-248846 (Mona Alkazwini) from existing stock.
 *
 *  - order_items: sourced = true, vendor = 'stock', cost_usd = 60 (the stock
 *    unit's recorded cost).
 *  - stock_items 374250f7: quantity 1 -> 0, note appended.
 *
 * Run:  npx ts-node scripts/source-sbb-248846-from-stock.ts
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

const ORDER_ITEM_ID = "dee149ad-866b-4dfe-a224-3092a759eded";
const STOCK_ITEM_ID = "374250f7-4971-4db3-9b1f-22735b00cc1c";
const COST_USD = 60;

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  await ensureSchema();
  const sql = getSql();

  const oi = (await sql`
    update order_items
    set sourced = true, vendor = 'stock', cost_usd = ${COST_USD}
    where id = ${ORDER_ITEM_ID} and sourced = false
    returning product_brand, product_name, sourced, vendor, cost_usd
  `) as Array<Record<string, unknown>>;
  console.log("Order item:", oi[0] ?? "(no change)");

  const st = (await sql`
    update stock_items
    set quantity = 0,
        notes = coalesce(notes || ' ', '') || '— consumed by SBB-248846 (Mona Alkazwini) 2026-09-08'
    where id = ${STOCK_ITEM_ID} and quantity > 0
    returning product_brand, product_name, quantity, notes
  `) as Array<Record<string, unknown>>;
  console.log("Stock item:", st[0] ?? "(no change)");
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
