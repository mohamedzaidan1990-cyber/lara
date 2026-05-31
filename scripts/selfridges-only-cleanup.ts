/**
 * Make the catalog Selfridges-only: delete every product that did NOT come from
 * Selfridges (identified by its product_url host). Run AFTER a Selfridges
 * populate so the site is never empty in between.
 *
 * Run:  npx ts-node scripts/selfridges-only-cleanup.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
function load(f: string): void {
  let t: string;
  try { t = readFileSync(resolve(process.cwd(), f), "utf8"); } catch { return; }
  for (const raw of t.split(/\r?\n/)) {
    const l = raw.trim(); if (!l || l.startsWith("#")) continue;
    const e = l.indexOf("="); if (e < 0) continue;
    const k = l.slice(0, e).trim(); const v = l.slice(e + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}
load(".env.local"); load(".env");
import { getSql } from "../lib/db";

async function main(): Promise<void> {
  const sql = getSql();
  const before = (await sql`select count(*)::int as n from products`) as Array<{ n: number }>;
  const sf = (await sql`select count(*)::int as n from products where product_url ilike '%selfridges.com%'`) as Array<{ n: number }>;
  console.log(`Before: ${before[0].n} total, ${sf[0].n} Selfridges.`);

  if ((sf[0]?.n ?? 0) < 200) {
    console.error(`Refusing to delete: only ${sf[0]?.n ?? 0} Selfridges products present. Populate first.`);
    process.exit(1);
  }

  const deleted = (await sql`
    delete from products where product_url is null or product_url not ilike '%selfridges.com%'
    returning brand
  `) as Array<{ brand: string }>;
  const after = (await sql`select count(*)::int as n from products`) as Array<{ n: number }>;
  console.log(`Deleted ${deleted.length} non-Selfridges products.`);
  console.log(`Products: ${before[0].n} → ${after[0].n} (all Selfridges).`);
}
main().catch((e) => { console.error("cleanup failed:", e.message); process.exit(1); });
