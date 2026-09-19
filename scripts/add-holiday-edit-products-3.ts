/**
 * Holiday Edit — batch 3: 2 more gift sets from Sephora Middle East (Qatar),
 * at the USD prices set by the user: Sephora Favorites "The Clean Routine"
 * ($72) and Yves Saint Laurent "Lash Clash Duo Gift Set" ($92).
 * Follows scripts/add-holiday-edit-products.ts (batch 1) and -2.ts (batch 2).
 *
 * - price_gbp is a derived reference value (usd / 1.3).
 * - Images downloaded from img-product.sephora.me, self-hosted in public/.
 * - Descriptions condensed from the Sephora ME product pages.
 *
 * Idempotent (upserts on product_url). Prints each product's id so the ids can
 * be pasted into lib/holiday-collection.ts.
 *
 * Run:  npx ts-node scripts/add-holiday-edit-products-3.ts
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
  description: string;
}

const PRODUCTS: ProductSeed[] = [
  {
    "brand": "Sephora Favorites",
    "name": "The Clean Routine",
    "category": "Makeup",
    "price_usd": 72,
    "product_url": "https://www.sephora.me/qa-en/p/the-clean-routine/P10064695",
    "image_url": "/sephora-favorites-the-clean-routine.jpg",
    "description": "A routine of clean beauty essentials from Clean at Sephora brands: ILIA Limitless Lash Mascara in After Midnight, Saie High-Shine Hydrating Lip Gloss Oil in Bounce, Kosas Cloud Set Loose Translucent Setting + Blurring Powder, a mini Tower 28 SOS Daily Rescue Facial Spray and a mini Gisou Hair Mask (30 ml)."
  },
  {
    "brand": "Yves Saint Laurent",
    "name": "Lash Clash Duo Gift Set",
    "category": "Makeup",
    "price_usd": 92,
    "product_url": "https://www.sephora.me/qa-en/p/lash-clash-duo-ramadan-gift-set/P10063664",
    "image_url": "/yves-saint-laurent-lash-clash-duo-ramadan-gift-set.jpg",
    "description": "A gift set of two Lash Clash Extreme Volume mascaras in Overnoir Black, presented in a gold-patterned YSL gift box."
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
        ${p.product_url}, ${p.image_url}, ${JSON.stringify([p.image_url])}::jsonb,
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
