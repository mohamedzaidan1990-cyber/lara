/**
 * One-off add: two products requested together.
 *  - NARS "The Multiple Mini Duo" (2 mini multi-use sticks for cheeks/
 *    lips/eyes), $40 flat per explicit user instruction.
 *  - Natasha Denona "My Mini Dream Glow Blush" (3-tone blush/highlighter
 *    palette, mauve "Natasha" shade family), $33 flat per explicit user
 *    instruction (real Sephora retail is $20).
 * Both images cropped by hand from the user's Instagram-story screenshots
 * (phone/IG chrome removed) and saved locally.
 *
 * Run:  npx ts-node scripts/add-nars-natasha-denona.ts
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

const PRODUCTS = [
  {
    brand: "Nars",
    name: "The Multiple Mini Duo",
    category: "Makeup",
    price_gbp: 30.77,
    price_usd: 40,
    product_url: "https://www.narscosmetics.com/USA/the-multiple-mini-duo/999NAC0000284.html",
    image_url: "/nars-multiple-mini-duo.jpg",
    deliverable_lebanon: true
  },
  {
    brand: "Natasha Denona",
    name: "My Mini Dream Glow Blush",
    category: "Makeup",
    price_gbp: 25.38,
    price_usd: 33,
    product_url: "https://www.sephora.com/product/natasha-denona-my-mini-dream-glow-blush-P509533",
    image_url: "/natasha-denona-my-mini-dream-glow-blush.jpg",
    deliverable_lebanon: true
  }
];

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  await ensureSchema();
  const sql = getSql();

  for (const p of PRODUCTS) {
    await sql`
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
    `;
    console.log(`OK  ${p.brand} — ${p.name} — $${p.price_usd}`);
  }
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
