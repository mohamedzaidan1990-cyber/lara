/**
 * Mark the Sol De Janeiro Perfume Mist Discovery Set on Mariam Hamad's
 * order (SBB-540971) as sourced — cost $46.70. It's the only item of hers
 * that has reached Lebanon so far (already flagged in_lebanon = true).
 *
 * Run:  npx ts-node scripts/mark-sourced-mariam-hamad-sdj-discovery-set.ts
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

const ORDER_NUMBER = "SBB-540971";
const COST_USD = 46.7;
const COST_GBP = Math.round((COST_USD / 1.3) * 100) / 100;

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const sql = getSql();

  const rows = (await sql`
    update order_items
    set cost_usd = ${COST_USD}, cost_gbp = ${COST_GBP}, sourced = true, in_lebanon = true
    where order_id = (select id from orders where order_number = ${ORDER_NUMBER})
      and product_brand = 'Sol De Janeiro'
    returning product_name, cost_usd
  `) as Array<{ product_name: string; cost_usd: string }>;

  if (!rows.length) {
    console.error(`No matching item found for ${ORDER_NUMBER}`);
    process.exit(1);
  }
  console.log(`OK  ${ORDER_NUMBER} — ${rows[0].product_name} — sourced @ $${rows[0].cost_usd}, in Lebanon`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
