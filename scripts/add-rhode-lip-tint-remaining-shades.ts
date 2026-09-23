/**
 * Add the remaining 8 shades of Rhode Peptide Lip Tint as product_variants
 * on the product already in the catalogue (added with just "Salty Tan" —
 * see add-rhode-lip-tint-and-order-mona-alkazwini.ts). Full shade list
 * confirmed via rhodeskin.com's Shopify collection JSON
 * (/collections/peptide-lip-tint/products.json) — each shade is its own
 * product page on their site, but on ours it's one product with a shade
 * picker, same convention as every other multi-shade product here.
 *
 * Images self-hosted from each shade's own product photo (not lifestyle
 * shots) — same $28 price as Salty Tan (price_locked, so unaffected by any
 * future scrape).
 *
 * Run:  npx ts-node scripts/add-rhode-lip-tint-remaining-shades.ts
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

const PRODUCT_ID = "93232e07-bf36-48e3-a576-698194ce524d"; // Rhode Peptide Lip Tint

const SHADES: Array<{ name: string; image: string }> = [
  { name: "Sweet Apple", image: "/rhode-peptide-lip-tint-sweet-apple.png" },
  { name: "Sweet Pea", image: "/rhode-peptide-lip-tint-sweet-pea.png" },
  { name: "Jelly Bean", image: "/rhode-peptide-lip-tint-jelly-bean.png" },
  { name: "Ribbon", image: "/rhode-peptide-lip-tint-ribbon.png" },
  { name: "Toast", image: "/rhode-peptide-lip-tint-toast.png" },
  { name: "Raspberry Jelly", image: "/rhode-peptide-lip-tint-raspberry-jelly.png" },
  { name: "PBJ", image: "/rhode-peptide-lip-tint-pbj.png" },
  { name: "Espresso", image: "/rhode-peptide-lip-tint-espresso.png" }
];

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const sql = getSql();

  const prodRows = (await sql`select id, name from products where id = ${PRODUCT_ID}`) as Array<{ id: string; name: string }>;
  if (!prodRows.length) {
    console.error("Rhode Peptide Lip Tint product not found.");
    process.exit(1);
  }

  for (const s of SHADES) {
    const score = shadeScore(s.name);
    await sql`
      insert into product_variants (product_id, shade_name, shade_image_url, swatch_url, sort_order)
      values (${PRODUCT_ID}, ${s.name}, ${s.image}, ${s.image}, ${score})
      on conflict (product_id, shade_name) do update set
        shade_image_url = excluded.shade_image_url,
        swatch_url = excluded.swatch_url,
        sort_order = excluded.sort_order
    `;
    console.log(`  + shade ${s.name} (sort ${score})`);
  }

  const shadesJson = (await sql`
    select shade_name as name, shade_image_url as image_url, swatch_url from product_variants
    where product_id = ${PRODUCT_ID} order by sort_order
  `) as Array<{ name: string; image_url: string; swatch_url: string }>;

  await sql`
    update products
    set shades = ${JSON.stringify(shadesJson)}::jsonb, shades_checked_at = now()
    where id = ${PRODUCT_ID}
  `;

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

  console.log(`\nOK  ${prodRows[0].name} — ${SHADES.length} shades added (${shadesJson.length} total) — light_shade_image_url = ${lightest[0].light_shade_image_url}`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
