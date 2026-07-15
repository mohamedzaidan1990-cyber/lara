/**
 * One-off import: single Sephora Collection product, price given
 * directly by the user ($38), not derived from a QAR listing.
 * Checked the DB first for any existing "Sephora Collection" / "Size Up"
 * mascara — none found.
 *
 * Product image supplied by the user (converted from .avif) and saved
 * to public/sephora-collection-size-up-waterproof-mascara.png.
 *
 * Run:  npx ts-node scripts/add-sephora-collection-mascara.ts
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

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Make sure .env.local exists in the project root.");
    process.exit(1);
  }

  await ensureSchema();
  const sql = getSql();

  const product = {
    brand: "Sephora Collection",
    name: "Size Up Waterproof - Immediate Supersized Volume Mascara",
    category: "Makeup",
    price_gbp: 30.02,
    price_usd: 38,
    product_url: "https://www.sephora.qa/brand/sephora-collection/#size-up-waterproof-mascara",
    image_url: "/sephora-collection-size-up-waterproof-mascara.png",
    deliverable_lebanon: true
  };

  await sql`
    insert into products (
      brand, name, category, price_gbp, price_usd, deliverable_lebanon, product_url, image_url
    )
    values (
      ${product.brand}, ${product.name}, ${product.category}, ${product.price_gbp}, ${product.price_usd},
      ${product.deliverable_lebanon}, ${product.product_url}, ${product.image_url}
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

  console.log(`OK  ${product.name} — $${product.price_usd}`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
