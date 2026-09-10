/**
 * One-off reprice: Huda Beauty "Habibti Lip And Cheek Best Sellers Kit"
 * catalogue price $55 -> $75 per explicit user instruction. GBP updated
 * proportionally ($75 / 1.30 = £57.70).
 *
 * Existing orders are unaffected: every order_items / orders row stores
 * its own price snapshot taken at checkout, so the ~53 past purchases
 * of this kit stay at $55.
 *
 * Run:  npx ts-node scripts/reprice-habibti-lip-cheek-kit.ts
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

const PRODUCT_ID = "f3862fec-ef9f-4e1d-9e6b-127a74949326";

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const sql = getSql();

  const rows = (await sql`
    update products
    set price_usd = 75, price_gbp = 57.70, price_locked = true, scraped_at = now()
    where id = ${PRODUCT_ID}
    returning brand, name, price_gbp, price_usd
  `) as Array<{ brand: string; name: string; price_gbp: string; price_usd: string }>;

  if (rows.length === 0) {
    console.error(`No product with id ${PRODUCT_ID}`);
    process.exit(1);
  }
  const r = rows[0];
  console.log(`OK  ${r.brand} — ${r.name} — now $${r.price_usd} / £${r.price_gbp}`);
}

main().catch((err) => {
  console.error("Reprice failed:", err);
  process.exit(1);
});
