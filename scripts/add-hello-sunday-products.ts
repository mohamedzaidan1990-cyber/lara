/**
 * One-off import: 14 Hello Sunday products sourced from Sephora Qatar
 * screenshots. Pricing rule (per user instruction):
 *   price_usd = qar_price / 3.645 + 5
 * price_gbp is a derived reference value (price_usd * 0.79) since the
 * source listing was in QAR, not GBP.
 *
 * Product images were cropped from the source screenshots and saved to
 * public/hello-sunday-*.png.
 *
 * Run:  npx ts-node scripts/add-hello-sunday-products.ts
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
  { brand: "Hello Sunday", name: "The Take-Out One SPF 30 - Invisible Sun Stick", category: "Skincare", price_gbp: 29.09, price_usd: 36.82, product_url: "https://www.sephora.qa/brand/hello-sunday/#the-take-out-one-spf30-invisible-sun-stick", image_url: "/hello-sunday-the-take-out-one-spf30-invisible-sun-stick.png", deliverable_lebanon: true },
  { brand: "Hello Sunday", name: "The One for Your Lips - Tinted Lip Balm SPF 50 with Shea Butter", category: "Skincare", price_gbp: 19.12, price_usd: 24.2, product_url: "https://www.sephora.qa/brand/hello-sunday/#the-one-for-your-lips-tinted-lip-balm-spf50-shea", image_url: "/hello-sunday-the-one-for-your-lips-tinted-lip-balm-spf50-shea.png", deliverable_lebanon: true },
  { brand: "Hello Sunday", name: "The Retouch One - Reapplication Mist SPF 30", category: "Skincare", price_gbp: 31.26, price_usd: 39.57, product_url: "https://www.sephora.qa/brand/hello-sunday/#the-retouch-one-reapplication-mist-spf30", image_url: "/hello-sunday-the-retouch-one-reapplication-mist-spf30.png", deliverable_lebanon: true },
  { brand: "Hello Sunday", name: "The Everyday Essentials", category: "Skincare", price_gbp: 36.68, price_usd: 46.43, product_url: "https://www.sephora.qa/brand/hello-sunday/#the-everyday-essentials", image_url: "/hello-sunday-the-everyday-essentials.png", deliverable_lebanon: true },
  { brand: "Hello Sunday", name: "The One That's a Serum - Moisturising Serum SPF 50", category: "Skincare", price_gbp: 32.34, price_usd: 40.94, product_url: "https://www.sephora.qa/brand/hello-sunday/#the-one-thats-a-serum-moisturising-serum-spf50", image_url: "/hello-sunday-the-one-thats-a-serum-moisturising-serum-spf50.png", deliverable_lebanon: true },
  { brand: "Hello Sunday", name: "The Everyday One - Face Moisturiser SPF 50", category: "Skincare", price_gbp: 29.09, price_usd: 36.82, product_url: "https://www.sephora.qa/brand/hello-sunday/#the-everyday-one-face-moisturiser-spf50", image_url: "/hello-sunday-the-everyday-one-face-moisturiser-spf50.png", deliverable_lebanon: true },
  { brand: "Hello Sunday", name: "The One for Your Lips - Clear Lip Balm SPF 50", category: "Skincare", price_gbp: 17.17, price_usd: 21.74, product_url: "https://www.sephora.qa/brand/hello-sunday/#the-one-for-your-lips-clear-lip-balm-spf50", image_url: "/hello-sunday-the-one-for-your-lips-clear-lip-balm-spf50.png", deliverable_lebanon: true },
  { brand: "Hello Sunday", name: "The One for Your Lips - The Rose One - Tinted Lip Balm", category: "Skincare", price_gbp: 19.12, price_usd: 24.2, product_url: "https://www.sephora.qa/brand/hello-sunday/#the-one-for-your-lips-the-rose-one-tinted-lip-balm", image_url: "/hello-sunday-the-one-for-your-lips-the-rose-one-tinted-lip-balm.png", deliverable_lebanon: true },
  { brand: "Hello Sunday", name: "The Illuminating One - Glow Primer SPF 50", category: "Skincare", price_gbp: 33.42, price_usd: 42.31, product_url: "https://www.sephora.qa/brand/hello-sunday/#the-illuminating-one-glow-primer-spf50", image_url: "/hello-sunday-the-illuminating-one-glow-primer-spf50.png", deliverable_lebanon: true },
  { brand: "Hello Sunday", name: "The Shimmer One - Mineral Glow Stick SPF 45", category: "Skincare", price_gbp: 34.51, price_usd: 43.68, product_url: "https://www.sephora.qa/brand/hello-sunday/#the-shimmer-one-mineral-glow-stick-spf45", image_url: "/hello-sunday-the-shimmer-one-mineral-glow-stick-spf45.png", deliverable_lebanon: true },
  { brand: "Hello Sunday", name: "The One for Your Hands - Hand Cream SPF 30", category: "Skincare", price_gbp: 18.04, price_usd: 22.83, product_url: "https://www.sephora.qa/brand/hello-sunday/#the-one-for-your-hands-hand-cream-spf30", image_url: "/hello-sunday-the-one-for-your-hands-hand-cream-spf30.png", deliverable_lebanon: true },
  { brand: "Hello Sunday", name: "The Mineral One - Mineral Serum SPF 50 with Squalane", category: "Skincare", price_gbp: 35.59, price_usd: 45.05, product_url: "https://www.sephora.qa/brand/hello-sunday/#the-mineral-one-mineral-serum-spf50-squalane", image_url: "/hello-sunday-the-mineral-one-mineral-serum-spf50-squalane.png", deliverable_lebanon: true },
  { brand: "Hello Sunday", name: "The Everyday One - Mini Face Moisturizer", category: "Skincare", price_gbp: 14.79, price_usd: 18.72, product_url: "https://www.sephora.qa/brand/hello-sunday/#the-everyday-one-mini-face-moisturizer", image_url: "/hello-sunday-the-everyday-one-mini-face-moisturizer.png", deliverable_lebanon: true },
  { brand: "Hello Sunday", name: "The Everyday One - Non-Comedogenic Mineral Face Moisturizer", category: "Skincare", price_gbp: 34.51, price_usd: 43.68, product_url: "https://www.sephora.qa/brand/hello-sunday/#the-everyday-one-non-comedogenic-mineral-face-moisturizer", image_url: "/hello-sunday-the-everyday-one-non-comedogenic-mineral-face-moisturizer.png", deliverable_lebanon: true }
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

  console.log(`\nInserted/updated ${inserted}/${PRODUCTS.length} Hello Sunday products.`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
