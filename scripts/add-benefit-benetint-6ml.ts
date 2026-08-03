/**
 * One-off import: Benefit Cosmetics Benetint - Rose-tinted Lip & Cheek Stain
 * 6ml, price given directly by the user ($40), with 3 shade variants
 * (product_variants rows) so the PDP shade picker renders without any
 * Selfridges scrape (this product isn't sourced from Selfridges).
 *
 * Images supplied by the user (.avif), saved to:
 *   public/benefit-benetint-6ml.avif         (shade: "6ml" — used as main product image)
 *   public/benefit-benetint-raspberry.avif   (shade: "Raspberry")
 *   public/benefit-benetint-dark-cherry.avif (shade: "Dark Cherry")
 *
 * Run:  npx ts-node scripts/add-benefit-benetint-6ml.ts
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

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Make sure .env.local exists in the project root.");
    process.exit(1);
  }

  await ensureSchema();
  const sql = getSql();

  const product = {
    brand: "Benefit Cosmetics",
    name: "Benetint - Rose-tinted Lip & Cheek Stain 6ml",
    category: "Makeup",
    subcategory: "Lip Care",
    price_gbp: 25.76,
    price_usd: 40,
    product_url: "https://www.benefitcosmetics.com/us/en/product/benetint#rose-tinted-lip-cheek-stain-6ml",
    image_url: "/benefit-benetint-6ml.avif",
    deliverable_lebanon: true
  };

  const shades = [
    { name: "6ml", image_url: "/benefit-benetint-6ml.avif", sort_order: 10 },
    { name: "Raspberry", image_url: "/benefit-benetint-raspberry.avif", sort_order: 20 },
    { name: "Dark Cherry", image_url: "/benefit-benetint-dark-cherry.avif", sort_order: 30 }
  ];

  const rows = (await sql`
    insert into products (
      brand, name, category, subcategory, price_gbp, price_usd, deliverable_lebanon, product_url, image_url,
      light_shade_image_url, shades, shades_checked_at
    )
    values (
      ${product.brand}, ${product.name}, ${product.category}, ${product.subcategory}, ${product.price_gbp}, ${product.price_usd},
      ${product.deliverable_lebanon}, ${product.product_url}, ${product.image_url},
      ${shades[0].image_url}, ${JSON.stringify(shades.map((s) => ({ name: s.name, swatch_url: "", image_url: s.image_url })))}::jsonb, now()
    )
    on conflict (product_url) do update set
      brand = excluded.brand,
      name = excluded.name,
      category = excluded.category,
      subcategory = excluded.subcategory,
      price_gbp = excluded.price_gbp,
      price_usd = excluded.price_usd,
      deliverable_lebanon = excluded.deliverable_lebanon,
      image_url = excluded.image_url,
      light_shade_image_url = excluded.light_shade_image_url,
      shades = excluded.shades,
      shades_checked_at = excluded.shades_checked_at,
      scraped_at = now()
    returning id
  `) as Array<{ id: string }>;

  const productId = rows[0].id;

  for (const shade of shades) {
    await sql`
      insert into product_variants (product_id, shade_name, shade_image_url, sort_order)
      values (${productId}, ${shade.name}, ${shade.image_url}, ${shade.sort_order})
      on conflict (product_id, shade_name) do update set
        shade_image_url = excluded.shade_image_url,
        sort_order = excluded.sort_order
    `;
  }

  console.log(`OK  ${product.name} — $${product.price_usd} (id ${productId})`);
  console.log(`Shades: ${shades.map((s) => s.name).join(", ")}`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
