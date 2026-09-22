/**
 * Add all 6 shades (with per-shade swatch images) to the Haus Labs Color Fuse
 * Blush Powder already in the catalogue — product 14d0a549-94cb-408e-85b3-
 * 08ea62640aeb ("Color Fuse Talc-Free Blush Powder With Fermented Arnica",
 * $40, sourced from sephora.com/product/...-P504025).
 *
 * The user pasted a Sephora ME (Qatar) link to the SAME product
 * (sephora.me/qa-en/p/color-fuse-blush-powder/P10057652) to source the
 * shades from — it is not a separate item, so this UPDATES the existing row
 * rather than inserting a duplicate. price_usd/price_gbp/price_locked,
 * product_url and image_url are left untouched.
 *
 * Sets subcategory = 'Blush' so the shade picker actually renders
 * (isShadeRelevant() only matches "Blush" via the subcategory allow-list —
 * the product-name fallback regex doesn't cover "blush").
 *
 * Sephora ME's PDP has no distinct product photo per shade (the hero gallery
 * is identical across all 6 variantIds) — only a small flat-colour swatch
 * differs per shade. That swatch (upscaled via the CDN's ?sw= param) is used
 * as BOTH shade_image_url and swatch_url, self-hosted in public/ per the
 * image-proxy-allowlist convention (img-product.sephora.me is not on it).
 * So selecting a shade on the site swaps the hero photo to a flat colour
 * card, not a photo of the product in that shade — that's a limitation of
 * the source, not a full pack shot like Selfridges-sourced variants have.
 *
 * Run:  npx ts-node scripts/add-shades-haus-labs-color-fuse-blush.ts
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
import { shadeScore } from "../lib/shade-options";

const PRODUCT_ID = "14d0a549-94cb-408e-85b3-08ea62640aeb";

const DESCRIPTION =
  "Talc-free blush with redness-reducing fermented arnica and hydrating squalane and hydraberry — a one-swipe, blendable colour that lasts all day. Ultra-soft, ultra-pigmented formula that melts seamlessly for a buildable rush of long-wearing colour on any skin tone, skincare-infused with fermented arnica, vitamins C and E, plant squalane and shea butter.";

interface Shade {
  name: string;
  image_url: string;
}

const SHADES: Shade[] = [
  { name: "Dragon Fruit Daze", image_url: "/haus-labs-color-fuse-blush-dragon-fruit-daze.jpg" },
  { name: "Fire Moon", image_url: "/haus-labs-color-fuse-blush-fire-moon.jpg" },
  { name: "French Rosette", image_url: "/haus-labs-color-fuse-blush-french-rosette.jpg" },
  { name: "Hibiscus Haze", image_url: "/haus-labs-color-fuse-blush-hibiscus-haze.jpg" },
  { name: "Pomelo Peach", image_url: "/haus-labs-color-fuse-blush-pomelo-peach.jpg" },
  { name: "Watermelon Bliss", image_url: "/haus-labs-color-fuse-blush-watermelon-bliss.jpg" }
];

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const sql = getSql();

  const before = (await sql`
    select brand, name, price_usd::float8 as usd, price_locked, archived
    from products where id = ${PRODUCT_ID} limit 1
  `) as Array<{ brand: string; name: string; usd: number; price_locked: boolean; archived: boolean }>;
  if (!before.length || before[0].brand !== "Haus Labs" || !before[0].name.startsWith("Color Fuse")) {
    console.error("Product not found or not the expected Haus Labs Color Fuse blush — aborting.");
    process.exit(1);
  }

  const shadesJson = SHADES.map((s) => ({ name: s.name, swatch_url: s.image_url, image_url: s.image_url }));

  await sql`
    update products
    set subcategory = 'Blush',
        description = ${DESCRIPTION},
        shades = ${JSON.stringify(shadesJson)}::jsonb,
        shades_checked_at = now()
    where id = ${PRODUCT_ID}
  `;

  for (const s of SHADES) {
    const score = shadeScore(s.name);
    await sql`
      insert into product_variants (product_id, shade_name, shade_image_url, swatch_url, sort_order)
      values (${PRODUCT_ID}, ${s.name}, ${s.image_url}, ${s.image_url}, ${score})
      on conflict (product_id, shade_name) do update set
        shade_image_url = excluded.shade_image_url,
        swatch_url = excluded.swatch_url,
        sort_order = excluded.sort_order
    `;
    console.log(`  + shade ${s.name} (sort ${score})`);
  }

  const lightest = (await sql`
    update products
    set light_shade_image_url = (
      select shade_image_url from product_variants
      where product_id = ${PRODUCT_ID} and shade_image_url is not null and shade_image_url <> ''
      order by sort_order asc limit 1
    ),
    variants_checked_at = now()
    where id = ${PRODUCT_ID}
    returning light_shade_image_url
  `) as Array<{ light_shade_image_url: string | null }>;

  console.log(`OK  ${before[0].name} — $${before[0].usd} (unchanged) — ${SHADES.length} shades added — light_shade_image_url = ${lightest[0].light_shade_image_url}`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
