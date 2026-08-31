/**
 * One-off add: Dior "Backstage Glassy Glow Stick" Multi-Use Highlighter Balm
 * — shade 001 Glazed Pink (ultra-pearlescent "glazed" finish, pink).
 * Multi-use stick for face / eyes / lips / décolleté. Matches the customer's
 * screenshot and the note on order SBB-372092 ("glazed pink").
 * Price $62 flat per explicit user instruction.
 * Image is the Sephora PDP packshot supplied by the customer, saved to /public.
 *
 * Run:  npx ts-node scripts/add-dior-glassy-glow-stick.ts
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
  brand: "Dior",
  name: "Backstage Glassy Glow Stick Multi-Use Highlighter Balm — Glazed Pink",
  category: "Makeup",
  price_gbp: 47.69,
  price_usd: 62,
  product_url:
    "https://www.sephora.com/product/backstage-glassy-glow-stick-multi-use-stick-highlighter-balm-P522583",
  image_url: "/dior-backstage-glassy-glow-stick-glazed-pink.webp",
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
