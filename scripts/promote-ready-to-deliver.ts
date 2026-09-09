/**
 * Promotes every open order whose items have ALL reached Lebanon
 * (no order_item with in_lebanon = false) to status 'ready_to_deliver',
 * so they show up in the admin "Ready to Deliver" tab.
 *
 * Mirrors app/api/admin/order-items/[id]/route.ts (the in_lebanon toggle),
 * but also covers 'payment_confirmed' orders that were sourced directly
 * (Huda Qatar / Sephora Canada) without ever passing through
 * 'ordered_selfridges'.
 *
 * Run:  npx ts-node scripts/promote-ready-to-deliver.ts
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

  const rows = (await sql`
    update orders o
    set status = 'ready_to_deliver', updated_at = now()
    where o.status in ('ordered_selfridges', 'payment_confirmed', 'partially_delivered', 'in_lebanon', 'shipped')
      and exists (select 1 from order_items oi where oi.order_id = o.id)
      and not exists (
        select 1 from order_items oi
        where oi.order_id = o.id and coalesce(oi.in_lebanon, false) = false
      )
    returning o.order_number, o.status
  `) as Array<Record<string, unknown>>;

  console.log(`Promoted ${rows.length} orders to ready_to_deliver:`);
  for (const r of rows) console.log(`  ${r.order_number}`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
