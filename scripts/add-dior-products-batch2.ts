/**
 * Follow-up import: 6 more Dior products from the same 2026-07-21 Sephora
 * Qatar screenshot batch as scripts/add-dior-products.ts — these were held
 * back initially because no matching product image had been sourced yet.
 * Images were subsequently found via live Selfridges.com browsing.
 *
 * Run:  npx ts-node scripts/add-dior-products-batch2.ts
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
  for (const raw of text.split("\n")) {
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
  { brand: "DIOR", name: "Dior Solar - The Sublimating Oil Body", category: "Skincare", price_gbp: 67.95, price_usd: 86.01, product_url: "https://www.sephora.qa/brand/dior/#dior-solar-the-sublimating-oil-body", image_url: "/dior-solar-the-sublimating-oil-body.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Hydrating Invisible UV Fluid SPF 50+ PA++++", category: "Skincare", price_gbp: 66.76, price_usd: 84.5, product_url: "https://www.sephora.qa/brand/dior/#hydrating-invisible-uv-fluid-spf-50-pa", image_url: "/dior-hydrating-invisible-uv-fluid-spf-50-pa.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Snow UV Base Brightening Makeup Base", category: "Makeup", price_gbp: 66.76, price_usd: 84.5, product_url: "https://www.sephora.qa/brand/dior/#snow-uv-base-brightening-makeup-base", image_url: "/dior-snow-uv-base-brightening-makeup-base.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Forever Cushion Refill", category: "Makeup", price_gbp: 54.83, price_usd: 69.41, product_url: "https://www.sephora.qa/brand/dior/#forever-cushion-refill", image_url: "/dior-forever-cushion-refill.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Dior Solar The Protective Creme SPF 50", category: "Skincare", price_gbp: 63.18, price_usd: 79.97, product_url: "https://www.sephora.qa/brand/dior/#dior-solar-the-protective-creme-spf-50", image_url: "/dior-solar-the-protective-creme-spf-50.jpg", deliverable_lebanon: true },
  { brand: "DIOR", name: "Prestige La Mousse Micellaire", category: "Skincare", price_gbp: 120.4, price_usd: 152.4, product_url: "https://www.sephora.qa/brand/dior/#prestige-la-mousse-micellaire", image_url: "/dior-prestige-la-mousse-micellaire.jpg", deliverable_lebanon: true }
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

  console.log(`\nInserted/updated ${inserted}/${PRODUCTS.length} DIOR products.`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
