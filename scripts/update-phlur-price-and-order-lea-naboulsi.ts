/**
 * 1) Reprice Phlur Vanilla Skin hair and body fragrance mist 90ml
 *    (c41a1946-c2db-48d1-8d3e-a17fb9e3774c) to $34, price_locked.
 * 2) Create a NEW order for Lea Naboulsi — her only existing order
 *    (SBB-924890) is already delivered, so this is a separate order, not
 *    an addition to it. Reuses her existing phone/address.
 *      - Phlur Vanilla Skin mist 90ml (repriced above)
 *      - Kiehl's Creamy Eye Treatment with Avocado 14ml (existing product,
 *        777612e3-88ba-4009-ba55-b23e91c63410)
 *    Payment: cod, confirmed — per standing instruction
 *    ([[lara_order_entry_defaults]]).
 *
 * Run:  npx ts-node scripts/update-phlur-price-and-order-lea-naboulsi.ts
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

const PHLUR_ID = "c41a1946-c2db-48d1-8d3e-a17fb9e3774c";
const PHLUR_USD = 34;
const PHLUR_GBP = Math.round((PHLUR_USD / 1.35) * 100) / 100;

const KIEHLS_ID = "777612e3-88ba-4009-ba55-b23e91c63410";

const CUSTOMER = {
  full_name: "Lea Naboulsi",
  phone: "70854002",
  address: "اخر شارع الجاموس طلعة مدارس المهدي مفرق سوبرماركت ابو امير بناية البيت السعيد رقم ٦ طابق اول"
};

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const sql = getSql();

  // ---- 1) reprice Phlur ----
  const phlurRows = (await sql`
    update products
    set price_usd = ${PHLUR_USD}, price_gbp = ${PHLUR_GBP}, price_locked = true
    where id = ${PHLUR_ID}
    returning id, brand, name, price_usd, price_gbp, product_url, image_url
  `) as Array<{ id: string; brand: string; name: string; price_usd: string; price_gbp: string; product_url: string; image_url: string }>;
  if (!phlurRows.length) {
    console.error("Phlur product not found.");
    process.exit(1);
  }
  const phlur = phlurRows[0];
  console.log(`OK  ${phlur.brand} — ${phlur.name} -> $${phlur.price_usd}`);

  // ---- look up Kiehl's ----
  const kiehlsRows = (await sql`
    select id, brand, name, price_usd, price_gbp, product_url, image_url
    from products where id = ${KIEHLS_ID}
  `) as Array<{ id: string; brand: string; name: string; price_usd: string; price_gbp: string; product_url: string; image_url: string }>;
  if (!kiehlsRows.length) {
    console.error("Kiehl's product not found.");
    process.exit(1);
  }
  const kiehls = kiehlsRows[0];

  const items = [
    {
      brand: phlur.brand,
      name: phlur.name,
      price_usd: Number(phlur.price_usd),
      price_gbp: Number(phlur.price_gbp),
      product_url: phlur.product_url,
      image_url: phlur.image_url
    },
    {
      brand: kiehls.brand,
      name: kiehls.name,
      price_usd: Number(kiehls.price_usd),
      price_gbp: Number(kiehls.price_gbp),
      product_url: kiehls.product_url,
      image_url: kiehls.image_url
    }
  ];

  // ---- 2) customer + order ----
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
      status, payment_method, payment_confirmed
    )
    values (
      ${orderNumber}, ${customerId}, ${null},
      ${items.length + " items"}, ${"Multiple brands"},
      ${totalUsd}, ${totalGbp}, ${totalUsd}, ${totalGbp}, ${items.length},
      ${"payment_confirmed"}, ${"cod"}, ${true}
    )
    returning id, order_number
  `) as Array<{ id: string; order_number: string }>;
  const order = orderRows[0];

  for (const it of items) {
    await sql`
      insert into order_items (order_id, product_name, product_brand, product_url, image_url, price_usd, price_gbp, quantity)
      values (${order.id}, ${it.name}, ${it.brand}, ${it.product_url}, ${it.image_url}, ${it.price_usd}, ${it.price_gbp}, ${1})
    `;
    console.log(`  + ${it.brand} — ${it.name} ($${it.price_usd})`);
  }

  console.log(`OK  ${order.order_number} — ${CUSTOMER.full_name} — $${totalUsd} — cod / confirmed`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
