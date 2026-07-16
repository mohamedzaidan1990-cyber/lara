/**
 * One-off import: 26 Rare Beauty products sourced from Sephora Qatar
 * screenshots. Pricing rule (per user instruction):
 *   price_usd = qar_price / 3.645 + 8   (single items)
 *   price_usd = qar_price / 3.645 + 13  (sets / kits / bundles)
 *
 * Before importing, the existing `products` table was checked for
 * brand ILIKE 'rare beauty' — 36 Rare Beauty products already existed.
 * 2 of the 28 candidates from this screenshot batch matched an existing
 * product 1:1 (same item, same converted price) and were skipped:
 *   Soft Pinch Tinted Lip Oil, Kind Words Matte Lip Liner.
 *
 * Per explicit instruction, images were NOT cropped from the
 * screenshots — each was sourced from rarebeauty.com's product pages
 * (via Shopify's public product .json / predictive-search endpoints,
 * cross-checked by title) or, for two items no longer sold on the
 * current US site (Selena's Faves full-size set, Find Comfort Mini
 * Lotion & Fragrance Set), from Space NK's listing of the same product.
 * Every image was visually verified against its screenshot before use.
 *
 * price_gbp is a derived reference value (price_usd * 0.79) since the
 * source listing was in QAR, not GBP.
 *
 * Run:  npx ts-node scripts/add-rare-beauty-products.ts
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
  price_gbp: number;
  price_usd: number;
  product_url: string;
  image_url: string;
  deliverable_lebanon: boolean;
}

const PRODUCTS: ProductSeed[] = [
  { brand: "Rare Beauty", name: "Liquid Touch Foundation Brush", category: "Beauty tools", price_gbp: 38.83, price_usd: 49.15, product_url: "https://www.sephora.qa/brand/rare-beauty/#liquid-touch-foundation-brush", image_url: "/rare-beauty-liquid-touch-foundation-brush.jpg", deliverable_lebanon: true },
  { brand: "Rare Beauty", name: "Soft Pinch Liquid Blush Brush", category: "Beauty tools", price_gbp: 34.5, price_usd: 43.67, product_url: "https://www.sephora.qa/brand/rare-beauty/#soft-pinch-liquid-blush-brush", image_url: "/rare-beauty-soft-pinch-liquid-blush-brush.jpg", deliverable_lebanon: true },
  { brand: "Rare Beauty", name: "Warm Wishes Angled Powder Brush", category: "Beauty tools", price_gbp: 41.0, price_usd: 51.9, product_url: "https://www.sephora.qa/brand/rare-beauty/#warm-wishes-angled-powder-brush", image_url: "/rare-beauty-warm-wishes-angled-powder-brush.jpg", deliverable_lebanon: true },
  { brand: "Rare Beauty", name: "Rare Fragrance Layering Balm", category: "Fragrance", price_gbp: 26.91, price_usd: 34.06, product_url: "https://www.sephora.qa/brand/rare-beauty/#rare-fragrance-layering-balm", image_url: "/rare-beauty-rare-fragrance-layering-balm.jpg", deliverable_lebanon: false },
  { brand: "Rare Beauty", name: "Selena's Faves Fragrance & Blush Set", category: "Fragrance", price_gbp: 93.71, price_usd: 118.62, product_url: "https://www.sephora.qa/brand/rare-beauty/#selenas-faves-fragrance-blush-set", image_url: "/rare-beauty-selenas-faves-fragrance-blush-set.jpg", deliverable_lebanon: false },
  { brand: "Rare Beauty", name: "Perfect Strokes Universal Volumizing Mascara Mini", category: "Makeup", price_gbp: 21.49, price_usd: 27.2, product_url: "https://www.sephora.qa/brand/rare-beauty/#perfect-strokes-universal-volumizing-mascara-mini", image_url: "/rare-beauty-perfect-strokes-universal-volumizing-mascara-mini.jpg", deliverable_lebanon: true },
  { brand: "Rare Beauty", name: "Stay Vulnerable Glossy Lip Balm", category: "Makeup", price_gbp: 30.16, price_usd: 38.18, product_url: "https://www.sephora.qa/brand/rare-beauty/#stay-vulnerable-glossy-lip-balm", image_url: "/rare-beauty-stay-vulnerable-glossy-lip-balm.jpg", deliverable_lebanon: true },
  { brand: "Rare Beauty", name: "Positive Light Precision Highlighter Brush", category: "Beauty tools", price_gbp: 27.99, price_usd: 35.43, product_url: "https://www.sephora.qa/brand/rare-beauty/#positive-light-precision-highlighter-brush", image_url: "/rare-beauty-positive-light-precision-highlighter-brush.jpg", deliverable_lebanon: true },
  { brand: "Rare Beauty", name: "Find Comfort Body & Hair Fragrance Mist - Feel Seen", category: "Fragrance", price_gbp: 38.83, price_usd: 49.15, product_url: "https://www.sephora.qa/brand/rare-beauty/#find-comfort-body-hair-fragrance-mist-feel-seen", image_url: "/rare-beauty-find-comfort-body-hair-fragrance-mist-feel-seen.jpg", deliverable_lebanon: false },
  { brand: "Rare Beauty", name: "Always An Optimist Illuminating Primer", category: "Makeup", price_gbp: 38.83, price_usd: 49.15, product_url: "https://www.sephora.qa/brand/rare-beauty/#always-an-optimist-illuminating-primer", image_url: "/rare-beauty-always-an-optimist-illuminating-primer.jpg", deliverable_lebanon: true },
  { brand: "Rare Beauty", name: "Find Comfort Hand Cream", category: "Skincare", price_gbp: 26.91, price_usd: 34.06, product_url: "https://www.sephora.qa/brand/rare-beauty/#find-comfort-hand-cream", image_url: "/rare-beauty-find-comfort-hand-cream.jpg", deliverable_lebanon: true },
  { brand: "Rare Beauty", name: "Find Comfort Hydrating Body Mousse to Oil - Feel Seen", category: "Skincare", price_gbp: 41.0, price_usd: 51.9, product_url: "https://www.sephora.qa/brand/rare-beauty/#find-comfort-hydrating-body-mousse-to-oil-feel-seen", image_url: "/rare-beauty-find-comfort-hydrating-body-mousse-to-oil-feel-seen.jpg", deliverable_lebanon: true },
  { brand: "Rare Beauty", name: "Soft Pinch Liquid Blush", category: "Makeup", price_gbp: 35.58, price_usd: 45.04, product_url: "https://www.sephora.qa/brand/rare-beauty/#soft-pinch-liquid-blush", image_url: "/rare-beauty-soft-pinch-liquid-blush.jpg", deliverable_lebanon: true },
  { brand: "Rare Beauty", name: "Brow Harmony Precision Pencil", category: "Makeup", price_gbp: 27.99, price_usd: 35.43, product_url: "https://www.sephora.qa/brand/rare-beauty/#brow-harmony-precision-pencil", image_url: "/rare-beauty-brow-harmony-precision-pencil.jpg", deliverable_lebanon: true },
  { brand: "Rare Beauty", name: "Stay Vulnerable Melting Blush", category: "Makeup", price_gbp: 34.5, price_usd: 43.67, product_url: "https://www.sephora.qa/brand/rare-beauty/#stay-vulnerable-melting-blush", image_url: "/rare-beauty-stay-vulnerable-melting-blush.jpg", deliverable_lebanon: true },
  { brand: "Rare Beauty", name: "Liquid Touch Brightening Concealer", category: "Makeup", price_gbp: 34.5, price_usd: 43.67, product_url: "https://www.sephora.qa/brand/rare-beauty/#liquid-touch-brightening-concealer", image_url: "/rare-beauty-liquid-touch-brightening-concealer.jpg", deliverable_lebanon: true },
  { brand: "Rare Beauty", name: "Mini Soft Pinch Liquid Blush", category: "Makeup", price_gbp: 23.66, price_usd: 29.95, product_url: "https://www.sephora.qa/brand/rare-beauty/#mini-soft-pinch-liquid-blush", image_url: "/rare-beauty-mini-soft-pinch-liquid-blush.jpg", deliverable_lebanon: true },
  { brand: "Rare Beauty", name: "Always An Optimist Pore Diffusing Primer", category: "Makeup", price_gbp: 38.83, price_usd: 49.15, product_url: "https://www.sephora.qa/brand/rare-beauty/#always-an-optimist-pore-diffusing-primer", image_url: "/rare-beauty-always-an-optimist-pore-diffusing-primer.jpg", deliverable_lebanon: true },
  { brand: "Rare Beauty", name: "Kind Words - Matte Lipstick", category: "Makeup", price_gbp: 29.08, price_usd: 36.81, product_url: "https://www.sephora.qa/brand/rare-beauty/#kind-words-matte-lipstick", image_url: "/rare-beauty-kind-words-matte-lipstick.jpg", deliverable_lebanon: true },
  { brand: "Rare Beauty", name: "Find Comfort Gentle Exfoliating Body Wash", category: "Skincare", price_gbp: 34.5, price_usd: 43.67, product_url: "https://www.sephora.qa/brand/rare-beauty/#find-comfort-gentle-exfoliating-body-wash", image_url: "/rare-beauty-find-comfort-gentle-exfoliating-body-wash.jpg", deliverable_lebanon: true },
  { brand: "Rare Beauty", name: "Find Comfort Hydrating Undereye Patches", category: "Skincare", price_gbp: 35.58, price_usd: 45.04, product_url: "https://www.sephora.qa/brand/rare-beauty/#find-comfort-hydrating-undereye-patches", image_url: "/rare-beauty-find-comfort-hydrating-undereye-patches.jpg", deliverable_lebanon: true },
  { brand: "Rare Beauty", name: "Find Comfort Bouncy Body Cream - Awaken Confidence", category: "Skincare", price_gbp: 47.5, price_usd: 60.13, product_url: "https://www.sephora.qa/brand/rare-beauty/#find-comfort-bouncy-body-cream-awaken-confidence", image_url: "/rare-beauty-find-comfort-bouncy-body-cream-awaken-confidence.jpg", deliverable_lebanon: true },
  { brand: "Rare Beauty", name: "Find Comfort Body & Hair Fragrance Mist - Awaken Confidence", category: "Fragrance", price_gbp: 38.83, price_usd: 49.15, product_url: "https://www.sephora.qa/brand/rare-beauty/#find-comfort-body-hair-fragrance-mist-awaken-confidence", image_url: "/rare-beauty-find-comfort-body-hair-fragrance-mist-awaken-confidence.jpg", deliverable_lebanon: false },
  { brand: "Rare Beauty", name: "Find Comfort Mini Lotion & Fragrance Set", category: "Fragrance", price_gbp: 44.95, price_usd: 56.9, product_url: "https://www.sephora.qa/brand/rare-beauty/#find-comfort-mini-lotion-fragrance-set", image_url: "/rare-beauty-find-comfort-mini-lotion-fragrance-set.jpg", deliverable_lebanon: false },
  { brand: "Rare Beauty", name: "Soft Pinch Cheek & Lip Trio", category: "Makeup", price_gbp: 49.28, price_usd: 62.38, product_url: "https://www.sephora.qa/brand/rare-beauty/#soft-pinch-cheek-lip-trio", image_url: "/rare-beauty-soft-pinch-cheek-lip-trio.jpg", deliverable_lebanon: true },
  { brand: "Rare Beauty", name: "Mini Find Comfort: Awaken Confidence Body Essentials", category: "Skincare", price_gbp: 40.61, price_usd: 51.41, product_url: "https://www.sephora.qa/brand/rare-beauty/#mini-find-comfort-awaken-confidence-body-essentials", image_url: "/rare-beauty-mini-find-comfort-awaken-confidence-body-essentials.jpg", deliverable_lebanon: true }
];

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Make sure .env.local exists in the project root.");
    process.exit(1);
  }

  await ensureSchema();
  const sql = getSql();

  let inserted = 0;
  for (const p of PRODUCTS) {
    try {
      await sql`
        insert into products (
          brand, name, category, price_gbp, price_usd, deliverable_lebanon, product_url, image_url
        )
        values (
          ${p.brand}, ${p.name}, ${p.category}, ${p.price_gbp}, ${p.price_usd},
          ${p.deliverable_lebanon}, ${p.product_url}, ${p.image_url}
        )
        on conflict (product_url) do update set
          brand = excluded.brand,
          name = excluded.name,
          category = excluded.category,
          price_gbp = excluded.price_gbp,
          price_usd = excluded.price_usd,
          deliverable_lebanon = excluded.deliverable_lebanon,
          image_url = excluded.image_url,
          scraped_at = now()
      `;
      inserted += 1;
      console.log(`  OK  ${p.name} — $${p.price_usd}`);
    } catch (err) {
      console.error(`FAIL  ${p.name}:`, err);
    }
  }

  console.log(`\nInserted/updated ${inserted}/${PRODUCTS.length} Rare Beauty products.`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
