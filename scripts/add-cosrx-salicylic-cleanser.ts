/**
 * One-off add: Cosrx Salicylic Acid Daily Gentle Cleanser, flat price $20
 * per explicit user instruction. Image supplied locally by the user.
 *
 * Not currently listed on Selfridges or cosrx.com's own store (both
 * checked — 404/no match), so product_url is a synthetic anchor on the
 * brand's official site rather than a live retailer link, matching the
 * convention used for other non-Selfridges-sourced items (see
 * add-anua-products.ts). Brand casing ("Cosrx") and k_beauty flag match
 * the existing Cosrx rows already in the catalogue.
 *
 * Run:  npx ts-node scripts/add-cosrx-salicylic-cleanser.ts
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
  k_beauty: boolean;
}

const PRODUCTS: ProductSeed[] = [
  {
    brand: "Cosrx",
    name: "Salicylic Acid Daily Gentle Cleanser",
    category: "Skincare",
    price_gbp: 15.8,
    price_usd: 20,
    product_url: "https://www.cosrx.com/#salicylic-acid-daily-gentle-cleanser",
    image_url: "/cosrx-salicylic-acid-daily-gentle-cleanser.jpeg",
    deliverable_lebanon: true,
    k_beauty: true
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
          brand, name, category, price_gbp, price_usd, deliverable_lebanon, product_url, image_url, price_locked, k_beauty
        )
        values (
          ${p.brand}, ${p.name}, ${p.category}, ${p.price_gbp}, ${p.price_usd},
          ${p.deliverable_lebanon}, ${p.product_url}, ${p.image_url}, true, ${p.k_beauty}
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
          k_beauty = excluded.k_beauty,
          scraped_at = now()
      `;
      inserted += 1;
      console.log(`  OK  ${p.name} — $${p.price_usd}`);
    } catch (err) {
      console.error(`FAIL  ${p.name}:`, err);
    }
  }

  console.log(`\nInserted/updated ${inserted}/${PRODUCTS.length} Cosrx product(s).`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
