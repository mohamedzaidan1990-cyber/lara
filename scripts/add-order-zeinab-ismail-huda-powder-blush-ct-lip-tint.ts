/**
 * One-off manual order (Instagram) for existing client Zeinab Ismail.
 *  - 1x Huda Beauty Easy Bake Duo Loose Powder 6.5g — Cherry Peach   @ catalogue price
 *  - 1x Huda Beauty Blush Filter 4.5ml — Cotton Candy               @ catalogue price
 *  - 1x Charlotte Tilbury Pillow Talk Blush Balm Lip Tint 2g
 *       — Pillow Talk Medium                                        @ 50% off (per user)
 *  - Payment: COD, order confirmed (payment_confirmed = true, status
 *    payment_confirmed) — the default for every manual order.
 *  - Reuses her existing customer record. Shades are appended to the base
 *    product's name on the order line (same convention as other orders), so no
 *    new catalogue rows are needed.
 *  - Generates the invoice PDF with lib/invoice.ts and stores it on the order
 *    (invoice_pdf). Nothing is emailed or WhatsApped; no PDF file is written.
 *
 * Run:  npx ts-node scripts/add-order-zeinab-ismail-huda-powder-blush-ct-lip-tint.ts
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

// Her customer record (created 2026-09-07, phone 70629918).
const CUSTOMER_ID = "0eca96df-4965-4780-91d7-526e3f1d2971";

const SOURCE = "instagram";
const PAYMENT_METHOD = "cod";

interface LineSpec {
  productId: string;
  // Appended to the base product's name on the order line.
  suffix: string;
  // 1 = catalogue price, 0.5 = half price.
  priceFactor: number;
}

const LINES: LineSpec[] = [
  { productId: "a37a42c8-4115-4604-bec7-5971068c72de", suffix: " — Shade: Cherry Peach", priceFactor: 1 },
  { productId: "f18171fb-010f-4ab8-90f3-6313d96b29a8", suffix: " — Colour: COTTON CANDY", priceFactor: 1 },
  { productId: "0677af42-b26a-4428-862f-8482563f735d", suffix: " — Shade: Pillow Talk Medium", priceFactor: 0.5 }
];

const round2 = (n: number): number => Math.round(n * 100) / 100;

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  await ensureSchema();
  const sql = getSql();

  const custRows = (await sql`
    select id, full_name, phone, address from customers where id = ${CUSTOMER_ID} limit 1
  `) as Array<{ id: string; full_name: string; phone: string; address: string }>;
  if (!custRows.length || custRows[0].full_name !== "Zeinab Ismail" || custRows[0].phone !== "70629918") {
    console.error("Customer record is not Zeinab Ismail / 70629918 — aborting.");
    process.exit(1);
  }
  const customer = custRows[0];

  // Her email from her previous order (kept on the record; nothing is sent).
  const prev = (await sql`
    select customer_email from orders
    where customer_id = ${CUSTOMER_ID} and customer_email is not null and customer_email <> ''
    order by created_at desc limit 1
  `) as Array<{ customer_email: string }>;
  const email = prev[0]?.customer_email ?? null;

  const recent = (await sql`
    select order_number from orders
    where customer_id = ${CUSTOMER_ID} and created_at > now() - interval '10 minutes'
  `) as Array<{ order_number: string }>;
  if (recent.length) {
    console.error(`An order for her was just created (${recent[0].order_number}) — aborting to avoid a duplicate.`);
    process.exit(1);
  }

  const items: Array<{
    brand: string; name: string; price_usd: number; price_gbp: number;
    product_url: string | null; image_url: string | null; regular_usd: number; factor: number;
  }> = [];
  for (const l of LINES) {
    const rows = (await sql`
      select brand, name, price_usd, price_gbp, product_url, image_url
      from products where id = ${l.productId} and not archived limit 1
    `) as Array<{ brand: string; name: string; price_usd: string; price_gbp: string; product_url: string | null; image_url: string | null }>;
    if (!rows.length) {
      console.error(`Product ${l.productId} not found in products — aborting.`);
      process.exit(1);
    }
    const p = rows[0];
    items.push({
      brand: p.brand,
      name: p.name + l.suffix,
      price_usd: round2(Number(p.price_usd) * l.priceFactor),
      price_gbp: round2(Number(p.price_gbp) * l.priceFactor),
      product_url: p.product_url,
      image_url: p.image_url,
      regular_usd: Number(p.price_usd),
      factor: l.priceFactor
    });
  }

  const totalUsd = round2(items.reduce((s, i) => s + i.price_usd, 0));
  const totalGbp = round2(items.reduce((s, i) => s + i.price_gbp, 0));
  const discounted = items.filter((i) => i.factor < 1);
  const notes =
    "Cash on delivery." +
    discounted.map((i) => ` ${i.name.split(" — ")[0]} at ${Math.round((1 - i.factor) * 100)}% off (regular $${i.regular_usd}).`).join("");

  const orderNumber = generateOrderNumber();
  const brands = new Set(items.map((i) => i.brand));

  const orderRows = (await sql`
    insert into orders (
      order_number, customer_id, customer_email,
      product_name, product_brand,
      price_usd, price_gbp, total_usd, total_gbp, items_count,
      status, payment_method, payment_confirmed, notes, source
    )
    values (
      ${orderNumber}, ${CUSTOMER_ID}, ${email},
      ${`${items.length} items`}, ${brands.size === 1 ? [...brands][0] : "Multiple brands"},
      ${totalUsd}, ${totalGbp}, ${totalUsd}, ${totalGbp}, ${items.length},
      ${"payment_confirmed"}, ${PAYMENT_METHOD}, ${true}, ${notes}, ${SOURCE}
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

  const pdf = generateInvoice(
    {
      order_number: order.order_number,
      created_at: order.created_at,
      payment_confirmed: true,
      payment_method: PAYMENT_METHOD,
      total_usd: totalUsd
    },
    { full_name: customer.full_name, email: email ?? "", phone: customer.phone, address: customer.address },
    items.map((i) => ({ brand: i.brand, name: i.name, quantity: 1, price_usd: i.price_usd }))
  );
  await sql`
    update orders set invoice_pdf = ${pdf.toString("base64")}, updated_at = now()
    where id = ${order.id}
  `;

  for (const it of items) console.log(`    ${it.brand} — ${it.name} — $${it.price_usd}`);
  console.log(`OK  ${order.order_number} — ${customer.full_name} — $${totalUsd} — COD confirmed — invoice stored`);
}

main().catch((err) => {
  console.error("Order creation failed:", err);
  process.exit(1);
});
