/**
 * New order for Sally Salami (existing customer, 76702663, Tyre — the record
 * with the fuller address): 1x Rare Beauty Warm Wishes Effortless Bronzer
 * Stick, shade TBC ($49). Payment: cod, confirmed — per standing instruction
 * ([[lara_order_entry_defaults]]).
 *
 * Run:  npx tsx scripts/add-order-sally-salami-rare-beauty-bronzer.ts
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

const CUSTOMER_ID = "956e933c-8194-4bf1-a391-d6c31de80624"; // Sally Salami

const LINES: Array<{ productId: string; shade: string; fromStock: boolean }> = [
  { productId: "2706e163-3cf1-4e24-9d46-53355f80662e", shade: "TBC", fromStock: false }  // Rare Beauty Warm Wishes Bronzer Stick
];

const round2 = (n: number): number => Math.round(n * 100) / 100;

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const sql = getSql();

  // Validate everything before writing anything.
  const lines = [];
  for (const l of LINES) {
    const prod = (await sql`
      select brand, name, price_usd, price_gbp, product_url, image_url from products where id = ${l.productId}
    `) as Array<{ brand: string; name: string; price_usd: string; price_gbp: string; product_url: string; image_url: string }>;
    if (!prod.length) {
      console.error(`Product ${l.productId} not found — aborting, nothing changed.`);
      process.exit(1);
    }
    let image = prod[0].image_url;
    if (l.shade !== "TBC") {
      const v = (await sql`
        select shade_name, shade_image_url from product_variants where product_id = ${l.productId} and lower(shade_name) = lower(${l.shade})
      `) as Array<{ shade_name: string; shade_image_url: string }>;
      if (v.length !== 1) {
        console.error(`Expected exactly one "${l.shade}" shade for ${prod[0].name}, found ${v.length} — aborting, nothing changed.`);
        process.exit(1);
      }
      image = v[0].shade_image_url || image;
    }
    lines.push({ ...l, ...prod[0], image, itemName: `${prod[0].name} — Shade: ${l.shade}` });
  }

  const cust = (await sql`select id, full_name from customers where id = ${CUSTOMER_ID}`) as Array<{ id: string; full_name: string }>;
  if (!cust.length) {
    console.error("Customer not found — aborting, nothing changed.");
    process.exit(1);
  }
  const customerId = cust[0].id;

  const totalUsd = lines.reduce((s, l) => s + Number(l.price_usd), 0);
  const totalGbp = round2(lines.reduce((s, l) => s + Number(l.price_gbp), 0));
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
      ${lines[0].itemName}, ${lines[0].brand},
      ${totalUsd}, ${totalGbp}, ${totalUsd}, ${totalGbp}, ${lines.length},
      ${"payment_confirmed"}, ${"cod"}, ${true}
    )
    returning id, order_number
  `) as Array<{ id: string; order_number: string }>;
  const order = orderRows[0];

  for (const l of lines) {
    await sql`
      insert into order_items (
        order_id, product_name, product_brand, product_url, image_url, price_usd, price_gbp, quantity,
        cost_usd, cost_gbp, sourced, in_lebanon
      )
      values (
        ${order.id}, ${l.itemName}, ${l.brand}, ${l.product_url}, ${l.image}, ${Number(l.price_usd)}, ${Number(l.price_gbp)}, ${1},
        ${l.fromStock ? 0 : null}, ${l.fromStock ? 0 : null}, ${l.fromStock}, ${l.fromStock}
      )
    `;
    console.log(`  + ${l.brand} — ${l.itemName} — $${Number(l.price_usd)}${l.fromStock ? " — from stock, cost $0, in Lebanon" : ""}`);
  }

  console.log(`OK  ${order.order_number} — ${cust[0].full_name} — ${lines.length} items — $${totalUsd} — cod / confirmed`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
