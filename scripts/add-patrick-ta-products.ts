/**
 * One-off import: 27 Patrick Ta products sourced from Sephora Qatar
 * screenshots. Pricing rule (per user instruction):
 *   price_usd = qar_price / 3.645 + 8   (single items)
 *   price_usd = qar_price / 3.645 + 13  (sets / kits / bundles)
 * None of this batch were genuine multi-item sets/kits/bundles (the
 * "Duo" and "Double-Take" products are single 2-in-1 compacts, not
 * bundles of separate items), so all 27 use the +8 rule.
 * price_gbp is a derived reference value (price_usd * 0.79) since the
 * source listing was in QAR, not GBP.
 *
 * The one fragrance item (Hair & Body Fragrance Mist) is marked
 * deliverable_lebanon: false, matching the existing catalog convention
 * that fragrances are not deliverable.
 *
 * Product images were cropped from the source screenshots and saved to
 * public/patrick-ta-*.png.
 *
 * Run:  npx ts-node scripts/add-patrick-ta-products.ts
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
  { brand: "Patrick Ta", name: "Major Skin Soft Blur Brightening Concealer", category: "Makeup", price_gbp: 33.41, price_usd: 42.29, product_url: "https://www.sephora.qa/brand/patrick-ta/#major-skin-soft-blur-brightening-concealer", image_url: "/patrick-ta-major-skin-soft-blur-brightening-concealer.png", deliverable_lebanon: true },
  { brand: "Patrick Ta", name: "Major Dimension Eye Illusion Eyeshadow Duo", category: "Makeup", price_gbp: 39.91, price_usd: 50.52, product_url: "https://www.sephora.qa/brand/patrick-ta/#major-dimension-eye-illusion-eyeshadow-duo", image_url: "/patrick-ta-major-dimension-eye-illusion-eyeshadow-duo.png", deliverable_lebanon: true },
  { brand: "Patrick Ta", name: "Major Dimension Essential Artistry Edit Eyeshadow Palette", category: "Makeup", price_gbp: 42.08, price_usd: 53.27, product_url: "https://www.sephora.qa/brand/patrick-ta/#major-dimension-essential-artistry-edit-eyeshadow", image_url: "/patrick-ta-major-dimension-essential-artistry-edit-eyeshadow.png", deliverable_lebanon: true },
  { brand: "Patrick Ta", name: "Major Moisture Smoothing Lip Balm", category: "Makeup", price_gbp: 26.91, price_usd: 34.06, product_url: "https://www.sephora.qa/brand/patrick-ta/#major-moisture-smoothing-lip-balm", image_url: "/patrick-ta-major-moisture-smoothing-lip-balm.png", deliverable_lebanon: true },
  { brand: "Patrick Ta", name: "Major Volume Plumping Lip Gloss", category: "Makeup", price_gbp: 26.91, price_usd: 34.06, product_url: "https://www.sephora.qa/brand/patrick-ta/#major-volume-plumping-lip-gloss", image_url: "/patrick-ta-major-volume-plumping-lip-gloss.png", deliverable_lebanon: true },
  { brand: "Patrick Ta", name: "Major Skin Hydra-Luxe Luminous Skin Perfecting Foundation", category: "Makeup", price_gbp: 52.91, price_usd: 66.98, product_url: "https://www.sephora.qa/brand/patrick-ta/#major-skin-hydra-luxe-luminous-skin-perfecting-foundation", image_url: "/patrick-ta-major-skin-hydra-luxe-luminous-skin-perfecting-foundation.png", deliverable_lebanon: true },
  { brand: "Patrick Ta", name: "Major Brow Defining Pencil", category: "Makeup", price_gbp: 27.99, price_usd: 35.43, product_url: "https://www.sephora.qa/brand/patrick-ta/#major-brow-defining-pencil", image_url: "/patrick-ta-major-brow-defining-pencil.png", deliverable_lebanon: true },
  { brand: "Patrick Ta", name: "Mini Major Headlines Double-Take Crème and Powder Blush", category: "Makeup", price_gbp: 26.91, price_usd: 34.06, product_url: "https://www.sephora.qa/brand/patrick-ta/#mini-major-headlines-double-take-creme-powder-blush", image_url: "/patrick-ta-mini-major-headlines-double-take-creme-powder-blush.png", deliverable_lebanon: true },
  { brand: "Patrick Ta", name: "Precision Blush Brush", category: "Beauty tools", price_gbp: 38.83, price_usd: 49.15, product_url: "https://www.sephora.qa/brand/patrick-ta/#precision-blush-brush", image_url: "/patrick-ta-precision-blush-brush.png", deliverable_lebanon: true },
  { brand: "Patrick Ta", name: "Brushes - Dual-Ended Contour Brush", category: "Beauty tools", price_gbp: 43.17, price_usd: 54.64, product_url: "https://www.sephora.qa/brand/patrick-ta/#brushes-dual-ended-contour-brush", image_url: "/patrick-ta-brushes-dual-ended-contour-brush.png", deliverable_lebanon: true },
  { brand: "Patrick Ta", name: "Major Volume Gloss Mini", category: "Makeup", price_gbp: 18.24, price_usd: 23.09, product_url: "https://www.sephora.qa/brand/patrick-ta/#major-volume-gloss-mini", image_url: "/patrick-ta-major-volume-gloss-mini.png", deliverable_lebanon: true },
  { brand: "Patrick Ta", name: "Dual-Ended Blush Brush", category: "Beauty tools", price_gbp: 43.17, price_usd: 54.64, product_url: "https://www.sephora.qa/brand/patrick-ta/#dual-ended-blush-brush", image_url: "/patrick-ta-dual-ended-blush-brush.png", deliverable_lebanon: true },
  { brand: "Patrick Ta", name: "Brushes - Dual-Ended Foundation Brush", category: "Beauty tools", price_gbp: 43.17, price_usd: 54.64, product_url: "https://www.sephora.qa/brand/patrick-ta/#brushes-dual-ended-foundation-brush", image_url: "/patrick-ta-brushes-dual-ended-foundation-brush.png", deliverable_lebanon: true },
  { brand: "Patrick Ta", name: "Major Glow Body Balm", category: "Skincare", price_gbp: 46.41, price_usd: 58.75, product_url: "https://www.sephora.qa/brand/patrick-ta/#major-glow-body-balm", image_url: "/patrick-ta-major-glow-body-balm.png", deliverable_lebanon: true },
  { brand: "Patrick Ta", name: "Dual-Ended Eyeshadow Brush", category: "Beauty tools", price_gbp: 30.16, price_usd: 38.18, product_url: "https://www.sephora.qa/brand/patrick-ta/#dual-ended-eyeshadow-brush", image_url: "/patrick-ta-dual-ended-eyeshadow-brush.png", deliverable_lebanon: true },
  { brand: "Patrick Ta", name: "Major Dimension Eyeshadow Palette", category: "Makeup", price_gbp: 61.59, price_usd: 77.96, product_url: "https://www.sephora.qa/brand/patrick-ta/#major-dimension-eyeshadow-palette", image_url: "/patrick-ta-major-dimension-eyeshadow-palette.png", deliverable_lebanon: true },
  { brand: "Patrick Ta", name: "Major Skin 5-in-1 Blending Sponge", category: "Beauty tools", price_gbp: 22.58, price_usd: 28.58, product_url: "https://www.sephora.qa/brand/patrick-ta/#major-skin-5-in-1-blending-sponge", image_url: "/patrick-ta-major-skin-5-in-1-blending-sponge.png", deliverable_lebanon: true },
  { brand: "Patrick Ta", name: "Body Brush", category: "Beauty tools", price_gbp: 34.5, price_usd: 43.67, product_url: "https://www.sephora.qa/brand/patrick-ta/#body-brush", image_url: "/patrick-ta-body-brush.png", deliverable_lebanon: true },
  { brand: "Patrick Ta", name: "Major Glow Nourishing Bronzing Body Oil", category: "Skincare", price_gbp: 47.5, price_usd: 60.13, product_url: "https://www.sephora.qa/brand/patrick-ta/#major-glow-nourishing-bronzing-body-oil", image_url: "/patrick-ta-major-glow-nourishing-bronzing-body-oil.png", deliverable_lebanon: true },
  { brand: "Patrick Ta", name: "Major Glow Hair & Body Fragrance Mist", category: "Fragrance", price_gbp: 42.08, price_usd: 53.27, product_url: "https://www.sephora.qa/brand/patrick-ta/#major-glow-hair-body-fragrance-mist", image_url: "/patrick-ta-major-glow-hair-body-fragrance-mist.png", deliverable_lebanon: false },
  { brand: "Patrick Ta", name: "Major Glow High Shine Nourishing Body Oil", category: "Skincare", price_gbp: 42.08, price_usd: 53.27, product_url: "https://www.sephora.qa/brand/patrick-ta/#major-glow-high-shine-nourishing-body-oil", image_url: "/patrick-ta-major-glow-high-shine-nourishing-body-oil.png", deliverable_lebanon: true },
  { brand: "Patrick Ta", name: "Major Glow High Shine Skin Perfecting Body Crème", category: "Skincare", price_gbp: 52.91, price_usd: 66.98, product_url: "https://www.sephora.qa/brand/patrick-ta/#major-glow-high-shine-skin-perfecting-body-creme", image_url: "/patrick-ta-major-glow-high-shine-skin-perfecting-body-creme.png", deliverable_lebanon: true },
  { brand: "Patrick Ta", name: "Brushes - Dual-Ended Concealer Brush", category: "Beauty tools", price_gbp: 30.16, price_usd: 38.18, product_url: "https://www.sephora.qa/brand/patrick-ta/#brushes-dual-ended-concealer-brush", image_url: "/patrick-ta-brushes-dual-ended-concealer-brush.png", deliverable_lebanon: true },
  { brand: "Patrick Ta", name: "Brushes - Precision Dual-Ended Nose Contour Brush", category: "Beauty tools", price_gbp: 30.16, price_usd: 38.18, product_url: "https://www.sephora.qa/brand/patrick-ta/#brushes-precision-dual-ended-nose-contour-brush", image_url: "/patrick-ta-brushes-precision-dual-ended-nose-contour-brush.png", deliverable_lebanon: true },
  { brand: "Patrick Ta", name: "Major Headlines Double-Take Crème & Powder Blush", category: "Makeup", price_gbp: 38.83, price_usd: 49.15, product_url: "https://www.sephora.qa/brand/patrick-ta/#major-headlines-double-take-creme-powder-blush", image_url: "/patrick-ta-major-headlines-double-take-creme-powder-blush.png", deliverable_lebanon: true },
  { brand: "Patrick Ta", name: "Major Glow Crème and Powder Light Reflecting Highlighter", category: "Makeup", price_gbp: 38.83, price_usd: 49.15, product_url: "https://www.sephora.qa/brand/patrick-ta/#major-glow-creme-powder-light-reflecting-highlighter", image_url: "/patrick-ta-major-glow-creme-powder-light-reflecting-highlighter.png", deliverable_lebanon: true },
  { brand: "Patrick Ta", name: "Major Sculpt Crème Contour & Powder Bronzer", category: "Makeup", price_gbp: 39.91, price_usd: 50.52, product_url: "https://www.sephora.qa/brand/patrick-ta/#major-sculpt-creme-contour-powder-bronzer", image_url: "/patrick-ta-major-sculpt-creme-contour-powder-bronzer.png", deliverable_lebanon: true }
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

  console.log(`\nInserted/updated ${inserted}/${PRODUCTS.length} Patrick Ta products.`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
