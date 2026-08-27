/**
 * One-off add: Sol de Janeiro "Cheiroso 7" Cologne Body Mist for Men
 * (new men's fragrance line launched July 2026 — lavender, salted
 * macadamia, vanilla woods). Flat price $36 per explicit user
 * instruction (real Sephora retail is $26). Image cropped by hand from
 * the user's Instagram-story screenshot (phone/IG chrome removed).
 *
 * Run:  npx ts-node scripts/add-sdj-cheiroso-7.ts
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

const PRODUCT = {
  brand: "Sol De Janeiro",
  name: "Cheiroso 7 Cologne Body Mist for Men",
  category: "Fragrance",
  price_gbp: 27.69,
  price_usd: 36,
  product_url: "https://www.sephora.com/product/cheiroso-7-cologne-body-mist-for-men-P527171",
  image_url: "/sol-de-janeiro-cheiroso-7-cologne-body-mist.jpg",
  deliverable_lebanon: true
};

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  await ensureSchema();
  const sql = getSql();

  const p = PRODUCT;
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

  console.log(`OK  ${p.brand} — ${p.name} — $${p.price_usd}`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
