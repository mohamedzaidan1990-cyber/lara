/**
 * Marks the 3 outstanding Habibti Lip & Cheek Best Sellers Kit line items as
 * sourced (ordered from Huda) at $34.29 cost each:
 *   - SBB-827356 (narcisse saad)
 *   - SBB-114169 (Angel)
 *   - SBB-526507 (Fatima Noureddine)
 * All are payment_confirmed. Samar's SBB-514743 was cancelled and is excluded.
 *
 * Run:  npx ts-node scripts/source-habibti-kits-sept.ts
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

const ORDER_NUMBERS = ["SBB-827356", "SBB-114169", "SBB-526507"];
const COST_USD = 34.29;

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  await ensureSchema();
  const sql = getSql();

  const rows = (await sql`
    update order_items oi
    set sourced = true, cost_usd = ${COST_USD}
    from orders o
    where o.id = oi.order_id
      and o.order_number = any(${ORDER_NUMBERS})
      and oi.product_name ilike '%habibti%'
      and oi.sourced = false
    returning o.order_number, oi.product_name, oi.sourced, oi.cost_usd
  `) as Array<Record<string, unknown>>;

  console.dir(rows, { depth: null });
  console.log(`\nMarked ${rows.length} Habibti kit line item(s) sourced at $${COST_USD}.`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
