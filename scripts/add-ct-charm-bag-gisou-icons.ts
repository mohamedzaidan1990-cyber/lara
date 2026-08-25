/**
 * One-off add: two products requested together.
 *  - Charlotte Tilbury "Mini Pillow Talk Makeup Charm Bag" (quilted mini
 *    pouch with lipstick-shaped zipper pull), $23 flat per explicit user
 *    instruction (real Sephora retail is $15).
 *  - Gisou "Honey Glow Icons" Hair & Lip Set (Honey Gloss Ceramide
 *    Therapy hair mask, Honey Infused Hair Oil, Honey Infused Lip Oil),
 *    $67 flat per explicit user instruction.
 * Both images cropped by hand from the user's supplied photos (excess
 * white canvas trimmed) and saved locally.
 *
 * Run:  npx ts-node scripts/add-ct-charm-bag-gisou-icons.ts
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

const PRODUCTS = [
  {
    brand: "Charlotte Tilbury",
    name: "Mini Pillow Talk Makeup Charm Bag",
    category: "Makeup",
    price_gbp: 17.69,
    price_usd: 23,
    product_url: "https://www.sephora.com/product/mini-pillow-talk-beauty-bag-P525807",
    image_url: "/charlotte-tilbury-mini-pillow-talk-charm-bag.jpg",
    deliverable_lebanon: true
  },
  {
    brand: "Gisou",
    name: "Honey Glow Icons Hair & Lip Set",
    category: "Haircare",
    price_gbp: 51.54,
    price_usd: 67,
    product_url: "https://www.sephora.com/product/honey-glow-icons-hair-lip-set-P521691",
    image_url: "/gisou-honey-glow-icons-set.jpg",
    deliverable_lebanon: true
  }
];

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  await ensureSchema();
  const sql = getSql();

  for (const p of PRODUCTS) {
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
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
