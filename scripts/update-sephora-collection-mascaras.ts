/**
 * 1. Repriced the existing "Size Up Waterproof - Immediate Supersized
 *    Volume Mascara" (Sephora Collection) from $38 to $24.
 * 2. Added the non-waterproof sibling, "Size Up - Immediate Supersized
 *    Volume Mascara", at $24 — price and image supplied directly by
 *    the user, not derived from a QAR listing.
 *
 * Run:  npx ts-node scripts/update-sephora-collection-mascaras.ts
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

  const updated = (await sql`
    update products
    set price_usd = 24, price_gbp = 18.96, scraped_at = now()
    where product_url = 'https://www.sephora.qa/brand/sephora-collection/#size-up-waterproof-mascara'
    returning name, price_usd
  `) as Array<{ name: string; price_usd: string }>;
  if (updated.length === 0) {
    console.error("No existing row found for the waterproof mascara — expected one.");
  } else {
    console.log(`Repriced: ${(updated[0] as any).name} — $${(updated[0] as any).price_usd}`);
  }

  const newProduct = {
    brand: "Sephora Collection",
    name: "Size Up - Immediate Supersized Volume Mascara",
    category: "Makeup",
    price_gbp: 18.96,
    price_usd: 24,
    product_url: "https://www.sephora.qa/brand/sephora-collection/#size-up-mascara",
    image_url: "/sephora-collection-size-up-mascara.png",
    deliverable_lebanon: true
  };

  await sql`
    insert into products (
      brand, name, category, price_gbp, price_usd, deliverable_lebanon, product_url, image_url
    )
    values (
      ${newProduct.brand}, ${newProduct.name}, ${newProduct.category}, ${newProduct.price_gbp}, ${newProduct.price_usd},
      ${newProduct.deliverable_lebanon}, ${newProduct.product_url}, ${newProduct.image_url}
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

  console.log(`Inserted: ${newProduct.name} — $${newProduct.price_usd}`);
}

main().catch((err) => {
  console.error("Update/import failed:", err);
  process.exit(1);
});
