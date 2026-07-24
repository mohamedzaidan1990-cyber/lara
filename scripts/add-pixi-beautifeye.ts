/**
 * One-off add: PIXI BeautifEYE Vitamin-C & Licorice, per explicit
 * instruction — priced flat at $40 (not derived from any conversion
 * formula). Image supplied locally by the user (public/pixi-beautifeye-
 * vitamin-c-licorice.avif); product_url/category matched against the
 * real Selfridges listing ("BeautifEYE brightening eye patches 30 pairs",
 * infused with vitamin C, licorice and ginseng) for traceability, and
 * category follows the sibling "FortifEYE hydrogel eye patches" already
 * in the catalog (filed under Makeup, not Skincare).
 *
 * Run:  npx ts-node scripts/add-pixi-beautifeye.ts
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

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Make sure .env.local exists in the project root.");
    process.exit(1);
  }

  await ensureSchema();
  const sql = getSql();

  const priceUsd = 40;
  const priceGbp = Math.round(priceUsd * 0.79 * 100) / 100;

  await sql`
    insert into products (
      brand, name, category, price_gbp, price_usd, deliverable_lebanon,
      product_url, image_url, price_locked
    )
    values (
      'Pixi', 'BeautifEYE Vitamin-C & Licorice', 'Makeup', ${priceGbp}, ${priceUsd}, true,
      'https://www.selfridges.com/US/en/product/pixi-beautifeye-brightening-eye-patches-30-pairs_R00104536/',
      '/pixi-beautifeye-vitamin-c-licorice.avif', true
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

  console.log(`OK  PIXI BeautifEYE Vitamin-C & Licorice — $${priceUsd}`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
