/**
 * Deliveries reported by the user on 6 Oct 2026.
 *
 * Full deliveries (status delivered, delivered_at now, paid in full):
 *   SBB-117959 Malak Tabaja, SBB-547894 Saja Daher (item also marked in
 *   Lebanon), SBB-950995 Layla Daher, SBB-812745 Nour Akkouch,
 *   SBB-361403 Reem Al Maaz, SBB-772161 Zeinab Ismail.
 *   (Narcisse Saad, Mirna Harb, Zahraa Sal, Lara Awada were already
 *   delivered + paid — nothing to do.)
 *
 * Partial deliveries (status partially_delivered; there is no per-item
 * delivered flag, so the delivered items are recorded in orders.notes):
 *   SBB-335181 Lea Sbeity — Benefit trio + Fenty Lil' Mists duo delivered and
 *     paid; amount_paid_usd = those two lines.
 *   SBB-974645 Batoul Dbouk — 12 of 15 items delivered (already prepaid in
 *     full); still to deliver: 1 Coat WOW mascara, Easy Bake Setting Spray,
 *     Makeout Sesh Lip Duo.
 *
 * Run:  npx tsx scripts/deliveries-oct06.ts
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

const FULL = ["SBB-117959", "SBB-547894", "SBB-950995", "SBB-812745", "SBB-361403", "SBB-772161"];

const PARTIAL: Array<{ order: string; delivered: string[]; paidFromDelivered: boolean }> = [
  { order: "SBB-335181", delivered: ["Rhythm & Beauty Radio", "Lil' Mists"], paidFromDelivered: true },
  {
    order: "SBB-974645",
    delivered: [
      "FAUXFILTER Luminous Matte Liquid Concealer", "Blush Filter liquid blusher", "Easy Bake loose baking",
      "#fauxfilter colour corrector", "Major Sculpt", "Positive Light", "Dew Bronze", "Soft Pop Blush Stick",
      "Faux Filter lip gloss", "Blush Filter Palette", "Liquid Matte Mousse Gift Set", "Airbrush Flawless Finish"
    ],
    paidFromDelivered: false // already prepaid in full
  }
];

async function main(): Promise<void> {
  const sql = getSql();

  // Validate everything before writing.
  for (const n of FULL) {
    const r = (await sql`select status from orders where order_number = ${n}`) as Array<{ status: string }>;
    if (!r.length || ["cancelled", "refunded"].includes(r[0].status)) {
      console.error(`${n} not found or already closed (${r[0]?.status}) — aborting, nothing changed.`);
      process.exit(1);
    }
  }
  const partialPlans = [];
  for (const p of PARTIAL) {
    const items = (await sql`
      select oi.id, oi.product_name, oi.price_usd, oi.quantity, o.id as order_id
      from order_items oi join orders o on o.id = oi.order_id where o.order_number = ${p.order}
    `) as Array<{ id: string; product_name: string; price_usd: string; quantity: number; order_id: string }>;
    const matched = p.delivered.map((frag) => {
      const hits = items.filter((it) => it.product_name.toLowerCase().includes(frag.toLowerCase()));
      if (hits.length !== 1) {
        console.error(`${p.order}: "${frag}" matched ${hits.length} lines — aborting, nothing changed.`);
        process.exit(1);
      }
      return hits[0];
    });
    const remaining = items.filter((it) => !matched.includes(it));
    partialPlans.push({ ...p, orderId: items[0].order_id, matched, remaining });
  }

  // Full deliveries.
  for (const n of FULL) {
    const st = (await sql`select status from orders where order_number = ${n}`) as Array<{ status: string }>;
    if (st[0].status === "delivered") {
      console.log(`--  ${n} — already delivered, skipped`);
      continue;
    }
    await sql`update order_items set sourced = true, in_lebanon = true where order_id = (select id from orders where order_number = ${n})`;
    const r = (await sql`
      update orders
      set status = 'delivered', delivered_at = coalesce(delivered_at, now()), payment_confirmed = true,
          amount_paid_usd = greatest(coalesce(amount_paid_usd, 0), coalesce(total_usd, price_usd, 0)), updated_at = now()
      where order_number = ${n}
      returning amount_paid_usd, total_usd
    `) as Array<{ amount_paid_usd: string; total_usd: string }>;
    console.log(`OK  ${n} — delivered, paid $${Number(r[0].amount_paid_usd)} (total $${Number(r[0].total_usd)})`);
  }

  // Partial deliveries.
  const today = new Date().toISOString().slice(0, 10);
  for (const p of partialPlans) {
    const deliveredValue = p.matched.reduce((s, it) => s + Number(it.price_usd) * (Number(it.quantity) || 1), 0);
    const note = `[${today}] Partial delivery — delivered: ${p.matched.map((it) => it.product_name).join("; ")}. Still to deliver: ${p.remaining.map((it) => it.product_name).join("; ")}.`;
    if (p.paidFromDelivered) {
      await sql`
        update orders
        set status = 'partially_delivered', payment_confirmed = true,
            amount_paid_usd = greatest(coalesce(amount_paid_usd, 0), ${deliveredValue}::numeric),
            notes = trim(both from concat_ws(E'\n', notes, ${note}::text)), updated_at = now()
        where id = ${p.orderId}
      `;
    } else {
      await sql`
        update orders
        set status = 'partially_delivered',
            notes = trim(both from concat_ws(E'\n', notes, ${note}::text)), updated_at = now()
        where id = ${p.orderId}
      `;
    }
    const o = (await sql`select total_usd, amount_paid_usd from orders where id = ${p.orderId}`) as Array<{ total_usd: string; amount_paid_usd: string }>;
    console.log(`OK  ${p.order} — partially delivered (${p.matched.length} of ${p.matched.length + p.remaining.length} items, $${deliveredValue}); paid $${Number(o[0].amount_paid_usd)} of $${Number(o[0].total_usd)}`);
    console.log(`      still to deliver: ${p.remaining.map((it) => `${it.product_name} ($${Number(it.price_usd)})`).join("; ")}`);
  }
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
