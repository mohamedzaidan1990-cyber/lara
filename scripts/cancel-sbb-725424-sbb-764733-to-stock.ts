/**
 * Cancel two orders whose customers never received them — SBB-725424 (Nour
 * Mtayrek, COD, $112) and SBB-764733 (Fatima Al Amin, Whish link, $140) — move
 * their sourced items into stock, and take both orders out of the accounting,
 * per the user ("I don't want their dues to keep showing in our accounts").
 *
 * Per order, in ONE atomic statement:
 *   - status = 'cancelled'                       -> drops off "Outstanding Payments"
 *                                                   (AdminAccountingTab excludes cancelled)
 *   - payment_confirmed = false                  -> drops out of Accounting revenue + COGS
 *                                                   (both are computed over payment_confirmed
 *                                                   orders only) and matches 25 of the 27
 *                                                   other cancelled orders
 *   - cost_usd / cost_gbp / profit_usd /
 *     platform_fee_usd / profit_notes = NULL     -> the dashboard's P&L sums these over every
 *                                                   order that has one, cancelled or not; the
 *                                                   cost now lives in stock instead, so keeping
 *                                                   it here would double-count it
 *   - sourced order_items are copied into stock_items with the note
 *     "Moved from cancelled order <number>" — the same thing the admin's Cancel does
 *     (app/api/orders/[id]/route.ts). Item rows on the order are left as they are.
 *
 * It does NOT call the admin route, and nothing is emailed or WhatsApped.
 * amount_paid_usd is left as recorded ($0 on both).
 *
 * Refuses to run unless both orders are the expected clients, still open
 * (ready_to_deliver) and have no stock rows yet.
 *
 * Run:  npx ts-node scripts/cancel-sbb-725424-sbb-764733-to-stock.ts
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

const ORDERS: Array<{ order: string; client: string }> = [
  { order: "SBB-725424", client: "Nour Mtayrek" },
  { order: "SBB-764733", client: "Fatima Al Amin" }
];

const NOTE = "Cancelled — customer did not receive the order; sourced items moved to stock.";

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const sql = getSql();

  // Pre-flight: check everything before changing anything.
  const ids: Record<string, string> = {};
  for (const o of ORDERS) {
    const rows = (await sql`
      select o.id, o.status, c.full_name
      from orders o left join customers c on c.id = o.customer_id
      where o.order_number = ${o.order} limit 1
    `) as Array<{ id: string; status: string; full_name: string }>;
    if (!rows.length) {
      console.error(`${o.order} not found — aborting, nothing changed.`);
      process.exit(1);
    }
    if (rows[0].full_name !== o.client) {
      console.error(`${o.order} belongs to ${rows[0].full_name}, expected ${o.client} — aborting, nothing changed.`);
      process.exit(1);
    }
    if (rows[0].status !== "ready_to_deliver") {
      console.error(`${o.order} is "${rows[0].status}", expected ready_to_deliver — aborting, nothing changed.`);
      process.exit(1);
    }
    const already = (await sql`select 1 from stock_items where notes = ${"Moved from cancelled order " + o.order} limit 1`) as Array<unknown>;
    if (already.length) {
      console.error(`Stock rows for ${o.order} already exist — aborting, nothing changed.`);
      process.exit(1);
    }
    ids[o.order] = rows[0].id;
  }

  for (const o of ORDERS) {
    const id = ids[o.order];
    const res = (await sql`
      with upd as (
        update orders
        set status = 'cancelled',
            payment_confirmed = false,
            cost_usd = null, cost_gbp = null,
            profit_usd = null, platform_fee_usd = null, profit_notes = null,
            notes = case when coalesce(notes, '') = '' then ${NOTE} else notes || ' | ' || ${NOTE} end,
            updated_at = now()
        where id = ${id} and status = 'ready_to_deliver'
        returning id, order_number
      ),
      ins as (
        insert into stock_items (product_name, product_brand, product_url, image_url, cost_gbp, cost_usd, quantity, notes)
        select oi.product_name, oi.product_brand, oi.product_url, oi.image_url,
               oi.cost_gbp, oi.cost_usd, oi.quantity,
               'Moved from cancelled order ' || upd.order_number
        from order_items oi join upd on oi.order_id = upd.id
        where oi.sourced = true
        returning id
      )
      select (select count(*)::int from upd) as orders_cancelled, (select count(*)::int from ins) as stock_rows
    `) as Array<{ orders_cancelled: number; stock_rows: number }>;

    if (res[0].orders_cancelled !== 1) {
      console.error(`${o.order}: expected to cancel exactly 1 order, got ${res[0].orders_cancelled}.`);
      process.exit(1);
    }
    console.log(`OK  ${o.order} (${o.client}) cancelled — ${res[0].stock_rows} item(s) moved to stock`);
  }
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
