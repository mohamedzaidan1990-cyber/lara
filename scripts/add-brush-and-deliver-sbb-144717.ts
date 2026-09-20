/**
 * Order SBB-144717 (Bouchra Charif, Whish link, $200 already received against a
 * $174 total), per the user:
 *   1. Adds 1x Huda Beauty Diffusing Cheek Brush at a discounted $26
 *      (catalogue $33) — which brings the order total to exactly $200.
 *   2. Marks the order delivered (status = 'delivered', delivered_at = now()),
 *      the same database change as app/api/orders/[id]/route.ts — that route is
 *      deliberately NOT called, because it also WhatsApps the customer.
 *   3. Leaves amount_paid_usd at $200 / payment_confirmed = true, so the order
 *      is fully paid and the refreshed invoice reads "STATUS: PAID".
 *
 * The new line is marked sourced + in_lebanon like her other four items, since
 * it ships with the delivered order. Its cost is $0 (cost_usd = cost_gbp = 0),
 * per the user — applied to the live row after the first run, and included in
 * the insert below so the script matches the database.
 *
 * The stored invoice is regenerated so it shows the brush and the paid-in-full
 * total. Nothing is emailed or WhatsApped, and invoice_sent_at (the original
 * 16 Aug send) is left untouched.
 *
 * Run:  npx ts-node scripts/add-brush-and-deliver-sbb-144717.ts
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
import { generateInvoice } from "../lib/invoice";

const ORDER_NUMBER = "SBB-144717";
const CUSTOMER_NAME = "Bouchra Charif";
const BRUSH_ID = "a225a323-e05c-4103-aab0-f6de9b99f4e7"; // Huda Beauty Diffusing Cheek Brush
const BRUSH_PRICE_USD = 26; // discounted from the $33 catalogue price
const BRUSH_PRICE_GBP = Math.round((BRUSH_PRICE_USD / 1.3) * 100) / 100;
const EXPECTED_TOTAL_USD = 200;

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const sql = getSql();

  const orderRows = (await sql`
    select o.id, o.order_number, o.status, o.created_at, o.payment_method,
           o.amount_paid_usd, o.promo_entry, o.customer_email,
           coalesce(c.full_name, '') as full_name, coalesce(c.phone, '') as phone,
           coalesce(c.address, '') as address
    from orders o left join customers c on c.id = o.customer_id
    where o.order_number = ${ORDER_NUMBER} limit 1
  `) as Array<{
    id: string; order_number: string; status: string; created_at: string;
    payment_method: string | null; amount_paid_usd: string | null;
    promo_entry: boolean | null; customer_email: string | null;
    full_name: string; phone: string; address: string;
  }>;
  if (!orderRows.length) {
    console.error(`Order ${ORDER_NUMBER} not found.`);
    process.exit(1);
  }
  const order = orderRows[0];
  if (order.full_name !== CUSTOMER_NAME) {
    console.error(`Order belongs to ${order.full_name}, not ${CUSTOMER_NAME} — aborting.`);
    process.exit(1);
  }
  if (order.status === "cancelled" || order.status === "refunded") {
    console.error(`${ORDER_NUMBER} is ${order.status} — aborting.`);
    process.exit(1);
  }

  const prod = (await sql`
    select brand, name, product_url, image_url, price_usd
    from products where id = ${BRUSH_ID} and not archived limit 1
  `) as Array<{ brand: string; name: string; product_url: string | null; image_url: string | null; price_usd: string }>;
  if (!prod.length || prod[0].name !== "Diffusing Cheek Brush") {
    console.error("Diffusing Cheek Brush not found in products — aborting.");
    process.exit(1);
  }
  const p = prod[0];

  // Guard against running twice.
  const dupe = (await sql`
    select 1 from order_items where order_id = ${order.id} and product_name = ${p.name} limit 1
  `) as Array<unknown>;
  if (dupe.length) {
    console.error("The brush is already on this order — aborting to avoid a duplicate line.");
    process.exit(1);
  }

  await sql`
    insert into order_items (
      order_id, product_brand, product_name, product_url, image_url,
      price_gbp, price_usd, quantity, sourced, in_lebanon, cost_usd, cost_gbp
    )
    values (
      ${order.id}, ${p.brand}, ${p.name}, ${p.product_url}, ${p.image_url},
      ${BRUSH_PRICE_GBP}, ${BRUSH_PRICE_USD}, ${1}, ${true}, ${true}, ${0}, ${0}
    )
  `;
  console.log(`  + ${p.brand} — ${p.name} ($${BRUSH_PRICE_USD}, discounted from $${Number(p.price_usd)})`);

  const upd = (await sql`
    with agg as (
      select
        coalesce(sum(price_usd * quantity), 0) as total_usd,
        coalesce(sum(price_gbp * quantity), 0) as total_gbp,
        count(*)::int as items_count,
        count(distinct product_brand) as brand_count
      from order_items where order_id = ${order.id}
    )
    update orders o
    set total_usd     = agg.total_usd,
        total_gbp     = agg.total_gbp,
        price_usd     = agg.total_usd,
        price_gbp     = agg.total_gbp,
        items_count   = agg.items_count,
        product_name  = agg.items_count || ' items',
        product_brand = case when agg.brand_count = 1
                            then (select product_brand from order_items where order_id = ${order.id} limit 1)
                            else 'Multiple brands' end,
        status        = 'delivered',
        delivered_at  = coalesce(o.delivered_at, now()),
        amount_paid_usd = ${EXPECTED_TOTAL_USD},
        payment_confirmed = true,
        updated_at    = now()
    from agg
    where o.id = ${order.id}
    returning o.total_usd, o.items_count, o.status, o.delivered_at, o.amount_paid_usd
  `) as Array<{ total_usd: string; items_count: number; status: string; delivered_at: string; amount_paid_usd: string }>;
  const totalUsd = Number(upd[0].total_usd);
  if (totalUsd !== EXPECTED_TOTAL_USD) {
    console.error(`WARNING: total is $${totalUsd}, expected $${EXPECTED_TOTAL_USD} — check the order.`);
  }

  // Refresh the stored invoice (not sent).
  const itemRows = (await sql`
    select product_brand as brand, product_name as name, quantity, price_usd
    from order_items where order_id = ${order.id} order by created_at asc
  `) as Array<{ brand: string; name: string; quantity: number; price_usd: string }>;

  const pdf = generateInvoice(
    {
      order_number: order.order_number,
      created_at: order.created_at,
      payment_confirmed: true,
      payment_method: order.payment_method,
      total_usd: totalUsd,
      amount_paid_usd: EXPECTED_TOTAL_USD,
      promo_entry: !!order.promo_entry
    },
    { full_name: order.full_name, email: order.customer_email ?? "", phone: order.phone, address: order.address },
    itemRows.map((r) => ({ brand: r.brand, name: r.name, quantity: Number(r.quantity) || 1, price_usd: Number(r.price_usd) || 0 }))
  );
  await sql`update orders set invoice_pdf = ${pdf.toString("base64")} where id = ${order.id}`;

  console.log(
    `OK  ${ORDER_NUMBER}: ${upd[0].items_count} items, total $${totalUsd}, paid $${Number(upd[0].amount_paid_usd)}, ` +
      `status ${order.status} -> ${upd[0].status} (delivered_at ${upd[0].delivered_at}) — invoice refreshed (not sent)`
  );
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
