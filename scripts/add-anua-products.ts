/**
 * One-off import: 27 Anua products sourced from Sephora Qatar screenshots.
 *
 * Pricing rule (per user instruction):
 *   price_usd = ceil(qar_price / 3.645 + 5)  (single items)
 *   price_usd = ceil(qar_price / 3.645 + 8)  (sets / kits / bundles / duos)
 * Always rounded UP to the nearest whole dollar.
 *
 * 8 of the 27 products already existed in the catalogue (scraped from
 * Selfridges with the standard GBP-based formula) — per instruction, those
 * are UPDATED in place (new price + price_locked = true so the Selfridges
 * scraper doesn't overwrite them again) rather than inserted as duplicates.
 * The other 19 are new inserts.
 *
 * Images were not cropped from the screenshots. Most were sourced from
 * anua.com's public Shopify catalog (products.json), matched by exact
 * product name. The 9 K-Pop Demon Hunters collab / "Mini for X" items are
 * Sephora-exclusive SKUs not sold on Anua's own site — their photos were
 * pulled from the matching sephora.me listing (found via the ANUA brand
 * page on sephora.me) and visually confirmed against the screenshots.
 *
 * price_gbp is a derived reference value (price_usd * 0.79) for the new
 * inserts, since the source listing was in QAR, not GBP.
 *
 * Run:  npx ts-node scripts/add-anua-products.ts
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

interface PriceUpdate {
  name: string;
  product_url: string;
  price_gbp: number;
  price_usd: number;
}

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

const UPDATES: PriceUpdate[] = [
  { name: "Niacinamide 10 + TXA 4 Serum", product_url: "https://www.selfridges.com/GB/en/product/anua-niacinamide-10-txa-4-serum-30ml_R04626059/", price_gbp: 22.91, price_usd: 29 },
  { name: "Rice 70 Glow Milky Toner", product_url: "https://www.selfridges.com/GB/en/product/anua-rice-70-glow-milky-toner-250ml_R04626061/", price_gbp: 21.33, price_usd: 27 },
  { name: "Heartleaf 77 Soothing Toner", product_url: "https://www.selfridges.com/GB/en/product/anua-heartleaf-77-soothing-toner-250ml_R04626053/", price_gbp: 21.33, price_usd: 27 },
  { name: "Azelaic Acid 10 Hyaluron Redness Soothing Serum", product_url: "https://www.selfridges.com/GB/en/product/anua-azelaic-acid-10-hyaluron-redness-soothing-serum-30ml_R04626055/", price_gbp: 22.91, price_usd: 29 },
  { name: "Heartleaf Quercetinol Pore Deep Cleansing Foam", product_url: "https://www.selfridges.com/GB/en/product/anua-heartleaf-quercetinol-pore-deep-cleansing-foam-150ml_R04626052/", price_gbp: 16.59, price_usd: 21 },
  { name: "Heartleaf Pore Control Cleansing Oil", product_url: "https://www.selfridges.com/GB/en/product/anua-heartleaf-pore-control-cleansing-oil-200ml_R04626051/", price_gbp: 20.54, price_usd: 26 },
  { name: "PDRN Hyaluronic Acid Capsule 100 Serum", product_url: "https://www.selfridges.com/GB/en/product/anua-pdrn-hyaluronic-acid-capsule-100-serum-30ml_R04626057/", price_gbp: 26.86, price_usd: 34 },
  { name: "PDRN Hyaluronic Acid Hydrating Capsule Mist", product_url: "https://www.selfridges.com/GB/en/product/anua-pdrn-hyaluronic-acid-hydrating-capsule-mist-100ml_R04626067/", price_gbp: 25.28, price_usd: 32 }
];

const INSERTS: ProductSeed[] = [
  { brand: "Anua", name: "KPDH Grab-n-Go", category: "Skincare", price_gbp: 32.39, price_usd: 41, product_url: "https://www.sephora.qa/brand/anua/#kpdh-grab-n-go", image_url: "/anua-kpdh-grab-n-go.jpg", deliverable_lebanon: true },
  { brand: "Anua", name: "PDRN Glow Discovery Set", category: "Skincare", price_gbp: 51.35, price_usd: 65, product_url: "https://www.sephora.qa/brand/anua/#pdrn-glow-discovery-set", image_url: "/anua-pdrn-glow-discovery-set.jpg", deliverable_lebanon: true },
  { brand: "Anua", name: "KDH Anua Ultra-Thin Spot Cover Patch", category: "Skincare", price_gbp: 16.59, price_usd: 21, product_url: "https://www.sephora.qa/brand/anua/#kdh-anua-ultra-thin-spot-cover-patch", image_url: "/anua-kdh-anua-ultra-thin-spot-cover-patch.jpg", deliverable_lebanon: true },
  { brand: "Anua", name: "PDRN Capsule Mist Special Set", category: "Skincare", price_gbp: 22.91, price_usd: 29, product_url: "https://www.sephora.qa/brand/anua/#pdrn-capsule-mist-special-set", image_url: "/anua-pdrn-capsule-mist-special-set.jpg", deliverable_lebanon: true },
  { brand: "Anua", name: "Glass Skin Cleanse Duo", category: "Skincare", price_gbp: 30.81, price_usd: 39, product_url: "https://www.sephora.qa/brand/anua/#glass-skin-cleanse-duo", image_url: "/anua-glass-skin-cleanse-duo.jpg", deliverable_lebanon: true },
  { brand: "Anua", name: "Niacinamide 5 TXA Brightening Pad", category: "Skincare", price_gbp: 22.91, price_usd: 29, product_url: "https://www.sephora.qa/brand/anua/#niacinamide-5-txa-brightening-pad", image_url: "/anua-niacinamide-5-txa-brightening-pad.jpg", deliverable_lebanon: true },
  { brand: "Anua", name: "Rice Enzyme Brightening Cleansing Powder", category: "Skincare", price_gbp: 19.75, price_usd: 25, product_url: "https://www.sephora.qa/brand/anua/#rice-enzyme-brightening-cleansing-powder", image_url: "/anua-rice-enzyme-brightening-cleansing-powder.jpg", deliverable_lebanon: true },
  { brand: "Anua", name: "Zero-Cast Moisturizing Finish Sunscreen SPF 50+ PA++++", category: "Skincare", price_gbp: 19.75, price_usd: 25, product_url: "https://www.sephora.qa/brand/anua/#zero-cast-moisturizing-finish-sunscreen-spf-50-plus-pa-plus-plus-plus-plus", image_url: "/anua-zero-cast-moisturizing-finish-sunscreen-spf-50-plus-pa-plus-plus-plus-plus.jpg", deliverable_lebanon: true },
  { brand: "Anua", name: "Mini for Dark Spot TXA4", category: "Skincare", price_gbp: 14.22, price_usd: 18, product_url: "https://www.sephora.qa/brand/anua/#mini-for-dark-spot-txa4", image_url: "/anua-mini-for-dark-spot-txa4.jpg", deliverable_lebanon: true },
  { brand: "Anua", name: "Vita 10 Porestrix Brightening Serum", category: "Skincare", price_gbp: 26.86, price_usd: 34, product_url: "https://www.sephora.qa/brand/anua/#vita-10-porestrix-brightening-serum", image_url: "/anua-vita-10-porestrix-brightening-serum.jpg", deliverable_lebanon: true },
  { brand: "Anua", name: "PDRN Hyaluronic Acid Capsule 100 Serum Mask", category: "Skincare", price_gbp: 23.7, price_usd: 30, product_url: "https://www.sephora.qa/brand/anua/#pdrn-hyaluronic-acid-capsule-100-serum-mask", image_url: "/anua-pdrn-hyaluronic-acid-capsule-100-serum-mask.jpg", deliverable_lebanon: true },
  { brand: "Anua", name: "Mini for Plumping", category: "Skincare", price_gbp: 17.38, price_usd: 22, product_url: "https://www.sephora.qa/brand/anua/#mini-for-plumping", image_url: "/anua-mini-for-plumping.jpg", deliverable_lebanon: true },
  { brand: "Anua", name: "Mini for Blemish", category: "Skincare", price_gbp: 14.22, price_usd: 18, product_url: "https://www.sephora.qa/brand/anua/#mini-for-blemish", image_url: "/anua-mini-for-blemish.jpg", deliverable_lebanon: true },
  { brand: "Anua", name: "PDRN 100 Hyaluronic Acid Glow Pad", category: "Skincare", price_gbp: 22.91, price_usd: 29, product_url: "https://www.sephora.qa/brand/anua/#pdrn-100-hyaluronic-acid-glow-pad", image_url: "/anua-pdrn-100-hyaluronic-acid-glow-pad.jpg", deliverable_lebanon: true },
  { brand: "Anua", name: "Azelaic 10 Hyaluron Redness Soothing Pad", category: "Skincare", price_gbp: 22.91, price_usd: 29, product_url: "https://www.sephora.qa/brand/anua/#azelaic-10-hyaluron-redness-soothing-pad", image_url: "/anua-azelaic-10-hyaluron-redness-soothing-pad.jpg", deliverable_lebanon: true },
  { brand: "Anua", name: "7 Rice Ceramide Hydrating Barrier Serum", category: "Skincare", price_gbp: 22.91, price_usd: 29, product_url: "https://www.sephora.qa/brand/anua/#7-rice-ceramide-hydrating-barrier-serum", image_url: "/anua-7-rice-ceramide-hydrating-barrier-serum.jpg", deliverable_lebanon: true },
  { brand: "Anua", name: "Rice 70 Intensive Moisturizing Milk", category: "Skincare", price_gbp: 19.75, price_usd: 25, product_url: "https://www.sephora.qa/brand/anua/#rice-70-intensive-moisturizing-milk", image_url: "/anua-rice-70-intensive-moisturizing-milk.jpg", deliverable_lebanon: true },
  { brand: "Anua", name: "3 Ceramide Panthenol Moisture Barrier Cream", category: "Skincare", price_gbp: 20.54, price_usd: 26, product_url: "https://www.sephora.qa/brand/anua/#3-ceramide-panthenol-moisture-barrier-cream", image_url: "/anua-3-ceramide-panthenol-moisture-barrier-cream.jpg", deliverable_lebanon: true },
  { brand: "Anua", name: "PDRN Hyaluronic Acid 100 Moisture Cream", category: "Skincare", price_gbp: 23.7, price_usd: 30, product_url: "https://www.sephora.qa/brand/anua/#pdrn-hyaluronic-acid-100-moisture-cream", image_url: "/anua-pdrn-hyaluronic-acid-100-moisture-cream.jpg", deliverable_lebanon: true }
];

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Make sure .env.local exists in the project root.");
    process.exit(1);
  }

  await ensureSchema();
  const sql = getSql();

  let updated = 0;
  for (const p of UPDATES) {
    try {
      const rows = await sql`
        update products
        set price_gbp = ${p.price_gbp}, price_usd = ${p.price_usd}, price_locked = true
        where product_url = ${p.product_url}
        returning id
      `;
      if (rows.length === 0) {
        console.warn(`  MISS  ${p.name} — no row matched ${p.product_url}`);
        continue;
      }
      updated += 1;
      console.log(`  UPD  ${p.name} — $${p.price_usd}`);
    } catch (err) {
      console.error(`FAIL  ${p.name}:`, err);
    }
  }

  let inserted = 0;
  for (const p of INSERTS) {
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

  console.log(`\nUpdated ${updated}/${UPDATES.length} existing, inserted/updated ${inserted}/${INSERTS.length} new Anua products.`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
