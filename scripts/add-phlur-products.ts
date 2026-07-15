/**
 * One-off import: 36 PHLUR products sourced from Sephora Qatar
 * screenshots. Pricing rule (per user instruction):
 *   price_usd = qar_price / 3.645 + 8   (single items)
 *   price_usd = qar_price / 3.645 + 13  (sets / kits / bundles)
 *
 * Before importing, the existing `products` table was checked for
 * brand ILIKE 'phlur' — 22 PHLUR products already existed (imported
 * earlier from Selfridges, e.g. "Vanilla Skin hair and body fragrance
 * mist 240ml"). 8 of the 44 candidate products from this screenshot
 * batch matched an existing scent/mist 1:1 and were skipped to avoid
 * duplicating the catalog:
 *   Vanilla Skin, Matcha Milk, Berry Cream, Heavy Cream, Vanilla Smoke,
 *   Peach Skin, Beach Skin, Caramel Skin (all "Hair and Body Fragrance
 *   Mist" variants).
 * The remaining 36 (new fragrance mist scents, EDPs in both travel and
 * full size, fragrance sets, body oils, fragrance oil, deodorants) are
 * genuinely new and inserted here.
 *
 * Two pairs of products shared an identical on-site title across two
 * screenshots with only price/bottle-size distinguishing them
 * ("Afterglow Eau de Parfum" and "Honey Moon Eau de Parfum", each at
 * QAR 120 travel vs QAR 365 full size) — the cheaper/travel bottle was
 * suffixed "- Travel Size" here for uniqueness, matching the naming
 * pattern already used for every other travel-size PHLUR EDP.
 *
 * price_gbp is a derived reference value (price_usd * 0.79) since the
 * source listing was in QAR, not GBP. Fragrance category items are
 * marked deliverable_lebanon: false, matching the existing catalog
 * convention; body oils and deodorants are true.
 *
 * Product images were cropped from the source screenshots and saved to
 * public/phlur-*.png.
 *
 * Run:  npx ts-node scripts/add-phlur-products.ts
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
  { brand: "PHLUR", name: "Mini Icons Duo", category: "Fragrance", price_gbp: 38.45, price_usd: 48.67, product_url: "https://www.sephora.qa/brand/phlur/#mini-icons-duo", image_url: "/phlur-mini-icons-duo.png", deliverable_lebanon: false },
  { brand: "PHLUR", name: "Decadent Layering Set", category: "Fragrance", price_gbp: 62.28, price_usd: 78.84, product_url: "https://www.sephora.qa/brand/phlur/#decadent-layering-set", image_url: "/phlur-decadent-layering-set.png", deliverable_lebanon: false },
  { brand: "PHLUR", name: "Cashmere Skin Hair and Body Mist", category: "Fragrance", price_gbp: 26.91, price_usd: 34.06, product_url: "https://www.sephora.qa/brand/phlur/#cashmere-skin-hair-body-mist", image_url: "/phlur-cashmere-skin-hair-body-mist.png", deliverable_lebanon: false },
  { brand: "PHLUR", name: "Berry Matcha Set", category: "Fragrance", price_gbp: 64.46, price_usd: 81.59, product_url: "https://www.sephora.qa/brand/phlur/#berry-matcha-set", image_url: "/phlur-berry-matcha-set.png", deliverable_lebanon: false },
  { brand: "PHLUR", name: "Golden Rule Eau de Parfum - Travel Size", category: "Fragrance", price_gbp: 32.33, price_usd: 40.92, product_url: "https://www.sephora.qa/brand/phlur/#golden-rule-edp-travel", image_url: "/phlur-golden-rule-edp-travel.png", deliverable_lebanon: false },
  { brand: "PHLUR", name: "Vanilla Skin Eau de Parfum", category: "Fragrance", price_gbp: 85.43, price_usd: 108.14, product_url: "https://www.sephora.qa/brand/phlur/#vanilla-skin-edp-full", image_url: "/phlur-vanilla-skin-edp-full.png", deliverable_lebanon: false },
  { brand: "PHLUR", name: "Rose Whip Eau de Parfum - Travel Size", category: "Fragrance", price_gbp: 32.33, price_usd: 40.92, product_url: "https://www.sephora.qa/brand/phlur/#rose-whip-edp-travel", image_url: "/phlur-rose-whip-edp-travel.png", deliverable_lebanon: false },
  { brand: "PHLUR", name: "Missing Person Eau de Parfum", category: "Fragrance", price_gbp: 85.43, price_usd: 108.14, product_url: "https://www.sephora.qa/brand/phlur/#missing-person-edp-full", image_url: "/phlur-missing-person-edp-full.png", deliverable_lebanon: false },
  { brand: "PHLUR", name: "Strawberry Letter Eau de Parfum - Travel Size", category: "Fragrance", price_gbp: 32.33, price_usd: 40.92, product_url: "https://www.sephora.qa/brand/phlur/#strawberry-letter-edp-travel", image_url: "/phlur-strawberry-letter-edp-travel.png", deliverable_lebanon: false },
  { brand: "PHLUR", name: "Soft Spot Eau de Parfum - Travel Size", category: "Fragrance", price_gbp: 32.33, price_usd: 40.92, product_url: "https://www.sephora.qa/brand/phlur/#soft-spot-edp-travel", image_url: "/phlur-soft-spot-edp-travel.png", deliverable_lebanon: false },
  { brand: "PHLUR", name: "Coffret Set", category: "Fragrance", price_gbp: 56.86, price_usd: 71.98, product_url: "https://www.sephora.qa/brand/phlur/#coffret-set", image_url: "/phlur-coffret-set.png", deliverable_lebanon: false },
  { brand: "PHLUR", name: "Mood Ring Eau de Parfum - Travel Size", category: "Fragrance", price_gbp: 32.33, price_usd: 40.92, product_url: "https://www.sephora.qa/brand/phlur/#mood-ring-edp-travel", image_url: "/phlur-mood-ring-edp-travel.png", deliverable_lebanon: false },
  { brand: "PHLUR", name: "Vanilla Skin Eau de Parfum - Travel Size", category: "Fragrance", price_gbp: 32.33, price_usd: 40.92, product_url: "https://www.sephora.qa/brand/phlur/#vanilla-skin-edp-travel", image_url: "/phlur-vanilla-skin-edp-travel.png", deliverable_lebanon: false },
  { brand: "PHLUR", name: "Afterglow Eau de Parfum - Travel Size", category: "Fragrance", price_gbp: 32.33, price_usd: 40.92, product_url: "https://www.sephora.qa/brand/phlur/#afterglow-edp-travel", image_url: "/phlur-afterglow-edp-travel.png", deliverable_lebanon: false },
  { brand: "PHLUR", name: "Amber Haze Hair and Body Fragrance Mist", category: "Fragrance", price_gbp: 37.75, price_usd: 47.78, product_url: "https://www.sephora.qa/brand/phlur/#amber-haze-hair-body-fragrance-mist", image_url: "/phlur-amber-haze-hair-body-fragrance-mist.png", deliverable_lebanon: false },
  { brand: "PHLUR", name: "Vanilla Nectar Hair and Body Fragrance Mist", category: "Fragrance", price_gbp: 26.91, price_usd: 34.06, product_url: "https://www.sephora.qa/brand/phlur/#vanilla-nectar-hair-body-fragrance-mist", image_url: "/phlur-vanilla-nectar-hair-body-fragrance-mist.png", deliverable_lebanon: false },
  { brand: "PHLUR", name: "Honey Moon Eau de Parfum - Travel Size", category: "Fragrance", price_gbp: 32.33, price_usd: 40.92, product_url: "https://www.sephora.qa/brand/phlur/#honey-moon-edp-travel", image_url: "/phlur-honey-moon-edp-travel.png", deliverable_lebanon: false },
  { brand: "PHLUR", name: "Strawberry Letter Eau de Parfum", category: "Fragrance", price_gbp: 85.43, price_usd: 108.14, product_url: "https://www.sephora.qa/brand/phlur/#strawberry-letter-edp-full", image_url: "/phlur-strawberry-letter-edp-full.png", deliverable_lebanon: false },
  { brand: "PHLUR", name: "Afterglow Eau de Parfum", category: "Fragrance", price_gbp: 85.43, price_usd: 108.14, product_url: "https://www.sephora.qa/brand/phlur/#afterglow-edp-full", image_url: "/phlur-afterglow-edp-full.png", deliverable_lebanon: false },
  { brand: "PHLUR", name: "Honey Moon Eau de Parfum", category: "Fragrance", price_gbp: 85.43, price_usd: 108.14, product_url: "https://www.sephora.qa/brand/phlur/#honey-moon-edp-full", image_url: "/phlur-honey-moon-edp-full.png", deliverable_lebanon: false },
  { brand: "PHLUR", name: "Missing Person Eau de Parfum - Travel Size", category: "Fragrance", price_gbp: 32.33, price_usd: 40.92, product_url: "https://www.sephora.qa/brand/phlur/#missing-person-edp-travel", image_url: "/phlur-missing-person-edp-travel.png", deliverable_lebanon: false },
  { brand: "PHLUR", name: "Rose Whip Deodorant", category: "Skincare", price_gbp: 22.58, price_usd: 28.58, product_url: "https://www.sephora.qa/brand/phlur/#rose-whip-deodorant", image_url: "/phlur-rose-whip-deodorant.png", deliverable_lebanon: true },
  { brand: "PHLUR", name: "Cherry Stem Eau de Parfum - Travel Size", category: "Fragrance", price_gbp: 32.33, price_usd: 40.92, product_url: "https://www.sephora.qa/brand/phlur/#cherry-stem-edp-travel", image_url: "/phlur-cherry-stem-edp-travel.png", deliverable_lebanon: false },
  { brand: "PHLUR", name: "Rose Whip Eau de Parfum", category: "Fragrance", price_gbp: 85.43, price_usd: 108.14, product_url: "https://www.sephora.qa/brand/phlur/#rose-whip-edp-full", image_url: "/phlur-rose-whip-edp-full.png", deliverable_lebanon: false },
  { brand: "PHLUR", name: "Missing Person Body Oil", category: "Skincare", price_gbp: 42.08, price_usd: 53.27, product_url: "https://www.sephora.qa/brand/phlur/#missing-person-body-oil", image_url: "/phlur-missing-person-body-oil.png", deliverable_lebanon: true },
  { brand: "PHLUR", name: "Deluxe Trio Set", category: "Fragrance", price_gbp: 39.53, price_usd: 50.04, product_url: "https://www.sephora.qa/brand/phlur/#deluxe-trio-set", image_url: "/phlur-deluxe-trio-set.png", deliverable_lebanon: false },
  { brand: "PHLUR", name: "Cherry Stem Eau de Parfum", category: "Fragrance", price_gbp: 85.43, price_usd: 108.14, product_url: "https://www.sephora.qa/brand/phlur/#cherry-stem-edp-full", image_url: "/phlur-cherry-stem-edp-full.png", deliverable_lebanon: false },
  { brand: "PHLUR", name: "Mood Ring Eau de Parfum", category: "Fragrance", price_gbp: 85.43, price_usd: 108.14, product_url: "https://www.sephora.qa/brand/phlur/#mood-ring-edp-full", image_url: "/phlur-mood-ring-edp-full.png", deliverable_lebanon: false },
  { brand: "PHLUR", name: "Soft Spot Eau de Parfum", category: "Fragrance", price_gbp: 85.43, price_usd: 108.14, product_url: "https://www.sephora.qa/brand/phlur/#soft-spot-edp-full", image_url: "/phlur-soft-spot-edp-full.png", deliverable_lebanon: false },
  { brand: "PHLUR", name: "Missing Person Fragrance Oil", category: "Fragrance", price_gbp: 42.08, price_usd: 53.27, product_url: "https://www.sephora.qa/brand/phlur/#missing-person-fragrance-oil", image_url: "/phlur-missing-person-fragrance-oil.png", deliverable_lebanon: false },
  { brand: "PHLUR", name: "Golden Rule Eau de Parfum", category: "Fragrance", price_gbp: 85.43, price_usd: 108.14, product_url: "https://www.sephora.qa/brand/phlur/#golden-rule-edp-full", image_url: "/phlur-golden-rule-edp-full.png", deliverable_lebanon: false },
  { brand: "PHLUR", name: "Father Figure Eau de Parfum - Travel Size", category: "Fragrance", price_gbp: 32.33, price_usd: 40.92, product_url: "https://www.sephora.qa/brand/phlur/#father-figure-edp-travel", image_url: "/phlur-father-figure-edp-travel.png", deliverable_lebanon: false },
  { brand: "PHLUR", name: "Vanilla Skin Body Oil", category: "Skincare", price_gbp: 42.08, price_usd: 53.27, product_url: "https://www.sephora.qa/brand/phlur/#vanilla-skin-body-oil", image_url: "/phlur-vanilla-skin-body-oil.png", deliverable_lebanon: true },
  { brand: "PHLUR", name: "Father Figure Deodorant", category: "Skincare", price_gbp: 22.58, price_usd: 28.58, product_url: "https://www.sephora.qa/brand/phlur/#father-figure-deodorant", image_url: "/phlur-father-figure-deodorant.png", deliverable_lebanon: true },
  { brand: "PHLUR", name: "Father Figure Eau de Parfum", category: "Fragrance", price_gbp: 85.43, price_usd: 108.14, product_url: "https://www.sephora.qa/brand/phlur/#father-figure-edp-full", image_url: "/phlur-father-figure-edp-full.png", deliverable_lebanon: false },
  { brand: "PHLUR", name: "Vanilla Skin Deodorant", category: "Skincare", price_gbp: 22.58, price_usd: 28.58, product_url: "https://www.sephora.qa/brand/phlur/#vanilla-skin-deodorant", image_url: "/phlur-vanilla-skin-deodorant.png", deliverable_lebanon: true }
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

  console.log(`\nInserted/updated ${inserted}/${PRODUCTS.length} PHLUR products.`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
