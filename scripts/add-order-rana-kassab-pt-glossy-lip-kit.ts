/**
 * One-off manual order (Instagram) for customer Rana Kassab.
 *  - 1x Charlotte Tilbury Pillow Talk Glossy Lip Kit — Fair @ $38
 *    (catalogue product 757b7133-3c42-4b43-8293-bc070a8dbfe1)
 *  - Payment: COD, order confirmed (payment_confirmed = true, status
 *    payment_confirmed) — matches every existing COD order.
 *
 * Run:  npx ts-node scripts/add-order-rana-kassab-pt-glossy-lip-kit.ts
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

import { ensureSchema, getSql, generateOrderNumber } from "../lib/db";

const CUSTOMER = {
  full_name: "Rana Kassab",
  phone: "76766557",
  address: "Hazmieh, behind Backyard, Ghazali Hills bldg, third floor"
};

const SOURCE = "instagram";
const PAYMENT_METHOD = "cod";
const NOTES = "Paying COD. No email on file.";

const PRODUCT_ID = "757b7133-3c42-4b43-8293-bc070a8dbfe1";

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  await ensureSchema();
  const sql = getSql();

  const prod = (await sql`
    select brand, name, price_usd, price_gbp, product_url, image_url
    from products where id = ${PRODUCT_ID} limit 1
  `) as Array<{
    brand: string; name: string; price_usd: string; price_gbp: string;
    product_url: string | null; image_url: string | null;
  }>;
  if (!prod.length) {
    console.error(`Product ${PRODUCT_ID} not found`);
    process.exit(1);
  }
  const p = prod[0];

  const custRows = (await sql`
    insert into customers (full_name, phone, address)
    values (${CUSTOMER.full_name}, ${CUSTOMER.phone}, ${CUSTOMER.address})
    returning id
  `) as Array<{ id: string }>;
  const customerId = custRows[0].id;

  const totalUsd = Number(p.price_usd);
  const totalGbp = Number(p.price_gbp);
  const orderNumber = generateOrderNumber();

  const orderRows = (await sql`
    insert into orders (
      order_number, customer_id, customer_email,
      product_name, product_brand,
      price_usd, price_gbp, total_usd, total_gbp, items_count,
      status, payment_method, payment_confirmed, notes, source
    )
    values (
      ${orderNumber}, ${customerId}, ${null},
      ${p.name}, ${p.brand},
      ${totalUsd}, ${totalGbp}, ${totalUsd}, ${totalGbp}, ${1},
      ${"payment_confirmed"}, ${PAYMENT_METHOD}, ${true}, ${NOTES}, ${SOURCE}
    )
    returning id, order_number
  `) as Array<{ id: string; order_number: string }>;
  const order = orderRows[0];

  await sql`
    insert into order_items (
      order_id, product_name, product_brand, product_url, image_url,
      price_usd, price_gbp, quantity
    )
    values (
      ${order.id}, ${p.name}, ${p.brand}, ${p.product_url}, ${p.image_url},
      ${totalUsd}, ${totalGbp}, ${1}
    )
  `;

  console.log(`OK  ${order.order_number} — ${CUSTOMER.full_name} — $${totalUsd} — COD confirmed`);
}

main().catch((err) => {
  console.error("Order creation failed:", err);
  process.exit(1);
});
