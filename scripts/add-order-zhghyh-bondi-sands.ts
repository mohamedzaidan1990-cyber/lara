/**
 * One-off manual order (Instagram) for customer "zhghyh".
 *  - 1x Bondi Sands Self Tanning Foam Ultra Dark 200ml @ $45
 *  - Payment: COD, order confirmed (payment_confirmed = true, status
 *    payment_confirmed) — matches how existing COD orders are recorded.
 *  - Notes: paying COD; will give a detailed address once items reach Lebanon.
 *
 * Run:  npx ts-node scripts/add-order-zhghyh-bondi-sands.ts
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
  full_name: "zhghyh",
  phone: "002422040114444",
  address: "Beirut"
};

const SOURCE = "instagram";
const PAYMENT_METHOD = "cod";
const NOTES =
  "Paying COD. Customer will provide a detailed address once the items reach Lebanon. No email on file.";

const ITEMS = [
  {
    brand: "Bondi Sands",
    name: "Self Tanning Foam Ultra Dark 200ml",
    price_usd: 45,
    quantity: 1,
    product_url: "https://bondisands.com/products/self-tanning-foam-ultra-dark",
    image_url: "/bondi-sands-self-tanning-foam-ultra-dark.png"
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
  const totalGbp = totalUsd / 1.3;
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
    returning id, order_number, created_at
  `) as Array<{ id: string; order_number: string; created_at: string }>;
  const order = orderRows[0];

  for (const it of ITEMS) {
    const pGbp = it.price_usd / 1.3;
    await sql`
      insert into order_items (
        order_id, product_name, product_brand, product_url, image_url,
        price_usd, price_gbp, quantity
      )
      values (
        ${order.id}, ${it.name}, ${it.brand}, ${it.product_url}, ${it.image_url},
        ${it.price_usd}, ${pGbp}, ${it.quantity}
      )
    `;
  }

  console.log(`OK  ${order.order_number} — ${CUSTOMER.full_name} — $${totalUsd} — COD confirmed`);
  console.log(`    notes: ${NOTES}`);
}

main().catch((err) => {
  console.error("Order creation failed:", err);
  process.exit(1);
});
