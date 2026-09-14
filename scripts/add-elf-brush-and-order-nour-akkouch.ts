/**
 * 1) Add e.l.f. Cosmetics "Camo Liquid Blush Brush" — $16 (user-given price,
 *    no markup). Image supplied locally by the user (cropped, no shade
 *    picker needed — single item).
 * 2) Create an order for customer Nour Akkouch:
 *      - Patrick Ta Major Headlines Double-Take Crème & Powder Blush Duo
 *        — shade "Not Too Much — soft rosey taupe" (existing product +
 *        variant, matched exactly)
 *      - e.l.f. Camo Liquid Blush Brush
 *    Phone is WhatsApp-only (noted on the order). Payment: cod, confirmed —
 *    per standing instruction ([[lara_order_entry_defaults]]).
 *
 * Run:  npx ts-node scripts/add-elf-brush-and-order-nour-akkouch.ts
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

const ELF_PRICE_USD = 16;
const ELF_PRICE_GBP = Math.round((ELF_PRICE_USD / 1.3) * 100) / 100;

const ELF_PRODUCT = {
  brand: "e.l.f. Cosmetics",
  name: "Camo Liquid Blush Brush",
  category: "Beauty tools",
  product_url: "https://www.elfcosmetics.com/products/liquid-blush-brush",
  image_url: "/elf-camo-liquid-blush-brush.jpg"
};

const PATRICK_TA_PRODUCT_ID = "65d89933-1be2-4347-804e-6578d72a6b1f";
const PATRICK_TA_SHADE = "Not Too Much — soft rosey taupe";

const CUSTOMER = {
  full_name: "Nour Akkouch",
  phone: "002250709755151",
  address: "Kharayeb Jnoub"
};
const NOTES = "Number is WhatsApp only.";
const SOURCE = "instagram";

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  await ensureSchema();
  const sql = getSql();

  // ---- 1) e.l.f. brush ----
  const elfRows = (await sql`
    insert into products (
      brand, name, category, price_gbp, price_usd, deliverable_lebanon,
      product_url, image_url, images, price_locked
    )
    values (
      ${ELF_PRODUCT.brand}, ${ELF_PRODUCT.name}, ${ELF_PRODUCT.category}, ${ELF_PRICE_GBP}, ${ELF_PRICE_USD}, true,
      ${ELF_PRODUCT.product_url}, ${ELF_PRODUCT.image_url}, ${JSON.stringify([ELF_PRODUCT.image_url])}::jsonb, true
    )
    on conflict (product_url) do update set
      brand = excluded.brand,
      name = excluded.name,
      category = excluded.category,
      price_gbp = excluded.price_gbp,
      price_usd = excluded.price_usd,
      deliverable_lebanon = true,
      image_url = excluded.image_url,
      images = excluded.images,
      price_locked = true,
      scraped_at = now()
    returning id, brand, name, price_usd, price_gbp, product_url, image_url
  `) as Array<{ id: string; brand: string; name: string; price_usd: string; price_gbp: string; product_url: string; image_url: string }>;
  const elf = elfRows[0];
  console.log(`OK  ${elf.brand} — ${elf.name} — $${elf.price_usd}  (${elf.id})`);

  // ---- Look up the Patrick Ta shade ----
  const ptRows = (await sql`
    select p.brand, p.name, p.price_usd, p.price_gbp, p.product_url, v.shade_image_url
    from products p
    join product_variants v on v.product_id = p.id
    where p.id = ${PATRICK_TA_PRODUCT_ID} and v.shade_name = ${PATRICK_TA_SHADE}
    limit 1
  `) as Array<{ brand: string; name: string; price_usd: string; price_gbp: string; product_url: string; shade_image_url: string | null }>;
  if (!ptRows.length) {
    console.error(`Patrick Ta shade not found: ${PATRICK_TA_SHADE}`);
    process.exit(1);
  }
  const pt = ptRows[0];

  const items = [
    {
      brand: pt.brand,
      name: `${pt.name} — ${PATRICK_TA_SHADE}`,
      price_usd: Number(pt.price_usd),
      price_gbp: Number(pt.price_gbp),
      product_url: pt.product_url,
      image_url: pt.shade_image_url
    },
    {
      brand: elf.brand,
      name: elf.name,
      price_usd: Number(elf.price_usd),
      price_gbp: Number(elf.price_gbp),
      product_url: elf.product_url,
      image_url: elf.image_url
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
      status, payment_method, payment_confirmed, notes, source
    )
    values (
      ${orderNumber}, ${customerId}, ${null},
      ${items.length + " items"}, ${"Multiple brands"},
      ${totalUsd}, ${totalGbp}, ${totalUsd}, ${totalGbp}, ${items.length},
      ${"payment_confirmed"}, ${"cod"}, ${true}, ${NOTES}, ${SOURCE}
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
