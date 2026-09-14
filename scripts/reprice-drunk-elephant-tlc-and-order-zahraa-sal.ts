/**
 * 1) Reprice Drunk Elephant T.L.C. Framboos Glycolic Night Serum 30ml
 *    $128 -> $110 and lock it (was scraper-priced, unlocked — locking
 *    stops the next Selfridges scrape from overwriting the manual price).
 * 2) Create a new order for that product for customer Zahraa Sal.
 *    Payment/status unspecified — created pending/unconfirmed.
 *
 * Run:  npx ts-node scripts/reprice-drunk-elephant-tlc-and-order-zahraa-sal.ts
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

const PRODUCT_ID = "0a1ee9eb-fb90-47b4-9304-de62c2c39a12";
const NEW_PRICE_USD = 110;
const NEW_PRICE_GBP = Math.round((NEW_PRICE_USD / 1.3) * 100) / 100;

const CUSTOMER = {
  full_name: "Zahraa Sal",
  phone: "76838887",
  address: "Chiyah Knisset Mar Mkhayel facing Mazen pharmacy"
};

const SOURCE = "instagram";

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  await ensureSchema();
  const sql = getSql();

  const productRows = (await sql`
    update products
    set price_usd = ${NEW_PRICE_USD}, price_gbp = ${NEW_PRICE_GBP}, price_locked = true, scraped_at = now()
    where id = ${PRODUCT_ID}
    returning brand, name, price_usd, price_gbp, product_url, image_url
  `) as Array<{ brand: string; name: string; price_usd: string; price_gbp: string; product_url: string | null; image_url: string | null }>;
  if (!productRows.length) {
    console.error(`Product not found: ${PRODUCT_ID}`);
    process.exit(1);
  }
  const p = productRows[0];
  console.log(`REPRICED  ${p.brand} — ${p.name} -> $${p.price_usd} (locked)`);

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
      product_name, product_brand, product_url,
      price_usd, price_gbp, total_usd, total_gbp, items_count,
      status, payment_confirmed, source
    )
    values (
      ${orderNumber}, ${customerId}, ${null},
      ${p.name}, ${p.brand}, ${p.product_url},
      ${priceUsd}, ${priceGbp}, ${priceUsd}, ${priceGbp}, ${1},
      ${"pending"}, ${false}, ${SOURCE}
    )
    returning id, order_number
  `) as Array<{ id: string; order_number: string }>;
  const order = orderRows[0];

  await sql`
    insert into order_items (order_id, product_name, product_brand, product_url, image_url, price_usd, price_gbp, quantity)
    values (${order.id}, ${p.name}, ${p.brand}, ${p.product_url}, ${p.image_url}, ${priceUsd}, ${priceGbp}, ${1})
  `;

  console.log(`OK  ${order.order_number} — ${CUSTOMER.full_name} — $${priceUsd} — pending / unconfirmed`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
