/**
 * Reprice the Haus Labs Color Fuse Blush Powder (14d0a549-94cb-408e-85b3-
 * 08ea62640aeb) to $48 USD, per user request. price_gbp is scaled by the
 * same ratio the existing $40/£30.77 pricing used (~0.7692), consistent
 * with how the rest of the catalogue derives GBP from USD.
 *
 * Run: npx ts-node scripts/update-haus-labs-blush-price.ts
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

const PRODUCT_ID = "14d0a549-94cb-408e-85b3-08ea62640aeb";
const NEW_USD = 48;
const NEW_GBP = 36.92; // 48 * (30.77 / 40), matching existing USD:GBP ratio

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const sql = getSql();

  const before = (await sql`
    select brand, name, price_usd::float8 as usd, price_gbp::float8 as gbp
    from products where id = ${PRODUCT_ID} limit 1
  `) as Array<{ brand: string; name: string; usd: number; gbp: number }>;
  if (!before.length || before[0].brand !== "Haus Labs" || !before[0].name.startsWith("Color Fuse")) {
    console.error("Product not found or not the expected Haus Labs Color Fuse blush — aborting.");
    process.exit(1);
  }

  const after = (await sql`
    update products
    set price_usd = ${NEW_USD}, price_gbp = ${NEW_GBP}
    where id = ${PRODUCT_ID}
    returning price_usd::float8 as usd, price_gbp::float8 as gbp
  `) as Array<{ usd: number; gbp: number }>;

  console.log(`OK  ${before[0].name} — $${before[0].usd}/£${before[0].gbp} -> $${after[0].usd}/£${after[0].gbp}`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
