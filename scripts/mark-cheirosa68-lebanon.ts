/**
 * Sol De Janeiro Cheirosa 68 Hair & Body Perfume Mist 90ml (SBB-539783,
 * Zahraa) reached Lebanon. It's not this order's only item (2 others still
 * pending/not sourced), so this only flags the item — no status change.
 *
 * Run:  npx ts-node scripts/mark-cheirosa68-lebanon.ts
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
    update order_items set in_lebanon = true
    where order_id = (select id from orders where order_number = 'SBB-539783')
      and product_name = 'Cheirosa 68 Hair & Body Perfume Mist 90ml'
      and sourced = true
    returning id, product_brand, product_name
  `) as Array<{ id: string; product_brand: string; product_name: string }>;
  if (updated.length !== 1) {
    console.error(`Expected exactly 1 row, got ${updated.length} — aborting.`);
    process.exit(1);
  }
  console.log(`OK  SBB-539783 — ${updated[0].product_brand} — ${updated[0].product_name} — in_lebanon = true`);
}
main().catch((err) => { console.error("Failed:", err); process.exit(1); });
