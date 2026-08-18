/**
 * One-off add: two products requested together.
 *  - Sephora Collection "The Face Brush Set - Mistake-Proof Brush
 *    Essentials" (5 brushes + pouch), $62 flat per explicit user
 *    instruction.
 *  - Sol de Janeiro "Leite Café" Perfume Mist (limited edition), $42 flat
 *    per explicit user instruction.
 * Both images supplied locally by the user (Sephora product photos,
 * product IDs P10059973 and P1000214651).
 *
 * Run:  npx ts-node scripts/add-sephora-face-brush-set-and-sdj-mist.ts
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
    brand: "Sephora Collection",
    name: "The Face Brush Set - Mistake-Proof Brush Essentials",
    category: "Makeup",
    price_gbp: 47.69,
    price_usd: 62,
    product_url: "https://www.sephora.me/ae-en/p/the-face-brush-set-mistake-proof-brush-essentials/P10059973",
    image_url: "/sephora-collection-face-brush-set-mistake-proof.avif",
    deliverable_lebanon: true
  },
  {
    brand: "Sol de Janeiro",
    name: "Leite Café Perfume Mist",
    category: "Fragrance",
    price_gbp: 32.31,
    price_usd: 42,
    product_url: "https://www.sephora.me/qa-en/p/leite-caf%C3%A9-perfume-mist/P1000214651",
    image_url: "/sol-de-janeiro-leite-cafe-perfume-mist.avif",
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
