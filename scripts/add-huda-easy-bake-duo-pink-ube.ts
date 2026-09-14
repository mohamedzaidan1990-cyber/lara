/**
 * Add Huda Beauty "Easy Bake Duo Loose Powder 6.5g — Pink Ube" — a new
 * shade, same $55 as the Cherry Lilac shade added just before it (no price
 * given by the user this time). subcategory deliberately left unset — same
 * reasoning as Cherry Lilac: no real Selfridges URL / product_variants for
 * the shade picker to resolve, so marking it shade-relevant would block
 * add-to-cart. Image supplied locally by the user (already a clean
 * packshot — no chrome to crop).
 *
 * Run:  npx ts-node scripts/add-huda-easy-bake-duo-pink-ube.ts
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

const PRICE_USD = 55;
const PRICE_GBP = Math.round((PRICE_USD / 1.3) * 100) / 100;

const PRODUCT = {
  brand: "Huda Beauty",
  name: "Easy Bake Duo Loose Powder 6.5g — Pink Ube",
  category: "Makeup",
  product_url: "https://seasonsbyb.co.uk/p/huda-beauty-easy-bake-duo-loose-powder-pink-ube",
  image_url: "/huda-beauty-easy-bake-duo-loose-powder-pink-ube.jpg"
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
      brand, name, category, price_gbp, price_usd, deliverable_lebanon,
      product_url, image_url, images, price_locked
    )
    values (
      ${p.brand}, ${p.name}, ${p.category}, ${PRICE_GBP}, ${PRICE_USD}, true,
      ${p.product_url}, ${p.image_url}, ${JSON.stringify([p.image_url])}::jsonb, true
    )
    on conflict (product_url) do update set
      brand = excluded.brand,
      name = excluded.name,
      category = excluded.category,
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
