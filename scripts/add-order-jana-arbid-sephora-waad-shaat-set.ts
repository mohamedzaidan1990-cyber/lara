/**
 * Manual order (Instagram) for existing client Jana Arbid.
 *  - 1x Sephora Collection "Sephora x Waad Shaat Makeup Set" @ $30 — the
 *    Mix & Match "any 4" promo price. It is a single item (the cart would
 *    charge the $60 retail price for one), but the user counted it at $30 for
 *    her, so the order carries $30 and a note saying so.
 *  - Payment: COD, order confirmed (payment_confirmed = true, status
 *    payment_confirmed) — the default for every manual order.
 *  - Reuses her most recent customer record (the one on SBB-910530) instead of
 *    inserting a duplicate.
 *  - Generates the invoice PDF with lib/invoice.ts and stores it on the order
 *    (invoice_pdf). Nothing is emailed or WhatsApped; no PDF file is written.
 *
 * Run:  npx ts-node scripts/add-order-jana-arbid-sephora-waad-shaat-set.ts
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

// Her most recent customer record (created 2026-09-14, used for SBB-910530).
const CUSTOMER_ID = "83fa1b07-0113-41e7-9369-3e5f9a107c1b";
const PRODUCT_ID = "df4c9110-3baf-48e1-b527-09e4b1c682d7";

const SOURCE = "instagram";
const PAYMENT_METHOD = "cod";
const NOTES = "Cash on delivery. Mix & Match price ($30) applied to a single item (retail $60), per instruction.";

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
  if (!custRows.length || custRows[0].full_name !== "Jana Arbid") {
    console.error("Customer record not found / not Jana Arbid — aborting.");
    process.exit(1);
  }
  const customer = custRows[0];

  const prod = (await sql`
    select brand, name, price_usd, price_gbp, product_url, image_url
    from products where id = ${PRODUCT_ID} and not archived limit 1
  `) as Array<{ brand: string; name: string; price_usd: string; price_gbp: string; product_url: string | null; image_url: string | null }>;
  if (!prod.length || Number(prod[0].price_usd) !== 30) {
    console.error("Waad Shaat set not found or its catalogue price is no longer $30 — aborting.");
    process.exit(1);
  }
  const p = prod[0];

  // Guard against running twice: no other order for her in the last 10 minutes.
  const recent = (await sql`
    select order_number from orders
    where customer_id = ${CUSTOMER_ID} and created_at > now() - interval '10 minutes'
  `) as Array<{ order_number: string }>;
  if (recent.length) {
    console.error(`An order for her was just created (${recent[0].order_number}) — aborting to avoid a duplicate.`);
    process.exit(1);
  }

  const totalUsd = Number(p.price_usd);
  const totalGbp = Number(p.price_gbp);
  const orderNumber = generateOrderNumber();

  const orderRows = (await sql`
    insert into orders (
      order_number, customer_id, customer_email,
      product_name, product_brand,
      price_usd, price_gbp, total_usd, total_gbp, items_count,
      status, payment_method, payment_confirmed, notes, source
    )
    values (
      ${orderNumber}, ${CUSTOMER_ID}, ${null},
      ${p.name}, ${p.brand},
      ${totalUsd}, ${totalGbp}, ${totalUsd}, ${totalGbp}, ${1},
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
      ${order.id}, ${p.name}, ${p.brand}, ${p.product_url}, ${p.image_url},
      ${totalUsd}, ${totalGbp}, ${1}
    )
  `;

  const pdf = generateInvoice(
    {
      order_number: order.order_number,
      created_at: order.created_at,
      payment_confirmed: true,
      payment_method: PAYMENT_METHOD,
      total_usd: totalUsd
    },
    { full_name: customer.full_name, email: "", phone: customer.phone, address: customer.address },
    [{ brand: p.brand, name: p.name, quantity: 1, price_usd: totalUsd }]
  );
  await sql`
    update orders set invoice_pdf = ${pdf.toString("base64")}, updated_at = now()
    where id = ${order.id}
  `;

  console.log(`OK  ${order.order_number} — ${customer.full_name} — ${p.name} — $${totalUsd} — COD confirmed — invoice stored`);
}

main().catch((err) => {
  console.error("Order creation failed:", err);
  process.exit(1);
});
