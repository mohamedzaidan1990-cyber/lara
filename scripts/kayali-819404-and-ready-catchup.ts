/**
 * Zahia SBB-819404: Kayali set in Lebanon. Then status catch-up: every open
 * order whose items are all in Lebanon → ready_to_deliver (scripts bypass the
 * admin UI auto-status).
 *
 * Run:  npx tsx scripts/kayali-819404-and-ready-catchup.ts
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

async function main(): Promise<void> {
  const sql = getSql();
  const r = (await sql`
    update order_items set sourced = true, in_lebanon = true
    where id = 'fcd96abf-86b0-440b-96ac-06b73627b153'
      and order_id = (select id from orders where order_number = 'SBB-819404')
    returning product_name
  `) as Array<{ product_name: string }>;
  if (r.length !== 1) {
    console.error("Kayali line on SBB-819404 not found — nothing changed.");
    process.exit(1);
  }
  console.log("OK  SBB-819404 — Kayali set in Lebanon");

  const moved = (await sql`
    update orders o set status = 'ready_to_deliver', updated_at = now()
    where o.status in ('payment_confirmed', 'ordered_selfridges', 'fulfilled_from_stock')
      and exists (select 1 from order_items oi where oi.order_id = o.id)
      and not exists (select 1 from order_items oi where oi.order_id = o.id and coalesce(oi.in_lebanon, false) = false)
    returning o.order_number
  `) as Array<{ order_number: string }>;
  console.log(`Moved to ready_to_deliver: ${moved.map((m) => m.order_number).join(", ") || "none"}`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
