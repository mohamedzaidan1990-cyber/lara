/**
 * Add Patrick Ta "Major Dimension Dream Date Essential Artistry Edit
 * Eyeshadow Palette" (Sephora P526003, limited edition) — $62 per explicit
 * user instruction (Sephora US retail is $49). Single SKU, no shade
 * variants — subcategory deliberately left unset so it doesn't trip the
 * shade picker with no variants to show.
 *
 * Six shades (fixed pans, not separately purchasable): Soulmate (nude
 * shimmer), Romantic (warm mauve shimmer), Intuition (cool nude matte),
 * Chemistry (cool pink matte), Interested (warm taupe matte), Manifesting
 * (slate grey shimmer) — folded into the description.
 *
 * Image is Sephora's own CDN (sephora.com is allowlisted in the image
 * proxy — see scripts/add-patrick-ta-major-headlines-blush-duo.ts).
 *
 * Run:  npx ts-node scripts/add-patrick-ta-major-dimension-dream-date-palette.ts
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

const PRICE_USD = 62;
const PRICE_GBP = Math.round((PRICE_USD / 1.3) * 100) / 100;

const PRODUCT = {
  brand: "Patrick Ta",
  name: "Major Dimension Dream Date Essential Artistry Edit Eyeshadow Palette",
  category: "Makeup",
  description:
    "Limited-edition 6-shade eyeshadow palette: Soulmate (nude shimmer), Romantic (warm mauve shimmer), " +
    "Intuition (cool nude matte), Chemistry (cool pink matte), Interested (warm taupe matte), Manifesting (slate grey shimmer).",
  product_url: "https://www.sephora.com/product/major-dimension-dream-date-eyeshadow-palette-P526003",
  image_url: "https://www.sephora.com/productimages/sku/s3018595-main-zoom-2.jpg"
};

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  await ensureSchema();
  const sql = getSql();

  const p = PRODUCT;
  const rows = (await sql`
    insert into products (
      brand, name, category, description, price_gbp, price_usd,
      deliverable_lebanon, product_url, image_url, images, price_locked
    )
    values (
      ${p.brand}, ${p.name}, ${p.category}, ${p.description}, ${PRICE_GBP}, ${PRICE_USD},
      true, ${p.product_url}, ${p.image_url}, ${JSON.stringify([p.image_url])}::jsonb, true
    )
    on conflict (product_url) do update set
      brand = excluded.brand,
      name = excluded.name,
      category = excluded.category,
      description = excluded.description,
      price_gbp = excluded.price_gbp,
      price_usd = excluded.price_usd,
      deliverable_lebanon = true,
      image_url = excluded.image_url,
      images = excluded.images,
      price_locked = true,
      scraped_at = now()
    returning id
  `) as Array<{ id: string }>;

  console.log(`OK  ${p.brand} — ${p.name} — $${PRICE_USD}  (${rows[0].id})`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
