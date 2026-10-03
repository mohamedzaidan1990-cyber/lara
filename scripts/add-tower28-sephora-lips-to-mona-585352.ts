/**
 * Add two products to the catalogue (user-given prices, images the user
 * supplied) and add both to Mona Alkazwini's open order SBB-585352, already
 * bought (sourced, not yet in Lebanon):
 *   - Sephora Favorites All About Lips set — $60, cost $42
 *   - Tower 28 Swipe Serum Concealer 6.5ml, shade 4.0 DTLA — $33, cost $20
 *
 * Run:  npx tsx scripts/add-tower28-sephora-lips-to-mona-585352.ts
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

const PRODUCTS = [
  {
    brand: "Sephora Favorites",
    name: "All About Lips Set",
    category: "Makeup",
    subcategory: "Sets",
    description:
      "A lip kit of Sephora favourites in a bright pink zip-around bag: a Makeup by Mario lip gloss, Sephora Collection Cream Lip Stain, Glow Recipe Glass Balm in Watermelon Bingsoo, a Huda Beauty lip liner and a full-size Rare Beauty gloss — everything to line, colour and gloss.",
    product_url: "https://www.sephora.com/search?keyword=sephora%20favorites%20all%20about%20lips",
    image_url: "/sephora-favorites-all-about-lips.jpg",
    priceUsd: 60,
    shade: null as string | null,
    costUsd: 42
  },
  {
    brand: "Tower 28",
    name: "Swipe Serum Concealer 6.5ml",
    category: "Makeup",
    subcategory: "Concealer",
    description:
      "A hydrating, medium-coverage serum concealer made for sensitive skin, with hyaluronic acid and centella. Fragrance-free, alcohol-free and non-comedogenic, it blends easily under eyes and over blemishes for a natural, skin-like finish.",
    product_url: "https://www.tower28beauty.com/products/swipe-serum-concealer",
    image_url: "/tower-28-swipe-serum-concealer.jpg",
    priceUsd: 33,
    shade: "4.0 DTLA" as string | null,
    costUsd: 20
  }
];

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

  for (const p of PRODUCTS) {
    const priceGbp = round2(p.priceUsd / 1.35);
    const rows = (await sql`
      insert into products (
        brand, name, category, subcategory, description,
        price_gbp, price_usd, product_url, image_url,
        price_locked, deliverable_lebanon
      )
      values (
        ${p.brand}, ${p.name}, ${p.category}, ${p.subcategory}, ${p.description},
        ${priceGbp}, ${p.priceUsd}, ${p.product_url}, ${p.image_url},
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
    console.log(`OK  product ${p.brand} — ${p.name} — $${p.priceUsd}  (${rows[0].id})`);

    const itemName = p.shade ? `${p.name} — Shade: ${p.shade}` : p.name;
    const already = (await sql`select 1 from order_items where order_id = ${orderId} and product_name = ${itemName}`) as unknown[];
    if (already.length) {
      console.error(`${itemName} is already on ${ORDER_NUMBER} — skipping the order line.`);
      continue;
    }
    await sql`
      insert into order_items (
        order_id, product_name, product_brand, product_url, image_url, price_usd, price_gbp, quantity,
        cost_usd, cost_gbp, sourced
      )
      values (
        ${orderId}, ${itemName}, ${p.brand}, ${p.product_url}, ${p.image_url}, ${p.priceUsd}, ${priceGbp}, ${1},
        ${p.costUsd}, ${round2(p.costUsd / 1.3)}, ${true}
      )
    `;
    console.log(`  + ${ORDER_NUMBER} — ${p.brand} ${itemName} — $${p.priceUsd} — sourced @ $${p.costUsd}`);
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
