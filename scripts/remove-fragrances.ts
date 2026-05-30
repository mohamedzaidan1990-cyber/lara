/**
 * Remove fragrance / EDP products from the catalog — they don't ship
 * internationally. Mirrors isFragrance() in scraper-worker/scraper.ts.
 *
 * Run:  npx ts-node scripts/remove-fragrances.ts   (reads DATABASE_URL from .env.local)
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

async function main(): Promise<void> {
  const sql = getSql();
  const before = (await sql`select count(*)::int as n from products`) as Array<{ n: number }>;

  // Substring matches (case-insensitive) + word-boundary edp/edt/edc.
  const deleted = (await sql`
    delete from products
    where (
        name ilike '%eau de parfum%'
        or name ilike '%eau de toilette%'
        or name ilike '%eau de cologne%'
        or name ilike '%eau fraiche%'
        or name ilike '%parfum%'
        or name ilike '%perfume%'
        or name ilike '%cologne%'
        or name ilike '%fragrance%'
        or name ~* '\\y(edp|edt|edc)\\y'
      )
      -- but never fragrance-free / non-perfumed / unscented skincare
      and name !~* 'fragrance[ -]?free|non[ -]?perfumed|unperfumed|unscented|scent[ -]?free'
    returning brand, name
  `) as Array<{ brand: string; name: string }>;

  const after = (await sql`select count(*)::int as n from products`) as Array<{ n: number }>;

  console.log(`Removed ${deleted.length} fragrance/EDP products.`);
  console.log(`Products: ${before[0]?.n ?? 0} → ${after[0]?.n ?? 0}`);
  console.log("\nSample removed:");
  for (const r of deleted.slice(0, 15)) console.log(`  ${r.brand} — ${r.name}`);
}

main().catch((err) => {
  console.error("remove-fragrances failed:", err);
  process.exit(1);
});
