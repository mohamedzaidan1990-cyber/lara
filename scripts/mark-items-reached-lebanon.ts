/**
 * Marks all sourced order_items as in_lebanon = true (they've arrived in
 * Lebanon), across every non-cancelled / non-delivered order — EXCEPT the two
 * items still in transit:
 *   - SBB-388212  Gisou "Honey Glow Icons Hair & Lip Set"
 *   - SBB-382153  Clarins "Double Serum Foundation 30ml — L2C"
 *
 * Run:  npx ts-node scripts/mark-items-reached-lebanon.ts
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
    update order_items oi
    set in_lebanon = true
    from orders o
    where o.id = oi.order_id
      and oi.sourced = true
      and coalesce(oi.in_lebanon, false) = false
      and o.status not in ('cancelled', 'refunded', 'delivered')
      and not (o.order_number = 'SBB-388212' and oi.product_name ilike '%honey glow icons%')
      and not (o.order_number = 'SBB-382153' and oi.product_name ilike '%double serum foundation%')
    returning o.order_number, oi.product_name
  `) as Array<Record<string, unknown>>;

  console.log(`Marked ${rows.length} sourced line items as in_lebanon = true.`);

  const left = (await sql`
    select o.order_number, c.full_name, oi.product_name
    from order_items oi
    join orders o on o.id = oi.order_id
    left join customers c on c.id = o.customer_id
    where oi.sourced = true and coalesce(oi.in_lebanon, false) = false
      and o.status not in ('cancelled', 'refunded', 'delivered')
  `) as Array<Record<string, unknown>>;
  console.log(`\nStill NOT in Lebanon (sourced, active): ${left.length}`);
  for (const r of left) console.log(`  ${r.order_number} ${r.full_name ?? "?"} — ${r.product_name}`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
