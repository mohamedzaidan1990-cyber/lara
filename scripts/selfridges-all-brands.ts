/**
 * One-time comprehensive brand deepening: crawl the Selfridges brand page for
 * EVERY brand already in the catalog (the brands Selfridges carries), so each
 * brand gets its full ~60-product range instead of just category bestsellers.
 *
 * This is a one-off (~150 Oxylabs calls). The daily cron stays lean (the curated
 * SELFRIDGES_BRAND_SLUGS list); long-tail products added here simply persist.
 *
 * Run:  npx ts-node scripts/selfridges-all-brands.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
function load(f: string): void { let t: string; try { t = readFileSync(resolve(process.cwd(), f), "utf8"); } catch { return; } for (const raw of t.split(/\r?\n/)) { const l = raw.trim(); if (!l || l.startsWith("#")) continue; const e = l.indexOf("="); if (e < 0) continue; const k = l.slice(0, e).trim(); if (!process.env[k]) process.env[k] = l.slice(e + 1).trim().replace(/^['"]|['"]$/g, ""); } }
load(".env.local"); load(".env");
import { getSql } from "../lib/db";
import { ensureSchema, upsertProducts } from "../scraper-worker/db";
import { scrapeSelfridgesBrands, brandToSlug, SELFRIDGES_BRAND_SLUGS } from "../scraper-worker/scraper";

async function main(): Promise<void> {
  await ensureSchema();
  const sql = getSql();
  const brands = (await sql`select distinct brand from products where product_url ilike '%selfridges.com%'`) as Array<{ brand: string }>;

  const done = new Set(SELFRIDGES_BRAND_SLUGS);
  const slugs = Array.from(new Set(brands.map((b) => brandToSlug(b.brand)).filter((s) => s && !done.has(s))));
  console.log(`${brands.length} catalog brands → ${slugs.length} new brand slugs to crawl (skipping ${done.size} already-daily).`);

  const rows = await scrapeSelfridgesBrands(slugs);
  const n = await upsertProducts(rows);
  console.log(`\nAll-brands crawl: scraped ${rows.length}, upserted ${n}.`);
}
main().catch((e) => { console.error("all-brands failed:", e.message); process.exit(1); });
