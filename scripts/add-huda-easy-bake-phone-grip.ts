/**
 * One-off add: Huda Beauty "Easy Bake Pressed Powder Phone Grip"
 * (new launch, 2026) — the Easy Bake Pressed Powder compact on a
 * MagSafe-style phone grip. Flat price $50 per explicit user
 * instruction (hudabeauty.com en-qa retail is QAR 325). GBP is a
 * derived reference value ($50 / 1.30).
 *
 * Media supplied locally by the user (NOT cropped):
 *   - /huda-easy-bake-phone-grip.webp    packshot (phone + compact)
 *   - /huda-easy-bake-phone-grip-2.webp  model shot
 *   - /huda-easy-bake-phone-grip.mp4     product video
 * Stored in the `images` jsonb gallery; the PDP gallery renders the
 * .mp4 entry as a <video>.
 *
 * Shades (8) fetched from the hudabeauty.com PDP variant list. Six of
 * the eight share a shade name with the existing "Easy Bake Pressed
 * Powder 2.0" row, so their Selfridges swatch/image URLs are reused
 * (Kunafa Blondie <- "Kunafa Blonde"). "Ube Birthday Cake" and "Pink
 * Velvet Cookie" are new shades with no swatch source — name-only
 * pills. Stored in product_variants so the picker can swap the image.
 *
 * Run:  npx ts-node scripts/add-huda-easy-bake-phone-grip.ts
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
  brand: "Huda Beauty",
  name: "Easy Bake Pressed Powder Phone Grip",
  category: "Makeup",
  subcategory: "Powder",
  price_gbp: 38.46,
  price_usd: 50,
  product_url:
    "https://hudabeauty.com/en-qa/products/easy-bake-pressed-powder-phone-grip-hb01821m",
  image_url: "/huda-easy-bake-phone-grip.webp",
  images: [
    "/huda-easy-bake-phone-grip.webp",
    "/huda-easy-bake-phone-grip-2.webp",
    "/huda-easy-bake-phone-grip.mp4"
  ],
  deliverable_lebanon: true
};

// Selfridges Scene7 renditions reused from the "Easy Bake Pressed Powder 2.0"
// row (product R04592846) for the six shades that share a name.
function sf(slug: string, kind: "M" | "SW"): string {
  const dims = kind === "M" ? "wid=960&hei=1280" : "wid=64&hei=64";
  return `https://images.selfridges.com/is/image/selfridges/R04592846_${slug}_${kind}?${dims}&fmt=webp&qlt=80`;
}

const SHADES: Array<{ name: string; slug: string | null; sort_order: number }> = [
  { name: "Pink Velvet Cookie", slug: null, sort_order: 10 },
  { name: "Cherry Blossom Cake", slug: "CHERRYBLOSSOMCAKE", sort_order: 20 },
  { name: "Ube Birthday Cake", slug: null, sort_order: 30 },
  { name: "Peach Cupcake", slug: "PEACHCUPCAKE", sort_order: 40 },
  { name: "Pound Cake", slug: "POUNDCAKE", sort_order: 50 },
  { name: "Banana Bread", slug: "BANANABREAD", sort_order: 60 },
  { name: "Kunafa Blondie", slug: "KUNAFABLONDE", sort_order: 70 },
  { name: "Cinnamon Bun", slug: "CINNAMONBUN", sort_order: 80 }
];

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Make sure .env.local exists in the project root.");
    process.exit(1);
  }

  await ensureSchema();
  const sql = getSql();

  const p = PRODUCT;
  const storedShades = SHADES.map((s) => ({
    name: s.name,
    swatch_url: s.slug ? sf(s.slug, "SW") : "",
    image_url: s.slug ? sf(s.slug, "M") : ""
  }));

  const rows = (await sql`
    insert into products (
      brand, name, category, subcategory, price_gbp, price_usd,
      deliverable_lebanon, product_url, image_url, images,
      shades, shades_checked_at, price_locked
    )
    values (
      ${p.brand}, ${p.name}, ${p.category}, ${p.subcategory}, ${p.price_gbp}, ${p.price_usd},
      ${p.deliverable_lebanon}, ${p.product_url}, ${p.image_url}, ${JSON.stringify(p.images)}::jsonb,
      ${JSON.stringify(storedShades)}::jsonb, now(), true
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
      images = excluded.images,
      shades = excluded.shades,
      shades_checked_at = now(),
      price_locked = true,
      scraped_at = now()
    returning id
  `) as Array<{ id: string }>;
  const productId = rows[0].id;
  console.log(`OK  ${p.brand} — ${p.name} — $${p.price_usd} (id ${productId})`);

  for (const s of SHADES) {
    await sql`
      insert into product_variants (product_id, shade_name, shade_image_url, swatch_url, sort_order)
      values (
        ${productId}, ${s.name},
        ${s.slug ? sf(s.slug, "M") : null}, ${s.slug ? sf(s.slug, "SW") : null},
        ${s.sort_order}
      )
      on conflict (product_id, shade_name) do update set
        shade_image_url = excluded.shade_image_url,
        swatch_url = excluded.swatch_url,
        sort_order = excluded.sort_order
    `;
    console.log(`  shade: ${s.name}${s.slug ? "" : "  (name only)"}`);
  }

  // light_shade_image_url is left NULL on purpose: the PDP and card should
  // open on the supplied packshot (phone + compact), not a plain Selfridges
  // shade render. The shade picker reads product_variants directly, so the
  // /api/product-shades backfill that would repopulate this never runs.
  await sql`update products set light_shade_image_url = null where id = ${productId}`;
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
