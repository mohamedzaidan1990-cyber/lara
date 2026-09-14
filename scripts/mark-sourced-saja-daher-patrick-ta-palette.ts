/**
 * Mark the Patrick Ta Major Dimension Dream Date palette on Saja Daher's
 * order (SBB-547894) as sourced — Sephora US, cost $49.
 *
 * Run:  npx ts-node scripts/mark-sourced-saja-daher-patrick-ta-palette.ts
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

const ORDER_NUMBER = "SBB-547894";
const COST_USD = 49;
const COST_GBP = Math.round((COST_USD / 1.3) * 100) / 100;
const VENDOR = "Sephora US";

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const sql = getSql();

  const rows = (await sql`
    update order_items
    set vendor = ${VENDOR}, cost_usd = ${COST_USD}, cost_gbp = ${COST_GBP}, sourced = true
    where order_id = (select id from orders where order_number = ${ORDER_NUMBER})
    returning product_name, vendor, cost_usd, sourced
  `) as Array<{ product_name: string; vendor: string; cost_usd: string; sourced: boolean }>;

  if (!rows.length) {
    console.error(`No order_items found for ${ORDER_NUMBER}`);
    process.exit(1);
  }
  console.log(`OK  ${ORDER_NUMBER} — ${rows[0].product_name} — sourced ${rows[0].vendor} @ $${rows[0].cost_usd}`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
