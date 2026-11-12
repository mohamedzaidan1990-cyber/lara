/**
 * Adds Gisou Glazed Cherry Honey Infused Hair & Body Mist 100ml ($40, price
 * locked — not on Selfridges; image cropped from the client's screenshot) and
 * places a new order for Rayan World (new customer):
 *   - Gisou Glazed Cherry Hair & Body Mist 100ml — $40
 *   - Gisou Honey Glaze Collagen Therapy Lip Mask 15g, Cherry Chocolate — $41 (catalogue)
 * Payment: cod, confirmed, PART-PAID $45 of $81 (user: "she paid 45$ already").
 *
 * Run:  npx tsx scripts/add-order-rayan-world-gisou.ts
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

const NEW_PRODUCT = {
  brand: "Gisou",
  name: "Glazed Cherry Honey Infused Hair & Body Mist 100ml",
  category: "Fragrance",
  price_usd: 40,
  price_gbp: Math.round((40 / (1.35 * 1.2)) * 100) / 100,
  product_url: "https://www.sephora.com/brand/gisou#glazed-cherry-honey-infused-hair-body-mist-100ml",
  image_url: "/gisou-glazed-cherry-hair-body-mist-100ml.webp"
};
const LIP_MASK_ID = "bf6c8fec-49da-49e3-b556-17d4bfcd0c6b"; // Gisou Honey Glaze Collagen Therapy Lip Mask 15g (no variants)

const CUSTOMER = { full_name: "Rayan World", phone: "79009241", address: "Beirut" };
const AMOUNT_PAID_USD = 45;

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  await ensureSchema();
  const sql = getSql();
  const p = NEW_PRODUCT;

  const mask = (await sql`select brand, name, price_usd, price_gbp, product_url, image_url from products where id = ${LIP_MASK_ID} and not archived`) as Array<{
    brand: string; name: string; price_usd: string; price_gbp: string; product_url: string; image_url: string;
  }>;
  if (!mask.length) {
    console.error("Lip mask not found — aborting, nothing changed.");
    process.exit(1);
  }

  await sql`
    insert into products (brand, name, category, price_gbp, price_usd, deliverable_lebanon, product_url, image_url, price_locked)
    values (${p.brand}, ${p.name}, ${p.category}, ${p.price_gbp}, ${p.price_usd}, true, ${p.product_url}, ${p.image_url}, true)
    on conflict (product_url) do update set
      price_gbp = excluded.price_gbp, price_usd = excluded.price_usd, image_url = excluded.image_url, price_locked = true, archived = false
  `;

  const lines = [
    { brand: p.brand, itemName: p.name, product_url: p.product_url, image: p.image_url, price_usd: p.price_usd, price_gbp: p.price_gbp },
    { brand: mask[0].brand, itemName: `${mask[0].name} — Shade: Cherry Chocolate`, product_url: mask[0].product_url, image: mask[0].image_url,
      price_usd: Number(mask[0].price_usd), price_gbp: Number(mask[0].price_gbp) }
  ];

  const existing = (await sql`select id from customers where phone_norm = ${CUSTOMER.phone}`) as Array<{ id: string }>;
  const customerId = existing.length
    ? existing[0].id
    : ((await sql`
        insert into customers (full_name, phone, address)
        values (${CUSTOMER.full_name}, ${CUSTOMER.phone}, ${CUSTOMER.address})
        returning id
      `) as Array<{ id: string }>)[0].id;

  const round2 = (n: number): number => Math.round(n * 100) / 100;
  const totalUsd = round2(lines.reduce((s, l) => s + l.price_usd, 0));
  const totalGbp = round2(lines.reduce((s, l) => s + l.price_gbp, 0));
  const order = ((await sql`
    insert into orders (
      order_number, customer_id, customer_email, product_name, product_brand,
      price_usd, price_gbp, total_usd, total_gbp, items_count,
      status, payment_method, payment_confirmed, amount_paid_usd
    )
    values (
      ${generateOrderNumber()}, ${customerId}, ${null}, ${lines.length + " items"}, ${"Gisou"},
      ${totalUsd}, ${totalGbp}, ${totalUsd}, ${totalGbp}, ${lines.length},
      ${"payment_confirmed"}, ${"cod"}, ${true}, ${AMOUNT_PAID_USD}
    )
    returning id, order_number
  `) as Array<{ id: string; order_number: string }>)[0];

  for (const l of lines) {
    await sql`
      insert into order_items (order_id, product_name, product_brand, product_url, image_url, price_usd, price_gbp, quantity, sourced, in_lebanon)
      values (${order.id}, ${l.itemName}, ${l.brand}, ${l.product_url}, ${l.image}, ${l.price_usd}, ${l.price_gbp}, ${1}, false, false)
    `;
    console.log(`  + ${l.brand} — ${l.itemName} — $${l.price_usd}`);
  }

  const c = ((await sql`
    select o.status, o.total_usd, o.amount_paid_usd, cu.full_name, (select count(*) from order_items where order_id = o.id) as n
    from orders o join customers cu on cu.id = o.customer_id where o.id = ${order.id}
  `) as Array<{ status: string; total_usd: string; amount_paid_usd: string; full_name: string; n: string }>)[0];
  console.log(`OK  ${order.order_number} — ${c.full_name} — ${c.n} items — paid $${Number(c.amount_paid_usd)} of $${Number(c.total_usd)} — cod / ${c.status}`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
