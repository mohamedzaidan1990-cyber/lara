/**
 * Order SBB-584558: single item (Kiehl's Creamy Eye Treatment with Avocado
 * 14ml) sourced at $43.30 and ready for delivery. Sets item cost_usd +
 * sourced=true + in_lebanon=true, rolls order-level cost_usd/profit_usd,
 * and sets orders.status = 'ready_to_deliver'.
 *
 * Run:  npx ts-node scripts/sourced-ready-sbb-584558.ts
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
    console.error("DATABASE_URL is not set. Make sure .env.local exists in the project root.");
    process.exit(1);
  }

  await ensureSchema();
  const sql = getSql();

  const orderRows = (await sql`
    SELECT id, coalesce(platform_fee_usd, 0) as platform_fee_usd, coalesce(total_usd, 0) as total_usd
    FROM orders WHERE order_number = 'SBB-584558' LIMIT 1
  `) as Array<{ id: string; platform_fee_usd: string; total_usd: string }>;
  if (!orderRows.length) {
    console.error("Order SBB-584558 not found");
    process.exit(1);
  }
  const orderId = orderRows[0].id;

  await sql`
    UPDATE order_items
    SET cost_usd = 43.30, sourced = true, in_lebanon = true
    WHERE order_id = ${orderId}
  `;

  const totalCost = (await sql`
    SELECT COALESCE(SUM(cost_usd * quantity), 0) as total_cost_usd FROM order_items WHERE order_id = ${orderId}
  `) as Array<{ total_cost_usd: string }>;

  const revenueUsd = Number(orderRows[0].total_usd) || 0;
  const platformFee = Number(orderRows[0].platform_fee_usd) || 0;
  const costUsd = Number(totalCost[0].total_cost_usd) || 0;
  const profitUsd = Math.round((revenueUsd - costUsd - platformFee) * 100) / 100;

  const updated = (await sql`
    UPDATE orders
    SET status = 'ready_to_deliver', cost_usd = ${costUsd}, profit_usd = ${profitUsd}, updated_at = now()
    WHERE id = ${orderId}
    RETURNING order_number, status, cost_usd, profit_usd
  `) as Array<{ order_number: string; status: string; cost_usd: string; profit_usd: string }>;

  console.log(`OK ${updated[0].order_number} — status=${updated[0].status}, cost_usd=$${updated[0].cost_usd}, profit_usd=$${updated[0].profit_usd}`);
}

main().catch((err) => {
  console.error("Update failed:", err);
  process.exit(1);
});
