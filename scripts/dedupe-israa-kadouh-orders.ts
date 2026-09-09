/**
 * Israa Kadouh placed two identical $97 orders (Pound Cake powder + FAUXFILTER
 * concealer Honey): SBB-277098 (Aug 29, has a note) and SBB-947035 (Sep 1, no
 * note). Duplicate — keep SBB-277098, drop SBB-947035.
 *
 *  - SBB-947035: status -> 'cancelled' (soft delete; the app has no hard order
 *    delete, and cancelled orders drop out of every active view/count while the
 *    record is kept). Its items are left attached — treated as a duplicate with
 *    no separate physical goods, so nothing moves to stock.
 *  - SBB-277098: amount_paid_usd = total ($97) — customer has paid.
 *
 * Run:  npx ts-node scripts/dedupe-israa-kadouh-orders.ts
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

  const cancelled = (await sql`
    update orders
    set status = 'cancelled',
        notes = case when coalesce(notes,'') = '' then 'Cancelled — duplicate of SBB-277098'
                     else notes || ' | Cancelled — duplicate of SBB-277098' end,
        updated_at = now()
    where order_number = 'SBB-947035'
    returning order_number, status, notes
  `) as Array<Record<string, unknown>>;
  console.log("Cancelled:", cancelled[0]);

  const paid = (await sql`
    update orders
    set amount_paid_usd = coalesce(total_usd, price_usd, 0), updated_at = now()
    where order_number = 'SBB-277098'
    returning order_number, total_usd, amount_paid_usd
  `) as Array<Record<string, unknown>>;
  console.log("Marked paid:", paid[0]);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
