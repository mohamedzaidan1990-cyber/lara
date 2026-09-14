/**
 * Add Patrick Ta "Major Headlines Double-Take Crème & Powder Blush Duo"
 * (Sephora, P458747) with all 16 standard-size shades.
 *
 * Price: no price given by the user — listed at Sephora's US retail ($40)
 * as-is, no markup applied. Adjust if you want your usual margin on top.
 *
 * Images: sephora.com per-SKU CDN (`s<SKU>-main-zoom.jpg` / `s<SKU>+sw.jpg`),
 * added to the image-proxy allowlist (app/api/image-proxy/route.ts,
 * lib/images.ts) since Sephora's CDN 403s a bare fetch without a matching
 * Referer/User-Agent — same treatment as Selfridges/Boots/John Lewis.
 *
 * subcategory = "Blush" is intentional here (unlike some other manually
 * added shaded products in this repo): we have real product_variants data
 * for every shade, so the shade picker fully resolves and won't block
 * add-to-cart.
 *
 * Run:  npx ts-node scripts/add-patrick-ta-major-headlines-blush-duo.ts
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

const PRICE_USD = 40;
const PRICE_GBP = Math.round((PRICE_USD / 1.3) * 100) / 100;

const PRODUCT = {
  brand: "Patrick Ta",
  name: "Major Headlines Double-Take Crème & Powder Blush Duo",
  category: "Makeup",
  subcategory: "Blush",
  product_url: "https://www.sephora.com/product/patrick-ta-major-headlines-cream-powder-blush-duo-P458747"
};

// Standard-size shades, in Sephora's own display order. (The mini-size
// duplicates of 5 of these shades — different SKUs — are a separate
// product on Sephora and not added here.)
const SHADES: Array<{ sku: string; name: string; desc: string }> = [
  { sku: "2742492", name: "Just Enough", desc: "soft blue pink" },
  { sku: "2742500", name: "Not Too Much", desc: "soft rosey taupe" },
  { sku: "2555894", name: "She's Vibrant", desc: "bright pinky coral" },
  { sku: "2555886", name: "She's a Doll", desc: "bright neutral pink" },
  { sku: "2363844", name: "She's That Girl", desc: "soft pink" },
  { sku: "2699379", name: "She's Flushed", desc: "soft peachy pink" },
  { sku: "2568665", name: "She's Blushing", desc: "dusty rose" },
  { sku: "2699361", name: "She's Wanted", desc: "rich berry" },
  { sku: "2364289", name: "She's So LA", desc: "bronzed nude" },
  { sku: "2990125", name: "Out Of Office", desc: "cool pink" },
  { sku: "2925980", name: "Soft Launch", desc: "neutral soft coral" },
  { sku: "2849768", name: "She Goes To The Gym", desc: "cool mauve rose" },
  { sku: "2849784", name: "She's Seductive", desc: "warm mauve rose" },
  { sku: "2849776", name: "She Left Me On Red", desc: "warm vivid red" },
  { sku: "2849750", name: "She Knows Who She Is", desc: "terracotta" },
  { sku: "2926012", name: "Thank Me Later", desc: "cool lilac" }
];

const mainImage = (sku: string): string => `https://www.sephora.com/productimages/sku/s${sku}-main-zoom.jpg`;
const swatchImage = (sku: string): string => `https://www.sephora.com/productimages/sku/s${sku}+sw.jpg`;

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  await ensureSchema();
  const sql = getSql();

  const p = PRODUCT;
  const defaultImage = mainImage(SHADES[9].sku); // "Out Of Office" — Sephora's own default/NEW selection
  const images = SHADES.map((s) => mainImage(s.sku));

  const rows = (await sql`
    insert into products (
      brand, name, category, subcategory, price_gbp, price_usd,
      deliverable_lebanon, product_url, image_url, images, price_locked
    )
    values (
      ${p.brand}, ${p.name}, ${p.category}, ${p.subcategory}, ${PRICE_GBP}, ${PRICE_USD},
      true, ${p.product_url}, ${defaultImage}, ${JSON.stringify(images)}::jsonb, true
    )
    on conflict (product_url) do update set
      brand = excluded.brand,
      name = excluded.name,
      category = excluded.category,
      subcategory = excluded.subcategory,
      price_gbp = excluded.price_gbp,
      price_usd = excluded.price_usd,
      deliverable_lebanon = true,
      image_url = excluded.image_url,
      images = excluded.images,
      price_locked = true,
      scraped_at = now()
    returning id
  `) as Array<{ id: string }>;
  const productId = rows[0].id;
  console.log(`OK  ${p.brand} — ${p.name} — $${PRICE_USD}  (${productId})`);

  for (let i = 0; i < SHADES.length; i++) {
    const s = SHADES[i];
    await sql`
      insert into product_variants (product_id, shade_name, shade_image_url, swatch_url, sort_order)
      values (${productId}, ${`${s.name} — ${s.desc}`}, ${mainImage(s.sku)}, ${swatchImage(s.sku)}, ${(i + 1) * 10})
      on conflict (product_id, shade_name) do update set
        shade_image_url = excluded.shade_image_url,
        swatch_url = excluded.swatch_url,
        sort_order = excluded.sort_order
    `;
    console.log(`  shade: ${s.name} — ${s.desc}`);
  }

  console.log(`Done — ${SHADES.length} shades.`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
