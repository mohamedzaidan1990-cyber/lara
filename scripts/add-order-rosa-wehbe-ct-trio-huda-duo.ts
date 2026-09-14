/**
 * One-off manual order for customer Rosa Wehbe (her 4th order):
 *  - 1x Charlotte Tilbury Unreal Blush + Glow Mini Trio       ($60)
 *      — not in the catalogue, sourced already at cost $39 (vendor unspecified)
 *  - 1x Huda Beauty Easy Bake Duo Loose Powder 6.5g            ($55)
 *      — matches the existing catalogue row exactly, not yet sourced
 *
 * Payment/status unspecified by the user — created as pending / unconfirmed.
 * Update via the admin dashboard once payment is confirmed.
 *
 * Run:  npx ts-node scripts/add-order-rosa-wehbe-ct-trio-huda-duo.ts
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
  address: "Beirut ramlet bayda"
};

const SOURCE = "instagram";

const ITEMS = [
  {
    brand: "Charlotte Tilbury",
    name: "Unreal Blush + Glow Mini Trio",
    price_usd: 60,
    price_gbp: 60 / 1.3,
    product_url: null as string | null,
    image_url: null as string | null,
    vendor: null as string | null,
    cost_usd: 39,
    cost_gbp: 39 / 1.3,
    sourced: true
  }
  // Huda item is looked up from the catalogue below.
];

const HUDA_PRODUCT_URL = "https://www.selfridges.com/GB/en/product/huda-beauty-easy-bake-duo-loose-powder-65g_R04537837/";

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  await ensureSchema();
  const sql = getSql();

  const hudaRows = (await sql`
    select brand, name, price_usd, price_gbp, product_url, image_url
    from products where product_url = ${HUDA_PRODUCT_URL} limit 1
  `) as Array<{ brand: string; name: string; price_usd: string; price_gbp: string; product_url: string | null; image_url: string | null }>;
  if (!hudaRows.length) {
    console.error("Huda product not found in catalogue.");
    process.exit(1);
  }
  const huda = hudaRows[0];

  const items = [
    ...ITEMS,
    {
      brand: huda.brand,
      name: huda.name,
      price_usd: Number(huda.price_usd),
      price_gbp: Number(huda.price_gbp),
      product_url: huda.product_url,
      image_url: huda.image_url,
      vendor: null as string | null,
      cost_usd: null as number | null,
      cost_gbp: null as number | null,
      sourced: false
    }
  ];

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
      status, payment_confirmed, source
    )
    values (
      ${orderNumber}, ${customerId}, ${null},
      ${items.length + " items"}, ${"Multiple brands"},
      ${totalUsd}, ${totalGbp}, ${totalUsd}, ${totalGbp}, ${items.length},
      ${"pending"}, ${false}, ${SOURCE}
    )
    returning id, order_number
  `) as Array<{ id: string; order_number: string }>;
  const order = orderRows[0];

  for (const it of items) {
    await sql`
      insert into order_items (
        order_id, product_name, product_brand, product_url, image_url,
        price_usd, price_gbp, quantity, vendor, cost_usd, cost_gbp, sourced
      )
      values (
        ${order.id}, ${it.name}, ${it.brand}, ${it.product_url}, ${it.image_url},
        ${it.price_usd}, ${it.price_gbp}, ${1}, ${it.vendor}, ${it.cost_usd}, ${it.cost_gbp}, ${it.sourced}
      )
    `;
    console.log(`  + ${it.brand} — ${it.name} ($${it.price_usd})${it.sourced ? ` [sourced, cost $${it.cost_usd}]` : ""}`);
  }

  console.log(`OK  ${order.order_number} — ${CUSTOMER.full_name} — $${totalUsd} total — pending / unconfirmed`);
}

main().catch((err) => {
  console.error("Order creation failed:", err);
  process.exit(1);
});
