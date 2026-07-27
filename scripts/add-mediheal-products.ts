/**
 * One-off import: 28 MEDIHEAL products sourced from Sephora Qatar screenshots.
 *
 * Pricing rule (per user instruction):
 *   price_usd = ceil(qar_price / 3.645 + 5)
 * Rounded UP to the nearest whole dollar, matching the convention used for
 * the earlier QAR-screenshot import (see add-anua-products.ts).
 *
 * All 28 products are new (no existing MEDIHEAL rows in the catalogue).
 * product_url and images were pulled directly from sephora.me's Mediheal
 * brand page (embedded React flight JSON, 28 items, prices cross-checked
 * against the screenshots) rather than reconstructed from the screenshots
 * themselves. Images are the site's hi-res product photos (img-product
 * .sephora.me / commercecloud CDN), downloaded and saved under public/ as
 * local files.
 *
 * price_gbp is a derived reference value (price_usd * 0.79), since the
 * source listing was in QAR, not GBP.
 *
 * Run:  npx ts-node scripts/add-mediheal-products.ts
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
  { brand: "MEDIHEAL", name: "Madecassoside Blemish Pad", category: "Skincare", price_gbp: 29.23, price_usd: 37, product_url: "https://www.sephora.me/qa-en/p/madecassoside-blemish-pad/P10064538?productVariantId=835782", image_url: "/mediheal-madecassoside-blemish-pad.jpg", deliverable_lebanon: true },
  { brand: "MEDIHEAL", name: "PDRN Lifting Pad", category: "Skincare", price_gbp: 29.23, price_usd: 37, product_url: "https://www.sephora.me/qa-en/p/pdrn-lifting-pad/P10064539?productVariantId=835783", image_url: "/mediheal-pdrn-lifting-pad.jpg", deliverable_lebanon: true },
  { brand: "MEDIHEAL", name: "Essential Mask_Madecassoside", category: "Skincare", price_gbp: 11.85, price_usd: 15, product_url: "https://www.sephora.me/qa-en/p/essential-mask-madecassoside/P10064551?productVariantId=835795", image_url: "/mediheal-essential-mask-madecassoside.jpg", deliverable_lebanon: true },
  { brand: "MEDIHEAL", name: "Madecassoside Serum", category: "Skincare", price_gbp: 22.12, price_usd: 28, product_url: "https://www.sephora.me/qa-en/p/madecassoside-serum/P10064560?productVariantId=835805", image_url: "/mediheal-madecassoside-serum.jpeg", deliverable_lebanon: true },
  { brand: "MEDIHEAL", name: "Teatree Trouble Calming Pad", category: "Skincare", price_gbp: 29.23, price_usd: 37, product_url: "https://www.sephora.me/qa-en/p/teatree-trouble-calming-pad/P10064540?productVariantId=835784", image_url: "/mediheal-teatree-trouble-calming-pad.jpg", deliverable_lebanon: true },
  { brand: "MEDIHEAL", name: "Madecassoside Derma Cream", category: "Skincare", price_gbp: 23.7, price_usd: 30, product_url: "https://www.sephora.me/qa-en/p/madecassoside-derma-cream/P10064549?productVariantId=835793", image_url: "/mediheal-madecassoside-derma-cream.jpeg", deliverable_lebanon: true },
  { brand: "MEDIHEAL", name: "Collagen Capsule Patch Retinol", category: "Skincare", price_gbp: 26.86, price_usd: 34, product_url: "https://www.sephora.me/qa-en/p/collagen-capsule-patch-retinol/P10064545?productVariantId=835789", image_url: "/mediheal-collagen-capsule-patch-retinol.jpg", deliverable_lebanon: true },
  { brand: "MEDIHEAL", name: "Collagen Firming Pad", category: "Skincare", price_gbp: 29.23, price_usd: 37, product_url: "https://www.sephora.me/qa-en/p/collagen-firming-pad/P10064541?productVariantId=835785", image_url: "/mediheal-collagen-firming-pad.jpg", deliverable_lebanon: true },
  { brand: "MEDIHEAL", name: "Essential Mask_Rose PDRN", category: "Skincare", price_gbp: 11.85, price_usd: 15, product_url: "https://www.sephora.me/qa-en/p/essential-mask-rose-pdrn/P10064554?productVariantId=835798", image_url: "/mediheal-essential-mask-rose-pdrn.jpg", deliverable_lebanon: true },
  { brand: "MEDIHEAL", name: "Hyaluronate Hydration Pad", category: "Skincare", price_gbp: 29.23, price_usd: 37, product_url: "https://www.sephora.me/qa-en/p/hyaluronate-hydration-pad/P10064542?productVariantId=835786", image_url: "/mediheal-hyaluronate-hydration-pad.jpg", deliverable_lebanon: true },
  { brand: "MEDIHEAL", name: "Madecassoside Derma Cream Pack Cleanser", category: "Skincare", price_gbp: 22.12, price_usd: 28, product_url: "https://www.sephora.me/qa-en/p/madecassoside-derma-cream-pack-cleanser/P10064547?productVariantId=835791", image_url: "/mediheal-madecassoside-derma-cream-pack-cleanser.jpg", deliverable_lebanon: true },
  { brand: "MEDIHEAL", name: "Hyaluronate Serum", category: "Skincare", price_gbp: 22.12, price_usd: 28, product_url: "https://www.sephora.me/qa-en/p/hyaluronate-serum/P10064562?productVariantId=835807", image_url: "/mediheal-hyaluronate-serum.jpeg", deliverable_lebanon: true },
  { brand: "MEDIHEAL", name: "Essential Mask_Teatree", category: "Skincare", price_gbp: 11.85, price_usd: 15, product_url: "https://www.sephora.me/qa-en/p/essential-mask-teatree/P10064552?productVariantId=835796", image_url: "/mediheal-essential-mask-teatree.jpg", deliverable_lebanon: true },
  { brand: "MEDIHEAL", name: "PDRN Serum", category: "Skincare", price_gbp: 22.12, price_usd: 28, product_url: "https://www.sephora.me/qa-en/p/pdrn-serum/P10064564?productVariantId=835809", image_url: "/mediheal-pdrn-serum.jpeg", deliverable_lebanon: true },
  { brand: "MEDIHEAL", name: "Vitamin C Bright Toning Pad", category: "Skincare", price_gbp: 29.23, price_usd: 37, product_url: "https://www.sephora.me/qa-en/p/vitamin-c-bright-toning-pad/P10064543?productVariantId=835787", image_url: "/mediheal-vitamin-c-bright-toning-pad.jpg", deliverable_lebanon: true },
  { brand: "MEDIHEAL", name: "Collagen Firming Volume Serum", category: "Skincare", price_gbp: 22.12, price_usd: 28, product_url: "https://www.sephora.me/qa-en/p/collagen-firming-volume-serum/P10064563?productVariantId=835808", image_url: "/mediheal-collagen-firming-volume-serum.jpeg", deliverable_lebanon: true },
  { brand: "MEDIHEAL", name: "Collagen Essential Mask_Core Firming", category: "Skincare", price_gbp: 11.85, price_usd: 15, product_url: "https://www.sephora.me/qa-en/p/collagen-essential-mask-core-firming/P10064553?productVariantId=835797", image_url: "/mediheal-collagen-essential-mask-core-firming.jpg", deliverable_lebanon: true },
  { brand: "MEDIHEAL", name: "Collagen Capsule Patch Vitamin C", category: "Skincare", price_gbp: 26.86, price_usd: 34, product_url: "https://www.sephora.me/qa-en/p/collagen-capsule-patch-vitamin-c/P10064546?productVariantId=835790", image_url: "/mediheal-collagen-capsule-patch-vitamin-c.jpg", deliverable_lebanon: true },
  { brand: "MEDIHEAL", name: "Teatree Serum", category: "Skincare", price_gbp: 22.12, price_usd: 28, product_url: "https://www.sephora.me/qa-en/p/teatree-serum/P10064561?productVariantId=835806", image_url: "/mediheal-teatree-serum.jpeg", deliverable_lebanon: true },
  { brand: "MEDIHEAL", name: "Vitamin C Serum", category: "Skincare", price_gbp: 22.12, price_usd: 28, product_url: "https://www.sephora.me/qa-en/p/vitamin-c-serum/P10064565?productVariantId=835810", image_url: "/mediheal-vitamin-c-serum.jpeg", deliverable_lebanon: true },
  { brand: "MEDIHEAL", name: "Essential Mask_Vitamin C", category: "Skincare", price_gbp: 11.85, price_usd: 15, product_url: "https://www.sephora.me/qa-en/p/essential-mask-vitamin-c/P10064555?productVariantId=835799", image_url: "/mediheal-essential-mask-vitamin-c.jpg", deliverable_lebanon: true },
  { brand: "MEDIHEAL", name: "Essential Mask_Ceramide", category: "Skincare", price_gbp: 11.85, price_usd: 15, product_url: "https://www.sephora.me/qa-en/p/essential-mask-ceramide/P10064557?productVariantId=835801", image_url: "/mediheal-essential-mask-ceramide.jpg", deliverable_lebanon: true },
  { brand: "MEDIHEAL", name: "Essential Mask_Hyaluronate", category: "Skincare", price_gbp: 11.85, price_usd: 15, product_url: "https://www.sephora.me/qa-en/p/essential-mask-hyaluronate/P10064556?productVariantId=835800", image_url: "/mediheal-essential-mask-hyaluronate.jpg", deliverable_lebanon: true },
  { brand: "MEDIHEAL", name: "Hyper Collagen Mask", category: "Skincare", price_gbp: 19.75, price_usd: 25, product_url: "https://www.sephora.me/qa-en/p/hyper-collagen-mask/P10064558?productVariantId=835803", image_url: "/mediheal-hyper-collagen-mask.jpg", deliverable_lebanon: true },
  { brand: "MEDIHEAL", name: "Hyper PDRN Mask", category: "Skincare", price_gbp: 19.75, price_usd: 25, product_url: "https://www.sephora.me/qa-en/p/hyper-pdrn-mask/P10064559?productVariantId=835804", image_url: "/mediheal-hyper-pdrn-mask.jpg", deliverable_lebanon: true },
  { brand: "MEDIHEAL", name: "Phyto-Enzyme Clear Peeling Pad", category: "Skincare", price_gbp: 29.23, price_usd: 37, product_url: "https://www.sephora.me/qa-en/p/phyto-enzyme-clear-peeling-pad/P10064544?productVariantId=835788", image_url: "/mediheal-phyto-enzyme-clear-peeling-pad.jpg", deliverable_lebanon: true },
  { brand: "MEDIHEAL", name: "Rose PDRN Derma Cream Pack Cleanser", category: "Skincare", price_gbp: 22.12, price_usd: 28, product_url: "https://www.sephora.me/qa-en/p/rose-pdrn-derma-cream-pack-cleanser/P10064548?productVariantId=835792", image_url: "/mediheal-rose-pdrn-derma-cream-pack-cleanser.jpg", deliverable_lebanon: true },
  { brand: "MEDIHEAL", name: "PDRN Derma Cream", category: "Skincare", price_gbp: 23.7, price_usd: 30, product_url: "https://www.sephora.me/qa-en/p/pdrn-derma-cream/P10064550?productVariantId=835794", image_url: "/mediheal-pdrn-derma-cream.jpeg", deliverable_lebanon: true }
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
          brand, name, category, price_gbp, price_usd, deliverable_lebanon, product_url, image_url, price_locked
        )
        values (
          ${p.brand}, ${p.name}, ${p.category}, ${p.price_gbp}, ${p.price_usd},
          ${p.deliverable_lebanon}, ${p.product_url}, ${p.image_url}, true
        )
        on conflict (product_url) do update set
          brand = excluded.brand,
          name = excluded.name,
          category = excluded.category,
          price_gbp = excluded.price_gbp,
          price_usd = excluded.price_usd,
          deliverable_lebanon = excluded.deliverable_lebanon,
          image_url = excluded.image_url,
          price_locked = true,
          scraped_at = now()
      `;
      inserted += 1;
      console.log(`  OK  ${p.name} — $${p.price_usd}`);
    } catch (err) {
      console.error(`FAIL  ${p.name}:`, err);
    }
  }

  console.log(`\nInserted/updated ${inserted}/${PRODUCTS.length} MEDIHEAL products.`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
