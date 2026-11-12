/**
 * New order for Nour World (new customer):
 *   - Rare Beauty Soft Pinch Liquid Blush (full size — no size given), shade Hope ($45.04)
 *   - Huda Beauty Faux Filter Luminous Matte Concealer 2ml (mini), shade Nougat ($23)
 *     — Nougat isn't among the catalogue's variants, entered as free text
 *   - Huda Beauty Faux Filter Mini Colour Corrector 2ml, shade Peach ($23)
 *   - Huda Beauty Easy Bake Mini Loose Powder 6g, shade Peach Pie ($32)
 * Payment: cod, confirmed, not paid — per standing instruction ([[lara_order_entry_defaults]]).
 *
 * Run:  npx tsx scripts/add-order-nour-world-rare-huda-minis.ts
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

const CUSTOMER = {
  full_name: "Nour World",
  phone: "76917050",
  address: "Dawhet El Hoss, Tal El Ward"
};

const LINES: Array<{ productId: string; shade: string; fromStock: boolean; freeShade?: boolean }> = [
  { productId: "2daebb55-fb32-475e-9cd3-932b2d0597c0", shade: "Hope", fromStock: false },                    // Rare Beauty Soft Pinch Liquid Blush (no variants)
  { productId: "24ca27b8-447c-41da-8081-9b82545eb8ea", shade: "Nougat", fromStock: false, freeShade: true }, // Huda Faux Filter Luminous Matte Concealer 2ml
  { productId: "0b92aceb-09b4-4c1b-840b-7c28f7712f45", shade: "Peach", fromStock: false },                   // Huda Faux Filter Mini Colour Corrector 2ml
  { productId: "3f4cd9ff-6f2b-4243-b3fa-0d3a12340997", shade: "Peach Pie", fromStock: false }                // Huda Easy Bake Mini Loose Powder 6g
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
    if (l.shade && l.shade !== "TBC") {
      const v = (await sql`
        select shade_name, shade_image_url from product_variants where product_id = ${l.productId} and lower(shade_name) = lower(${l.shade})
      `) as Array<{ shade_name: string; shade_image_url: string }>;
      // Products with no shade variants at all take the shade as free text.
      const anyVariants = (await sql`select 1 from product_variants where product_id = ${l.productId} limit 1`) as unknown[];
      if (v.length !== 1 && anyVariants.length && !l.freeShade) {
        console.error(`Expected exactly one "${l.shade}" shade for ${prod[0].name}, found ${v.length} — aborting, nothing changed.`);
        process.exit(1);
      }
      if (v.length === 1) image = v[0].shade_image_url || image;
    }
    lines.push({ ...l, ...prod[0], image, itemName: l.shade ? `${prod[0].name} — Shade: ${l.shade}` : prod[0].name });
  }

  const existing = (await sql`select id from customers where phone_norm = ${CUSTOMER.phone}`) as Array<{ id: string }>;
  const customerId = existing.length
    ? existing[0].id
    : ((await sql`
        insert into customers (full_name, phone, address)
        values (${CUSTOMER.full_name}, ${CUSTOMER.phone}, ${CUSTOMER.address})
        returning id
      `) as Array<{ id: string }>)[0].id;

  const totalUsd = round2(lines.reduce((s, l) => s + Number(l.price_usd), 0));
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
      ${lines.length + " items"}, ${"Multiple brands"},
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

  console.log(`OK  ${order.order_number} — ${CUSTOMER.full_name} — ${lines.length} items — $${totalUsd} — cod / confirmed`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
