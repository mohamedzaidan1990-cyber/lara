/**
 * Add Sephora Collection All That Matte(r)s Eye Palette — $38 (user-given
 * price). 9 matte eyeshadows. Image is the product photo the user supplied.
 *
 * Run:  npx tsx scripts/add-sephora-all-that-matters-eye-palette.ts
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

import { getSql } from "../lib/db";

const PRICE_USD = 38;
const round2 = (n: number): number => Math.round(n * 100) / 100;
const PRICE_GBP = round2(PRICE_USD / 1.35);

const PRODUCT = {
  brand: "Sephora Collection",
  name: "All That Matte(r)s Eye Palette",
  category: "Makeup",
  subcategory: "Eyeshadow" as string | null,
  description:
    "A 9-pan palette of blendable matte eyeshadows, from soft cream and nude beige through warm browns and taupe to deep plum and black. Build everyday neutral looks or a smoky eye with one compact palette.",
  product_url: "https://www.sephora.com/product/all-that-matters-eye-palette-P525606",
  image_url: "/sephora-collection-all-that-matters-eye-palette.jpg"
};
async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const sql = getSql();

  const rows = (await sql`
    insert into products (
      brand, name, category, subcategory, description,
      price_gbp, price_usd, product_url, image_url,
      price_locked, deliverable_lebanon
    )
    values (
      ${PRODUCT.brand}, ${PRODUCT.name}, ${PRODUCT.category}, ${PRODUCT.subcategory}, ${PRODUCT.description},
      ${PRICE_GBP}, ${PRICE_USD}, ${PRODUCT.product_url}, ${PRODUCT.image_url},
      true, true
    )
    on conflict (product_url) do update set
      description = excluded.description,
      price_gbp = excluded.price_gbp,
      price_usd = excluded.price_usd,
      image_url = excluded.image_url,
      price_locked = true
    returning id, brand, name, price_usd
  `) as Array<{ id: string; brand: string; name: string; price_usd: string }>;

  console.log(`OK  ${rows[0].brand} — ${rows[0].name} — $${rows[0].price_usd}  (${rows[0].id})`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
