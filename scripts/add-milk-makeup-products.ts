/**
 * One-off import: 41 Milk Makeup products sourced from Sephora Qatar
 * screenshots. Pricing rule (per user instruction):
 *   price_usd = qar_price / 3.645 + 8   (single items)
 *   price_usd = qar_price / 3.645 + 13  (sets / kits / bundles)
 * price_gbp is a derived reference value (price_usd * 0.79) since the
 * source listing was in QAR, not GBP.
 *
 * Product images were cropped from the source screenshots and saved to
 * public/milk-makeup-*.png.
 *
 * Run:  npx ts-node scripts/add-milk-makeup-products.ts
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
  { brand: "Milk Makeup", name: "Cooling Water Jelly Tint - Sheer Lip + Cheek Stain", category: "Makeup", price_gbp: 26.91, price_usd: 34.06, product_url: "https://www.sephora.qa/brand/milk-makeup/#cooling-water-jelly-tint-sheer-lip-cheek-stain", image_url: "/milk-makeup-cooling-water-jelly-tint-sheer-lip-cheek-stain.png", deliverable_lebanon: true },
  { brand: "Milk Makeup", name: "Hydro Grip 12-Hour Hydrating Gel Stick", category: "Makeup", price_gbp: 32.33, price_usd: 40.92, product_url: "https://www.sephora.qa/brand/milk-makeup/#hydro-grip-12-hour-hydrating-gel-stick", image_url: "/milk-makeup-hydro-grip-12-hour-hydrating-gel-stick.png", deliverable_lebanon: true },
  { brand: "Milk Makeup", name: "Balmade Electrolyte Lip Balm", category: "Makeup", price_gbp: 22.58, price_usd: 28.58, product_url: "https://www.sephora.qa/brand/milk-makeup/#balmade-electrolyte-lip-balm", image_url: "/milk-makeup-balmade-electrolyte-lip-balm.png", deliverable_lebanon: true },
  { brand: "Milk Makeup", name: "Kush Lip Oil", category: "Makeup", price_gbp: 25.83, price_usd: 32.69, product_url: "https://www.sephora.qa/brand/milk-makeup/#kush-lip-oil", image_url: "/milk-makeup-kush-lip-oil.png", deliverable_lebanon: true },
  { brand: "Milk Makeup", name: "Cooling Water Jelly Shimmer Stick for Face and Eyes", category: "Makeup", price_gbp: 35.58, price_usd: 45.04, product_url: "https://www.sephora.qa/brand/milk-makeup/#cooling-water-jelly-shimmer-stick-face-eyes", image_url: "/milk-makeup-cooling-water-jelly-shimmer-stick-face-eyes.png", deliverable_lebanon: true },
  { brand: "Milk Makeup", name: "Ready to Jelly Cooling Water Jelly Tint Vault Gift Set", category: "Makeup", price_gbp: 63.37, price_usd: 80.22, product_url: "https://www.sephora.qa/brand/milk-makeup/#ready-to-jelly-vault-gift-set", image_url: "/milk-makeup-ready-to-jelly-vault-gift-set.png", deliverable_lebanon: true },
  { brand: "Milk Makeup", name: "Hydro Grip Haul", category: "Makeup", price_gbp: 39.53, price_usd: 50.04, product_url: "https://www.sephora.qa/brand/milk-makeup/#hydro-grip-haul", image_url: "/milk-makeup-hydro-grip-haul.png", deliverable_lebanon: true },
  { brand: "Milk Makeup", name: "The Jelly Lip Kit - Lip Stain & Lip Oil Duo", category: "Makeup", price_gbp: 42.78, price_usd: 54.15, product_url: "https://www.sephora.qa/brand/milk-makeup/#jelly-lip-kit-lip-stain-lip-oil-duo", image_url: "/milk-makeup-jelly-lip-kit-lip-stain-lip-oil-duo.png", deliverable_lebanon: true },
  { brand: "Milk Makeup", name: "Balmade Variety Pack Hydrating Lip Balm & Keychain", category: "Makeup", price_gbp: 39.53, price_usd: 50.04, product_url: "https://www.sephora.qa/brand/milk-makeup/#balmade-variety-pack-lip-balm-keychain", image_url: "/milk-makeup-balmade-variety-pack-lip-balm-keychain.png", deliverable_lebanon: true },
  { brand: "Milk Makeup", name: "Hydro Grip Set & Refresh Spray", category: "Makeup", price_gbp: 41.26, price_usd: 52.23, product_url: "https://www.sephora.qa/brand/milk-makeup/#hydro-grip-set-refresh-spray", image_url: "/milk-makeup-hydro-grip-set-refresh-spray.png", deliverable_lebanon: true },
  { brand: "Milk Makeup", name: "Cooling Water Jelly Tint - Phreeze", category: "Makeup", price_gbp: 27.99, price_usd: 35.43, product_url: "https://www.sephora.qa/brand/milk-makeup/#cooling-water-jelly-tint-phreeze", image_url: "/milk-makeup-cooling-water-jelly-tint-phreeze.png", deliverable_lebanon: true },
  { brand: "Milk Makeup", name: "Makeup Must-Haves Prime Set & Blush Trio", category: "Makeup", price_gbp: 52.54, price_usd: 66.5, product_url: "https://www.sephora.qa/brand/milk-makeup/#makeup-must-haves-prime-set-blush-trio", image_url: "/milk-makeup-makeup-must-haves-prime-set-blush-trio.png", deliverable_lebanon: true },
  { brand: "Milk Makeup", name: "Highlighter - Cream Highlighter Stick", category: "Makeup", price_gbp: 25.61, price_usd: 32.42, product_url: "https://www.sephora.qa/brand/milk-makeup/#highlighter-cream-highlighter-stick", image_url: "/milk-makeup-highlighter-cream-highlighter-stick.png", deliverable_lebanon: true },
  { brand: "Milk Makeup", name: "Mini Hydro Grip Set & Refresh Spray", category: "Makeup", price_gbp: 26.31, price_usd: 33.3, product_url: "https://www.sephora.qa/brand/milk-makeup/#mini-hydro-grip-set-refresh-spray", image_url: "/milk-makeup-mini-hydro-grip-set-refresh-spray.png", deliverable_lebanon: true },
  { brand: "Milk Makeup", name: "Pore Eclipse Matte Translucent Setting Powder", category: "Makeup", price_gbp: 33.2, price_usd: 42.02, product_url: "https://www.sephora.qa/brand/milk-makeup/#pore-eclipse-matte-translucent-setting-powder", image_url: "/milk-makeup-pore-eclipse-matte-translucent-setting-powder.png", deliverable_lebanon: true },
  { brand: "Milk Makeup", name: "Bionic Blush", category: "Makeup", price_gbp: 31.24, price_usd: 39.55, product_url: "https://www.sephora.qa/brand/milk-makeup/#bionic-blush", image_url: "/milk-makeup-bionic-blush.png", deliverable_lebanon: true },
  { brand: "Milk Makeup", name: "Cloud Glow Primer - Priming Foam with Brightening Vitamin C", category: "Makeup", price_gbp: 31.24, price_usd: 39.55, product_url: "https://www.sephora.qa/brand/milk-makeup/#cloud-glow-primer-brightening-vitamin-c", image_url: "/milk-makeup-cloud-glow-primer-brightening-vitamin-c.png", deliverable_lebanon: true },
  { brand: "Milk Makeup", name: "Bionic Bronzer", category: "Makeup", price_gbp: 34.93, price_usd: 44.21, product_url: "https://www.sephora.qa/brand/milk-makeup/#bionic-bronzer", image_url: "/milk-makeup-bionic-bronzer.png", deliverable_lebanon: true },
  { brand: "Milk Makeup", name: "Bionic Glow", category: "Makeup", price_gbp: 35.79, price_usd: 45.31, product_url: "https://www.sephora.qa/brand/milk-makeup/#bionic-glow", image_url: "/milk-makeup-bionic-glow.png", deliverable_lebanon: true },
  { brand: "Milk Makeup", name: "Pore Eclipse Non-Comedogenic Matte Blurring Stick", category: "Makeup", price_gbp: 35.58, price_usd: 45.04, product_url: "https://www.sephora.qa/brand/milk-makeup/#pore-eclipse-non-comedogenic-matte-blurring-stick", image_url: "/milk-makeup-pore-eclipse-non-comedogenic-matte-blurring-stick.png", deliverable_lebanon: true },
  { brand: "Milk Makeup", name: "Watermelon Jelly Glow - Brightening Serum Stick", category: "Makeup", price_gbp: 35.58, price_usd: 45.04, product_url: "https://www.sephora.qa/brand/milk-makeup/#watermelon-jelly-glow-brightening-serum-stick", image_url: "/milk-makeup-watermelon-jelly-glow-brightening-serum-stick.png", deliverable_lebanon: true },
  { brand: "Milk Makeup", name: "Pore Eclipse Matte Setting Spray", category: "Makeup", price_gbp: 36.44, price_usd: 46.13, product_url: "https://www.sephora.qa/brand/milk-makeup/#pore-eclipse-matte-setting-spray", image_url: "/milk-makeup-pore-eclipse-matte-setting-spray.png", deliverable_lebanon: true },
  { brand: "Milk Makeup", name: "Cooling Water Jelly Ice - Soothing Serum Stick", category: "Makeup", price_gbp: 35.58, price_usd: 45.04, product_url: "https://www.sephora.qa/brand/milk-makeup/#cooling-water-jelly-ice-soothing-serum-stick", image_url: "/milk-makeup-cooling-water-jelly-ice-soothing-serum-stick.png", deliverable_lebanon: true },
  { brand: "Milk Makeup", name: "Infinity Long Wear Eyeliner", category: "Makeup", price_gbp: 27.78, price_usd: 35.16, product_url: "https://www.sephora.qa/brand/milk-makeup/#infinity-long-wear-eyeliner", image_url: "/milk-makeup-infinity-long-wear-eyeliner.png", deliverable_lebanon: true },
  { brand: "Milk Makeup", name: "Sticks Party Mix", category: "Makeup", price_gbp: 43.86, price_usd: 55.52, product_url: "https://www.sephora.qa/brand/milk-makeup/#sticks-party-mix", image_url: "/milk-makeup-sticks-party-mix.png", deliverable_lebanon: true },
  { brand: "Milk Makeup", name: "Kush Clear Brow Gel", category: "Makeup", price_gbp: 30.81, price_usd: 39.0, product_url: "https://www.sephora.qa/brand/milk-makeup/#kush-clear-brow-gel", image_url: "/milk-makeup-kush-clear-brow-gel.png", deliverable_lebanon: true },
  { brand: "Milk Makeup", name: "Kush Brow Gel", category: "Makeup", price_gbp: 30.81, price_usd: 39.0, product_url: "https://www.sephora.qa/brand/milk-makeup/#kush-brow-gel", image_url: "/milk-makeup-kush-brow-gel.png", deliverable_lebanon: true },
  { brand: "Milk Makeup", name: "Hydro Grip Gel Tint - 12-Hour Hydrating Gel Skin Tint", category: "Makeup", price_gbp: 41.0, price_usd: 51.9, product_url: "https://www.sephora.qa/brand/milk-makeup/#hydro-grip-gel-tint-12-hour-hydrating-gel-skin-tint", image_url: "/milk-makeup-hydro-grip-gel-tint-12-hour-hydrating-gel-skin-tint.png", deliverable_lebanon: true },
  { brand: "Milk Makeup", name: "Odyssey Lip Oil Gloss - Hydrating Lip Gloss", category: "Makeup", price_gbp: 27.56, price_usd: 34.89, product_url: "https://www.sephora.qa/brand/milk-makeup/#odyssey-lip-oil-gloss", image_url: "/milk-makeup-odyssey-lip-oil-gloss.png", deliverable_lebanon: true },
  { brand: "Milk Makeup", name: "Hydro Grip Primer", category: "Makeup", price_gbp: 41.21, price_usd: 52.17, product_url: "https://www.sephora.qa/brand/milk-makeup/#hydro-grip-primer", image_url: "/milk-makeup-hydro-grip-primer.png", deliverable_lebanon: true },
  { brand: "Milk Makeup", name: "Matte Bronzer", category: "Makeup", price_gbp: 26.91, price_usd: 34.06, product_url: "https://www.sephora.qa/brand/milk-makeup/#matte-bronzer", image_url: "/milk-makeup-matte-bronzer.png", deliverable_lebanon: true },
  { brand: "Milk Makeup", name: "Sculpt Stick - Contour Stick", category: "Makeup", price_gbp: 29.73, price_usd: 37.63, product_url: "https://www.sephora.qa/brand/milk-makeup/#sculpt-stick-contour-stick", image_url: "/milk-makeup-sculpt-stick-contour-stick.png", deliverable_lebanon: true },
  { brand: "Milk Makeup", name: "Mini Kush Big Hit Volumizing Mascara", category: "Makeup", price_gbp: 20.41, price_usd: 25.83, product_url: "https://www.sephora.qa/brand/milk-makeup/#mini-kush-big-hit-volumizing-mascara", image_url: "/milk-makeup-mini-kush-big-hit-volumizing-mascara.png", deliverable_lebanon: true },
  { brand: "Milk Makeup", name: "Highlighter", category: "Makeup", price_gbp: 26.91, price_usd: 34.06, product_url: "https://www.sephora.qa/brand/milk-makeup/#highlighter", image_url: "/milk-makeup-highlighter.png", deliverable_lebanon: true },
  { brand: "Milk Makeup", name: "Pore Eclipse Mattifying + Blurring Primer", category: "Makeup", price_gbp: 41.0, price_usd: 51.9, product_url: "https://www.sephora.qa/brand/milk-makeup/#pore-eclipse-mattifying-blurring-primer", image_url: "/milk-makeup-pore-eclipse-mattifying-blurring-primer.png", deliverable_lebanon: true },
  { brand: "Milk Makeup", name: "Lip + Cheek", category: "Makeup", price_gbp: 26.91, price_usd: 34.06, product_url: "https://www.sephora.qa/brand/milk-makeup/#lip-cheek", image_url: "/milk-makeup-lip-cheek.png", deliverable_lebanon: true },
  { brand: "Milk Makeup", name: "Sunshine Under Eye Tint + Brighten", category: "Makeup", price_gbp: 34.5, price_usd: 43.67, product_url: "https://www.sephora.qa/brand/milk-makeup/#sunshine-under-eye-tint-brighten", image_url: "/milk-makeup-sunshine-under-eye-tint-brighten.png", deliverable_lebanon: true },
  { brand: "Milk Makeup", name: "Rise Mascara", category: "Makeup", price_gbp: 32.76, price_usd: 41.47, product_url: "https://www.sephora.qa/brand/milk-makeup/#rise-mascara", image_url: "/milk-makeup-rise-mascara.png", deliverable_lebanon: true },
  { brand: "Milk Makeup", name: "Cooling Water", category: "Makeup", price_gbp: 38.83, price_usd: 49.15, product_url: "https://www.sephora.qa/brand/milk-makeup/#cooling-water", image_url: "/milk-makeup-cooling-water.png", deliverable_lebanon: true },
  { brand: "Milk Makeup", name: "Kush High Roll Mascara - Defining + Volumizing Tubing", category: "Makeup", price_gbp: 31.24, price_usd: 39.55, product_url: "https://www.sephora.qa/brand/milk-makeup/#kush-high-roll-mascara", image_url: "/milk-makeup-kush-high-roll-mascara.png", deliverable_lebanon: true },
  { brand: "Milk Makeup", name: "Hydro Grip + Glow Primer", category: "Makeup", price_gbp: 33.41, price_usd: 42.29, product_url: "https://www.sephora.qa/brand/milk-makeup/#hydro-grip-glow-primer", image_url: "/milk-makeup-hydro-grip-glow-primer.png", deliverable_lebanon: true }
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

  console.log(`\nInserted/updated ${inserted}/${PRODUCTS.length} Milk Makeup products.`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
