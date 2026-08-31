/**
 * One-off add: NARS "Talc-Free Powder Blush" — shade Dolce Vita / 888
 * (matte dusty rose). Upgraded talc-free pressed-powder blush formula.
 * Price $60 flat per explicit user instruction (real retail is ~$34).
 * Image is the official NARS packshot (Dolce Vita shade), downloaded to
 * /public.
 *
 * Run:  npx ts-node scripts/add-nars-talc-free-blush-dolce-vita.ts
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
  brand: "Nars",
  name: "Talc-Free Powder Blush — Dolce Vita 888",
  category: "Makeup",
  price_gbp: 46.15,
  price_usd: 60,
  product_url: "https://www.sephora.com/product/blush-P2855",
  image_url: "/nars-talc-free-powder-blush-dolce-vita.jpg",
  deliverable_lebanon: true
};

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  await ensureSchema();
  const sql = getSql();

  const p = PRODUCT;
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

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
