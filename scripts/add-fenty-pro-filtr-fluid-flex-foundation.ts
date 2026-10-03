/**
 * Add Fenty Beauty Pro Filt'r Fluid Flex Natural Matte Longwear Foundation —
 * $66 (user-given price). Launched Sept 2026, 50 shades; no per-shade
 * variants added — the shade is captured on each order line. Image is the
 * bottle shot the user supplied.
 *
 * Run:  npx tsx scripts/add-fenty-pro-filtr-fluid-flex-foundation.ts
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

const PRICE_USD = 66;
const round2 = (n: number): number => Math.round(n * 100) / 100;
const PRICE_GBP = round2(PRICE_USD / 1.35);

const PRODUCT = {
  brand: "Fenty Beauty",
  name: "Pro Filt'r Fluid Flex Natural Matte Longwear Foundation",
  category: "Makeup",
  subcategory: "Foundation" as string | null,
  description:
    "A buildable, lightweight foundation with a natural matte finish and medium coverage. Fluid Flex technology moves with your skin, resisting settling, sweat, humidity, transfer and oxidation for waterproof, longwear wear, while starfruit extract helps control oil and shine. Available in 50 shades.",
  product_url: "https://www.sephora.com/product/pro-filter-fluid-flex-foundation-P525460",
  image_url: "/fenty-beauty-pro-filtr-fluid-flex-foundation.avif"
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
