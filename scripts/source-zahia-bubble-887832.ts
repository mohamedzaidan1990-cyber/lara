/**
 * Zahia's SBB-887832: the 4 Bubble lines already on the order at promo prices
 * ($22 + $22 + $23 + $27 = $94) were bought together for $81 — split by
 * price — and are in Lebanon. If that completes the order, move it to
 * ready_to_deliver (scripts bypass the admin UI's auto-status).
 *
 * Run:  npx tsx scripts/source-zahia-bubble-887832.ts
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

const ORDER_NUMBER = "SBB-887832";
const TOTAL_COST_USD = 81;
const NAMES = ["Over Night - Hydrating Sleep Mask", "Day Dream - Vitamin C + Niacinamide Serum", "Power Wave - Super Hydrating Moisturizer", "Cosmic Silk - Hydrating Milky Toner"];
const round2 = (n: number): number => Math.round(n * 100) / 100;

async function main(): Promise<void> {
  const sql = getSql();
  const lines = [];
  for (const n of NAMES) {
    const rows = (await sql`
      select oi.id, oi.product_name, oi.price_usd, o.id as order_id
      from order_items oi join orders o on o.id = oi.order_id
      where o.order_number = ${ORDER_NUMBER} and oi.product_brand = 'Bubble' and oi.product_name like ${n + "%"}
    `) as Array<{ id: string; product_name: string; price_usd: string; order_id: string }>;
    if (rows.length !== 1) {
      console.error(`${ORDER_NUMBER} "${n}" matched ${rows.length} lines — aborting, nothing changed.`);
      process.exit(1);
    }
    lines.push(rows[0]);
  }
  const listTotal = lines.reduce((s, l) => s + Number(l.price_usd), 0);
  if (listTotal !== 94) {
    console.error(`Bubble lines total $${listTotal}, expected $94 — aborting, nothing changed.`);
    process.exit(1);
  }

  let assigned = 0;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const c = i === lines.length - 1 ? round2(TOTAL_COST_USD - assigned) : round2((TOTAL_COST_USD * Number(l.price_usd)) / listTotal);
    assigned = round2(assigned + c);
    await sql`update order_items set sourced = true, in_lebanon = true, cost_usd = ${c}, cost_gbp = ${round2(c / 1.3)} where id = ${l.id}`;
    console.log(`OK  ${l.product_name} — $${Number(l.price_usd)} — cost $${c}, in Lebanon`);
  }

  const orderId = lines[0].order_id;
  await sql`
    update orders o
    set cost_usd = sub.c, profit_usd = round((coalesce(o.total_usd, o.price_usd, 0) - sub.c - coalesce(o.platform_fee_usd, 0))::numeric, 2)
    from (select round(sum(cost_usd)::numeric, 2) as c from order_items where order_id = ${orderId}) sub
    where o.id = ${orderId}
  `;
  const moved = (await sql`
    update orders o set status = 'ready_to_deliver', updated_at = now()
    where o.id = ${orderId} and o.status in ('payment_confirmed', 'ordered_selfridges', 'fulfilled_from_stock', 'partially_delivered')
      and not exists (select 1 from order_items oi where oi.order_id = o.id and coalesce(oi.in_lebanon, false) = false)
    returning o.order_number
  `) as unknown[];
  const pending = (await sql`select product_brand, product_name, sourced from order_items where order_id = ${orderId} and not coalesce(in_lebanon, false)`) as Array<{ product_brand: string; product_name: string; sourced: boolean }>;
  console.log(moved.length ? `${ORDER_NUMBER} → ready_to_deliver` : `${ORDER_NUMBER} still waiting on: ${pending.map((p) => `${p.product_brand} ${p.product_name}${p.sourced ? " (bought)" : " (not bought)"}`).join("; ")}`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
