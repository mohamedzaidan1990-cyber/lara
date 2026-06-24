/**
 * One-off: scrape "Kylie By Kylie Jenner" from Selfridges and upsert into DB.
 * 77 products across 2 pages of search results.
 *
 * Run locally (needs Oxylabs + DATABASE_URL in .env.local):
 *   npx tsx scraper-worker/scrape-kylie.ts
 *
 * Or on Railway: set RUN_SCRIPT=scrape-kylie in env vars and redeploy.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function load(f: string): void {
  let text: string;
  try { text = readFileSync(f, "utf8"); } catch { return; }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    if (!process.env[key]) process.env[key] = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
  }
}
load(resolve(__dirname, "..", ".env.local"));
load(resolve(__dirname, ".env"));

export async function run(): Promise<void> {
  if (!process.env.OXYLABS_USERNAME || !process.env.OXYLABS_PASSWORD) {
    console.error("OXYLABS_USERNAME / OXYLABS_PASSWORD not set"); process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set"); process.exit(1);
  }

  const { scrapeSelfridgesUrls } = await import("./scraper");
  const { upsertProducts } = await import("./db");

  // Selfridges category pages tagged by brand slug carry a proper brand field
  // in the RSC flight data. The search-result pages (term=kylie+jenner) do NOT
  // include the brand field, so the brand filter drops everything.
  // Use /cat/kylie-by-kylie-jenner/ paths (matching the product URL slug) and
  // keep the "kylie" filter so any stray non-Kylie products are excluded.
  const KYLIE_URLS = [
    "https://www.selfridges.com/GB/en/cat/kylie-by-kylie-jenner/?ppp=60&sort=relevance",
    "https://www.selfridges.com/GB/en/cat/kylie-by-kylie-jenner/beauty/?ppp=60&sort=relevance",
    "https://www.selfridges.com/GB/en/cat/kylie-by-kylie-jenner/beauty/makeup/?ppp=60&sort=relevance",
    "https://www.selfridges.com/GB/en/cat/kylie-by-kylie-jenner/beauty/skincare/?ppp=60&sort=relevance",
  ];

  console.log(`Scraping Kylie By Kylie Jenner from ${KYLIE_URLS.length} Selfridges pages…`);

  const rows = await scrapeSelfridgesUrls(KYLIE_URLS, "kylie");

  if (rows.length === 0) {
    console.log("No Kylie products found — check Oxylabs response or URL validity.");
    return;
  }

  const byCategory: Record<string, number> = {};
  for (const r of rows) byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;

  console.log(`\nFound ${rows.length} Kylie product(s):`);
  for (const [cat, n] of Object.entries(byCategory)) console.log(`  ${cat}: ${n}`);

  const upserted = await upsertProducts(rows);
  console.log(`\nDone — upserted ${upserted} product(s) into the DB.`);
}

// Self-execute when run directly (not imported by index.ts).
if (require.main === module) {
  run().catch((err) => { console.error("Failed:", err?.message ?? err); process.exit(1); });
}
