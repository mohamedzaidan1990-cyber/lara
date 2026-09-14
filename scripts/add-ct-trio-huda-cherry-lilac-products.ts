/**
 * Add two products to the catalogue (both first appeared on Rosa Wehbe's
 * order SBB-473702) and link that order's line items to them:
 *
 *  - Charlotte Tilbury "Unreal Blush + Glow Mini Trio" — $60. Not a
 *    Selfridges scrape; a fixed 3-piece set with no shade picker needed.
 *  - Huda Beauty "Easy Bake Duo Loose Powder 6.5g — Cherry Lilac" — $55.
 *    A brand-new shade, separate from the existing generic
 *    "Easy Bake Duo Loose Powder 6.5g" row. subcategory deliberately left
 *    unset — it has no real Selfridges URL for shade auto-fetch and no
 *    product_variants rows, so marking it shade-relevant would block
 *    add-to-cart entirely (picker renders but never resolves a shade).
 *
 * Images supplied locally by the user, cropped out of Instagram-story
 * screenshots (chrome/border removed, padded to 3:4).
 *
 * Run:  npx ts-node scripts/add-ct-trio-huda-cherry-lilac-products.ts
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

import { ensureSchema, getSql } from "../lib/db";

const gbp = (usd: number): number => Math.round((usd / 1.3) * 100) / 100;

const PRODUCTS = [
  {
    brand: "Charlotte Tilbury",
    name: "Unreal Blush + Glow Mini Trio",
    category: "Makeup",
    price_usd: 60,
    product_url: "https://seasonsbyb.co.uk/p/charlotte-tilbury-unreal-blush-glow-mini-trio",
    image_url: "/charlotte-tilbury-unreal-blush-glow-mini-trio.jpg"
  },
  {
    brand: "Huda Beauty",
    name: "Easy Bake Duo Loose Powder 6.5g — Cherry Lilac",
    category: "Makeup",
    price_usd: 55,
    product_url: "https://seasonsbyb.co.uk/p/huda-beauty-easy-bake-duo-loose-powder-cherry-lilac",
    image_url: "/huda-beauty-easy-bake-duo-loose-powder-cherry-lilac.jpg"
  }
];

const ORDER_NUMBER = "SBB-473702";

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  await ensureSchema();
  const sql = getSql();

  const created: Array<{ id: string; name: string; product_url: string; image_url: string }> = [];

  for (const p of PRODUCTS) {
    const priceGbp = gbp(p.price_usd);
    const rows = (await sql`
      insert into products (
        brand, name, category, price_gbp, price_usd, deliverable_lebanon,
        product_url, image_url, images, price_locked
      )
      values (
        ${p.brand}, ${p.name}, ${p.category}, ${priceGbp}, ${p.price_usd}, true,
        ${p.product_url}, ${p.image_url}, ${JSON.stringify([p.image_url])}::jsonb, true
      )
      on conflict (product_url) do update set
        brand = excluded.brand,
        name = excluded.name,
        category = excluded.category,
        price_gbp = excluded.price_gbp,
        price_usd = excluded.price_usd,
        deliverable_lebanon = true,
        image_url = excluded.image_url,
        images = excluded.images,
        price_locked = true,
        scraped_at = now()
      returning id
    `) as Array<{ id: string }>;
    console.log(`OK  ${p.brand} — ${p.name} — $${p.price_usd}  (${rows[0].id})`);
    created.push({ id: rows[0].id, name: p.name, product_url: p.product_url, image_url: p.image_url });
  }

  // Link the two order_items on SBB-473702 to the new catalogue rows.
  const order = (await sql`select id from orders where order_number = ${ORDER_NUMBER} limit 1`) as Array<{ id: string }>;
  if (!order.length) {
    console.error(`Order ${ORDER_NUMBER} not found — products created, order not updated.`);
    return;
  }
  const orderId = order[0].id;

  const ct = created[0];
  const huda = created[1];

  await sql`
    update order_items
    set product_url = ${ct.product_url}, image_url = ${ct.image_url}
    where order_id = ${orderId} and product_brand = 'Charlotte Tilbury'
  `;
  await sql`
    update order_items
    set product_name = ${huda.name}, product_url = ${huda.product_url}, image_url = ${huda.image_url}
    where order_id = ${orderId} and product_brand = 'Huda Beauty'
  `;
  console.log(`Linked order ${ORDER_NUMBER} line items to the new catalogue rows.`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
