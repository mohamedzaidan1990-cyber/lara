/**
 * Mark both items on Jana Arbid's order (SBB-910530) as sourced and
 * arrived in Lebanon:
 *   - Sol De Janeiro Cheeky Frutini Perfume Mist 90ml — cost $31
 *   - Bubble Star Dew - Hydrating Eye Cream           — cost $15
 *
 * Run:  npx ts-node scripts/mark-sourced-jana-arbid-frutini-star-dew.ts
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

const ORDER_NUMBER = "SBB-910530";
const gbp = (usd: number): number => Math.round((usd / 1.3) * 100) / 100;

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const sql = getSql();

  const orderRows = (await sql`select id from orders where order_number = ${ORDER_NUMBER} limit 1`) as Array<{ id: string }>;
  if (!orderRows.length) {
    console.error(`Order not found: ${ORDER_NUMBER}`);
    process.exit(1);
  }
  const orderId = orderRows[0].id;

  const a = (await sql`
    update order_items set cost_usd = 31, cost_gbp = ${gbp(31)}, sourced = true, in_lebanon = true
    where order_id = ${orderId} and product_brand = 'Sol De Janeiro'
    returning product_name
  `) as Array<{ product_name: string }>;
  const b = (await sql`
    update order_items set cost_usd = 15, cost_gbp = ${gbp(15)}, sourced = true, in_lebanon = true
    where order_id = ${orderId} and product_brand = 'Bubble'
    returning product_name
  `) as Array<{ product_name: string }>;

  console.log(`OK  ${ORDER_NUMBER}: ${a[0]?.product_name ?? "?"} @ $31, ${b[0]?.product_name ?? "?"} @ $15 — both sourced, in Lebanon`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
