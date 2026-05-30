/**
 * Diagnostic: is Charlotte Tilbury in the catalog, and what brands are?
 * Run:  npx ts-node scripts/check-ct.ts   (reads DATABASE_URL from .env.local)
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

  const ct = (await sql`
    select count(*)::int as n,
           min(scraped_at) as first_seen,
           max(scraped_at) as last_seen
    from products
    where lower(brand) like '%charlotte%'
  `) as Array<{ n: number; first_seen: string | null; last_seen: string | null }>;
  console.log("Charlotte Tilbury in DB:", ct[0]);

  const brands = (await sql`
    select brand, count(*)::int as count
    from products
    group by brand
    order by count desc
    limit 30
  `) as Array<{ brand: string; count: number }>;
  console.log("\nTop 30 brands:");
  for (const b of brands) console.log(`  ${String(b.count).padStart(4)}  ${b.brand}`);

  const total = (await sql`select count(*)::int as n from products`) as Array<{ n: number }>;
  console.log(`\nTotal products: ${total[0]?.n ?? 0}`);
}

main().catch((err) => {
  console.error("check-ct failed:", err);
  process.exit(1);
});
