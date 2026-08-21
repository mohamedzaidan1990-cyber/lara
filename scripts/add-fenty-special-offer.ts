/**
 * One-off add: "Fenty Special Offer" bundle — Fenty Beauty Killawatt
 * Freestyle Highlighter, Gloss Bomb Universal Lip Luminizer, Full Frontal
 * Mascara, and Match Stix Matte Skinstick. Curated cross-item bundle, not
 * a single vendor product page, so it uses an internal seasonsbyb.co.uk
 * product_url like the Talia Fawaz and Sephora X Tarte offers. Flat price
 * $100 per explicit user instruction. Image cropped by hand from the
 * user's supplied graphic (price overlay removed) and saved locally.
 *
 * Run:  npx ts-node scripts/add-fenty-special-offer.ts
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
  brand: "Seasons by B",
  name: "Fenty Special Offer",
  category: "Makeup",
  price_gbp: 76.92,
  price_usd: 100,
  product_url: "https://seasonsbyb.co.uk/offer/fenty-2026-08",
  image_url: "/fenty-beauty-special-offer.jpg",
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

  console.log(`OK  ${p.name} — $${p.price_usd}`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
