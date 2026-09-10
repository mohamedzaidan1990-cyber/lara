/**
 * One-off add: "Sephora Collection — Sephora x Talia Fawaz" set — added to the
 * "Mix & Match — Any 4" promotion at $30 (retail / strike $60, "value is
 * double"). GBP = round(30 / 1.30, 2). Image supplied locally by the user.
 *
 * After running, paste the printed id into lib/mix-and-match.ts,
 * lib/promotions.ts and lib/home-promos.ts.
 *
 * Run:  npx ts-node scripts/add-sephora-x-talia-fawaz-promo.ts
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

const PROMO_USD = 30;
const PROMO_GBP = Math.round((PROMO_USD / 1.3) * 100) / 100;

const PRODUCT = {
  brand: "Sephora Collection",
  name: "Sephora x Talia Fawaz Makeup Set",
  category: "Makeup",
  product_url: "https://seasonsbyb.co.uk/p/mix-and-match/sephora-x-talia-fawaz",
  image_url: "/sephora-x-talia-fawaz.jpg"
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
      ${p.brand}, ${p.name}, ${p.category}, ${PROMO_GBP}, ${PROMO_USD}, true,
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

  const id = rows[0].id;
  const retailUsd = PROMO_USD * 2;
  const gbp = (n: number) => Math.round((n / 1.3) * 100) / 100;
  console.log(`OK  ${p.brand} — ${p.name} — $${PROMO_USD}  (${id})`);
  console.log(`\nlib/mix-and-match.ts:\n  "${id}": { promoUsd: ${PROMO_USD}, promoGbp: ${gbp(PROMO_USD)}, retailUsd: ${retailUsd}, retailGbp: ${gbp(retailUsd)} }, // sephora-x-talia-fawaz`);
  console.log(`\nlib/promotions.ts:\n  "${id}": { compareAtUsd: ${retailUsd}, label: "Any 4 for this price" }, // sephora-x-talia-fawaz`);
  console.log(`\nlib/home-promos.ts:\n  "${id}"`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
