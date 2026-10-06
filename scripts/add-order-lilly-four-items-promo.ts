/**
 * New order for Lilly (existing customer, 76951787, Chwayfet): 4 items at
 * catalogue price ($205) + a "Promotion" line of -$10 (same shape as the
 * existing "Loyalty Discount" line) = $195 invoice. Paid in full (recorded as
 * whish_link). All items already bought and in Lebanon → ready_to_deliver.
 *
 * The user gave only the total cost ($112). Order cost/profit are derived
 * from item costs (see the backfill in lib/db.ts), so the $112 is split
 * across the items in proportion to their price.
 *
 * Run:  npx tsx scripts/add-order-lilly-four-items-promo.ts
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

const CUSTOMER_ID = "b3b1c9e9-f6a9-4654-8fe9-8974d645791c"; // lilly, 76951787
const TOTAL_COST_USD = 112;
const PROMO_USD = 10;
const round2 = (n: number): number => Math.round(n * 100) / 100;

const LINES: Array<{ productId: string; shade: string | null }> = [
  { productId: "777612e3-88ba-4009-ba55-b23e91c63410", shade: null },           // Kiehl's Creamy Eye Treatment with Avocado 14ml
  { productId: "4ce26399-e7c7-4331-be98-d83e6772c3af", shade: null },           // Charlotte Tilbury Magic Cream 30ml
  { productId: "87d0342b-0306-4315-8be9-26e48f7d654d", shade: "Cotton Candy" }, // Huda FAUXFILTER Concealer 9ml
  { productId: "a169ca6b-5e9c-4272-bae4-8af38c361a81", shade: null }            // Sephora Blush Blush Blush Trio — Candy Lover
];

async function main(): Promise<void> {
  const sql = getSql();

  const cust = (await sql`select id, full_name from customers where id = ${CUSTOMER_ID}`) as Array<{ id: string; full_name: string }>;
  if (!cust.length) {
    console.error("Customer not found — aborting, nothing changed.");
    process.exit(1);
  }

  const lines = [];
  for (const l of LINES) {
    const prod = (await sql`select brand, name, price_usd, price_gbp, product_url, image_url from products where id = ${l.productId}`) as Array<{ brand: string; name: string; price_usd: string; price_gbp: string; product_url: string; image_url: string }>;
    if (!prod.length) {
      console.error(`Product ${l.productId} not found — aborting, nothing changed.`);
      process.exit(1);
    }
    let image = prod[0].image_url;
    if (l.shade) {
      const v = (await sql`select shade_image_url from product_variants where product_id = ${l.productId} and lower(shade_name) = lower(${l.shade})`) as Array<{ shade_image_url: string | null }>;
      if (v.length !== 1) {
        console.error(`Shade "${l.shade}" not found for ${prod[0].name} — aborting, nothing changed.`);
        process.exit(1);
      }
      image = v[0].shade_image_url || image;
    }
    lines.push({ ...prod[0], image, itemName: l.shade ? `${prod[0].name} — Shade: ${l.shade}` : prod[0].name });
  }

  const listTotal = lines.reduce((s, l) => s + Number(l.price_usd), 0);
  // Proportional cost split; the last line absorbs rounding so the sum is exact.
  let assigned = 0;
  const costs = lines.map((l, i) => {
    const c = i === lines.length - 1 ? round2(TOTAL_COST_USD - assigned) : round2((TOTAL_COST_USD * Number(l.price_usd)) / listTotal);
    assigned = round2(assigned + c);
    return c;
  });

  const totalUsd = listTotal - PROMO_USD;
  const promoGbp = round2(PROMO_USD / 1.3);
  const totalGbp = round2(lines.reduce((s, l) => s + Number(l.price_gbp), 0) - promoGbp);
  const orderNumber = generateOrderNumber();

  const orderRows = (await sql`
    insert into orders (
      order_number, customer_id, customer_email,
      product_name, product_brand,
      price_usd, price_gbp, total_usd, total_gbp, items_count,
      status, payment_method, payment_confirmed, amount_paid_usd
    )
    values (
      ${orderNumber}, ${CUSTOMER_ID}, ${null},
      ${lines.length + " items"}, ${"Multiple brands"},
      ${totalUsd}, ${totalGbp}, ${totalUsd}, ${totalGbp}, ${lines.length + 1},
      ${"ready_to_deliver"}, ${"whish_link"}, ${true}, ${totalUsd}
    )
    returning id, order_number
  `) as Array<{ id: string; order_number: string }>;
  const order = orderRows[0];

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    await sql`
      insert into order_items (
        order_id, product_name, product_brand, product_url, image_url, price_usd, price_gbp, quantity,
        cost_usd, cost_gbp, sourced, in_lebanon
      )
      values (
        ${order.id}, ${l.itemName}, ${l.brand}, ${l.product_url}, ${l.image}, ${Number(l.price_usd)}, ${Number(l.price_gbp)}, ${1},
        ${costs[i]}, ${round2(costs[i] / 1.3)}, ${true}, ${true}
      )
    `;
    console.log(`  + ${l.brand} — ${l.itemName} — $${Number(l.price_usd)} — cost $${costs[i]}`);
  }
  await sql`
    insert into order_items (order_id, product_name, product_brand, product_url, image_url, price_usd, price_gbp, quantity, sourced, in_lebanon)
    values (${order.id}, ${"Promotion"}, ${"Seasons by B"}, ${null}, ${null}, ${-PROMO_USD}, ${-promoGbp}, ${1}, ${true}, ${true})
  `;
  console.log(`  + Seasons by B — Promotion — -$${PROMO_USD}`);

  const costGbp = round2(costs.reduce((s, c) => s + c / 1.3, 0));
  await sql`
    update orders set cost_usd = ${TOTAL_COST_USD}, cost_gbp = ${costGbp}, profit_usd = ${round2(totalUsd - TOTAL_COST_USD)}
    where id = ${order.id}
  `;

  console.log(`OK  ${order.order_number} — ${cust[0].full_name} — $${totalUsd} paid (whish_link) — cost $${TOTAL_COST_USD}, profit $${round2(totalUsd - TOTAL_COST_USD)} — ready_to_deliver`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
