/**
 * New order for Zahraa Daher (existing customer): Fenty Beauty Gloss Bomb
 * Shimmer Stix Lip Gloss 3.6g, shade Hot Chocolit ($41, catalogue). Nothing sourced yet.
 * Payment: cod, confirmed, not paid — per standing instruction ([[lara_order_entry_defaults]]).
 *
 * Run:  npx tsx scripts/add-order-zahraa-daher-fenty-shimmer-stix.ts
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

const CUSTOMER = { full_name: "Zahraa Daher" };

const CUSTOMER_ID = "abdcd0b2-b282-40ca-8160-2cd6b615d894"; // Zahraa Daher, 70413437, Airport road, Bir Hassan, Al Ahlam bldg

const LINES: Array<{ productId: string; shade: string; fromStock: boolean; priceUsd?: number; suffix?: string }> = [
  { productId: "ef213361-e893-499e-9452-2bfded308a8e", shade: "Hot Chocolit", fromStock: false } // Fenty Gloss Bomb Shimmer Stix Lip Gloss 3.6g
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
      if (v.length !== 1 && anyVariants.length) {
        console.error(`Expected exactly one "${l.shade}" shade for ${prod[0].name}, found ${v.length} — aborting, nothing changed.`);
        process.exit(1);
      }
      if (v.length === 1) image = v[0].shade_image_url || image;
    }
    lines.push({ ...l, ...prod[0], ...(l.priceUsd !== undefined ? { price_usd: String(l.priceUsd), price_gbp: String(Number(prod[0].price_usd) ? round2(Number(prod[0].price_gbp) * l.priceUsd / Number(prod[0].price_usd)) : 0) } : {}), image, itemName: (l.shade ? `${prod[0].name} — Shade: ${l.shade}` : prod[0].name) + (l.suffix ? ` — ${l.suffix}` : "") });
  }

  const cust = (await sql`select id, full_name from customers where id = ${CUSTOMER_ID}`) as Array<{ id: string; full_name: string }>;
  if (!cust.length) {
    console.error("Customer not found — aborting, nothing changed.");
    process.exit(1);
  }
  const customerId = cust[0].id;

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
