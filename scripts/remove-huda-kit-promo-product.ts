/**
 * Removes the retired "Huda Beauty × Seasons by B Kit" promo product.
 * The limited-to-10-buyers promo has ended; the $200 kit is no longer
 * for sale. order_items keeps its own copy of product_name/product_url
 * (no foreign key to products.id), so the 3 historical orders that
 * bought this kit are unaffected.
 *
 * Run:  npx ts-node scripts/remove-huda-kit-promo-product.ts
 *       (reads DATABASE_URL from .env.local)
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

const KIT_URL = "https://seasonsbyb.co.uk/kit/huda-x-snb-2026";

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const sql = getSql();

  const deleted = (await sql`
    delete from products where product_url = ${KIT_URL} returning id, name
  `) as Array<{ id: string; name: string }>;

  if (deleted.length === 0) {
    console.log("No matching product found — already removed.");
    return;
  }
  console.log(`Deleted: ${deleted[0].name} (${deleted[0].id})`);
}

main().catch((err) => {
  console.error("delete failed:", err);
  process.exit(1);
});
