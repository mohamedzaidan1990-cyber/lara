/**
 * Correction: SBB-132710 (Zahia Krecht Khatoun) was already delivered and
 * paid — the previous script wrongly merged 2 new items + updated sourcing
 * into it. This script:
 *
 *  1) Reverts SBB-132710 to its original state (removes the 2 added lines,
 *     restores the original cost/vendor/in_lebanon on the 3 touched lines,
 *     restores order total/items_count to $330 / 7 items).
 *  2) Creates a NEW order for the same customer with all 5 items she
 *     actually ordered this time, cod / confirmed:
 *       - Rhode Glazing Mist Hydrating Face Spray 80ml   $44, cost $30,  not in Lebanon
 *       - Rhode Glazing Milk Hydrating Ceramide Facial Essence 124ml
 *                                                          $46, cost $32,  not in Lebanon
 *       - Kayali Yum Pistachio Gelato body cream          $58, cost $51.60, in Lebanon
 *       - Kayali Yum Boujee Marshmallow body cream        $58, cost $51.60, in Lebanon
 *       - Drunk Elephant B-Goldi Bright Drops 30ml        $50 (current catalogue
 *                                                          price), cost $35, in Lebanon
 *
 * Run:  npx ts-node scripts/revert-sbb-132710-and-new-order-zahia.ts
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

const gbp = (usd: number): number => Math.round((usd / 1.3) * 100) / 100;

const OLD_ORDER_NUMBER = "SBB-132710";

const CUSTOMER = {
  full_name: "Zahia Krecht Khatoun",
  phone: "70676076",
  address: "Jamhour, Baabda, Haret Set Street, Villagio Jamhour Complex, Villa A5"
};

const B_GOLDI_ID = "fd36e950-1830-4f39-ad3e-584ec21e2f1f";
const KAYALI_PISTACHIO_ID = "f378f58b-920e-4bf9-8300-87a629493b61";
const KAYALI_MARSHMALLOW_URL = "https://www.sephora.com/product/yum-boujee-marshmallow-81-silk-souffle-body-cream-P525437";
const RHODE_MIST_ID = "9450e457-6772-44f9-9180-b9736b7ae749";
const RHODE_MILK_ID = "9b380f92-d6d5-424c-89de-2f4be2a687a7";

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  await ensureSchema();
  const sql = getSql();

  // ---- 1) Revert SBB-132710 ----
  const oldOrderRows = (await sql`select id from orders where order_number = ${OLD_ORDER_NUMBER} limit 1`) as Array<{ id: string }>;
  if (!oldOrderRows.length) {
    console.error(`Order not found: ${OLD_ORDER_NUMBER}`);
    process.exit(1);
  }
  const oldOrderId = oldOrderRows[0].id;

  await sql`
    delete from order_items
    where order_id = ${oldOrderId}
      and ((product_brand = 'Kayali' and product_name ilike '%Pistachio Gelato%')
        or (product_brand = 'Rhode' and product_name ilike 'Glazing Milk%'))
  `;
  await sql`
    update order_items set cost_usd = 17.45, cost_gbp = null, vendor = 'selfridges', sourced = true, in_lebanon = true
    where order_id = ${oldOrderId} and product_brand = 'Drunk Elephant' and product_name ilike 'B-Goldi%'
  `;
  await sql`
    update order_items set cost_usd = 37.35, cost_gbp = null, vendor = 'selfridges', sourced = true, in_lebanon = true
    where order_id = ${oldOrderId} and product_brand = 'Rhode' and product_name ilike 'Glazing Mist%'
  `;
  await sql`
    update order_items set cost_usd = 52, cost_gbp = null, vendor = null, sourced = true, in_lebanon = true
    where order_id = ${oldOrderId} and product_brand = 'Kayali' and product_name ilike '%Boujee Marshmallow%'
  `;
  await sql`
    update orders set price_usd = 330, price_gbp = 253.85, total_usd = 330, total_gbp = 253.85, items_count = 7
    where id = ${oldOrderId}
  `;
  console.log(`Reverted ${OLD_ORDER_NUMBER} to its original delivered state ($330, 7 items).`);

  // ---- 2) New order ----
  const productRows = (await sql`
    select id, brand, name, price_usd, price_gbp, product_url, image_url
    from products
    where id in (${B_GOLDI_ID}, ${KAYALI_PISTACHIO_ID}, ${RHODE_MIST_ID}, ${RHODE_MILK_ID})
       or product_url = ${KAYALI_MARSHMALLOW_URL}
  `) as Array<{ id: string; brand: string; name: string; price_usd: string; price_gbp: string; product_url: string | null; image_url: string | null }>;
  const byId = new Map(productRows.map((p) => [p.id, p]));
  const marshmallow = productRows.find((p) => p.product_url === KAYALI_MARSHMALLOW_URL);
  if (!marshmallow) {
    console.error("Kayali Marshmallow product not found by product_url.");
    process.exit(1);
  }

  const items = [
    { p: byId.get(RHODE_MIST_ID)!, cost: 30, inLebanon: false },
    { p: byId.get(RHODE_MILK_ID)!, cost: 32, inLebanon: false },
    { p: byId.get(KAYALI_PISTACHIO_ID)!, cost: 51.6, inLebanon: true },
    { p: marshmallow, cost: 51.6, inLebanon: true },
    { p: byId.get(B_GOLDI_ID)!, cost: 35, inLebanon: true }
  ];
  for (const it of items) {
    if (!it.p) {
      console.error("Missing a product row for the new order — aborting before insert.");
      process.exit(1);
    }
  }

  const custRows = (await sql`
    insert into customers (full_name, phone, address)
    values (${CUSTOMER.full_name}, ${CUSTOMER.phone}, ${CUSTOMER.address})
    returning id
  `) as Array<{ id: string }>;
  const customerId = custRows[0].id;

  const totalUsd = items.reduce((s, i) => s + Number(i.p.price_usd), 0);
  const totalGbp = items.reduce((s, i) => s + Number(i.p.price_gbp), 0);
  const orderNumber = generateOrderNumber();

  const orderRows = (await sql`
    insert into orders (
      order_number, customer_id, customer_email,
      product_name, product_brand,
      price_usd, price_gbp, total_usd, total_gbp, items_count,
      status, payment_method, payment_confirmed, source
    )
    values (
      ${orderNumber}, ${customerId}, ${null},
      ${items.length + " items"}, ${"Multiple brands"},
      ${totalUsd}, ${totalGbp}, ${totalUsd}, ${totalGbp}, ${items.length},
      ${"payment_confirmed"}, ${"cod"}, ${true}, ${"instagram"}
    )
    returning id, order_number
  `) as Array<{ id: string; order_number: string }>;
  const order = orderRows[0];

  for (const it of items) {
    const priceUsd = Number(it.p.price_usd);
    const priceGbp = Number(it.p.price_gbp);
    await sql`
      insert into order_items (
        order_id, product_name, product_brand, product_url, image_url,
        price_usd, price_gbp, quantity, cost_usd, cost_gbp, sourced, in_lebanon
      )
      values (
        ${order.id}, ${it.p.name}, ${it.p.brand}, ${it.p.product_url}, ${it.p.image_url},
        ${priceUsd}, ${priceGbp}, 1, ${it.cost}, ${gbp(it.cost)}, true, ${it.inLebanon}
      )
    `;
    console.log(`  + ${it.p.brand} — ${it.p.name} ($${priceUsd}, cost $${it.cost}, ${it.inLebanon ? "in Lebanon" : "not in Lebanon"})`);
  }

  console.log(`OK  ${order.order_number} — ${CUSTOMER.full_name} — $${totalUsd} — cod / confirmed`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
