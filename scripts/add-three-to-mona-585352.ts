/**
 * Mona Alkazwini's SBB-585352 — add 3 more already-bought items:
 *   - Bubble Cosmic Silk Hydrating Milky Toner — $22, cost $13.20
 *   - Laneige Lip Glowy Balm 10g, shade Gummy Bear — $33, cost $20
 *   - Summer Fridays Flushed Lip Stain, shade Plum — $38, cost $23.70
 *     (new to the catalogue at $38; image cropped from the user's screenshot)
 * Prices are user-given for this order; catalogue prices of the existing
 * products are left as they are.
 *
 * Run:  npx tsx scripts/add-three-to-mona-585352.ts
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

import { getSql } from "../lib/db";

const ORDER_NUMBER = "SBB-585352";
const round2 = (n: number): number => Math.round(n * 100) / 100;

const SUMMER_FRIDAYS = {
  brand: "Summer Fridays",
  name: "Flushed Lip Stain",
  category: "Makeup",
  subcategory: "Lipstick",
  description:
    "A long-wear, transfer-proof lip stain that leaves a soft, flushed tint. The tapered felt-tip nib makes it easy to apply precisely, and the lightweight, buildable formula with aloe vera and panthenol keeps lips comfortable. Shades: Slipper, Rosette, Maple, Plum, Almond and Mocha.",
  product_url: "https://www.sephora.com/product/summer-fridays-flushed-lip-stain-P520759",
  image_url: "/summer-fridays-flushed-lip-stain-plum.jpg",
  priceUsd: 38
};

async function main(): Promise<void> {
  const sql = getSql();

  const order = (await sql`
    select id from orders where order_number = ${ORDER_NUMBER} and status not in ('cancelled', 'refunded', 'delivered')
  `) as Array<{ id: string }>;
  if (!order.length) {
    console.error(`${ORDER_NUMBER} not found or not open — aborting, nothing changed.`);
    process.exit(1);
  }
  const orderId = order[0].id;

  const sf = (await sql`
    insert into products (
      brand, name, category, subcategory, description,
      price_gbp, price_usd, product_url, image_url,
      price_locked, deliverable_lebanon
    )
    values (
      ${SUMMER_FRIDAYS.brand}, ${SUMMER_FRIDAYS.name}, ${SUMMER_FRIDAYS.category}, ${SUMMER_FRIDAYS.subcategory}, ${SUMMER_FRIDAYS.description},
      ${round2(SUMMER_FRIDAYS.priceUsd / 1.35)}, ${SUMMER_FRIDAYS.priceUsd}, ${SUMMER_FRIDAYS.product_url}, ${SUMMER_FRIDAYS.image_url},
      true, true
    )
    on conflict (product_url) do update set
      description = excluded.description,
      price_gbp = excluded.price_gbp,
      price_usd = excluded.price_usd,
      image_url = excluded.image_url,
      price_locked = true
    returning id
  `) as Array<{ id: string }>;
  console.log(`OK  product Summer Fridays — Flushed Lip Stain — $${SUMMER_FRIDAYS.priceUsd}  (${sf[0].id})`);

  const LINES = [
    { productId: "803a223a-b4d3-4d27-b9e9-61c095a96660", shade: null as string | null, priceUsd: 22, costUsd: 13.2 }, // Bubble Cosmic Silk toner
    { productId: "4263469f-e17e-44df-8970-af9cd01fd672", shade: "Gummy Bear", priceUsd: 33, costUsd: 20 },           // Laneige Lip Glowy Balm
    { productId: sf[0].id, shade: "Plum", priceUsd: 38, costUsd: 23.7 }                                               // Summer Fridays Flushed Lip Stain
  ];

  for (const l of LINES) {
    const prod = (await sql`select brand, name, product_url, image_url from products where id = ${l.productId}`) as Array<{ brand: string; name: string; product_url: string; image_url: string }>;
    if (!prod.length) {
      console.error(`Product ${l.productId} not found — stopping.`);
      process.exit(1);
    }
    const p = prod[0];
    let image = p.image_url;
    if (l.shade) {
      const v = (await sql`
        select shade_image_url from product_variants where product_id = ${l.productId} and lower(shade_name) = lower(${l.shade})
      `) as Array<{ shade_image_url: string | null }>;
      if (v.length === 1 && v[0].shade_image_url) image = v[0].shade_image_url;
    }
    const itemName = l.shade ? `${p.name} — Shade: ${l.shade}` : p.name;
    const already = (await sql`select 1 from order_items where order_id = ${orderId} and product_name = ${itemName}`) as unknown[];
    if (already.length) {
      console.error(`${itemName} is already on ${ORDER_NUMBER} — skipping.`);
      continue;
    }
    await sql`
      insert into order_items (
        order_id, product_name, product_brand, product_url, image_url, price_usd, price_gbp, quantity,
        cost_usd, cost_gbp, sourced
      )
      values (
        ${orderId}, ${itemName}, ${p.brand}, ${p.product_url}, ${image}, ${l.priceUsd}, ${round2(l.priceUsd / 1.35)}, ${1},
        ${l.costUsd}, ${round2(l.costUsd / 1.3)}, ${true}
      )
    `;
    console.log(`  + ${p.brand} — ${itemName} — $${l.priceUsd} — sourced @ $${l.costUsd}`);
  }

  const totals = (await sql`
    select coalesce(sum(price_usd::float8 * quantity), 0) as total_usd,
           coalesce(sum(price_gbp::float8 * quantity), 0) as total_gbp,
           count(*)::int as items_count
    from order_items where order_id = ${orderId}
  `) as Array<{ total_usd: number; total_gbp: number; items_count: number }>;
  const t = totals[0];
  await sql`
    update orders
    set price_usd = ${t.total_usd}, price_gbp = ${round2(t.total_gbp)},
        total_usd = ${t.total_usd}, total_gbp = ${round2(t.total_gbp)},
        items_count = ${t.items_count},
        product_name = ${t.items_count + " items"}, product_brand = 'Multiple brands',
        updated_at = now()
    where id = ${orderId}
  `;
  console.log(`OK  ${ORDER_NUMBER} — ${t.items_count} items — $${t.total_usd} total`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
