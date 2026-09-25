/**
 * New order for Zaynab Al Moussawi (existing customer, 81764045): 1x Hourglass
 * Vanish Airbrush Concealer 5.9ml, shade Pearl ($50). Payment: cod,
 * confirmed — per standing instruction ([[lara_order_entry_defaults]]).
 *
 * Run:  npx tsx scripts/add-order-zaynab-moussawi-hourglass-vanish-pearl.ts
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

const PRODUCT_ID = "eabde7e2-0a30-44b2-b1ea-0d4677e150c0"; // Hourglass Vanish Airbrush Concealer 5.9ml
const CUSTOMER_ID = "7a07654a-2c07-497c-98d9-d9d87dd8b54a"; // Zaynab Al Moussawi
const SHADE = "Pearl";

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const sql = getSql();

  const prodRows = (await sql`
    select id, brand, name, price_usd, price_gbp, product_url, image_url from products where id = ${PRODUCT_ID}
  `) as Array<{ id: string; brand: string; name: string; price_usd: string; price_gbp: string; product_url: string; image_url: string }>;
  if (!prodRows.length) {
    console.error("Product not found.");
    process.exit(1);
  }
  const p = prodRows[0];

  const shadeRows = (await sql`
    select shade_name, shade_image_url from product_variants
    where product_id = ${PRODUCT_ID} and shade_name ilike ${SHADE + "%"}
  `) as Array<{ shade_name: string; shade_image_url: string }>;
  if (shadeRows.length !== 1) {
    console.error(`Expected exactly one shade matching "${SHADE}", found: ${JSON.stringify(shadeRows.map((s) => s.shade_name))}`);
    process.exit(1);
  }
  const shade = shadeRows[0];

  const custRows = (await sql`select id, full_name from customers where id = ${CUSTOMER_ID}`) as Array<{ id: string; full_name: string }>;
  if (!custRows.length) {
    console.error("Customer not found.");
    process.exit(1);
  }
  const customer = custRows[0];

  const itemName = `${p.name} — Shade: ${SHADE}`;
  const priceUsd = Number(p.price_usd);
  const priceGbp = Number(p.price_gbp);
  const orderNumber = generateOrderNumber();

  const orderRows = (await sql`
    insert into orders (
      order_number, customer_id, customer_email,
      product_name, product_brand,
      price_usd, price_gbp, total_usd, total_gbp, items_count,
      status, payment_method, payment_confirmed
    )
    values (
      ${orderNumber}, ${customer.id}, ${null},
      ${itemName}, ${p.brand},
      ${priceUsd}, ${priceGbp}, ${priceUsd}, ${priceGbp}, ${1},
      ${"payment_confirmed"}, ${"cod"}, ${true}
    )
    returning id, order_number
  `) as Array<{ id: string; order_number: string }>;
  const order = orderRows[0];

  await sql`
    insert into order_items (order_id, product_name, product_brand, product_url, image_url, price_usd, price_gbp, quantity)
    values (${order.id}, ${itemName}, ${p.brand}, ${p.product_url}, ${shade.shade_image_url || p.image_url}, ${priceUsd}, ${priceGbp}, ${1})
  `;

  console.log(`OK  ${order.order_number} — ${customer.full_name} — ${p.brand} ${itemName} (matched "${shade.shade_name}") — $${priceUsd} — cod / confirmed`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
