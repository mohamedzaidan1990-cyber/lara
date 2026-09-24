/**
 * Add Sol de Janeiro Leite Néctar Perfume Mist 90ml — $42 (user-given
 * price). Limited edition, distinct from the Leite Café mist already in
 * the catalogue. Image sourced from soldejaneiro.com's own product photo.
 *
 * Run:  npx ts-node scripts/add-sdj-leite-nectar-mist.ts
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

const PRICE_USD = 42;
const round2 = (n: number): number => Math.round(n * 100) / 100;
const PRICE_GBP = round2(PRICE_USD / 1.35);

const PRODUCT = {
  brand: "Sol de Janeiro",
  name: "Leite Néctar Perfume Mist 90ml",
  category: "Fragrance",
  subcategory: null as string | null,
  description:
    "Milky & fruity, Leite Néctar Perfume Mist blends juicy peach, coconut milk, and sweet cream. Inspired by Brazilian pavê de pêssego, a peach dessert with layers of biscuits. Top notes of juicy peach and ripe nectarine, mid notes of coconut milk and peony blossom, dry notes of sweet cream, tonka bean, and vanilla drizzle. Limited edition.",
  product_url: "https://soldejaneiro.com/products/leite-nectar-perfume-mist-limited-edition",
  image_url: "/sol-de-janeiro-leite-nectar-perfume-mist-90ml.jpg"
};

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const sql = getSql();

  const rows = (await sql`
    insert into products (
      brand, name, category, subcategory, description,
      price_gbp, price_usd, product_url, image_url,
      price_locked, deliverable_lebanon
    )
    values (
      ${PRODUCT.brand}, ${PRODUCT.name}, ${PRODUCT.category}, ${PRODUCT.subcategory}, ${PRODUCT.description},
      ${PRICE_GBP}, ${PRICE_USD}, ${PRODUCT.product_url}, ${PRODUCT.image_url},
      true, true
    )
    on conflict (product_url) do update set
      description = excluded.description,
      price_gbp = excluded.price_gbp,
      price_usd = excluded.price_usd,
      image_url = excluded.image_url,
      price_locked = true
    returning id, brand, name, price_usd
  `) as Array<{ id: string; brand: string; name: string; price_usd: string }>;

  console.log(`OK  ${rows[0].brand} — ${rows[0].name} — $${rows[0].price_usd}  (${rows[0].id})`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
