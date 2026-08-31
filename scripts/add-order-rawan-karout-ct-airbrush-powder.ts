/**
 * One-off manual order for repeat customer Rawan Karout (03999071).
 *  - 1x Charlotte Tilbury Airbrush Flawless Finish skin-perfecting
 *    micro-powder 8g — shade Fair @ catalogue price $64 / £40
 *    (catalogue product b1a06aac-97bb-492b-b859-a473d5b353f2)
 *  - Payment: COD, order confirmed (payment_confirmed = true, status
 *    payment_confirmed) — matches how every existing COD order is recorded.
 *
 * Run:  npx ts-node scripts/add-order-rawan-karout-ct-airbrush-powder.ts
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
  full_name: "Rawan Karout",
  phone: "03999071",
  address: "Hadath, Jamous Street, same bldg as Karout, 8th floor"
};

const SOURCE = "instagram";
const PAYMENT_METHOD = "cod";
const NOTES = "Paying COD. No email on file. Repeat customer.";

const ITEMS = [
  {
    brand: "Charlotte Tilbury",
    name: "Airbrush Flawless Finish skin-perfecting micro-powder 8g — Shade: Fair",
    price_usd: 64,
    price_gbp: 40,
    quantity: 1,
    product_url:
      "https://www.selfridges.com/GB/en/product/charlotte-tilbury-airbrush-flawless-finish-skin-perfecting-micro-powder-8g_455-3003231-AIRBRUSHFLAWLESSFINISH/",
    image_url:
      "https://images.selfridges.com/is/image/selfridges/455-3003231-AIRBRUSHFLAWLESSFINISH_FAIR_M?wid=960&hei=1280&fmt=webp&qlt=80"
  }
];

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  await ensureSchema();
  const sql = getSql();

  const custRows = (await sql`
    insert into customers (full_name, phone, address)
    values (${CUSTOMER.full_name}, ${CUSTOMER.phone}, ${CUSTOMER.address})
    returning id
  `) as Array<{ id: string }>;
  const customerId = custRows[0].id;

  const totalUsd = ITEMS.reduce((s, i) => s + i.price_usd * i.quantity, 0);
  const totalGbp = ITEMS.reduce((s, i) => s + i.price_gbp * i.quantity, 0);
  const orderNumber = generateOrderNumber();

  const summaryBrand = ITEMS.length === 1 ? ITEMS[0].brand : `${ITEMS.length} brands`;
  const summaryName = ITEMS.length === 1 ? ITEMS[0].name : `${ITEMS.length} items`;

  const orderRows = (await sql`
    insert into orders (
      order_number, customer_id, customer_email,
      product_name, product_brand,
      price_usd, price_gbp, total_usd, total_gbp, items_count,
      status, payment_method, payment_confirmed, notes, source
    )
    values (
      ${orderNumber}, ${customerId}, ${null},
      ${summaryName}, ${summaryBrand},
      ${totalUsd}, ${totalGbp}, ${totalUsd}, ${totalGbp}, ${ITEMS.length},
      ${"payment_confirmed"}, ${PAYMENT_METHOD}, ${true}, ${NOTES}, ${SOURCE}
    )
    returning id, order_number
  `) as Array<{ id: string; order_number: string }>;
  const order = orderRows[0];

  for (const it of ITEMS) {
    await sql`
      insert into order_items (
        order_id, product_name, product_brand, product_url, image_url,
        price_usd, price_gbp, quantity
      )
      values (
        ${order.id}, ${it.name}, ${it.brand}, ${it.product_url}, ${it.image_url},
        ${it.price_usd}, ${it.price_gbp}, ${it.quantity}
      )
    `;
  }

  console.log(`OK  ${order.order_number} — ${CUSTOMER.full_name} — $${totalUsd} — COD confirmed`);
}

main().catch((err) => {
  console.error("Order creation failed:", err);
  process.exit(1);
});
