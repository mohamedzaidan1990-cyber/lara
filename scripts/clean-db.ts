/**
 * Database cleanup: remove fake/seeded products, keep only real scraped ones.
 *
 * Two rules (a product is deleted if it matches EITHER):
 *   1. image_url is null, empty, or a placeholder (contains 'unsplash').
 *   2. product_url is not from Space NK or Cult Beauty (i.e. anything not
 *      containing 'spacenk.com' or 'cultbeauty.co.uk', including null URLs).
 *
 * Logs how many rows each rule removed and how many remain.
 *
 * Run:
 *   DATABASE_URL="postgresql://..." npx ts-node scripts/clean-db.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Load .env.local / .env as a fallback so the script also works locally without
// an inline DATABASE_URL. An inline env var always takes precedence.
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
    const value = line
      .slice(eq + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}
loadDotenv(".env.local");
loadDotenv(".env");

import { getSql } from "../lib/db";

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Pass it inline, e.g.\n" + '  DATABASE_URL="postgresql://..." npx ts-node scripts/clean-db.ts');
    process.exit(1);
  }

  const sql = getSql();

  const before = (await sql`select count(*)::int as n from products`) as Array<{ n: number }>;
  const startCount = before[0]?.n ?? 0;
  console.log(`Products before cleanup: ${startCount}`);

  // Rule 1 — fake / missing imagery.
  const badImages = (await sql`
    delete from products
    where image_url is null
       or trim(image_url) = ''
       or image_url ilike '%unsplash%'
    returning id
  `) as Array<{ id: string }>;
  console.log(`Rule 1 — deleted ${badImages.length} products with no/placeholder image (unsplash/null/empty).`);

  // Rule 2 — not a real Space NK / Cult Beauty product URL.
  const badSource = (await sql`
    delete from products
    where product_url is null
       or (product_url not ilike '%spacenk.com%' and product_url not ilike '%cultbeauty.co.uk%')
    returning id
  `) as Array<{ id: string }>;
  console.log(`Rule 2 — deleted ${badSource.length} products not from spacenk.com / cultbeauty.co.uk.`);

  const after = (await sql`select count(*)::int as n from products`) as Array<{ n: number }>;
  const endCount = after[0]?.n ?? 0;

  const byCategory = (await sql`
    select category, count(*)::int as n
    from products
    group by category
    order by category
  `) as Array<{ category: string; n: number }>;

  const bySource = (await sql`
    select
      case
        when product_url ilike '%spacenk.com%' then 'Space NK'
        when product_url ilike '%cultbeauty.co.uk%' then 'Cult Beauty'
        else 'Other'
      end as source,
      count(*)::int as n
    from products
    group by source
    order by source
  `) as Array<{ source: string; n: number }>;

  console.log(`\nTotal deleted: ${startCount - endCount}`);
  console.log(`Products remaining: ${endCount}`);
  console.log("\nRemaining by category:");
  for (const row of byCategory) console.log(`  ${row.category.padEnd(14)} ${row.n}`);
  console.log("\nRemaining by source:");
  for (const row of bySource) console.log(`  ${row.source.padEnd(14)} ${row.n}`);
}

main().catch((err) => {
  console.error("Cleanup failed:", err);
  process.exit(1);
});
