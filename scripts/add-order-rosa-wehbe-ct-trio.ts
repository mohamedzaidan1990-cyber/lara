/**
 * One-off manual order (Instagram) for customer Rosa Wehbe.
 *  - 1x Charlotte Tilbury Golden Glow Quick And Easy Makeup            ($80)
 *  - 1x Charlotte Tilbury Airbrush Flawless Blush Blur
 *      — Pillow Talk Medium                                           ($60)
 *  - 1x Charlotte Tilbury Airbrush Flawless Blur Loose Powder
 *      — Shade: Brightening Pink                                      ($65)
 *  - Payment: COD, order confirmed (payment_confirmed = true, status
 *    payment_confirmed).
 *
 * Prices / URLs / images read from the products table.
 *
 * Run:  npx ts-node scripts/add-order-rosa-wehbe-ct-trio.ts
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
  full_name: "Rosa Wehbe",
  phone: "70215215",
  address:
    "Beirut, Ramlet el Bayda, two bldgs after Beauvirage Hotel on the left, Jaber Residence 4330, facing Picasso building, Abdallah Tfaily, 2nd floor"
};

const SOURCE = "instagram";
const PAYMENT_METHOD = "cod";
const NOTES = "Paying COD. No email on file.";

const LINES = [
  { url: "https://www.charlottetilbury.com/us/product/quick-and-easy-golden-glow", nameSuffix: "" },
  { url: "https://www.sephora.com/product/airbrush-flawless-blush-blur-P527083", nameSuffix: "" },
  { url: "https://www.sephora.com/product/airbrush-flawless-blur-loose-setting-powder-P524838",
    nameSuffix: " — Shade: Brightening Pink" }
];

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  await ensureSchema();
  const sql = getSql();

  const items: Array<{
    brand: string; name: string; price_usd: number; price_gbp: number;
    product_url: string | null; image_url: string | null;
  }> = [];

  for (const line of LINES) {
    const prod = (await sql`
      select brand, name, price_usd, price_gbp, product_url, image_url
      from products where product_url = ${line.url} limit 1
    `) as Array<{
      brand: string; name: string; price_usd: string; price_gbp: string;
      product_url: string | null; image_url: string | null;
    }>;
    if (!prod.length) {
      console.error(`Product not found: ${line.url}`);
      process.exit(1);
    }
    const p = prod[0];
    items.push({
      brand: p.brand,
      name: p.name + line.nameSuffix,
      price_usd: Number(p.price_usd),
      price_gbp: Number(p.price_gbp),
      product_url: p.product_url,
      image_url: p.image_url
    });
  }

  const custRows = (await sql`
    insert into customers (full_name, phone, address)
    values (${CUSTOMER.full_name}, ${CUSTOMER.phone}, ${CUSTOMER.address})
    returning id
  `) as Array<{ id: string }>;
  const customerId = custRows[0].id;

  const totalUsd = items.reduce((s, i) => s + i.price_usd, 0);
  const totalGbp = items.reduce((s, i) => s + i.price_gbp, 0);
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
      ${items.length + " items"}, ${"Charlotte Tilbury"},
      ${totalUsd}, ${totalGbp}, ${totalUsd}, ${totalGbp}, ${items.length},
      ${"payment_confirmed"}, ${PAYMENT_METHOD}, ${true}, ${NOTES}, ${SOURCE}
    )
    returning id, order_number
  `) as Array<{ id: string; order_number: string }>;
  const order = orderRows[0];

  for (const it of items) {
    await sql`
      insert into order_items (
        order_id, product_name, product_brand, product_url, image_url,
        price_usd, price_gbp, quantity
      )
      values (
        ${order.id}, ${it.name}, ${it.brand}, ${it.product_url}, ${it.image_url},
        ${it.price_usd}, ${it.price_gbp}, ${1}
      )
    `;
    console.log(`  + ${it.brand} — ${it.name} ($${it.price_usd})`);
  }

  console.log(`OK  ${order.order_number} — ${CUSTOMER.full_name} — $${totalUsd} — COD confirmed`);
}

main().catch((err) => {
  console.error("Order creation failed:", err);
  process.exit(1);
});
