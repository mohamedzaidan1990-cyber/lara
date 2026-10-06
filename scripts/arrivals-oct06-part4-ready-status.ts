/**
 * 1. More arrivals (user, 6 Oct 2026):
 *    - SBB-974645 Batoul Dbouk: CT Airbrush micro-powder + Huda Liquid Matte
 *      Mousse gift set → in Lebanon.
 *    - SBB-838062 Sahar Zeaiter: Kojie San soap → sourced (cost not given) +
 *      in Lebanon.
 * 2. Status catch-up. The admin UI flips an order to ready_to_deliver when its
 *    last item is ticked "in Lebanon"; the arrival scripts set in_lebanon
 *    directly and skipped that, leaving fully-arrived orders on
 *    payment_confirmed / ordered_selfridges. Move every open order whose items
 *    are all in Lebanon to ready_to_deliver.
 *
 * Run:  npx tsx scripts/arrivals-oct06-part4-ready-status.ts
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

const LINES: Array<[string, string]> = [
  ["818cb861", "SBB-974645 CT Airbrush Flawless Finish micro-powder (Fair)"],
  ["efeba27e", "SBB-974645 Huda Liquid Matte Mousse Gift Set"],
  ["7b32cff7", "SBB-838062 Kojie San HydroMoist Soap"]
];

async function main(): Promise<void> {
  const sql = getSql();

  const ids: string[] = [];
  for (const [prefix, label] of LINES) {
    const rows = (await sql`select id from order_items where id::text like ${prefix + "%"}`) as Array<{ id: string }>;
    if (rows.length !== 1) {
      console.error(`${prefix} (${label}) matched ${rows.length} lines — aborting, nothing changed.`);
      process.exit(1);
    }
    ids.push(rows[0].id);
  }
  for (let i = 0; i < ids.length; i++) {
    await sql`update order_items set sourced = true, in_lebanon = true where id = ${ids[i]}`;
    console.log(`OK  ${LINES[i][1]} — in Lebanon`);
  }

  const moved = (await sql`
    update orders o set status = 'ready_to_deliver', updated_at = now()
    where o.status in ('payment_confirmed', 'ordered_selfridges', 'fulfilled_from_stock', 'partially_delivered')
      and exists (select 1 from order_items oi where oi.order_id = o.id)
      and not exists (select 1 from order_items oi where oi.order_id = o.id and coalesce(oi.in_lebanon, false) = false)
    returning o.order_number, (select full_name from customers c where c.id = o.customer_id) as full_name
  `) as Array<{ order_number: string; full_name: string }>;
  console.log(`\nMoved to ready_to_deliver (${moved.length}):`);
  for (const m of moved.sort((a, b) => a.full_name.localeCompare(b.full_name))) console.log(`  ${m.order_number} — ${m.full_name}`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
