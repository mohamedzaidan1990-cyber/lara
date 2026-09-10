/**
 * One-off add: Kiehl's Since 1851 "Best Sellers Hydrate & Help Protect
 * Skincare Set" (Ultra Facial Cream + Avocado Creamy Eye Treatment +
 * Better Screen UV Serum SPF 50+, in the green zip pouch).
 *
 * Pricing per explicit user instruction: $100, limited-time offer with
 * a $140 original / compare-at price. The strikethrough + "Limited Time
 * Offer" badge are driven by lib/promotions.ts keyed on this row's id —
 * after this script runs, paste the printed id into that file.
 *
 * GBP is a derived reference value ($100 / 1.30). Image supplied
 * locally by the user (NOT cropped): /kiehls-hydrate-help-protect-set.jpeg
 *
 * Run:  npx ts-node scripts/add-kiehls-hydrate-help-protect-set.ts
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
  brand: "Kiehl's",
  name: "Best Sellers Hydrate & Help Protect Skincare Set",
  category: "Skincare",
  price_gbp: 76.92,
  price_usd: 100,
  product_url:
    "https://www.kiehls.com/gifts-and-value-sets/gifts-for-all/best-sellers-hydrate-and-help-protect-gift-set/KHL202523.html",
  image_url: "/kiehls-hydrate-help-protect-set.jpeg",
  deliverable_lebanon: true
};

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Make sure .env.local exists in the project root.");
    process.exit(1);
  }

  await ensureSchema();
  const sql = getSql();

  const p = PRODUCT;
  const rows = (await sql`
    insert into products (
      brand, name, category, price_gbp, price_usd,
      deliverable_lebanon, product_url, image_url, price_locked
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
    returning id
  `) as Array<{ id: string }>;

  console.log(`OK  ${p.brand} — ${p.name} — $${p.price_usd}`);
  console.log(`id: ${rows[0].id}`);
  console.log('-> add to lib/promotions.ts:  "' + rows[0].id + '": { compareAtUsd: 140, label: "Limited Time Offer" },');
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
