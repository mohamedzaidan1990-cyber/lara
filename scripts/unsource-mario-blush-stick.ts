/**
 * Correction: Makeup By Mario Soft Pop Blush Stick on Batoul Dbouk's order
 * (SBB-974645) was wrongly marked sourced + in_lebanon — it hasn't
 * actually been sourced yet. Reverts to unsourced (cost cleared) so it
 * shows back up in awaiting orders needing to be bought.
 *
 * Run:  npx ts-node scripts/unsource-mario-blush-stick.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
function loadDotenv(file: string): void {
  let text: string;
  try { text = readFileSync(resolve(process.cwd(), file), "utf8"); } catch { return; }
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

async function main() {
  const sql = getSql();
  const updated = (await sql`
    update order_items
    set sourced = false, in_lebanon = false, cost_usd = null, cost_gbp = null
    where order_id = (select id from orders where order_number = 'SBB-974645')
      and product_name = 'Soft Pop Blush Stick'
    returning id, product_brand, product_name
  `) as Array<{ id: string; product_brand: string; product_name: string }>;
  if (updated.length !== 1) {
    console.error(`Expected exactly 1 row, got ${updated.length} — aborting.`);
    process.exit(1);
  }
  console.log(`OK  SBB-974645 — ${updated[0].product_brand} — ${updated[0].product_name} — reverted to unsourced`);
}
main().catch((err) => { console.error("Failed:", err); process.exit(1); });
