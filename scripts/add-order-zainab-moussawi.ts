/**
 * New order for Zainab Moussawi — matched to existing customer "Zaynab Al
 * Moussawi" (same person, prior spelling on file), reusing her phone/address:
 *   - ONE/SIZE On 'Til Dawn Mattifying Waterproof Setting Spray
 * Payment: cod, confirmed — per standing instruction
 * ([[lara_order_entry_defaults]]).
 *
 * Run:  npx ts-node scripts/add-order-zainab-moussawi.ts
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

const PRODUCT_ID = "91e977ef-0591-4e7c-906b-be699b556f7c";

const CUSTOMER = {
  full_name: "Zainab Moussawi",
  phone: "81764045",
  address: "Tarik Matar Cocodi beit abou zein el moussawi"
};

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const sql = getSql();

  const prodRows = (await sql`
    select id, brand, name, price_usd, price_gbp, product_url, image_url
    from products where id = ${PRODUCT_ID}
  `) as Array<{ id: string; brand: string; name: string; price_usd: string; price_gbp: string; product_url: string | null; image_url: string }>;
  if (!prodRows.length) {
    console.error("Product not found.");
    process.exit(1);
  }
  const p = prodRows[0];

  const custRows = (await sql`
    insert into customers (full_name, phone, address)
    values (${CUSTOMER.full_name}, ${CUSTOMER.phone}, ${CUSTOMER.address})
    returning id
  `) as Array<{ id: string }>;
  const customerId = custRows[0].id;

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
      ${orderNumber}, ${customerId}, ${null},
      ${p.name}, ${p.brand},
      ${priceUsd}, ${priceGbp}, ${priceUsd}, ${priceGbp}, ${1},
      ${"payment_confirmed"}, ${"cod"}, ${true}
    )
    returning id, order_number
  `) as Array<{ id: string; order_number: string }>;
  const order = orderRows[0];

  await sql`
    insert into order_items (order_id, product_name, product_brand, product_url, image_url, price_usd, price_gbp, quantity)
    values (${order.id}, ${p.name}, ${p.brand}, ${p.product_url}, ${p.image_url}, ${priceUsd}, ${priceGbp}, ${1})
  `;

  console.log(`OK  ${order.order_number} — ${CUSTOMER.full_name} — ${p.brand} ${p.name} — $${priceUsd} — cod / confirmed`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
