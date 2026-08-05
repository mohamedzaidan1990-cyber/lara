/**
 * Fills in cost_usd for the two un-costed items on order SBB-823257
 * (already delivered): Huda Beauty Habibti Lip And Cheek Best Sellers Kit
 * ($34.30) and Tarte Shape Tape Concealer ($38.40). Marks both sourced,
 * then rolls the order-level cost_usd/profit_usd up from all items.
 *
 * Run:  npx ts-node scripts/add-costs-sbb-823257.ts
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

  const orderRows = (await sql`SELECT id, coalesce(platform_fee_usd, 0) as platform_fee_usd, coalesce(total_usd, 0) as total_usd FROM orders WHERE order_number = 'SBB-823257' LIMIT 1`) as Array<{
    id: string;
    platform_fee_usd: string;
    total_usd: string;
  }>;
  if (!orderRows.length) {
    console.error("Order SBB-823257 not found");
    process.exit(1);
  }
  const orderId = orderRows[0].id;

  const costs: Array<{ id: string; cost_usd: number }> = [
    { id: "0aeaf087-a27b-4caf-b7b7-bf0ea89810d4", cost_usd: 34.3 }, // Huda Beauty Habibti Lip And Cheek Best Sellers Kit
    { id: "201a5a59-ab4d-4cfe-b0f9-99d3bd0113ec", cost_usd: 38.4 } // Tarte Shape Tape Concealer
  ];

  for (const c of costs) {
    await sql`UPDATE order_items SET cost_usd = ${c.cost_usd}, sourced = true WHERE id = ${c.id} AND order_id = ${orderId}`;
  }

  const totalCost = (await sql`
    SELECT COALESCE(SUM(cost_usd * quantity), 0) as total_cost_usd FROM order_items WHERE order_id = ${orderId}
  `) as Array<{ total_cost_usd: string }>;

  const revenueUsd = Number(orderRows[0].total_usd) || 0;
  const platformFee = Number(orderRows[0].platform_fee_usd) || 0;
  const costUsd = Number(totalCost[0].total_cost_usd) || 0;
  const profitUsd = Math.round((revenueUsd - costUsd - platformFee) * 100) / 100;

  const updated = (await sql`
    UPDATE orders
    SET cost_usd = ${costUsd}, profit_usd = ${profitUsd}, updated_at = now()
    WHERE id = ${orderId}
    RETURNING order_number, cost_usd, profit_usd
  `) as Array<{ order_number: string; cost_usd: string; profit_usd: string }>;

  console.log(`Updated ${updated[0].order_number} — cost_usd=$${updated[0].cost_usd}, profit_usd=$${updated[0].profit_usd}`);
}

main().catch((err) => {
  console.error("Update failed:", err);
  process.exit(1);
});
