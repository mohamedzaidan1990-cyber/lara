/**
 * More Lebanon arrivals (user message, 6 Oct 2026):
 *  - SBB-974645 Makeup By Mario Soft Pop Blush Stick (already sourced)
 *  - SBB-914147 Tarte Shape Tape Matte Concealer (already sourced) — shade
 *    Light Medium Sand added to the line name
 *  - SBB-335181 Phlur Vanilla Skin mist (already sourced)
 *  - SBB-361403 Huda Easy Bake Mini Loose Powder, Cherry Blossom (already sourced)
 *  - SBB-158551 CT Powder & Brush Kit, Fair — bought at $124
 *  - SBB-335181 CT Magic Cream 15ml — bought at $44
 *
 * Run:  npx tsx scripts/arrivals-oct06-part3.ts
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

const round2 = (n: number): number => Math.round(n * 100) / 100;

// [order_items.id prefix, label, cost if not yet sourced]
const LINES: Array<[string, string, number | null]> = [
  ["f35321cf", "SBB-974645 Makeup By Mario Soft Pop Blush Stick", null],
  ["b46f067c", "SBB-914147 Tarte Shape Tape Matte Concealer", null],
  ["2d13f81b", "SBB-335181 Phlur Vanilla Skin hair & body mist", null],
  ["32376b16", "SBB-361403 Huda Easy Bake Mini Loose Powder (Cherry Blossom)", null],
  ["3d4f7d90", "SBB-158551 CT Powder & Brush Kit (Fair)", 124],
  ["8ffb9ac0", "SBB-335181 CT Magic Cream 15ml", 44]
];

async function main(): Promise<void> {
  const sql = getSql();

  // Resolve every prefix first; abort before writing if any is not unique.
  const resolved: Array<{ id: string; label: string; cost: number | null }> = [];
  for (const [prefix, label, cost] of LINES) {
    const rows = (await sql`select id from order_items where id::text like ${prefix + "%"}`) as Array<{ id: string }>;
    if (rows.length !== 1) {
      console.error(`${prefix} (${label}) matched ${rows.length} lines — aborting, nothing changed.`);
      process.exit(1);
    }
    resolved.push({ id: rows[0].id, label, cost });
  }

  for (const r of resolved) {
    if (r.cost != null) {
      await sql`update order_items set sourced = true, in_lebanon = true, cost_usd = ${r.cost}, cost_gbp = ${round2(r.cost / 1.3)} where id = ${r.id}`;
      console.log(`OK  ${r.label} — sourced @ $${r.cost}, in Lebanon`);
    } else {
      await sql`update order_items set sourced = true, in_lebanon = true where id = ${r.id}`;
      console.log(`OK  ${r.label} — in Lebanon`);
    }
  }

  // Record the Tarte shade the user gave on the line name.
  await sql`update order_items set product_name = ${"Shape Tape™ Full Coverage Matte Concealer — Shade: Light Medium Sand"} where id::text like ${"b46f067c%"} and product_name not like ${"%Shade:%"}`;
  console.log("OK  SBB-914147 Tarte concealer — shade Light Medium Sand recorded");

  // Keep order-level cost/profit in step with item costs for the orders touched.
  await sql`
    update orders o
    set cost_usd = sub.c, profit_usd = round((coalesce(o.total_usd, o.price_usd, 0) - sub.c - coalesce(o.platform_fee_usd, 0))::numeric, 2)
    from (
      select order_id, round(sum(cost_usd)::numeric, 2) as c from order_items
      where order_id in (select order_id from order_items where id = any(${resolved.map((r) => r.id)}))
      group by order_id
    ) sub
    where o.id = sub.order_id and sub.c is not null
  `;

  // Report which touched orders are now fully in Lebanon.
  const full = (await sql`
    select o.order_number, bool_and(coalesce(oi.in_lebanon, false)) as all_in
    from orders o join order_items oi on oi.order_id = o.id
    where o.id in (select order_id from order_items where id = any(${resolved.map((r) => r.id)}))
    group by o.order_number order by o.order_number
  `) as Array<{ order_number: string; all_in: boolean }>;
  console.log("\nOrders now fully in Lebanon: " + (full.filter((x) => x.all_in).map((x) => x.order_number).join(", ") || "none"));
  console.log("Orders still waiting on other items: " + (full.filter((x) => !x.all_in).map((x) => x.order_number).join(", ") || "none"));
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
