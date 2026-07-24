/**
 * One-off add: two more PIXI eye-patch products, both priced flat at $40
 * per explicit instruction (user is sourcing from elsewhere — no
 * reference-pricing conversion applied, unlike the QAR-screenshot
 * imports). Images supplied locally by the user. Category follows the
 * sibling "FortifEYE"/"BeautifEYE" eye-patch products already in the
 * catalog (filed under Makeup, not Skincare).
 *
 * NutrifEYE nourishing eye patches matches a real Selfridges listing
 * (product_url below). PIXI's "Depuffing" eye patches were not found
 * under that exact name at Selfridges/Sephora/Nordstrom/Boots — its
 * product_url is a synthetic identifier (matches the on-conflict-key
 * convention used elsewhere for non-Selfridges-sourced items) rather
 * than a live retailer link.
 *
 * Run:  npx ts-node scripts/add-pixi-depuffing-nutrifeye.ts
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
  {
    brand: "Pixi",
    name: "Depuffing Eye Patches",
    category: "Makeup",
    price_gbp: 31.6,
    price_usd: 40,
    product_url: "https://www.pixibeauty.com/products/depuffing-eye-patches",
    image_url: "/pixi-depuffing-eye-patches.avif",
    deliverable_lebanon: true
  },
  {
    brand: "Pixi",
    name: "NutrifEYE Nourishing Eye Patches",
    category: "Makeup",
    price_gbp: 31.6,
    price_usd: 40,
    product_url: "https://www.selfridges.com/US/en/product/pixi-nutrifeye-nourishing-eye-patches-30-pairs_R04222562/",
    image_url: "/pixi-nutrifeye.avif",
    deliverable_lebanon: true
  }
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

  console.log(`\nInserted/updated ${inserted}/${PRODUCTS.length} PIXI products.`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
