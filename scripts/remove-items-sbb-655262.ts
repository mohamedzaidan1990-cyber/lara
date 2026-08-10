/**
 * Order SBB-655262: customer cancelled the Easy Bake Setting Spray and
 * Easy Blur Primer Mini, so the Blush Filter Liquid Blush free gift
 * (tied to that bundle) is removed too. Only the Easy Bake loose baking
 * and setting powder (Pound Cake) remains.
 *
 * Run:  npx ts-node scripts/remove-items-sbb-655262.ts
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

const ITEM_IDS_TO_REMOVE = [
  "407f3cdd-bb14-433e-9d5e-b4b744fc260e", // Easy Bake Setting Spray 30ml
  "525283b6-3312-4b68-a27a-1b4629f85643", // Easy Blur Primer Mini 10ml
  "bc9678f4-0f5e-4d29-8c82-e2072b6d545b"  // Blush Filter Liquid Blush — Free Gift
];

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Make sure .env.local exists in the project root.");
    process.exit(1);
  }

  await ensureSchema();
  const sql = getSql();

  const orderRows = (await sql`SELECT id FROM orders WHERE order_number = 'SBB-655262' LIMIT 1`) as Array<{ id: string }>;
  if (!orderRows.length) {
    console.error("Order SBB-655262 not found");
    process.exit(1);
  }
  const orderId = orderRows[0].id;

  const removed = (await sql`
    DELETE FROM order_items
    WHERE order_id = ${orderId} AND id = ANY(${ITEM_IDS_TO_REMOVE})
    RETURNING product_brand, product_name
  `) as Array<{ product_brand: string; product_name: string }>;

  const totalCost = (await sql`
    SELECT COALESCE(SUM(cost_usd * quantity), 0) as total_cost_usd FROM order_items WHERE order_id = ${orderId}
  `) as Array<{ total_cost_usd: string }>;

  const orderMeta = (await sql`
    SELECT coalesce(platform_fee_usd, 0) as platform_fee_usd FROM orders WHERE id = ${orderId}
  `) as Array<{ platform_fee_usd: string }>;

  const totals = (await sql`
    UPDATE orders
    SET total_usd   = (SELECT COALESCE(SUM(price_usd * quantity), 0) FROM order_items WHERE order_id = ${orderId}),
        total_gbp   = (SELECT COALESCE(SUM(price_gbp * quantity), 0) FROM order_items WHERE order_id = ${orderId}),
        items_count = (SELECT COUNT(*)::int FROM order_items WHERE order_id = ${orderId}),
        updated_at  = now()
    WHERE id = ${orderId}
    RETURNING order_number, total_usd, total_gbp, items_count
  `) as Array<{ order_number: string; total_usd: string; total_gbp: string; items_count: number }>;

  const costUsd = Number(totalCost[0].total_cost_usd) || 0;
  const platformFee = Number(orderMeta[0].platform_fee_usd) || 0;
  const revenueUsd = Number(totals[0].total_usd) || 0;
  const profitUsd = Math.round((revenueUsd - costUsd - platformFee) * 100) / 100;

  await sql`UPDATE orders SET cost_usd = ${costUsd}, profit_usd = ${profitUsd} WHERE id = ${orderId}`;

  console.log(`Removed from ${totals[0].order_number}:`);
  for (const r of removed) console.log(`  ${r.product_brand} — ${r.product_name}`);
  console.log(`Order now: ${totals[0].items_count} items, $${totals[0].total_usd} / £${totals[0].total_gbp}, cost=$${costUsd}, profit=$${profitUsd}`);
}

main().catch((err) => {
  console.error("Remove failed:", err);
  process.exit(1);
});
