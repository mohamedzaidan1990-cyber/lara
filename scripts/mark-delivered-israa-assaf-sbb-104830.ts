/**
 * Mark Israa Assaf's order SBB-104830 as delivered (it was "ready_to_deliver"),
 * per the user. Does the same database change as the admin status route
 * (app/api/orders/[id]/route.ts): status = 'delivered', delivered_at = now().
 * It deliberately does NOT call that route, because it also WhatsApps the
 * customer a delivery message — nothing is sent here.
 *
 * Only touches the order if it belongs to Israa Assaf and is not already
 * delivered/cancelled.
 *
 * Run:  npx ts-node scripts/mark-delivered-israa-assaf-sbb-104830.ts
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

const ORDER_NUMBER = "SBB-104830";

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const sql = getSql();

  const before = (await sql`
    select o.status, c.full_name from orders o join customers c on c.id = o.customer_id
    where o.order_number = ${ORDER_NUMBER} limit 1
  `) as Array<{ status: string; full_name: string }>;
  if (!before.length) {
    console.error(`Order ${ORDER_NUMBER} not found.`);
    process.exit(1);
  }
  if (before[0].full_name !== "Israa Assaf") {
    console.error(`Order belongs to ${before[0].full_name}, not Israa Assaf — aborting.`);
    process.exit(1);
  }
  if (before[0].status === "delivered") {
    console.log(`${ORDER_NUMBER} is already delivered — nothing to do.`);
    return;
  }
  if (before[0].status === "cancelled" || before[0].status === "refunded") {
    console.error(`${ORDER_NUMBER} is ${before[0].status} — not marking it delivered.`);
    process.exit(1);
  }

  const rows = (await sql`
    update orders
    set status = 'delivered', delivered_at = now(), updated_at = now()
    where order_number = ${ORDER_NUMBER} and status not in ('delivered', 'cancelled', 'refunded')
    returning order_number, status, delivered_at
  `) as Array<{ order_number: string; status: string; delivered_at: string }>;

  if (rows.length !== 1) {
    console.error(`Expected to update exactly 1 order, updated ${rows.length}.`);
    process.exit(1);
  }
  console.log(`OK  ${rows[0].order_number}: ${before[0].status} -> ${rows[0].status} (delivered_at ${rows[0].delivered_at})`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
