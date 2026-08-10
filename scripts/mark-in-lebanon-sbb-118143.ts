/**
 * Marks order SBB-118143 as arrived in Lebanon: sets order_items.in_lebanon
 * = true for its item(s) and orders.status = 'in_lebanon' ("In transit").
 * Not marked ready_to_deliver — user said it reached Lebanon, not that
 * it's ready for delivery yet.
 *
 * Run:  npx ts-node scripts/mark-in-lebanon-sbb-118143.ts
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

  const orderRows = (await sql`SELECT id FROM orders WHERE order_number = 'SBB-118143' LIMIT 1`) as Array<{ id: string }>;
  if (!orderRows.length) {
    console.error("Order SBB-118143 not found");
    process.exit(1);
  }
  const orderId = orderRows[0].id;

  await sql`UPDATE order_items SET in_lebanon = true WHERE order_id = ${orderId}`;

  const updated = (await sql`
    UPDATE orders
    SET status = 'in_lebanon', updated_at = now()
    WHERE id = ${orderId}
    RETURNING order_number, status
  `) as Array<{ order_number: string; status: string }>;

  console.log(`OK ${updated[0].order_number} — status=${updated[0].status}`);
}

main().catch((err) => {
  console.error("Update failed:", err);
  process.exit(1);
});
