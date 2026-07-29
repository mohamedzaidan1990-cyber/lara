/**
 * One-off add: Fenty Beauty "The Mista Hair + Body Fragrance Mist", flat
 * price $47 per explicit user instruction (real fentybeauty.com retail is
 * $32 — no reference-pricing conversion applied here, same as the PIXI
 * eye-patch imports). Image supplied locally by the user.
 *
 * Category "Haircare" follows Fenty's own site classification (filed under
 * "Hair", not "Fragrance" or "Body").
 *
 * Run:  npx ts-node scripts/add-fenty-the-mista.ts
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
  {
    brand: "Fenty Beauty",
    name: "The Mista Hair + Body Fragrance Mist",
    category: "Haircare",
    price_gbp: 37.13,
    price_usd: 47,
    product_url: "https://fentybeauty.com/products/the-mista-hair-body-fragrance-mist",
    image_url: "/fenty-beauty-the-mista-hair-body-fragrance-mist.avif",
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

  console.log(`\nInserted/updated ${inserted}/${PRODUCTS.length} Fenty Beauty product(s).`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
