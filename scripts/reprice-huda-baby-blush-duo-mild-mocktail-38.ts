/**
 * Reprice Huda Beauty "Baby Blush Duo Mild Mocktail": $32 -> $38, per user
 * instruction. Locks the price so the next Selfridges scrape doesn't
 * overwrite it. Only the catalogue price changes — existing order lines
 * (already sold at $32) are untouched.
 *
 * Run:  npx ts-node scripts/reprice-huda-baby-blush-duo-mild-mocktail-38.ts
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

const PRODUCT_ID = "14e5bd52-ee82-453f-8b05-d8d5a60cf603";
const NEW_PRICE_USD = 38;
const NEW_PRICE_GBP = Math.round((NEW_PRICE_USD / 1.3) * 100) / 100;

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const sql = getSql();

  const rows = (await sql`
    update products
    set price_usd = ${NEW_PRICE_USD}, price_gbp = ${NEW_PRICE_GBP}, price_locked = true, scraped_at = now()
    where id = ${PRODUCT_ID} and brand = 'Huda Beauty' and name = 'Baby Blush Duo Mild Mocktail'
    returning brand, name, price_usd
  `) as Array<{ brand: string; name: string; price_usd: string }>;

  if (rows.length !== 1) {
    console.error(`Expected to reprice exactly 1 product, got ${rows.length} — nothing changed.`);
    process.exit(1);
  }
  console.log(`REPRICED  ${rows[0].brand} — ${rows[0].name} -> $${Number(rows[0].price_usd)}`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
