/**
 * Holiday Edit — batch 4: Charlotte Tilbury Holiday Advent Calendar at $330,
 * per the user. Follows add-holiday-edit-products.ts / -2.ts / -3.ts.
 *
 * - No source page: Sephora ME (Qatar) does not list it, so the images are the
 *   three photos the user supplied (self-hosted in public/, the styled shot is
 *   the primary) and the description sticks to what the photos show.
 * - product_url is an internal key (seasonsbyb.co.uk/p/<slug>), as for other
 *   products without a retailer page.
 * - price_gbp is a derived reference value (usd / 1.3).
 *
 * Idempotent (upserts on product_url). Prints the product id so it can be
 * pasted into lib/holiday-collection.ts.
 *
 * Run:  npx ts-node scripts/add-holiday-edit-products-4.ts
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

interface ProductSeed {
  brand: string;
  name: string;
  category: string;
  price_usd: number;
  product_url: string;
  image_url: string;
  images: string[];
  description: string;
}

const PRODUCTS: ProductSeed[] = [
  {
    "brand": "Charlotte Tilbury",
    "name": "Holiday Advent Calendar",
    "category": "Makeup",
    "price_usd": 330,
    "product_url": "https://seasonsbyb.co.uk/p/charlotte-tilbury-holiday-advent-calendar",
    "image_url": "/charlotte-tilbury-holiday-advent-calendar-1.jpg",
    "images": [
      "/charlotte-tilbury-holiday-advent-calendar-1.jpg",
      "/charlotte-tilbury-holiday-advent-calendar-2.jpg",
      "/charlotte-tilbury-holiday-advent-calendar-3.jpg"
    ],
    "description": "A Charlotte Tilbury holiday advent calendar in a red, theatre-inspired keepsake cabinet, with star-shaped drawer pulls that each open to a beauty surprise."
  }
];

const round2 = (n: number): number => Math.round(n * 100) / 100;

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  await ensureSchema();
  const sql = getSql();

  for (const p of PRODUCTS) {
    const gbp = round2(p.price_usd / 1.3);
    const rows = (await sql`
      insert into products (
        brand, name, category, price_gbp, price_usd, deliverable_lebanon,
        product_url, image_url, images, description, price_locked
      )
      values (
        ${p.brand}, ${p.name}, ${p.category}, ${gbp}, ${p.price_usd}, true,
        ${p.product_url}, ${p.image_url}, ${JSON.stringify(p.images)}::jsonb,
        ${p.description}, true
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
        description = excluded.description,
        price_locked = true,
        archived = false,
        scraped_at = now()
      returning id
    `) as Array<{ id: string }>;
    console.log(`OK  ${rows[0].id}  ${p.brand} — ${p.name} — $${p.price_usd}`);
  }
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
