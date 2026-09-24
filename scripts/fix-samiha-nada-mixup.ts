/**
 * Correction: the Tarte Shape Tape concealer was wrongly put on Samiha Al
 * Mokdad's order (SBB-565849) — it actually belongs to Nada Diab. Samiha
 * herself ordered Huda Beauty Faux Filter Luminous Matte Concealer 2ml —
 * Shade: HONEY ($23).
 *
 * 1) Replace the item on SBB-565849 with the correct Huda mini concealer.
 *    Since nothing was said about it being already sourced, cost/sourced
 *    are left unset for this one (Samiha's item).
 * 2) Create a new order for Nada Diab (71225052, Bir Hassan) with the Tarte
 *    Shape Tape Full Coverage Matte Concealer ($47), carrying over the
 *    sourced=true / cost=$31 that was on Samiha's order by mistake — it was
 *    the Tarte that was already bought, not the Huda concealer.
 *
 * Payment: cod, confirmed — per standing instruction
 * ([[lara_order_entry_defaults]]).
 *
 * Run:  npx ts-node scripts/fix-samiha-nada-mixup.ts
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

const SAMIHA_ORDER_NUMBER = "SBB-565849";
const HUDA_MINI_CONCEALER_ID = "24ca27b8-447c-41da-8081-9b82545eb8ea"; // Faux Filter Luminous Matte Concealer 2ml
const HONEY_SHADE_NAME = "HONEY";
const HONEY_IMAGE = "https://images.selfridges.com/is/image/selfridges/R04519049_HONEY_M?wid=960&hei=1280&fmt=webp&qlt=80";
const HUDA_PRICE_USD = 23;

const TARTE_PRODUCT_ID = "3220b35d-77d4-4e3d-a885-2e664f4d0350"; // Tarte Shape Tape Full Coverage Matte Concealer
const TARTE_COST_USD = 31;
const round2 = (n: number): number => Math.round(n * 100) / 100;

const NADA = {
  full_name: "Nada Diab",
  phone: "71225052",
  address: "Bir Hassan"
};

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const sql = getSql();

  // ---- 1) fix Samiha's order: swap Tarte for the Huda mini concealer ----
  const samiha = (await sql`select id from orders where order_number = ${SAMIHA_ORDER_NUMBER}`) as Array<{ id: string }>;
  if (!samiha.length) {
    console.error(`${SAMIHA_ORDER_NUMBER} not found.`);
    process.exit(1);
  }
  const samihaOrderId = samiha[0].id;

  const huda = (await sql`
    select brand, name, product_url, price_gbp from products where id = ${HUDA_MINI_CONCEALER_ID}
  `) as Array<{ brand: string; name: string; product_url: string; price_gbp: string }>;
  if (!huda.length) {
    console.error("Huda mini concealer product not found.");
    process.exit(1);
  }
  const hudaItemName = `${huda[0].name} — Shade: ${HONEY_SHADE_NAME}`;
  const hudaPriceGbp = Number(huda[0].price_gbp);

  await sql`
    update order_items
    set product_name = ${hudaItemName}, product_brand = ${huda[0].brand}, product_url = ${huda[0].product_url},
        image_url = ${HONEY_IMAGE}, price_usd = ${HUDA_PRICE_USD}, price_gbp = ${hudaPriceGbp},
        cost_usd = null, cost_gbp = null, sourced = false, in_lebanon = false
    where order_id = ${samihaOrderId}
  `;
  await sql`
    update orders
    set product_name = ${hudaItemName}, product_brand = ${huda[0].brand},
        price_usd = ${HUDA_PRICE_USD}, price_gbp = ${hudaPriceGbp},
        total_usd = ${HUDA_PRICE_USD}, total_gbp = ${hudaPriceGbp}, updated_at = now()
    where id = ${samihaOrderId}
  `;
  console.log(`OK  ${SAMIHA_ORDER_NUMBER} — Samiha Al Mokdad -> ${hudaItemName} — $${HUDA_PRICE_USD}`);

  // ---- 2) new order for Nada Diab with the Tarte concealer, already sourced ----
  const tarte = (await sql`
    select brand, name, product_url, image_url, price_usd, price_gbp from products where id = ${TARTE_PRODUCT_ID}
  `) as Array<{ brand: string; name: string; product_url: string; image_url: string; price_usd: string; price_gbp: string }>;
  const tarteCostGbp = round2(TARTE_COST_USD / 1.3);
  const tartePriceUsd = Number(tarte[0].price_usd);
  const tartePriceGbp = Number(tarte[0].price_gbp);

  const custRows = (await sql`
    insert into customers (full_name, phone, address)
    values (${NADA.full_name}, ${NADA.phone}, ${NADA.address})
    returning id
  `) as Array<{ id: string }>;
  const nadaCustomerId = custRows[0].id;

  const orderNumber = generateOrderNumber();
  const orderRows = (await sql`
    insert into orders (
      order_number, customer_id, customer_email,
      product_name, product_brand,
      price_usd, price_gbp, total_usd, total_gbp, items_count,
      status, payment_method, payment_confirmed
    )
    values (
      ${orderNumber}, ${nadaCustomerId}, ${null},
      ${tarte[0].name}, ${tarte[0].brand},
      ${tartePriceUsd}, ${tartePriceGbp}, ${tartePriceUsd}, ${tartePriceGbp}, ${1},
      ${"payment_confirmed"}, ${"cod"}, ${true}
    )
    returning id, order_number
  `) as Array<{ id: string; order_number: string }>;
  const nadaOrder = orderRows[0];

  await sql`
    insert into order_items (
      order_id, product_name, product_brand, product_url, image_url,
      price_usd, price_gbp, quantity, cost_usd, cost_gbp, sourced
    )
    values (
      ${nadaOrder.id}, ${tarte[0].name}, ${tarte[0].brand}, ${tarte[0].product_url}, ${tarte[0].image_url},
      ${tartePriceUsd}, ${tartePriceGbp}, ${1}, ${TARTE_COST_USD}, ${tarteCostGbp}, ${true}
    )
  `;

  console.log(`OK  ${nadaOrder.order_number} — ${NADA.full_name} — ${tarte[0].brand} ${tarte[0].name} — $${tartePriceUsd} (cost $${TARTE_COST_USD}, sourced) — cod / confirmed`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
