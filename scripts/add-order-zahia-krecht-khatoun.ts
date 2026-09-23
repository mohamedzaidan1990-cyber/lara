/**
 * New order for Zahia Krecht Khatoun (existing customer, reusing her phone
 * /address from prior orders):
 *   - Kayali Yum Boujee Marshmallow | 81 Silk Soufflé Body Cream
 *   - Tarte Don't Kiss & Tell Maracuja Juicy Lip Trio
 *   - Tarte Shape Tape Full Coverage Hydrating Color Corrector — Lavender
 *     shade (no product_variants row for this product; shade recorded in
 *     the order item's product name instead, same convention as prior
 *     one-off shade orders).
 * Payment: cod, confirmed — per standing instruction
 * ([[lara_order_entry_defaults]]).
 *
 * Run:  npx ts-node scripts/add-order-zahia-krecht-khatoun.ts
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

const KAYALI_ID = "93376259-3db5-4d32-944a-1b59b8617bd2";
const TARTE_LIP_TRIO_ID = "f073c6c5-317a-4941-8069-02b82bdb1fc0";
const TARTE_CORRECTOR_ID = "402f2e27-bedc-4651-b542-339a759f2ab5";
const CORRECTOR_SHADE = "Lavender";

const CUSTOMER = {
  full_name: "Zahia Krecht Khatoun",
  phone: "70676076",
  address: "Jamhour, Baabda, Haret Set Street, Villagio Jamhour Complex, Villa A5"
};

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const sql = getSql();

  const prodRows = (await sql`
    select id, brand, name, price_usd, price_gbp, product_url, image_url
    from products where id in (${KAYALI_ID}, ${TARTE_LIP_TRIO_ID}, ${TARTE_CORRECTOR_ID})
  `) as Array<{ id: string; brand: string; name: string; price_usd: string; price_gbp: string; product_url: string; image_url: string }>;
  if (prodRows.length !== 3) {
    console.error("Expected 3 products, found", prodRows.length);
    process.exit(1);
  }
  const byId = Object.fromEntries(prodRows.map((p) => [p.id, p]));
  const kayali = byId[KAYALI_ID];
  const lipTrio = byId[TARTE_LIP_TRIO_ID];
  const corrector = byId[TARTE_CORRECTOR_ID];

  const items = [
    {
      brand: kayali.brand,
      name: kayali.name,
      price_usd: Number(kayali.price_usd),
      price_gbp: Number(kayali.price_gbp),
      product_url: kayali.product_url,
      image_url: kayali.image_url
    },
    {
      brand: lipTrio.brand,
      name: lipTrio.name,
      price_usd: Number(lipTrio.price_usd),
      price_gbp: Number(lipTrio.price_gbp),
      product_url: lipTrio.product_url,
      image_url: lipTrio.image_url
    },
    {
      brand: corrector.brand,
      name: `${corrector.name} — ${CORRECTOR_SHADE}`,
      price_usd: Number(corrector.price_usd),
      price_gbp: Number(corrector.price_gbp),
      product_url: corrector.product_url,
      image_url: corrector.image_url
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
      status, payment_method, payment_confirmed
    )
    values (
      ${orderNumber}, ${customerId}, ${null},
      ${items.length + " items"}, ${"Multiple brands"},
      ${totalUsd}, ${totalGbp}, ${totalUsd}, ${totalGbp}, ${items.length},
      ${"payment_confirmed"}, ${"cod"}, ${true}
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
