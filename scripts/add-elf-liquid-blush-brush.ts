/**
 * One-off import: e.l.f. Cosmetics Liquid Blush Brush.
 * New brand on the site. Price set directly per user instruction ($13).
 * Image supplied by the user (public/elf-liquid-blush-brush.jpg, converted
 * from their elf brush.avif — same photo, just re-encoded as JPEG for
 * consistency with the rest of the catalogue).
 *
 * Run:  npx ts-node scripts/add-elf-liquid-blush-brush.ts
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
      'e.l.f. Cosmetics', 'Liquid Blush Brush', 'Beauty tools', 10.27, 13,
      true, 'https://www.elfcosmetics.com/products/liquid-blush-brush', '/elf-liquid-blush-brush.jpg', true
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

  console.log("OK  Liquid Blush Brush — $13");
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
