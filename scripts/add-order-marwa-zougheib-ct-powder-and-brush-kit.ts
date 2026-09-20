/**
 * Add the Charlotte Tilbury "Powder & Brush Kit" to the catalogue at $130 and
 * create a manual order (Instagram) for new client Marwa Zougheib.
 *  - 1x Charlotte Tilbury Powder & Brush Kit @ $130 (price set by the user)
 *  - Payment: COD, order confirmed (payment_confirmed = true, status
 *    payment_confirmed) — the default for every manual order.
 *  - Generates the invoice PDF with lib/invoice.ts and stores it on the order
 *    (invoice_pdf). Nothing is emailed or WhatsApped; no PDF file is written.
 *
 * The product image was cropped from the user's screenshot of the
 * charlottetilbury.com product page and is self-hosted in public/.
 *
 * Run:  npx ts-node scripts/add-order-marwa-zougheib-ct-powder-and-brush-kit.ts
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

const PRICE_USD = 130;
const PRICE_GBP = Math.round((PRICE_USD / 1.3) * 100) / 100;

const PRODUCT = {
  brand: "Charlotte Tilbury",
  name: "Powder & Brush Kit",
  category: "Makeup",
  // Internal key (no retailer page to link) — same convention as other
  // products added without a source URL.
  product_url: "https://seasonsbyb.co.uk/p/charlotte-tilbury-powder-and-brush-kit",
  image_url: "/charlotte-tilbury-powder-and-brush-kit.jpg",
  description:
    "A Charlotte Tilbury powder and brush kit: a pressed setting powder in a rose-gold compact, with the Powder & Sculpt Brush in Rose Gold & Night Crimson."
};

const CUSTOMER = {
  full_name: "Marwa Zougheib",
  phone: "71283480",
  address: "Tayyouneh"
};

const SOURCE = "instagram";
const PAYMENT_METHOD = "cod";
const NOTES = "Cash on delivery. No email on file.";

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
    console.error("Marwa Zougheib already exists as a client — aborting to avoid a duplicate order.");
    process.exit(1);
  }

  // 1. Product
  const prodRows = (await sql`
    insert into products (
      brand, name, category, price_gbp, price_usd, deliverable_lebanon,
      product_url, image_url, images, description, price_locked
    )
    values (
      ${PRODUCT.brand}, ${PRODUCT.name}, ${PRODUCT.category}, ${PRICE_GBP}, ${PRICE_USD}, true,
      ${PRODUCT.product_url}, ${PRODUCT.image_url}, ${JSON.stringify([PRODUCT.image_url])}::jsonb,
      ${PRODUCT.description}, true
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
      description = excluded.description,
      price_locked = true,
      archived = false,
      scraped_at = now()
    returning id
  `) as Array<{ id: string }>;
  console.log(`OK  product ${prodRows[0].id}  ${PRODUCT.brand} — ${PRODUCT.name} — $${PRICE_USD}`);

  // 2. Client
  const custRows = (await sql`
    insert into customers (full_name, phone, address)
    values (${CUSTOMER.full_name}, ${CUSTOMER.phone}, ${CUSTOMER.address})
    returning id
  `) as Array<{ id: string }>;
  const customerId = custRows[0].id;

  // 3. Order + item
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
      ${PRODUCT.name}, ${PRODUCT.brand},
      ${PRICE_USD}, ${PRICE_GBP}, ${PRICE_USD}, ${PRICE_GBP}, ${1},
      ${"payment_confirmed"}, ${PAYMENT_METHOD}, ${true}, ${NOTES}, ${SOURCE}
    )
    returning id, order_number, created_at
  `) as Array<{ id: string; order_number: string; created_at: string }>;
  const order = orderRows[0];

  await sql`
    insert into order_items (
      order_id, product_name, product_brand, product_url, image_url,
      price_usd, price_gbp, quantity
    )
    values (
      ${order.id}, ${PRODUCT.name}, ${PRODUCT.brand}, ${PRODUCT.product_url}, ${PRODUCT.image_url},
      ${PRICE_USD}, ${PRICE_GBP}, ${1}
    )
  `;

  // 4. Invoice (stored on the order; not sent)
  const pdf = generateInvoice(
    {
      order_number: order.order_number,
      created_at: order.created_at,
      payment_confirmed: true,
      payment_method: PAYMENT_METHOD,
      total_usd: PRICE_USD
    },
    { full_name: CUSTOMER.full_name, email: "", phone: CUSTOMER.phone, address: CUSTOMER.address },
    [{ brand: PRODUCT.brand, name: PRODUCT.name, quantity: 1, price_usd: PRICE_USD }]
  );
  await sql`
    update orders set invoice_pdf = ${pdf.toString("base64")}, updated_at = now()
    where id = ${order.id}
  `;

  console.log(`OK  ${order.order_number} — ${CUSTOMER.full_name} — $${PRICE_USD} — COD confirmed — invoice stored`);
}

main().catch((err) => {
  console.error("Order creation failed:", err);
  process.exit(1);
});
