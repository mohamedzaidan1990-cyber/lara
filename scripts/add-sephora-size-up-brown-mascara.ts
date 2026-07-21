/**
 * One-off import: Sephora Collection Size Up - Immediate Supersized Volume
 * Mascara, Brown shade. Price set directly per user instruction ($24),
 * matching the existing black and waterproof Size Up siblings already in
 * the catalog. Photo supplied by the user (public/sephora-collection-
 * size-up-mascara-brown.png, converted from their 725436_swatch.avif).
 *
 * Checked catalog first: only the black and waterproof variants existed,
 * no brown — this is a new row, not a duplicate.
 *
 * Run:  npx ts-node scripts/add-sephora-size-up-brown-mascara.ts
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

  await sql`
    insert into products (
      brand, name, category, price_gbp, price_usd, deliverable_lebanon, product_url, image_url, price_locked
    )
    values (
      'Sephora Collection', 'Size Up - Immediate Supersized Volume Mascara — Brown', 'Makeup', 18.96, 24,
      true, 'https://www.sephora.qa/brand/sephora-collection/#size-up-mascara-brown', '/sephora-collection-size-up-mascara-brown.png', true
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

  console.log("OK  Size Up - Immediate Supersized Volume Mascara — Brown — $24");
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
