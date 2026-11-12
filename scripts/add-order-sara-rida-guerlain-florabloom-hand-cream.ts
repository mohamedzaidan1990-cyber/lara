/**
 * Adds Guerlain Aqua Allegoria Florabloom Hand Cream 50ml ($75 per the user's
 * quote, price locked — not on Selfridges; official image via John Lewis) and
 * places a new order for Sara Rida (new customer; address not given yet — TBC).
 * Payment: cod, confirmed — per standing instruction ([[lara_order_entry_defaults]]).
 *
 * Run:  npx tsx scripts/add-order-sara-rida-guerlain-florabloom-hand-cream.ts
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

const PRODUCT = {
  brand: "Guerlain",
  name: "Aqua Allegoria Florabloom Hand Cream 50ml",
  category: "Skincare",
  subcategory: "Body & Hand",
  price_usd: 75,
  price_gbp: Math.round((75 / (1.35 * 1.1)) * 100) / 100, // back-computed from the $75 at the 10% ($50+) markup
  product_url: "https://www.johnlewis.com/guerlain-aqua-allegoria-florabloom-hand-cream-50ml/p114233115",
  image_url: "/guerlain-aqua-allegoria-florabloom-hand-cream-50ml.webp"
};

const CUSTOMER = { full_name: "Sara Rida", phone: "76581788", address: "TBC" };

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  await ensureSchema();
  const sql = getSql();
  const p = PRODUCT;

  const prod = (await sql`
    insert into products (brand, name, category, subcategory, price_gbp, price_usd, deliverable_lebanon, product_url, image_url, price_locked)
    values (${p.brand}, ${p.name}, ${p.category}, ${p.subcategory}, ${p.price_gbp}, ${p.price_usd}, true, ${p.product_url}, ${p.image_url}, true)
    on conflict (product_url) do update set
      price_gbp = excluded.price_gbp, price_usd = excluded.price_usd, image_url = excluded.image_url,
      price_locked = true, archived = false
    returning id, archived
  `) as Array<{ id: string; archived: boolean }>;
  console.log(`  product ${prod[0].id} — ${p.brand} — ${p.name} — $${p.price_usd}${prod[0].archived ? " (ARCHIVED by hidden-brand trigger!)" : ""}`);

  const existing = (await sql`select id from customers where phone_norm = ${CUSTOMER.phone}`) as Array<{ id: string }>;
  const customerId = existing.length
    ? existing[0].id
    : ((await sql`
        insert into customers (full_name, phone, address)
        values (${CUSTOMER.full_name}, ${CUSTOMER.phone}, ${CUSTOMER.address})
        returning id
      `) as Array<{ id: string }>)[0].id;

  const orderNumber = generateOrderNumber();
  const order = ((await sql`
    insert into orders (
      order_number, customer_id, customer_email, product_name, product_brand, product_url,
      price_usd, price_gbp, total_usd, total_gbp, items_count,
      status, payment_method, payment_confirmed
    )
    values (
      ${orderNumber}, ${customerId}, ${null}, ${p.name}, ${p.brand}, ${p.product_url},
      ${p.price_usd}, ${p.price_gbp}, ${p.price_usd}, ${p.price_gbp}, ${1},
      ${"payment_confirmed"}, ${"cod"}, ${true}
    )
    returning id, order_number
  `) as Array<{ id: string; order_number: string }>)[0];

  await sql`
    insert into order_items (order_id, product_name, product_brand, product_url, image_url, price_usd, price_gbp, quantity, sourced, in_lebanon)
    values (${order.id}, ${p.name}, ${p.brand}, ${p.product_url}, ${p.image_url}, ${p.price_usd}, ${p.price_gbp}, ${1}, false, false)
  `;

  const check = (await sql`
    select o.status, o.payment_method, o.total_usd, c.full_name, c.phone_norm, (select count(*) from order_items where order_id = o.id) as n
    from orders o join customers c on c.id = o.customer_id where o.id = ${order.id}
  `) as Array<{ status: string; payment_method: string; total_usd: string; full_name: string; phone_norm: string; n: string }>;
  const c = check[0];
  console.log(`OK  ${order.order_number} — ${c.full_name} (${c.phone_norm}) — ${c.n} item — $${Number(c.total_usd)} — ${c.payment_method} / ${c.status}`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
