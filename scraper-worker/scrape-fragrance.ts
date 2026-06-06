/**
 * One-off: crawl Selfridges fragrance listings and upsert into the catalogue.
 * Run from the scraper-worker dir:
 *   npx tsx scrape-fragrance.ts
 * Reads DATABASE_URL + OXYLABS_* from ../.env.local (then ./.env).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv(file: string): void {
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return;
  }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const k = line.slice(0, eq).trim();
    if (!process.env[k]) process.env[k] = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
  }
}

loadEnv(resolve(__dirname, "..", ".env.local"));
loadEnv(resolve(__dirname, ".env"));

(async () => {
  if (!process.env.OXYLABS_USERNAME || !process.env.OXYLABS_PASSWORD) {
    console.error("OXYLABS creds missing");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL missing");
    process.exit(1);
  }
  const { scrapeSelfridgesCategory } = await import("./scraper");
  const { upsertProducts } = await import("./db");

  console.log("Scraping Selfridges Fragrance listings…");
  const rows = await scrapeSelfridgesCategory("Fragrance");
  const frag = rows.filter((r) => r.category === "Fragrance");
  console.log(`Scraped ${rows.length} rows (${frag.length} classified Fragrance).`);
  if (rows.length === 0) {
    console.log("Nothing scraped — check listing slugs / Oxylabs.");
    return;
  }
  const sample = frag.slice(0, 6).map((r) => `  ${r.brand} ${r.name} — £${r.price_gbp} → $${r.price_usd}`);
  console.log("Sample:\n" + sample.join("\n"));
  const n = await upsertProducts(rows);
  console.log(`Upserted ${n} products.`);
})().catch((e) => {
  console.error("scrape-fragrance failed:", e?.message ?? e);
  process.exit(1);
});
