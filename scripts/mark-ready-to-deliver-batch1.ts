/**
 * Marks 4 orders as ready for delivery: sets order_items.in_lebanon = true
 * for all their items and orders.status = 'ready_to_deliver'.
 *
 * Run:  npx ts-node scripts/mark-ready-to-deliver-batch1.ts
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

const ORDER_NUMBERS = ["SBB-783937", "SBB-962298", "SBB-601276", "SBB-655262"];

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Make sure .env.local exists in the project root.");
    process.exit(1);
  }

  await ensureSchema();
  const sql = getSql();

  for (const orderNumber of ORDER_NUMBERS) {
    const orderRows = (await sql`SELECT id FROM orders WHERE order_number = ${orderNumber} LIMIT 1`) as Array<{ id: string }>;
    if (!orderRows.length) {
      console.error(`SKIP ${orderNumber} — order not found`);
      continue;
    }
    const orderId = orderRows[0].id;

    await sql`UPDATE order_items SET in_lebanon = true WHERE order_id = ${orderId}`;

    const updated = (await sql`
      UPDATE orders
      SET status = 'ready_to_deliver', updated_at = now()
      WHERE id = ${orderId}
      RETURNING order_number, status, items_count
    `) as Array<{ order_number: string; status: string; items_count: number }>;

    console.log(`OK ${updated[0].order_number} — status=${updated[0].status}, ${updated[0].items_count} items marked in_lebanon`);
  }
}

main().catch((err) => {
  console.error("Update failed:", err);
  process.exit(1);
});
