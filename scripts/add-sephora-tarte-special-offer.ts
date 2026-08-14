/**
 * One-off add: "Sephora X Tarte Special Offer" bundle — Tarte Maracuja
 * Juicy Lip Plump, Sephora "Blush Blush Blush" trio palette, and a
 * Sephora brush/sponge travel pouch set. Curated cross-brand bundle, not
 * a single vendor product page, so it uses an internal seasonsbyb.co.uk
 * product_url like the Talia Fawaz offer. Flat price $80 per explicit
 * user instruction. Image cropped by hand from the user's supplied
 * graphic (blank margin/price overlay removed) and saved locally.
 *
 * Run:  npx ts-node scripts/add-sephora-tarte-special-offer.ts
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
  name: "Sephora X Tarte Special Offer",
  category: "Makeup",
  price_gbp: 63.24,
  price_usd: 80,
  product_url: "https://seasonsbyb.co.uk/offer/sephora-x-tarte-2026-08",
  image_url: "/seasonsbyb-sephora-tarte-special-offer.jpg",
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
