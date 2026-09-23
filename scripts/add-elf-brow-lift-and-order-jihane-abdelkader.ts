/**
 * 1) Add e.l.f. Cosmetics "Brow Lift - Clear" — $16 (user-given price, no
 *    markup). Image supplied locally by the user.
 * 2) Create an order for customer Jihane AbdelKader: 2x Brow Lift - Clear.
 *    Payment: cod, confirmed — per standing instruction
 *    ([[lara_order_entry_defaults]]).
 *
 * Run:  npx ts-node scripts/add-elf-brow-lift-and-order-jihane-abdelkader.ts
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
const ELF_PRICE_GBP = Math.round((ELF_PRICE_USD / 1.35) * 100) / 100;

const ELF_PRODUCT = {
  brand: "e.l.f. Cosmetics",
  name: "Brow Lift - Clear",
  category: "Makeup",
  subcategory: "Brows",
  product_url: "https://www.elfcosmetics.com/products/brow-lift",
  image_url: "/elf-cosmetics-brow-lift-clear.jpg"
};

const QUANTITY = 2;

const CUSTOMER = {
  full_name: "Jihane AbdelKader",
  phone: "03015011",
  address: "Mansourieh Autostrade Jdid, after Abed Tahan Centre, Maydaa, 1st floor"
};

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  await ensureSchema();
  const sql = getSql();

  // ---- 1) e.l.f. Brow Lift - Clear ----
  const elfRows = (await sql`
    insert into products (
      brand, name, category, subcategory, price_gbp, price_usd, deliverable_lebanon,
      product_url, image_url, images, price_locked
    )
    values (
      ${ELF_PRODUCT.brand}, ${ELF_PRODUCT.name}, ${ELF_PRODUCT.category}, ${ELF_PRODUCT.subcategory},
      ${ELF_PRICE_GBP}, ${ELF_PRICE_USD}, true,
      ${ELF_PRODUCT.product_url}, ${ELF_PRODUCT.image_url}, ${JSON.stringify([ELF_PRODUCT.image_url])}::jsonb, true
    )
    on conflict (product_url) do update set
      brand = excluded.brand,
      name = excluded.name,
      category = excluded.category,
      subcategory = excluded.subcategory,
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

  // ---- 2) customer + order ----
  const custRows = (await sql`
    insert into customers (full_name, phone, address)
    values (${CUSTOMER.full_name}, ${CUSTOMER.phone}, ${CUSTOMER.address})
    returning id
  `) as Array<{ id: string }>;
  const customerId = custRows[0].id;

  const priceUsd = Number(elf.price_usd);
  const priceGbp = Number(elf.price_gbp);
  const totalUsd = priceUsd * QUANTITY;
  const totalGbp = priceGbp * QUANTITY;
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
      ${elf.name}, ${elf.brand},
      ${totalUsd}, ${totalGbp}, ${totalUsd}, ${totalGbp}, ${QUANTITY},
      ${"payment_confirmed"}, ${"cod"}, ${true}
    )
    returning id, order_number
  `) as Array<{ id: string; order_number: string }>;
  const order = orderRows[0];

  await sql`
    insert into order_items (order_id, product_name, product_brand, product_url, image_url, price_usd, price_gbp, quantity)
    values (${order.id}, ${elf.name}, ${elf.brand}, ${elf.product_url}, ${elf.image_url}, ${priceUsd}, ${priceGbp}, ${QUANTITY})
  `;

  console.log(`OK  ${order.order_number} — ${CUSTOMER.full_name} — ${QUANTITY}x ${elf.name} — $${totalUsd} — cod / confirmed`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
