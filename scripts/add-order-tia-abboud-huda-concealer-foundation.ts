/**
 * New order for Tia Abboud (existing customer, reuses her customers row):
 * Huda Beauty FAUXFILTER Luminous Matte Liquid Concealer 9ml, shade Meringue
 * ($42) + Huda Beauty Easy Blur natural airbrush foundation 30ml, shade 150G
 * Creme Brulee ($52). Nothing sourced yet.
 * Payment: cod (no method given), confirmed, ALREADY PAID IN FULL — so
 * amount_paid_usd = total and loyalty points are synced straight away.
 *
 * Run:  npx tsx scripts/add-order-tia-abboud-huda-concealer-foundation.ts
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
import { syncOrderPoints } from "../lib/loyalty";

const CUSTOMER = {
  full_name: "Tia Abboud",
  phone: "81689712",
  address: "Bchamoun Al Madaress"
};

const LINES: Array<{ productId: string; shade: string; fromStock: boolean }> = [
  { productId: "87d0342b-0306-4315-8be9-26e48f7d654d", shade: "Meringue", fromStock: false },          // Huda FAUXFILTER Luminous Matte Liquid Concealer 9ml
  { productId: "c5e3da92-5ae4-4425-805e-b0a3abb7b099", shade: "150G Creme Brulee", fromStock: false }  // Huda Easy Blur natural airbrush foundation 30ml
];

const round2 = (n: number): number => Math.round(n * 100) / 100;

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const sql = getSql();

  // Validate everything before writing anything.
  const lines = [];
  for (const l of LINES) {
    const prod = (await sql`
      select brand, name, price_usd, price_gbp, product_url, image_url from products where id = ${l.productId}
    `) as Array<{ brand: string; name: string; price_usd: string; price_gbp: string; product_url: string; image_url: string }>;
    if (!prod.length) {
      console.error(`Product ${l.productId} not found — aborting, nothing changed.`);
      process.exit(1);
    }
    let image = prod[0].image_url;
    if (l.shade && l.shade !== "TBC") {
      const v = (await sql`
        select shade_name, shade_image_url from product_variants where product_id = ${l.productId} and lower(shade_name) = lower(${l.shade})
      `) as Array<{ shade_name: string; shade_image_url: string }>;
      // Products with no shade variants at all take the shade as free text.
      const anyVariants = (await sql`select 1 from product_variants where product_id = ${l.productId} limit 1`) as unknown[];
      if (v.length !== 1 && anyVariants.length) {
        console.error(`Expected exactly one "${l.shade}" shade for ${prod[0].name}, found ${v.length} — aborting, nothing changed.`);
        process.exit(1);
      }
      if (v.length === 1) image = v[0].shade_image_url || image;
    }
    lines.push({ ...l, ...prod[0], image, itemName: l.shade ? `${prod[0].name} — Shade: ${l.shade}` : prod[0].name });
  }

  const existing = (await sql`select id from customers where phone = ${CUSTOMER.phone}`) as Array<{ id: string }>;
  const customerId = existing.length
    ? existing[0].id
    : ((await sql`
        insert into customers (full_name, phone, address)
        values (${CUSTOMER.full_name}, ${CUSTOMER.phone}, ${CUSTOMER.address})
        returning id
      `) as Array<{ id: string }>)[0].id;

  const totalUsd = lines.reduce((s, l) => s + Number(l.price_usd), 0);
  const totalGbp = round2(lines.reduce((s, l) => s + Number(l.price_gbp), 0));
  const orderNumber = generateOrderNumber();

  const orderRows = (await sql`
    insert into orders (
      order_number, customer_id, customer_email,
      product_name, product_brand,
      price_usd, price_gbp, total_usd, total_gbp, items_count,
      status, payment_method, payment_confirmed, amount_paid_usd
    )
    values (
      ${orderNumber}, ${customerId}, ${null},
      ${lines.length + " items"}, ${"Multiple brands"},
      ${totalUsd}, ${totalGbp}, ${totalUsd}, ${totalGbp}, ${lines.length},
      ${"payment_confirmed"}, ${"cod"}, ${true}, ${totalUsd}
    )
    returning id, order_number
  `) as Array<{ id: string; order_number: string }>;
  const order = orderRows[0];

  for (const l of lines) {
    await sql`
      insert into order_items (
        order_id, product_name, product_brand, product_url, image_url, price_usd, price_gbp, quantity,
        cost_usd, cost_gbp, sourced, in_lebanon
      )
      values (
        ${order.id}, ${l.itemName}, ${l.brand}, ${l.product_url}, ${l.image}, ${Number(l.price_usd)}, ${Number(l.price_gbp)}, ${1},
        ${l.fromStock ? 0 : null}, ${l.fromStock ? 0 : null}, ${l.fromStock}, ${l.fromStock}
      )
    `;
    console.log(`  + ${l.brand} — ${l.itemName} — $${Number(l.price_usd)}${l.fromStock ? " — from stock, cost $0, in Lebanon" : ""}`);
  }

  await syncOrderPoints(order.id);
  const check = (await sql`
    select o.status, o.payment_confirmed, o.amount_paid_usd, o.total_usd,
           (select count(*) from order_items where order_id = o.id) as n_items
    from orders o where o.id = ${order.id}
  `) as Array<{ status: string; payment_confirmed: boolean; amount_paid_usd: string; total_usd: string; n_items: string }>;
  console.log(`OK  ${order.order_number} — ${CUSTOMER.full_name} — ${check[0].n_items} items — paid $${Number(check[0].amount_paid_usd)} of $${Number(check[0].total_usd)} — ${check[0].status}`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
