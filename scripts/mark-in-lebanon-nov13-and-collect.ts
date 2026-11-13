/**
 * 2026-11-13 — the user says everything sourced in these three batches has
 * reached Lebanon:
 *   scripts/source-batch-nov12-1345.ts        (24 lines)
 *   scripts/source-sephora-qa-nov12-13.ts     (36 lines)
 *   scripts/source-ct-pair-and-fatima-lip-oil.ts (3 lines)
 * Marks those 63 order_items in_lebanon = true, then promotes every open,
 * payment_confirmed order whose items are ALL in Lebanon to 'ready_to_deliver'
 * (same rule as the admin in_lebanon toggle / promote-ready-to-deliver.ts).
 * No customer messages are sent. Prints what is owed on each affected order.
 *
 * Run:  npx tsx scripts/mark-in-lebanon-nov13-and-collect.ts [--dry-run]
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
for (const f of [".env.local", ".env"]) { try { for (const raw of readFileSync(resolve(process.cwd(), f), "utf8").split(/\r?\n/)) { const l = raw.trim(); if (!l || l.startsWith("#")) continue; const e = l.indexOf("="); if (e < 0) continue; const k = l.slice(0, e).trim(); if (!process.env[k]) process.env[k] = l.slice(e + 1).trim().replace(/^['"]|['"]$/g, ""); } } catch {} }
import { getSql } from "../lib/db";

const DRY = process.argv.includes("--dry-run");
const FILES = ["scripts/source-batch-nov12-1345.ts", "scripts/source-sephora-qa-nov12-13.ts", "scripts/source-ct-pair-and-fatima-lip-oil.ts"];
const UUID = /"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})"/g;
const ids = [...new Set(FILES.flatMap((f) => [...readFileSync(f, "utf8").matchAll(UUID)].map((m) => m[1])))];

async function main(): Promise<void> {
  const sql = getSql();
  const lines = (await sql`
    select oi.id, oi.order_id, oi.sourced, coalesce(oi.in_lebanon, false) as in_lebanon, o.status
    from order_items oi join orders o on o.id = oi.order_id where oi.id = any(${ids})
  `) as Array<{ id: string; order_id: string; sourced: boolean; in_lebanon: boolean; status: string }>;
  if (lines.length !== 63) { console.error(`Expected 63 order lines, found ${lines.length} — aborting.`); process.exit(1); }
  const notSourced = lines.filter((l) => !l.sourced);
  if (notSourced.length) { console.error(`${notSourced.length} lines not sourced — aborting.`); process.exit(1); }
  const toMark = lines.filter((l) => !l.in_lebanon).map((l) => l.id);
  const orderIds = [...new Set(lines.map((l) => l.order_id))];
  console.log(`${toMark.length} of 63 lines to mark in Lebanon, across ${orderIds.length} orders.`);

  if (!DRY) {
    await sql.transaction([
      sql`update order_items set in_lebanon = true where id = any(${toMark})`,
      sql`
        update orders o set status = 'ready_to_deliver', updated_at = now()
        where o.id = any(${orderIds})
          and o.status in ('payment_confirmed', 'ordered_selfridges', 'shipped', 'partially_delivered')
          and o.payment_confirmed = true
          and not exists (select 1 from order_items oi where oi.order_id = o.id and coalesce(oi.in_lebanon, false) = false)
      `
    ]);
  }

  const rows = (await sql`
    select o.order_number, o.status, c.full_name, o.payment_method,
           coalesce(o.total_usd, o.price_usd, 0)::numeric as total,
           coalesce(o.amount_paid_usd, 0)::numeric as paid,
           (select count(*) from order_items oi where oi.order_id = o.id)::int as n,
           (select count(*) from order_items oi where oi.order_id = o.id and coalesce(oi.in_lebanon, false))::int as n_leb,
           (select coalesce(sum(oi.price_usd * oi.quantity), 0) from order_items oi where oi.order_id = o.id and coalesce(oi.in_lebanon, false))::numeric as leb_value
    from orders o left join customers c on c.id = o.customer_id
    where o.id = any(${orderIds})
    order by (select count(*) from order_items oi where oi.order_id = o.id and coalesce(oi.in_lebanon, false) = false), c.full_name
  `) as Array<{ order_number: string; status: string; full_name: string; payment_method: string; total: string; paid: string; n: number; n_leb: number; leb_value: string }>;
  console.log(JSON.stringify(rows));
}
main().catch((e) => { console.error("Failed:", e); process.exit(1); });
