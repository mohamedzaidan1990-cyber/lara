/**
 * One-off import: 7 Moonglaze products sourced from Sephora Qatar
 * screenshots. Pricing rule (per user instruction):
 *   price_usd = qar_price / 3.645 + 5
 * price_gbp is a derived reference value (price_usd * 0.79) since the
 * source listing was in QAR, not GBP.
 *
 * Product images were cropped from the source screenshots and saved to
 * public/moonglaze-*.png.
 *
 * Run:  npx ts-node scripts/add-moonglaze-products.ts
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
  { brand: "Moonglaze", name: "Phases Stick Blush", category: "Makeup", price_gbp: 23.89, price_usd: 30.24, product_url: "https://www.sephora.qa/brand/moonglaze/#phases-stick-blush", image_url: "/moonglaze-phases-stick-blush.png", deliverable_lebanon: true },
  { brand: "Moonglaze", name: "Moods Water Lip Tint", category: "Makeup", price_gbp: 26.92, price_usd: 34.08, product_url: "https://www.sephora.qa/brand/moonglaze/#moods-water-lip-tint", image_url: "/moonglaze-moods-water-lip-tint.png", deliverable_lebanon: true },
  { brand: "Moonglaze", name: "Feels Lipliner", category: "Makeup", price_gbp: 25.19, price_usd: 31.89, product_url: "https://www.sephora.qa/brand/moonglaze/#feels-lipliner", image_url: "/moonglaze-feels-lipliner.png", deliverable_lebanon: true },
  { brand: "Moonglaze", name: "Full-Use Brush", category: "Makeup", price_gbp: 32.34, price_usd: 40.94, product_url: "https://www.sephora.qa/brand/moonglaze/#full-use-brush", image_url: "/moonglaze-full-use-brush.png", deliverable_lebanon: true },
  { brand: "Moonglaze", name: "Sheers Stick Highlighter", category: "Makeup", price_gbp: 30.6, price_usd: 38.74, product_url: "https://www.sephora.qa/brand/moonglaze/#sheers-stick-highlighter", image_url: "/moonglaze-sheers-stick-highlighter.png", deliverable_lebanon: true },
  { brand: "Moonglaze", name: "Full Set Highlighter Duo & Brush", category: "Makeup", price_gbp: 84.58, price_usd: 107.06, product_url: "https://www.sephora.qa/brand/moonglaze/#full-set-highlighter-duo-brush", image_url: "/moonglaze-full-set-highlighter-duo-brush.png", deliverable_lebanon: true },
  { brand: "Moonglaze", name: "Tones Creamy Bronzer", category: "Makeup", price_gbp: 33.21, price_usd: 42.04, product_url: "https://www.sephora.qa/brand/moonglaze/#tones-creamy-bronzer", image_url: "/moonglaze-tones-creamy-bronzer.png", deliverable_lebanon: true }
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

  console.log(`\nInserted/updated ${inserted}/${PRODUCTS.length} Moonglaze products.`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
