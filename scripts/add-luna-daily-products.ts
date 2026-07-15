/**
 * One-off import: 29 Luna Daily products sourced from Sephora Qatar
 * screenshots. Pricing rule (per user instruction):
 *   price_usd = qar_price / 3.645 + 5
 * price_gbp is a derived reference value (price_usd * 0.79) since the
 * source listing was in QAR, not GBP.
 *
 * Product images were cropped from the source screenshots and saved to
 * public/luna-daily-*.png.
 *
 * Run:  npx ts-node scripts/add-luna-daily-products.ts
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
  { brand: "Luna Daily", name: "The All Over Deodorant", category: "Skincare", price_gbp: 22.37, price_usd: 28.32, product_url: "https://www.sephora.qa/brand/luna-daily/#the-all-over-deodorant-jasmine-ylang-ylang", image_url: "/luna-daily-the-all-over-deodorant-jasmine-ylang-ylang.png", deliverable_lebanon: true },
  { brand: "Luna Daily", name: "The Everywhere Spray-to-Wipe - Body Cleansing Spray", category: "Skincare", price_gbp: 15.87, price_usd: 20.09, product_url: "https://www.sephora.qa/brand/luna-daily/#the-everywhere-spray-to-wipe-body-cleansing-spray", image_url: "/luna-daily-the-everywhere-spray-to-wipe-body-cleansing-spray.png", deliverable_lebanon: true },
  { brand: "Luna Daily", name: "The Everywhere Spray to Wipe Cleansing Body Spray Duo", category: "Skincare", price_gbp: 31.04, price_usd: 39.29, product_url: "https://www.sephora.qa/brand/luna-daily/#the-everywhere-spray-to-wipe-cleansing-body-spray-duo", image_url: "/luna-daily-the-everywhere-spray-to-wipe-cleansing-body-spray-duo.png", deliverable_lebanon: true },
  { brand: "Luna Daily", name: "The Everywhere Spray-to-Wipe - Cooling WaterLily + Citrus", category: "Skincare", price_gbp: 21.29, price_usd: 26.95, product_url: "https://www.sephora.qa/brand/luna-daily/#the-everywhere-spray-to-wipe-cooling-waterlily-citrus", image_url: "/luna-daily-the-everywhere-spray-to-wipe-cooling-waterlily-citrus.png", deliverable_lebanon: true },
  { brand: "Luna Daily", name: "The Cooling All Over Deodorant", category: "Skincare", price_gbp: 22.37, price_usd: 28.32, product_url: "https://www.sephora.qa/brand/luna-daily/#the-cooling-all-over-deodorant", image_url: "/luna-daily-the-cooling-all-over-deodorant.png", deliverable_lebanon: true },
  { brand: "Luna Daily", name: "The Hydrating All Over Deodorant", category: "Skincare", price_gbp: 22.37, price_usd: 28.32, product_url: "https://www.sephora.qa/brand/luna-daily/#the-hydrating-all-over-deodorant", image_url: "/luna-daily-the-hydrating-all-over-deodorant.png", deliverable_lebanon: true },
  { brand: "Luna Daily", name: "The Mini Everywhere pH Balanced Wash", category: "Skincare", price_gbp: 13.05, price_usd: 16.52, product_url: "https://www.sephora.qa/brand/luna-daily/#the-mini-everywhere-ph-balanced-wash", image_url: "/luna-daily-the-mini-everywhere-ph-balanced-wash.png", deliverable_lebanon: true },
  { brand: "Luna Daily", name: "The Motherhood Wash With Arnica", category: "Skincare", price_gbp: 15.0, price_usd: 18.99, product_url: "https://www.sephora.qa/brand/luna-daily/#the-motherhood-wash-with-arnica", image_url: "/luna-daily-the-motherhood-wash-with-arnica.png", deliverable_lebanon: true },
  { brand: "Luna Daily", name: "The Post Birth Soothing Spray With Aloe", category: "Skincare", price_gbp: 22.16, price_usd: 28.05, product_url: "https://www.sephora.qa/brand/luna-daily/#the-post-birth-soothing-spray-with-aloe", image_url: "/luna-daily-the-post-birth-soothing-spray-with-aloe.png", deliverable_lebanon: true },
  { brand: "Luna Daily", name: "The Oil - For Ingrown Hairs (10ml)", category: "Skincare", price_gbp: 20.63, price_usd: 26.12, product_url: "https://www.sephora.qa/brand/luna-daily/#the-oil-for-ingrown-hairs-10ml", image_url: "/luna-daily-the-oil-for-ingrown-hairs-10ml.png", deliverable_lebanon: true },
  { brand: "Luna Daily", name: "The Oil - For Ingrown Hairs (30ml)", category: "Skincare", price_gbp: 37.33, price_usd: 47.25, product_url: "https://www.sephora.qa/brand/luna-daily/#the-oil-for-ingrown-hairs-30ml", image_url: "/luna-daily-the-oil-for-ingrown-hairs-30ml.png", deliverable_lebanon: true },
  { brand: "Luna Daily", name: "The Hospital Essentials Kit - For Pregnancy & Birth", category: "Skincare", price_gbp: 41.88, price_usd: 53.01, product_url: "https://www.sephora.qa/brand/luna-daily/#the-hospital-essentials-kit", image_url: "/luna-daily-the-hospital-essentials-kit.png", deliverable_lebanon: true },
  { brand: "Luna Daily", name: "The Nip & Lip Balm For Dry, Cracked Skin", category: "Skincare", price_gbp: 29.31, price_usd: 37.1, product_url: "https://www.sephora.qa/brand/luna-daily/#the-nip-lip-balm-dry-cracked-skin", image_url: "/luna-daily-the-nip-lip-balm-dry-cracked-skin.png", deliverable_lebanon: true },
  { brand: "Luna Daily", name: "The Perineal Prep Pregnancy Massage Oil", category: "Skincare", price_gbp: 33.21, price_usd: 42.04, product_url: "https://www.sephora.qa/brand/luna-daily/#the-perineal-prep-pregnancy-massage-oil", image_url: "/luna-daily-the-perineal-prep-pregnancy-massage-oil.png", deliverable_lebanon: true },
  { brand: "Luna Daily", name: "The Everywhere Wash + Care Kit - with Prebiotics", category: "Skincare", price_gbp: 26.05, price_usd: 32.98, product_url: "https://www.sephora.qa/brand/luna-daily/#the-everywhere-wash-care-kit-prebiotics", image_url: "/luna-daily-the-everywhere-wash-care-kit-prebiotics.png", deliverable_lebanon: true },
  { brand: "Luna Daily", name: "The Original Everywhere Spray-To-Wipe", category: "Skincare", price_gbp: 20.63, price_usd: 26.12, product_url: "https://www.sephora.qa/brand/luna-daily/#the-original-everywhere-spray-to-wipe", image_url: "/luna-daily-the-original-everywhere-spray-to-wipe.png", deliverable_lebanon: true },
  { brand: "Luna Daily", name: "The Post Birth Soothing Spray With Aloe Mini", category: "Skincare", price_gbp: 16.52, price_usd: 20.91, product_url: "https://www.sephora.qa/brand/luna-daily/#the-post-birth-soothing-spray-with-aloe-mini", image_url: "/luna-daily-the-post-birth-soothing-spray-with-aloe-mini.png", deliverable_lebanon: true },
  { brand: "Luna Daily", name: "The Skin Support Oil For Stretch Marks", category: "Skincare", price_gbp: 46.22, price_usd: 58.5, product_url: "https://www.sephora.qa/brand/luna-daily/#the-skin-support-oil-stretch-marks", image_url: "/luna-daily-the-skin-support-oil-stretch-marks.png", deliverable_lebanon: true },
  { brand: "Luna Daily", name: "The Fragrance Free Everywhere Spray-To-Wipe", category: "Skincare", price_gbp: 20.63, price_usd: 26.12, product_url: "https://www.sephora.qa/brand/luna-daily/#the-fragrance-free-everywhere-spray-to-wipe", image_url: "/luna-daily-the-fragrance-free-everywhere-spray-to-wipe.png", deliverable_lebanon: true },
  { brand: "Luna Daily", name: "The Hydrating Everywhere Spray-To-Wipe", category: "Skincare", price_gbp: 20.63, price_usd: 26.12, product_url: "https://www.sephora.qa/brand/luna-daily/#the-hydrating-everywhere-spray-to-wipe", image_url: "/luna-daily-the-hydrating-everywhere-spray-to-wipe.png", deliverable_lebanon: true },
  { brand: "Luna Daily", name: "The Repair Treatment - For Scars", category: "Skincare", price_gbp: 55.53, price_usd: 70.29, product_url: "https://www.sephora.qa/brand/luna-daily/#the-repair-treatment-for-scars", image_url: "/luna-daily-the-repair-treatment-for-scars.png", deliverable_lebanon: true },
  { brand: "Luna Daily", name: "The Everywhere pH Balanced Wash", category: "Skincare", price_gbp: 21.29, price_usd: 26.95, product_url: "https://www.sephora.qa/brand/luna-daily/#the-everywhere-ph-balanced-wash", image_url: "/luna-daily-the-everywhere-ph-balanced-wash.png", deliverable_lebanon: true },
  { brand: "Luna Daily", name: "The Everywhere Lotion - with Niacinamide", category: "Skincare", price_gbp: 27.79, price_usd: 35.18, product_url: "https://www.sephora.qa/brand/luna-daily/#the-everywhere-lotion-niacinamide", image_url: "/luna-daily-the-everywhere-lotion-niacinamide.png", deliverable_lebanon: true },
  { brand: "Luna Daily", name: "The Everywhere Wash", category: "Skincare", price_gbp: 27.79, price_usd: 35.18, product_url: "https://www.sephora.qa/brand/luna-daily/#the-everywhere-wash", image_url: "/luna-daily-the-everywhere-wash.png", deliverable_lebanon: true },
  { brand: "Luna Daily", name: "The Hydrating Everywhere Body Minis Kit Fresh Cotton", category: "Skincare", price_gbp: 31.04, price_usd: 39.29, product_url: "https://www.sephora.qa/brand/luna-daily/#the-hydrating-everywhere-body-minis-kit-fresh-cotton", image_url: "/luna-daily-the-hydrating-everywhere-body-minis-kit-fresh-cotton.png", deliverable_lebanon: true },
  { brand: "Luna Daily", name: "The Hydrating Fresh Cotton Everywhere Wash", category: "Skincare", price_gbp: 27.79, price_usd: 35.18, product_url: "https://www.sephora.qa/brand/luna-daily/#the-hydrating-fresh-cotton-everywhere-wash", image_url: "/luna-daily-the-hydrating-fresh-cotton-everywhere-wash.png", deliverable_lebanon: true },
  { brand: "Luna Daily", name: "The Fragrance-Free Everywhere Wash", category: "Skincare", price_gbp: 27.79, price_usd: 35.18, product_url: "https://www.sephora.qa/brand/luna-daily/#the-fragrance-free-everywhere-wash", image_url: "/luna-daily-the-fragrance-free-everywhere-wash.png", deliverable_lebanon: true },
  { brand: "Luna Daily", name: "The Everywhere Body Minis Kit Jasmine and Ylang Ylang", category: "Skincare", price_gbp: 31.04, price_usd: 39.29, product_url: "https://www.sephora.qa/brand/luna-daily/#the-everywhere-body-minis-kit-jasmine-ylang-ylang", image_url: "/luna-daily-the-everywhere-body-minis-kit-jasmine-ylang-ylang.png", deliverable_lebanon: true },
  { brand: "Luna Daily", name: "The Everywhere Exfoliator for KP", category: "Skincare", price_gbp: 27.79, price_usd: 35.18, product_url: "https://www.sephora.qa/brand/luna-daily/#the-everywhere-exfoliator-for-kp", image_url: "/luna-daily-the-everywhere-exfoliator-for-kp.png", deliverable_lebanon: true }
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

  console.log(`\nInserted/updated ${inserted}/${PRODUCTS.length} Luna Daily products.`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
