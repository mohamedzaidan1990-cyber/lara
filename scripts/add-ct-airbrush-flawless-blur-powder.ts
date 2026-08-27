/**
 * One-off add: Charlotte Tilbury "Airbrush Flawless Blur Loose Powder"
 * (new launch, Aug 2026) — 4 of its 7 shades supplied by the user as
 * swatch photos, matched by colour to CT's official shade lineup
 * (Translucent / Fair-Medium / Medium-Tan / Tan-Deep / Deep / Brightening
 * Pink / Brightening Peach — confirmed via charlottetilbury.com). Flat
 * price $65 per explicit user instruction. Shades stored in
 * product_variants so the shade picker swaps the product image.
 *
 * Run:  npx ts-node scripts/add-ct-airbrush-flawless-blur-powder.ts
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

const PRODUCT = {
  brand: "Charlotte Tilbury",
  name: "Airbrush Flawless Blur Loose Powder",
  category: "Makeup",
  price_gbp: 50,
  price_usd: 65,
  product_url: "https://www.sephora.com/product/airbrush-flawless-blur-loose-setting-powder-P524838",
  image_url: "/ct-airbrush-flawless-blur-powder-shade1.jpg",
  deliverable_lebanon: true
};

const SHADES = [
  { name: "Fair/Medium", image: "/ct-airbrush-flawless-blur-powder-shade1.jpg", sort_order: 10 },
  { name: "Medium/Tan", image: "/ct-airbrush-flawless-blur-powder-shade4.jpg", sort_order: 20 },
  { name: "Brightening Pink", image: "/ct-airbrush-flawless-blur-powder-shade2.jpg", sort_order: 30 },
  { name: "Brightening Peach", image: "/ct-airbrush-flawless-blur-powder-shade3.jpg", sort_order: 40 }
];

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const sql = getSql();

  const p = PRODUCT;
  const rows = (await sql`
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
    returning id
  `) as Array<{ id: string }>;
  const productId = rows[0].id;
  console.log(`OK  ${p.brand} — ${p.name} — $${p.price_usd} (id ${productId})`);

  for (const s of SHADES) {
    await sql`
      insert into product_variants (product_id, shade_name, shade_image_url, sort_order)
      values (${productId}, ${s.name}, ${s.image}, ${s.sort_order})
      on conflict (product_id, shade_name) do update set
        shade_image_url = excluded.shade_image_url,
        sort_order = excluded.sort_order
    `;
    console.log(`  shade: ${s.name}`);
  }
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
