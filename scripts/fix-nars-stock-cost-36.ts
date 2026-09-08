/**
 * Corrects the NARS Dolce Vita blush cost from $60 to $36 (actual stock cost).
 *  - order_items on SBB-248846: cost_usd = 36
 *  - stock_items 374250f7 (consumed): cost_usd = 36, cost_gbp = 27.69
 *
 * Run:  npx ts-node scripts/fix-nars-stock-cost-36.ts
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

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  await ensureSchema();
  const sql = getSql();

  const oi = (await sql`
    update order_items set cost_usd = 36
    where id = ${ORDER_ITEM_ID}
    returning product_name, vendor, sourced, cost_usd
  `) as Array<Record<string, unknown>>;
  console.log("Order item:", oi[0]);

  const st = (await sql`
    update stock_items set cost_usd = 36, cost_gbp = 27.69
    where id = ${STOCK_ITEM_ID}
    returning product_name, quantity, cost_usd, cost_gbp, notes
  `) as Array<Record<string, unknown>>;
  console.log("Stock item:", st[0]);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
