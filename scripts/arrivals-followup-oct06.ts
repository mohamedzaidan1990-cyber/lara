/**
 * Follow-up to arrivals-batch-oct06.ts (user answers):
 *  - Kiehl's avocado eye cream: BOTH SBB-335181 (Lea Sbeity) and SBB-465254
 *    (Mariam Jalloul) arrived, each bought at $35.
 *  - Huda Makeout Sesh Lip Duo Rosy Nudes → Batoul Dbouk SBB-974645 arrived.
 *  - Huda Easy Bake Setting Spray → both arrived: SBB-974645 (100ml) and
 *    SBB-117959 (30ml).
 *  - Benefit Benetint Pocket Pal: new order for Zahraa Daher (existing record
 *    "Zahraa", 70413437) at website price, bought at $31 and in Lebanon.
 *    cod / confirmed per [[lara_order_entry_defaults]].
 *
 * Run:  npx tsx scripts/arrivals-followup-oct06.ts
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

import { getSql, generateOrderNumber } from "../lib/db";

const round2 = (n: number): number => Math.round(n * 100) / 100;

const LINES: Array<[string, string, number | null]> = [
  ["d722883d", "SBB-335181 Kiehl's avocado eye cream (Lea Sbeity)", 35],
  ["b2c29106", "SBB-465254 Kiehl's avocado eye cream (Mariam Jalloul)", 35],
  ["956ec913", "SBB-974645 Huda Makeout Sesh Lip Duo Rosy Nudes", null],
  ["189bd128", "SBB-974645 Huda Easy Bake Setting Spray 100ml", null],
  ["e5b51718", "SBB-117959 Huda Easy Bake Setting Spray 30ml", null]
];

const ZAHRAA_ID = "abdcd0b2-b282-40ca-8160-2cd6b615d894";
const BENETINT_ID = "387a3ff8-f40c-48da-af85-05f00c24ab94"; // Benetint Pocket Pal
const BENETINT_COST = 31;

async function main(): Promise<void> {
  const sql = getSql();

  const resolved: Array<{ id: string; label: string; cost: number | null }> = [];
  for (const [prefix, label, cost] of LINES) {
    const rows = (await sql`select id from order_items where id::text like ${prefix + "%"}`) as Array<{ id: string }>;
    if (rows.length !== 1) {
      console.error(`${prefix} (${label}) matched ${rows.length} lines — aborting, nothing changed.`);
      process.exit(1);
    }
    resolved.push({ id: rows[0].id, label, cost });
  }
  const cust = (await sql`select id from customers where id = ${ZAHRAA_ID} and phone = '70413437'`) as unknown[];
  const prod = (await sql`select brand, name, price_usd, price_gbp, product_url, image_url from products where id = ${BENETINT_ID}`) as Array<{ brand: string; name: string; price_usd: string; price_gbp: string; product_url: string; image_url: string }>;
  if (!cust.length || !prod.length) {
    console.error("Zahraa's customer record or the Benetint product not found — aborting, nothing changed.");
    process.exit(1);
  }

  for (const r of resolved) {
    if (r.cost != null) {
      await sql`update order_items set sourced = true, in_lebanon = true, cost_usd = ${r.cost}, cost_gbp = ${round2(r.cost / 1.3)} where id = ${r.id}`;
      console.log(`OK  ${r.label} — sourced @ $${r.cost}, in Lebanon`);
    } else {
      await sql`update order_items set sourced = true, in_lebanon = true where id = ${r.id}`;
      console.log(`OK  ${r.label} — in Lebanon`);
    }
  }

  // Benetint order for Zahraa Daher.
  await sql`update customers set full_name = 'Zahraa Daher' where id = ${ZAHRAA_ID}`;
  const p = prod[0];
  const priceUsd = Number(p.price_usd);
  const priceGbp = Number(p.price_gbp);
  const orderRows = (await sql`
    insert into orders (
      order_number, customer_id, customer_email, product_name, product_brand,
      price_usd, price_gbp, total_usd, total_gbp, items_count,
      status, payment_method, payment_confirmed, cost_usd, cost_gbp, profit_usd
    )
    values (
      ${generateOrderNumber()}, ${ZAHRAA_ID}, ${null}, ${p.name}, ${p.brand},
      ${priceUsd}, ${priceGbp}, ${priceUsd}, ${priceGbp}, ${1},
      ${"ready_to_deliver"}, ${"cod"}, ${true}, ${BENETINT_COST}, ${round2(BENETINT_COST / 1.3)}, ${round2(priceUsd - BENETINT_COST)}
    )
    returning id, order_number
  `) as Array<{ id: string; order_number: string }>;
  await sql`
    insert into order_items (order_id, product_name, product_brand, product_url, image_url, price_usd, price_gbp, quantity, cost_usd, cost_gbp, sourced, in_lebanon)
    values (${orderRows[0].id}, ${p.name}, ${p.brand}, ${p.product_url}, ${p.image_url}, ${priceUsd}, ${priceGbp}, ${1}, ${BENETINT_COST}, ${round2(BENETINT_COST / 1.3)}, ${true}, ${true})
  `;
  console.log(`OK  ${orderRows[0].order_number} — Zahraa Daher — ${p.brand} ${p.name} — $${priceUsd} — cod / confirmed — sourced @ $${BENETINT_COST}, in Lebanon`);

  // Keep order-level cost/profit in step for the orders touched above.
  await sql`
    update orders o
    set cost_usd = sub.c, profit_usd = round((coalesce(o.total_usd, o.price_usd, 0) - sub.c - coalesce(o.platform_fee_usd, 0))::numeric, 2)
    from (
      select order_id, round(sum(cost_usd)::numeric, 2) as c from order_items
      where order_id in (select order_id from order_items where id = any(${resolved.map((r) => r.id)}))
      group by order_id
    ) sub
    where o.id = sub.order_id and sub.c is not null
  `;

  const full = (await sql`
    select o.order_number, c.full_name, bool_and(coalesce(oi.in_lebanon, false)) as all_in
    from orders o join order_items oi on oi.order_id = o.id left join customers c on c.id = o.customer_id
    where o.id in (select order_id from order_items where id = any(${resolved.map((r) => r.id)}))
    group by o.order_number, c.full_name order by o.order_number
  `) as Array<{ order_number: string; full_name: string; all_in: boolean }>;
  for (const x of full) console.log(`  ${x.order_number} (${x.full_name}): ${x.all_in ? "everything in Lebanon" : "still waiting on other items"}`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
