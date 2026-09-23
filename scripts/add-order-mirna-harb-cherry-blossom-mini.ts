/**
 * New order for Mirna Harb (old client, reusing her phone/address from
 * prior orders): 1x Huda Beauty Easy Bake Mini Loose Powder — CHERRY
 * BLOSSOM. Already sourced (cost $32) and already reached Lebanon, so the
 * line is inserted with sourced = true, in_lebanon = true, cost_usd = 32
 * from the start — no separate follow-up script needed.
 *
 * Selling price $32 matches every prior order for this exact
 * product/shade (SBB-100185, SBB-950995, SBB-361403, SBB-750646,
 * SBB-996268 all charged $32), so it's used here too, not the fluctuating
 * cost.
 *
 * Payment: cod, confirmed — per standing instruction
 * ([[lara_order_entry_defaults]]).
 *
 * Run:  npx ts-node scripts/add-order-mirna-harb-cherry-blossom-mini.ts
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

const PRODUCT_ID = "3f4cd9ff-6f2b-4243-b3fa-0d3a12340997"; // Easy Bake Mini Loose Powder 6g
const SHADE_NAME = "CHERRY BLOSSOM";
const PRICE_USD = 32;
const COST_USD = 32;
const round2 = (n: number): number => Math.round(n * 100) / 100;

const CUSTOMER = {
  full_name: "Mirna Harb",
  phone: "71812106",
  address: "Furn el Chebbak"
};

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const sql = getSql();

  const prodRows = (await sql`
    select id, brand, name, product_url from products where id = ${PRODUCT_ID}
  `) as Array<{ id: string; brand: string; name: string; product_url: string | null }>;
  if (!prodRows.length) {
    console.error("Product not found.");
    process.exit(1);
  }
  const p = prodRows[0];

  const variantRows = (await sql`
    select shade_image_url from product_variants where product_id = ${PRODUCT_ID} and shade_name = ${SHADE_NAME}
  `) as Array<{ shade_image_url: string | null }>;
  const imageUrl = variantRows[0]?.shade_image_url ?? null;

  const priceGbp = round2(PRICE_USD / 1.35);
  const costGbp = round2(COST_USD / 1.3);
  const fullName = `${p.name} — Shade: ${SHADE_NAME}`;

  const custRows = (await sql`
    insert into customers (full_name, phone, address)
    values (${CUSTOMER.full_name}, ${CUSTOMER.phone}, ${CUSTOMER.address})
    returning id
  `) as Array<{ id: string }>;
  const customerId = custRows[0].id;

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
      ${fullName}, ${p.brand},
      ${PRICE_USD}, ${priceGbp}, ${PRICE_USD}, ${priceGbp}, ${1},
      ${"payment_confirmed"}, ${"cod"}, ${true}
    )
    returning id, order_number
  `) as Array<{ id: string; order_number: string }>;
  const order = orderRows[0];

  await sql`
    insert into order_items (
      order_id, product_name, product_brand, product_url, image_url,
      price_usd, price_gbp, quantity, cost_usd, cost_gbp, sourced, in_lebanon
    )
    values (
      ${order.id}, ${fullName}, ${p.brand}, ${p.product_url}, ${imageUrl},
      ${PRICE_USD}, ${priceGbp}, ${1}, ${COST_USD}, ${costGbp}, ${true}, ${true}
    )
  `;

  console.log(`OK  ${order.order_number} — ${CUSTOMER.full_name} — ${fullName} — $${PRICE_USD} (cost $${COST_USD}) — sourced + already in Lebanon — cod / confirmed`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
