/**
 * One-off: scrape Benefit Cosmetics from Selfridges and upsert into the DB.
 * Uses original (pre-sale) prices — the parser already prefers "Previous price"
 * over the discounted price when a sale is active, so no extra handling needed.
 *
 * Run locally (needs Oxylabs + DATABASE_URL in .env.local):
 *   npx tsx scraper-worker/scrape-benefit.ts
 *
 * Or push and trigger on Railway (set RUN_SCRIPT=scrape-benefit in env).
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

(async () => {
  if (!process.env.OXYLABS_USERNAME || !process.env.OXYLABS_PASSWORD) {
    console.error("OXYLABS_USERNAME / OXYLABS_PASSWORD not set"); process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set"); process.exit(1);
  }

  const { scrapeSelfridgesUrls, SELFRIDGES_BENEFIT_URLS } = await import("./scraper");
  const { upsertProducts } = await import("./db");

  console.log(`Scraping Benefit Cosmetics from ${SELFRIDGES_BENEFIT_URLS.length} Selfridges pages…`);
  console.log("Note: sale items will use the original (pre-sale) price automatically.\n");

  const rows = await scrapeSelfridgesUrls(SELFRIDGES_BENEFIT_URLS, "benefit");

  if (rows.length === 0) {
    console.log("No Benefit products found — check Oxylabs response or URL validity.");
    return;
  }

  const byCategory: Record<string, number> = {};
  for (const r of rows) byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;

  console.log(`\nFound ${rows.length} Benefit product(s):`);
  for (const [cat, n] of Object.entries(byCategory)) console.log(`  ${cat}: ${n}`);

  const upserted = await upsertProducts(rows);
  console.log(`\nDone — upserted ${upserted} product(s) into the DB.`);
})().catch((err) => { console.error("Failed:", err?.message ?? err); process.exit(1); });
