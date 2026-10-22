/**
 * Saie: fill shades + per-shade images for every Saie product that comes in
 * shades (14 of the 22 in the catalogue — the brushes, CitySet sprays and the
 * single-shade mini mascara have none). Shade names, order and photos come
 * from saiehello.com's Shopify catalogue (/products.json, each variant's
 * featured_image), saved locally in public/saie/<saie-handle>/ at 900px with
 * transparent PNGs flattened onto #f3f3f3. Swatches are 64px solid colour
 * tiles sampled from each photo's most saturated product pixels (mascara
 * black/brown set by hand).
 *
 * Known source quirks: Saie's Lip Liner "French" variant points at the Wink
 * photo, so French uses its own silo image from the gallery instead; Slip
 * Tint "Five and Half" has no photo of its own on Saie's site and reuses Five.
 *
 * Run:  npx tsx scripts/add-saie-shades.ts
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

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// product id → [saie handle (= public/saie/ folder), shades in Saie's order]
const PRODUCTS: Array<[string, string, string[]]> = [
  // SuperSuede Radiant Baked Bronzer
  ["7b7e6ed8-b508-44f2-97ab-539f905c0030", "supersuede-radiant-baked-bronzer", ["Palermo", "Amalfi", "Napoli", "Portofino", "Bari", "Como"]],
  // Mini Dew Blush
  ["795ed165-ab89-4c5f-b18f-0f3f48b4a33a", "mini-dew-blush", ["Sweetie", "Baby", "Chilly", "Lady"]],
  // Slip Tint Baked Setting Powder
  ["de1edd18-fc70-4b0e-b01f-f95ee31598be", "slip-tint-undetectable-baked-setting-powder", ["Translucent 1", "Translucent 2", "Translucent 3", "Translucent 4", "Translucent 5"]],
  // SuperSuede Baked Powder Blush
  ["2663ec4b-ce41-4d8b-a108-0ef87e7cc87c", "supersuede", ["Vino", "Ma Donna", "Frutti", "Mia", "Ciao", "Grazie", "Stella", "Bella", "Amore"]],
  // Lip Liner 101
  ["d8713b52-9301-4526-a8aa-362ba88e4866", "lip-liner-101", ["Bite", "Coy", "Fox", "Fling", "Wink", "Flirt", "Twist", "Tease", "French"]],
  // Dew Bronze
  ["b81fe20e-ed03-434a-9be1-f5e24b2e59ed", "dew-bronze", ["Sand", "Salt", "Spritz", "Swim", "Stinson", "Sail"]],
  // Slip Tint Concealer
  ["d10d19af-4daf-4ef7-a61d-986227e82c3d", "slip-tint-concealer", ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25"]],
  // Glossybounce
  ["ad9d0a69-91c6-4d99-9e7c-86d85b70a6a7", "glossybounce", ["Burst", "Splash", "Bubble", "Remix", "Disco", "Shake", "Kiss", "Dip", "Play", "Bounce", "Push", "Dream"]],
  // Mini Glowy Super Gel
  ["8db5f7de-831b-4bfc-a138-fdd79f471f94", "mini-glowy-super-gel", ["Warmglow", "Starglow", "Sunglow", "Roseglow"]],
  // Glowy Super Gel
  ["19ff0d98-0bf6-417a-8c7b-36f9942d441d", "glowy-super-gel-luminizer", ["Beachglow", "Starglow", "Warmglow", "Sunglow", "Roseglow"]],
  // Sun Melt
  ["65ae53e9-5c32-4dfa-9d17-80e9fc612a9c", "sun-melt", ["Fair Bronze", "Light Bronze", "Medium Bronze", "Tan Bronze", "Deep Bronze", "Dark Bronze"]],
  // Dew Blush
  ["1399169d-2f2e-4d63-8630-ff72f1002554", "dew-blush", ["Lady", "Spicy", "Chilly", "Baby", "Sweetie", "Cherie", "Flirty", "Hottie", "Cutie", "Rosy", "Poppy", "Dreamy"]],
  // Slip Tint Tinted Moisturizer
  ["c91225c9-b277-485f-8e7e-90d22ad5948a", "slip-tint-tinted-moisturizer", ["One: Very Light - Pink", "Two: Very Light - Peach", "Three: Light to Medium - Peach", "Three and Half: Light to Medium - Golden", "Four: Light to Medium - Neutral-red", "Four and Half: Medium - Golden", "Five: Medium - Peach", "Five and Half: Medium - Neutral-red", "Six: Medium to Tan - Golden", "Seven: Medium to Tan - Olive", "Eight: Deep - Peach", "Nine: Deep - Red", "Nine and Half: Rich - Red", "Ten: Rich - Neutral"]],
  // Mascara 101
  ["8e2a2359-c16c-403d-b170-5c58796e1670", "mascara-101", ["Black", "Brown"]],
];

async function main(): Promise<void> {
  const sql = getSql();
  for (const [id, handle, shades] of PRODUCTS) {
    const p = (await sql`select name from products where id = ${id} and brand = 'Saie'`) as Array<{ name: string }>;
    if (!p.length) {
      console.error(`MISSING product ${id} (${handle}) — skipped`);
      continue;
    }
    const dir = `/saie/${handle}`;
    for (let i = 0; i < shades.length; i++) {
      const name = shades[i];
      const s = slug(name);
      await sql`
        insert into product_variants (product_id, shade_name, shade_image_url, swatch_url, sort_order)
        values (${id}, ${name}, ${`${dir}/${s}.jpg`}, ${`${dir}/${s}-swatch.jpg`}, ${(i + 1) * 10})
        on conflict (product_id, shade_name) do update set
          shade_image_url = excluded.shade_image_url, swatch_url = excluded.swatch_url, sort_order = excluded.sort_order
      `;
    }
    console.log(`OK  ${p[0].name}: ${shades.length} shades`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
