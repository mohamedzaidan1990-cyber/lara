/**
 * 2026-09-08 sourcing, part 2:
 *  - SBB-769585 Kiehl's Creamy Eye Treatment 14ml (qty 2): sourced,
 *    cost_usd = $48.90 ($24.45 each).
 *  - SBB-329074 Benefit "Precisely, My Brow Detailer" (qty 4 line): split into
 *    2 sourced ($43.20 total) + 2 still awaiting order.
 *
 * Run:  npx ts-node scripts/source-kiehls-and-split-brow.ts
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

const KIEHLS_ITEM_ID = "2eab4891-67b1-4453-893a-5b9caa054edf"; // SBB-769585 Creamy Eye Treatment x2
const BROW_ITEM_ID = "95f38c39-e51c-455b-aa2f-8f29b51f91fd";   // SBB-329074 Precisely My Brow Detailer x4

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  await ensureSchema();
  const sql = getSql();

  // --- Kiehl's ---
  const k = (await sql`
    update order_items
    set sourced = true, cost_usd = 48.90
    where id = ${KIEHLS_ITEM_ID} and sourced = false
    returning product_name, quantity, sourced, cost_usd
  `) as Array<Record<string, unknown>>;
  console.log("Kiehl's:", k[0] ?? "(no change)");

  // --- Brow Detailer split ---
  const rows = (await sql`
    select order_id, product_brand, product_name, product_url, image_url,
           price_gbp, price_usd, quantity
    from order_items where id = ${BROW_ITEM_ID}
  `) as Array<{
    order_id: string; product_brand: string; product_name: string;
    product_url: string | null; image_url: string | null;
    price_gbp: string; price_usd: string; quantity: number;
  }>;
  if (!rows.length) {
    console.error("Brow Detailer line not found");
    process.exit(1);
  }
  const b = rows[0];
  if (b.quantity !== 4) {
    console.error(`Expected qty 4 on brow line, found ${b.quantity} — aborting split.`);
    process.exit(1);
  }

  // shrink original to the 2 that are sourced
  await sql`
    update order_items
    set quantity = 2, sourced = true, cost_usd = 43.20
    where id = ${BROW_ITEM_ID}
  `;
  // new line for the 2 still to source
  await sql`
    insert into order_items (
      order_id, product_brand, product_name, product_url, image_url,
      price_gbp, price_usd, quantity, sourced
    )
    values (
      ${b.order_id}, ${b.product_brand}, ${b.product_name}, ${b.product_url}, ${b.image_url},
      ${b.price_gbp}, ${b.price_usd}, 2, false
    )
  `;
  console.log("Brow Detailer: split 4 -> 2 sourced ($43.20) + 2 pending");

  // recompute order SBB-329074 totals (units unchanged, but items_count +1)
  const upd = (await sql`
    with agg as (
      select
        coalesce(sum(price_usd * quantity), 0) as total_usd,
        coalesce(sum(price_gbp * quantity), 0) as total_gbp,
        count(*)::int as items_count,
        count(distinct product_brand) as brand_count
      from order_items where order_id = ${b.order_id}
    )
    update orders o
    set total_usd     = agg.total_usd,
        total_gbp     = agg.total_gbp,
        price_usd     = agg.total_usd,
        price_gbp     = agg.total_gbp,
        items_count   = agg.items_count,
        product_name  = agg.items_count || ' items',
        product_brand = case when agg.brand_count = 1
                            then (select product_brand from order_items where order_id = ${b.order_id} limit 1)
                            else 'Multiple brands' end,
        updated_at    = now()
    from agg
    where o.id = ${b.order_id}
    returning o.order_number, o.total_usd, o.total_gbp, o.items_count
  `) as Array<Record<string, unknown>>;
  console.log("SBB-329074 recomputed:", upd[0]);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
