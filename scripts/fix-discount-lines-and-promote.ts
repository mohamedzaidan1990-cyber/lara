/**
 * Discount lines (negative price_usd, e.g. "Loyalty Discount") are accounting
 * artifacts, not physical items — they never "reach Lebanon" and were blocking
 * orders from being promoted to ready_to_deliver. Mark them sourced + in_lebanon
 * so the completeness checks ignore them, then re-run the ready_to_deliver
 * promotion for any order now fully arrived.
 *
 * Run:  npx ts-node scripts/fix-discount-lines-and-promote.ts
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

  const disc = (await sql`
    update order_items
    set sourced = true, in_lebanon = true
    where price_usd < 0
      and (sourced = false or coalesce(in_lebanon, false) = false)
    returning id, product_name, price_usd
  `) as Array<Record<string, unknown>>;
  console.log(`Marked ${disc.length} discount line(s) as sourced + in_lebanon:`);
  for (const d of disc) console.log(`  ${d.product_name} ($${d.price_usd})`);

  const promoted = (await sql`
    update orders o
    set status = 'ready_to_deliver', updated_at = now()
    where o.status in ('ordered_selfridges', 'payment_confirmed', 'partially_delivered', 'in_lebanon', 'shipped')
      and exists (select 1 from order_items oi where oi.order_id = o.id)
      and not exists (
        select 1 from order_items oi
        where oi.order_id = o.id and coalesce(oi.in_lebanon, false) = false
      )
    returning o.order_number
  `) as Array<Record<string, unknown>>;
  console.log(`\nPromoted ${promoted.length} order(s) to ready_to_deliver:`);
  for (const p of promoted) console.log(`  ${p.order_number}`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
