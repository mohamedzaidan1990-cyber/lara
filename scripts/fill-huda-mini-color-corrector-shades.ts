/**
 * Huda Beauty Faux Filter Mini Colour Corrector 2ml (0b92aceb…): fill the 8
 * shades + images from hudabeauty.com (Mini #FauxFilter Color Corrector).
 * Images are Huda's per-shade packshots (PDP-SECTION1-FFCOLORCORRECTORMINI-
 * <SHADE>-TILE1, 600px), saved locally in public/huda-mini-color-corrector/
 * because Huda's CDN is slow; swatches are 64px crops of each packshot's smear.
 * The Selfridges image_url was returning 403, so the main image becomes the
 * Cherry Light packshot (Huda's default shade).
 *
 * variants_checked_at is pushed far out so the scraper's shade enricher
 * (which re-checks Selfridges products every 7 days) doesn't add a second,
 * differently-spelled set of shades from Selfridges.
 *
 * Run:  npx tsx scripts/fill-huda-mini-color-corrector-shades.ts
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

const PRODUCT_ID = "0b92aceb-09b4-4c1b-840b-7c28f7712f45";
const DIR = "/huda-mini-color-corrector";
// Huda's own order (light → deep).
const SHADES: Array<[string, string]> = [
  ["Cherry Light", "cherry-light"],
  ["Peach Light", "peach-light"],
  ["Pink Pomelo", "pink-pomelo"],
  ["Peach", "peach"],
  ["Mango", "mango"],
  ["Papaya", "papaya"],
  ["Cherry Blossom", "cherry-blossom"],
  ["Lychee", "lychee"]
];

async function main(): Promise<void> {
  const sql = getSql();
  const p = (await sql`select id, name from products where id = ${PRODUCT_ID}`) as Array<{ id: string; name: string }>;
  if (!p.length) {
    console.error("Product not found — nothing changed.");
    process.exit(1);
  }

  for (let i = 0; i < SHADES.length; i++) {
    const [name, slug] = SHADES[i];
    await sql`
      insert into product_variants (product_id, shade_name, shade_image_url, swatch_url, sort_order)
      values (${PRODUCT_ID}, ${name}, ${`${DIR}/${slug}.jpg`}, ${`${DIR}/${slug}-swatch.jpg`}, ${(i + 1) * 10})
      on conflict (product_id, shade_name) do update set
        shade_image_url = excluded.shade_image_url, swatch_url = excluded.swatch_url, sort_order = excluded.sort_order
    `;
    console.log(`OK  shade ${name}`);
  }

  const main = `${DIR}/cherry-light.jpg`;
  await sql`
    update products
    set image_url = ${main}, images = jsonb_build_array(${main}::text), light_shade_image_url = ${main},
        variants_checked_at = '2099-01-01'
    where id = ${PRODUCT_ID}
  `;
  const n = (await sql`select count(*)::int as n from product_variants where product_id = ${PRODUCT_ID}`) as Array<{ n: number }>;
  console.log(`OK  ${p[0].name} — main image ${main}, ${n[0].n} shades`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
