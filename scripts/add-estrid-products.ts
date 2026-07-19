/**
 * One-off import: 18 Estrid products sourced from Sephora Qatar
 * screenshots. Pricing rule (per user instruction, flat):
 *   price_usd = qar_price / 3.645 + 8
 *
 * Checked the catalog first — no existing Estrid products, so all 18
 * are new.
 *
 * Per instruction, images were NOT cropped from the screenshots:
 * - 12 Starter Kit colors + Body Razor Blades sourced directly from
 *   estrid.com's product pages (Shopify product .json / predictive
 *   search, cross-checked by variant/title).
 * - Starter Kit Space and Starter Kit Jade aren't sold under those
 *   names on the current US site — sourced from Lyko.com, which
 *   lists the same colorways as "Space" and "Matcha" respectively
 *   (visually confirmed: pale lilac and mint green match the
 *   screenshots).
 * - Body Razor Blades XL reuses the Body Razor Blades photo (same
 *   cartridge product, no distinct XL photo found; Sephora's XL is a
 *   larger pack of the identical five-blade cartridge).
 * - The 3 "Shave Duo Set" colors (Guava, Fawn, Halo — razor + travel
 *   case bundle) could not be found on any retailer despite extensive
 *   searching (Estrid, Lyko, Boots, Superdrug); the user supplied
 *   these three images directly.
 *
 * price_gbp is a derived reference value (price_usd * 0.79) since the
 * source listing was in QAR, not GBP.
 *
 * Run:  npx ts-node scripts/add-estrid-products.ts
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

interface ProductSeed {
  brand: string;
  name: string;
  category: string;
  price_gbp: number;
  price_usd: number;
  product_url: string;
  image_url: string;
  deliverable_lebanon: boolean;
}

const PRODUCTS: ProductSeed[] = [
  { brand: "Estrid", name: "Shave Duo Set Guava", category: "Beauty tools", price_gbp: 21.49, price_usd: 27.2, product_url: "https://www.sephora.qa/brand/estrid/#shave-duo-set-guava", image_url: "/estrid-shave-duo-set-guava.jpg", deliverable_lebanon: true },
  { brand: "Estrid", name: "Starter Kit Bloom", category: "Beauty tools", price_gbp: 18.24, price_usd: 23.09, product_url: "https://www.sephora.qa/brand/estrid/#starter-kit-bloom", image_url: "/estrid-starter-kit-bloom.jpg", deliverable_lebanon: true },
  { brand: "Estrid", name: "Body Razor Blades", category: "Beauty tools", price_gbp: 19.32, price_usd: 24.46, product_url: "https://www.sephora.qa/brand/estrid/#body-razor-blades", image_url: "/estrid-body-razor-blades.jpg", deliverable_lebanon: true },
  { brand: "Estrid", name: "Starter Kit Space", category: "Beauty tools", price_gbp: 18.24, price_usd: 23.09, product_url: "https://www.sephora.qa/brand/estrid/#starter-kit-space", image_url: "/estrid-starter-kit-space.jpg", deliverable_lebanon: true },
  { brand: "Estrid", name: "Starter Kit Sky", category: "Beauty tools", price_gbp: 18.24, price_usd: 23.09, product_url: "https://www.sephora.qa/brand/estrid/#starter-kit-sky", image_url: "/estrid-starter-kit-sky.jpg", deliverable_lebanon: true },
  { brand: "Estrid", name: "Body Razor Blades XL", category: "Beauty tools", price_gbp: 27.99, price_usd: 35.43, product_url: "https://www.sephora.qa/brand/estrid/#body-razor-blades-xl", image_url: "/estrid-body-razor-blades-xl.jpg", deliverable_lebanon: true },
  { brand: "Estrid", name: "Starter Kit Aqua", category: "Beauty tools", price_gbp: 18.24, price_usd: 23.09, product_url: "https://www.sephora.qa/brand/estrid/#starter-kit-aqua", image_url: "/estrid-starter-kit-aqua.jpg", deliverable_lebanon: true },
  { brand: "Estrid", name: "Starter Kit Fawn", category: "Beauty tools", price_gbp: 18.24, price_usd: 23.09, product_url: "https://www.sephora.qa/brand/estrid/#starter-kit-fawn", image_url: "/estrid-starter-kit-fawn.jpg", deliverable_lebanon: true },
  { brand: "Estrid", name: "Starter Kit Guava", category: "Beauty tools", price_gbp: 18.24, price_usd: 23.09, product_url: "https://www.sephora.qa/brand/estrid/#starter-kit-guava", image_url: "/estrid-starter-kit-guava.jpg", deliverable_lebanon: true },
  { brand: "Estrid", name: "Starter Kit Jade", category: "Beauty tools", price_gbp: 18.24, price_usd: 23.09, product_url: "https://www.sephora.qa/brand/estrid/#starter-kit-jade", image_url: "/estrid-starter-kit-jade.jpg", deliverable_lebanon: true },
  { brand: "Estrid", name: "Starter Kit Pluto", category: "Beauty tools", price_gbp: 18.24, price_usd: 23.09, product_url: "https://www.sephora.qa/brand/estrid/#starter-kit-pluto", image_url: "/estrid-starter-kit-pluto.jpg", deliverable_lebanon: true },
  { brand: "Estrid", name: "Starter Kit Onyx", category: "Beauty tools", price_gbp: 18.24, price_usd: 23.09, product_url: "https://www.sephora.qa/brand/estrid/#starter-kit-onyx", image_url: "/estrid-starter-kit-onyx.jpg", deliverable_lebanon: true },
  { brand: "Estrid", name: "Starter Kit Moss", category: "Beauty tools", price_gbp: 18.24, price_usd: 23.09, product_url: "https://www.sephora.qa/brand/estrid/#starter-kit-moss", image_url: "/estrid-starter-kit-moss.jpg", deliverable_lebanon: true },
  { brand: "Estrid", name: "Starter Kit Solar", category: "Beauty tools", price_gbp: 18.24, price_usd: 23.09, product_url: "https://www.sephora.qa/brand/estrid/#starter-kit-solar", image_url: "/estrid-starter-kit-solar.jpg", deliverable_lebanon: true },
  { brand: "Estrid", name: "Shave Duo Set Fawn", category: "Beauty tools", price_gbp: 21.49, price_usd: 27.2, product_url: "https://www.sephora.qa/brand/estrid/#shave-duo-set-fawn", image_url: "/estrid-shave-duo-set-fawn.jpg", deliverable_lebanon: true },
  { brand: "Estrid", name: "Shave Duo Set Halo", category: "Beauty tools", price_gbp: 21.49, price_usd: 27.2, product_url: "https://www.sephora.qa/brand/estrid/#shave-duo-set-halo", image_url: "/estrid-shave-duo-set-halo.jpg", deliverable_lebanon: true },
  { brand: "Estrid", name: "Starter Kit Chrome", category: "Beauty tools", price_gbp: 18.24, price_usd: 23.09, product_url: "https://www.sephora.qa/brand/estrid/#starter-kit-chrome", image_url: "/estrid-starter-kit-chrome.jpg", deliverable_lebanon: true },
  { brand: "Estrid", name: "Starter Kit Halo", category: "Beauty tools", price_gbp: 18.24, price_usd: 23.09, product_url: "https://www.sephora.qa/brand/estrid/#starter-kit-halo", image_url: "/estrid-starter-kit-halo.jpg", deliverable_lebanon: true }
];

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Make sure .env.local exists in the project root.");
    process.exit(1);
  }

  await ensureSchema();
  const sql = getSql();

  let inserted = 0;
  for (const p of PRODUCTS) {
    try {
      await sql`
        insert into products (
          brand, name, category, price_gbp, price_usd, deliverable_lebanon, product_url, image_url
        )
        values (
          ${p.brand}, ${p.name}, ${p.category}, ${p.price_gbp}, ${p.price_usd},
          ${p.deliverable_lebanon}, ${p.product_url}, ${p.image_url}
        )
        on conflict (product_url) do update set
          brand = excluded.brand,
          name = excluded.name,
          category = excluded.category,
          price_gbp = excluded.price_gbp,
          price_usd = excluded.price_usd,
          deliverable_lebanon = excluded.deliverable_lebanon,
          image_url = excluded.image_url,
          scraped_at = now()
      `;
      inserted += 1;
      console.log(`  OK  ${p.name} — $${p.price_usd}`);
    } catch (err) {
      console.error(`FAIL  ${p.name}:`, err);
    }
  }

  console.log(`\nInserted/updated ${inserted}/${PRODUCTS.length} Estrid products.`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
