/**
 * Reem Al Maaz's Easy Bake Mini Loose Powder — CHERRY BLOSSOM (SBB-361403)
 * was sourced/in-Lebanon-marked at the wrong size. Reverts it back to
 * unsourced (sourced=false, in_lebanon=false, cost cleared) so it shows up
 * again in the awaiting-orders list needing the correct item, and reverts
 * the order status from ready_to_deliver back to payment_confirmed since
 * it's no longer actually ready.
 *
 * Also removes the invoice PDF already saved to the Ready to Deliver
 * folder, since it no longer reflects reality.
 *
 * Run:  npx ts-node scripts/unsource-reem-al-maaz.ts
 */
import { readFileSync, existsSync, unlinkSync } from "node:fs";
import { resolve, join } from "node:path";
import os from "node:os";
function loadDotenv(file: string): void {
  let text: string;
  try { text = readFileSync(resolve(process.cwd(), file), "utf8"); } catch { return; }
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

const ORDER_NUMBER = "SBB-361403";
const PRODUCT_NAME = "Easy Bake Mini Loose Powder 6g — Shade: CHERRY BLOSSOM";

async function main() {
  const sql = getSql();

  const itemUpdated = (await sql`
    update order_items
    set sourced = false, in_lebanon = false, cost_usd = null, cost_gbp = null
    where order_id = (select id from orders where order_number = ${ORDER_NUMBER})
      and product_name = ${PRODUCT_NAME}
    returning id
  `) as Array<{ id: string }>;
  if (itemUpdated.length !== 1) {
    console.error(`Expected exactly 1 item row, got ${itemUpdated.length} — aborting.`);
    process.exit(1);
  }

  const orderUpdated = (await sql`
    update orders set status = 'payment_confirmed', updated_at = now()
    where order_number = ${ORDER_NUMBER} and status = 'ready_to_deliver'
    returning order_number, status
  `) as Array<{ order_number: string; status: string }>;
  if (orderUpdated.length !== 1) {
    console.error(`Expected to revert exactly 1 order, got ${orderUpdated.length}.`);
    process.exit(1);
  }

  const invoicePath = join(os.homedir(), "Desktop", "Ready to Deliver Invoices", `${ORDER_NUMBER} - Reem Al Maaz.pdf`);
  if (existsSync(invoicePath)) {
    unlinkSync(invoicePath);
    console.log(`Removed stale invoice: ${invoicePath}`);
  }

  console.log(`OK  ${orderUpdated[0].order_number} — item unsourced, status -> ${orderUpdated[0].status}`);
}
main().catch((err) => { console.error("Failed:", err); process.exit(1); });
