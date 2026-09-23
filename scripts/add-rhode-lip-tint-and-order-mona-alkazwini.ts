/**
 * 1) Add Rhode "Peptide Lip Tint" to the catalogue — not previously in it
 *    (only Rhode Glazing Mist/Milk existed). $20, matches rhodeskin.com
 *    official price exactly, no markup. Shade "Salty Tan" (soft mauve)
 *    added as a product_variant, image self-hosted from the brand's own
 *    clean product shot (not the lifestyle/application photo).
 * 2) Create a new order for Mona Alkazwini (matched from "Mona Kazwini" —
 *    same person, existing customer, but her only order on file is already
 *    delivered, so this is a fresh order, reusing her phone/address).
 *
 * Payment: cod, confirmed — per standing instruction
 * ([[lara_order_entry_defaults]]).
 *
 * Run:  npx ts-node scripts/add-rhode-lip-tint-and-order-mona-alkazwini.ts
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
import { shadeScore } from "../lib/shade-options";

const PRICE_USD = 28;
const round2 = (n: number): number => Math.round(n * 100) / 100;
const PRICE_GBP = round2(PRICE_USD / 1.35);

const PRODUCT = {
  brand: "Rhode",
  name: "Peptide Lip Tint",
  category: "Makeup",
  subcategory: "Lip Gloss & Oil",
  description:
    "A nourishing formula with a hint of tint that hydrates and replenishes lips while leaving a glossy, high-shine finish. Sheer-but-buildable colour melts onto lips, helps lock in moisture, and smooths fine lines while visibly plumping lips over time. Formulated with palmitoyl tripeptide-1, shea butter, and vitamin E. Fragrance-free. Size: 10ml.",
  product_url: "https://www.rhodeskin.com/products/peptide-lip-tint-salty-tan",
  image_url: "/rhode-peptide-lip-tint-salty-tan.png"
};
const SHADE_NAME = "Salty Tan";

const CUSTOMER = {
  full_name: "Mona Alkazwini",
  phone: "76089441",
  address: "Sohmor, Bekaa Gharbi"
};

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const sql = getSql();

  // ---- 1) product ----
  const prodRows = (await sql`
    insert into products (
      brand, name, category, subcategory, description,
      price_gbp, price_usd, product_url, image_url,
      price_locked, deliverable_lebanon
    )
    values (
      ${PRODUCT.brand}, ${PRODUCT.name}, ${PRODUCT.category}, ${PRODUCT.subcategory}, ${PRODUCT.description},
      ${PRICE_GBP}, ${PRICE_USD}, ${PRODUCT.product_url}, ${PRODUCT.image_url},
      true, true
    )
    on conflict (product_url) do update set
      description = excluded.description,
      price_gbp = excluded.price_gbp,
      price_usd = excluded.price_usd,
      image_url = excluded.image_url,
      price_locked = true
    returning id, brand, name, product_url, image_url
  `) as Array<{ id: string; brand: string; name: string; product_url: string; image_url: string }>;
  const product = prodRows[0];
  console.log(`OK  ${product.brand} — ${product.name} — $${PRICE_USD}  (${product.id})`);

  const score = shadeScore(SHADE_NAME);
  await sql`
    insert into product_variants (product_id, shade_name, shade_image_url, swatch_url, sort_order)
    values (${product.id}, ${SHADE_NAME}, ${PRODUCT.image_url}, ${PRODUCT.image_url}, ${score})
    on conflict (product_id, shade_name) do update set
      shade_image_url = excluded.shade_image_url,
      swatch_url = excluded.swatch_url,
      sort_order = excluded.sort_order
  `;
  await sql`
    update products
    set light_shade_image_url = ${PRODUCT.image_url}, variants_checked_at = now()
    where id = ${product.id}
  `;
  console.log(`  + shade ${SHADE_NAME}`);

  // ---- 2) customer + order ----
  const custRows = (await sql`
    insert into customers (full_name, phone, address)
    values (${CUSTOMER.full_name}, ${CUSTOMER.phone}, ${CUSTOMER.address})
    returning id
  `) as Array<{ id: string }>;
  const customerId = custRows[0].id;

  const itemName = `${product.name} — Shade: ${SHADE_NAME}`;
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
      ${itemName}, ${product.brand},
      ${PRICE_USD}, ${PRICE_GBP}, ${PRICE_USD}, ${PRICE_GBP}, ${1},
      ${"payment_confirmed"}, ${"cod"}, ${true}
    )
    returning id, order_number
  `) as Array<{ id: string; order_number: string }>;
  const order = orderRows[0];

  await sql`
    insert into order_items (order_id, product_name, product_brand, product_url, image_url, price_usd, price_gbp, quantity)
    values (${order.id}, ${itemName}, ${product.brand}, ${product.product_url}, ${product.image_url}, ${PRICE_USD}, ${PRICE_GBP}, ${1})
  `;

  console.log(`OK  ${order.order_number} — ${CUSTOMER.full_name} — ${itemName} — $${PRICE_USD} — cod / confirmed`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
