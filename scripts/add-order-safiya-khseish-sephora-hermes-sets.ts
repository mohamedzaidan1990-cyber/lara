/**
 * Adds two manual fragrance sets (prices locked, images cropped from the
 * client's story screenshots — neither is on Selfridges) and places a new
 * order for Safiya Khseish (new customer):
 *   - Sephora Favorites Deluxe Perfume Sampler set — $150
 *   - Hermes miniatures fragrance gift set (Eau des Merveilles, Twilly
 *     d'Hermes, Un Jardin sur le Nil + 1) — $100
 * Payment: cod, confirmed, PART-PAID $150 of $250 (user: "she paid already 150$").
 *
 * Run:  npx tsx scripts/add-order-safiya-khseish-sephora-hermes-sets.ts
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

const gbp = (usd: number): number => Math.round((usd / (1.35 * 1.2)) * 100) / 100; // fragrance markup

const PRODUCTS = [
  {
    brand: "Sephora Favorites",
    name: "Deluxe Perfume Sampler Set",
    subcategory: "Gift Sets",
    price_usd: 150,
    product_url: "https://www.sephora.com/brand/sephora-favorites#deluxe-perfume-sampler-set",
    image_url: "/sephora-favorites-deluxe-perfume-sampler.webp"
  },
  {
    brand: "Hermes",
    name: "Miniatures fragrance gift set (Eau des Merveilles, Twilly d'Hermès, Un Jardin sur le Nil & more)",
    subcategory: "Gift Sets",
    price_usd: 100,
    product_url: "https://www.selfridges.com/GB/en/cat/hermes/#miniatures-fragrance-gift-set",
    image_url: "/hermes-miniatures-fragrance-gift-set.webp"
  }
];

const CUSTOMER = {
  full_name: "Safiya Khseish",
  phone: "71623323",
  address: "Bir Hassan, facing the Iranian Embassy, Bineyet Matar 707, 6th floor"
};
const AMOUNT_PAID_USD = 150;

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  await ensureSchema();
  const sql = getSql();

  const lines = [];
  for (const p of PRODUCTS) {
    const r = (await sql`
      insert into products (brand, name, category, subcategory, price_gbp, price_usd, deliverable_lebanon, product_url, image_url, price_locked)
      values (${p.brand}, ${p.name}, ${"Fragrance"}, ${p.subcategory}, ${gbp(p.price_usd)}, ${p.price_usd}, true, ${p.product_url}, ${p.image_url}, true)
      on conflict (product_url) do update set
        price_gbp = excluded.price_gbp, price_usd = excluded.price_usd, image_url = excluded.image_url,
        price_locked = true, archived = false
      returning id, archived
    `) as Array<{ id: string; archived: boolean }>;
    console.log(`  product ${r[0].id} — ${p.brand} — ${p.name} — $${p.price_usd}${r[0].archived ? " (ARCHIVED!)" : ""}`);
    lines.push({ ...p, price_gbp: gbp(p.price_usd) });
  }

  const existing = (await sql`select id from customers where phone_norm = ${CUSTOMER.phone}`) as Array<{ id: string }>;
  const customerId = existing.length
    ? existing[0].id
    : ((await sql`
        insert into customers (full_name, phone, address)
        values (${CUSTOMER.full_name}, ${CUSTOMER.phone}, ${CUSTOMER.address})
        returning id
      `) as Array<{ id: string }>)[0].id;

  const totalUsd = lines.reduce((s, l) => s + l.price_usd, 0);
  const totalGbp = Math.round(lines.reduce((s, l) => s + l.price_gbp, 0) * 100) / 100;
  const order = ((await sql`
    insert into orders (
      order_number, customer_id, customer_email, product_name, product_brand,
      price_usd, price_gbp, total_usd, total_gbp, items_count,
      status, payment_method, payment_confirmed, amount_paid_usd
    )
    values (
      ${generateOrderNumber()}, ${customerId}, ${null}, ${lines.length + " items"}, ${"Multiple brands"},
      ${totalUsd}, ${totalGbp}, ${totalUsd}, ${totalGbp}, ${lines.length},
      ${"payment_confirmed"}, ${"cod"}, ${true}, ${AMOUNT_PAID_USD}
    )
    returning id, order_number
  `) as Array<{ id: string; order_number: string }>)[0];

  for (const l of lines) {
    await sql`
      insert into order_items (order_id, product_name, product_brand, product_url, image_url, price_usd, price_gbp, quantity, sourced, in_lebanon)
      values (${order.id}, ${l.name}, ${l.brand}, ${l.product_url}, ${l.image_url}, ${l.price_usd}, ${l.price_gbp}, ${1}, false, false)
    `;
  }

  const c = ((await sql`
    select o.status, o.payment_method, o.total_usd, o.amount_paid_usd, cu.full_name, cu.phone_norm,
           (select count(*) from order_items where order_id = o.id) as n
    from orders o join customers cu on cu.id = o.customer_id where o.id = ${order.id}
  `) as Array<{ status: string; payment_method: string; total_usd: string; amount_paid_usd: string; full_name: string; phone_norm: string; n: string }>)[0];
  console.log(`OK  ${order.order_number} — ${c.full_name} (${c.phone_norm}) — ${c.n} items — paid $${Number(c.amount_paid_usd)} of $${Number(c.total_usd)} — ${c.payment_method} / ${c.status}`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
