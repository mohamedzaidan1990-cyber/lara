/**
 * Add Kojie San HydroMoist Skin Lightening & Brightening Soap 135g — $7
 * (user-given price). Image supplied by the user (matched to the exact
 * official product via kojic.co.uk, a UK Kojie San stockist).
 *
 * Run:  npx ts-node scripts/add-kojie-san-hydromoist-soap.ts
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

const PRICE_USD = 7;
const round2 = (n: number): number => Math.round(n * 100) / 100;
const PRICE_GBP = round2(PRICE_USD / 1.35);

const PRODUCT = {
  brand: "Kojie San",
  name: "HydroMoist Skin Lightening & Brightening Soap 135g",
  category: "Skincare",
  subcategory: "Body & Hand",
  description:
    "Skin lightening and brightening soap with high-grade kojic acid, formulated for dry skin. Zero Pigment Light Technology targets dark spots, age spots, scars, melasma and hyperpigmentation for a lighter, more even skin tone. HydroMoist formula keeps skin moisturised and hydrated for up to 24 hours, leaving skin soft and smooth. Clinically tested, dermatologically tested, paraben-free.",
  product_url: "https://kojic.co.uk/products/hydromoist-135g-specifically-for-dry-skin",
  image_url: "/kojie-san-hydromoist-soap-135g.jpg"
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
