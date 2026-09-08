/**
 * 2026-09-08 follow-up:
 *  - SBB-114169 (Angel) ordered the Huda Easy Bake 20g "2 Pound Cake" before
 *    SBB-582114 (Sirine Hamzeh), so the 1 unit bought from Sephora.ca goes to
 *    Angel: sourced, cost $44.52, vendor 'sephora canada'.
 *  - Revert the earlier assumption on SBB-540971 (Mariam Hamad) Kayali
 *    Marshmallow duo — unclear whether the single Sephora.ca unit is hers or
 *    SBB-401356's (Ali, already marked 'selfridges'). Back to unsourced.
 *
 * Run:  npx ts-node scripts/source-fixes-sept08b.ts
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

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  await ensureSchema();
  const sql = getSql();

  const angel = (await sql`
    update order_items oi
    set sourced = true, vendor = 'sephora canada', cost_usd = 44.52
    from orders o
    where o.id = oi.order_id and o.order_number = 'SBB-114169'
      and oi.product_name ilike '%2 pound cake%' and oi.sourced = false
    returning o.order_number, oi.product_name, oi.sourced, oi.vendor, oi.cost_usd
  `) as Array<Record<string, unknown>>;
  console.log("SBB-114169:", angel[0] ?? "(no change)");

  const mariam = (await sql`
    update order_items oi
    set sourced = false, vendor = null, cost_usd = null
    from orders o
    where o.id = oi.order_id and o.order_number = 'SBB-540971'
      and oi.product_name ilike '%marshmallow candy mini duo%'
    returning o.order_number, oi.product_name, oi.sourced, oi.vendor, oi.cost_usd
  `) as Array<Record<string, unknown>>;
  console.log("SBB-540971 (reverted):", mariam[0] ?? "(no change)");
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
