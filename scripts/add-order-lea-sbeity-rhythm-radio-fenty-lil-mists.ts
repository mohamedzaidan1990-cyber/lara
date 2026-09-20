/**
 * Manual order (Instagram) for new client Lea Sbeity, plus one repricing:
 *  - Reprices the Benefit "Rhythm & Beauty Radio Full-Size & Mini Bestsellers
 *    Trio" (already in the catalogue / Holiday Edit, sourced from Sephora ME
 *    Qatar) from $74 to $75, per the user. price_gbp stays usd / 1.3.
 *  - 1x Benefit Rhythm & Beauty Radio Full-Size & Mini Bestsellers Trio @ $75
 *  - 1x Fenty Skin Lil' Mists – Mini Body Mist Duo (Vanilla Flowers & Hey,
 *    Bouquet) @ catalogue price
 *  - Payment: COD, order confirmed (payment_confirmed = true, status
 *    payment_confirmed) — the default for every manual order.
 *  - Generates the invoice PDF with lib/invoice.ts and stores it on the order
 *    (invoice_pdf). Nothing is emailed or WhatsApped; no PDF file is written.
 *
 * Run:  npx ts-node scripts/add-order-lea-sbeity-rhythm-radio-fenty-lil-mists.ts
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
import { generateInvoice } from "../lib/invoice";

const CUSTOMER = {
  full_name: "Lea Sbeity",
  phone: "76746979",
  address: "Kfarseer"
};

const RHYTHM_ID = "8e255daf-889e-47f0-996a-a90e05d81af7";
const RHYTHM_PRICE_USD = 75;
const FENTY_ID = "9d5f00a6-80f5-451d-a5e6-aa5205c6fba3";

const SOURCE = "instagram";
const PAYMENT_METHOD = "cod";
const NOTES = "Cash on delivery. No email on file.";

const round2 = (n: number): number => Math.round(n * 100) / 100;

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  await ensureSchema();
  const sql = getSql();

  // Guard against running twice: she must not already exist as a client.
  const existing = (await sql`
    select id from customers where phone = ${CUSTOMER.phone} and full_name = ${CUSTOMER.full_name} limit 1
  `) as Array<{ id: string }>;
  if (existing.length) {
    console.error("Lea Sbeity already exists as a client — aborting to avoid a duplicate order.");
    process.exit(1);
  }

  // 1. Reprice the Rhythm & Beauty Radio set.
  const repriced = (await sql`
    update products
    set price_usd = ${RHYTHM_PRICE_USD}, price_gbp = ${round2(RHYTHM_PRICE_USD / 1.3)}, price_locked = true
    where id = ${RHYTHM_ID} and brand = 'Benefit Cosmetics' and name like 'Rhythm & Beauty Radio%'
    returning name, price_usd, price_gbp
  `) as Array<{ name: string; price_usd: string; price_gbp: string }>;
  if (repriced.length !== 1) {
    console.error(`Expected to reprice exactly 1 product, got ${repriced.length} — aborting.`);
    process.exit(1);
  }
  console.log(`OK  repriced ${repriced[0].name} -> $${Number(repriced[0].price_usd)}`);

  // 2. Load both products (Rhythm now at its new price).
  const items: Array<{
    brand: string; name: string; price_usd: number; price_gbp: number;
    product_url: string | null; image_url: string | null;
  }> = [];
  for (const id of [RHYTHM_ID, FENTY_ID]) {
    const rows = (await sql`
      select brand, name, price_usd, price_gbp, product_url, image_url
      from products where id = ${id} and not archived limit 1
    `) as Array<{ brand: string; name: string; price_usd: string; price_gbp: string; product_url: string | null; image_url: string | null }>;
    if (!rows.length) {
      console.error(`Product ${id} not found in products — aborting.`);
      process.exit(1);
    }
    const p = rows[0];
    items.push({
      brand: p.brand, name: p.name,
      price_usd: Number(p.price_usd), price_gbp: Number(p.price_gbp),
      product_url: p.product_url, image_url: p.image_url
    });
  }
  const totalUsd = round2(items.reduce((s, i) => s + i.price_usd, 0));
  const totalGbp = round2(items.reduce((s, i) => s + i.price_gbp, 0));

  // 3. Client
  const custRows = (await sql`
    insert into customers (full_name, phone, address)
    values (${CUSTOMER.full_name}, ${CUSTOMER.phone}, ${CUSTOMER.address})
    returning id
  `) as Array<{ id: string }>;
  const customerId = custRows[0].id;

  // 4. Order + items
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
      ${`${items.length} items`}, ${"Multiple brands"},
      ${totalUsd}, ${totalGbp}, ${totalUsd}, ${totalGbp}, ${items.length},
      ${"payment_confirmed"}, ${PAYMENT_METHOD}, ${true}, ${NOTES}, ${SOURCE}
    )
    returning id, order_number, created_at
  `) as Array<{ id: string; order_number: string; created_at: string }>;
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
  }

  // 5. Invoice (stored on the order; not sent)
  const pdf = generateInvoice(
    {
      order_number: order.order_number,
      created_at: order.created_at,
      payment_confirmed: true,
      payment_method: PAYMENT_METHOD,
      total_usd: totalUsd
    },
    { full_name: CUSTOMER.full_name, email: "", phone: CUSTOMER.phone, address: CUSTOMER.address },
    items.map((i) => ({ brand: i.brand, name: i.name, quantity: 1, price_usd: i.price_usd }))
  );
  await sql`
    update orders set invoice_pdf = ${pdf.toString("base64")}, updated_at = now()
    where id = ${order.id}
  `;

  for (const it of items) console.log(`    ${it.brand} — ${it.name} — $${it.price_usd}`);
  console.log(`OK  ${order.order_number} — ${CUSTOMER.full_name} — $${totalUsd} — COD confirmed — invoice stored`);
}

main().catch((err) => {
  console.error("Order creation failed:", err);
  process.exit(1);
});
