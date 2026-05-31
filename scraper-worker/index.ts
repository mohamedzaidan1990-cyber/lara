import cron from "node-cron";
import { ensureSchema, logScrape, upsertProducts, type ScrapedProductRow } from "./db";
import {
  scrapeCategory,
  scrapeSelfridgesCategory,
  scrapeLookfantasticBrands,
  scrapeDirectBrands,
  scrapeBootsBrands,
  scrapeJohnLewisBrands,
  webUnblockerEnabled,
  SCRAPE_CATEGORIES
} from "./scraper";

// Dedupe by product URL (or brand|name) so Selfridges + Space NK overlap once.
function dedupeProducts(rows: ScrapedProductRow[]): ScrapedProductRow[] {
  const seen = new Set<string>();
  const out: ScrapedProductRow[] = [];
  for (const r of rows) {
    const key = r.product_url || `${r.brand}|${r.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

const CRON_SCHEDULE = process.env.CRON_SCHEDULE ?? "0 */6 * * *";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runOnce(): Promise<void> {
  const startedAt = new Date();
  console.log(`[worker] ===== scrape run STARTED ${startedAt.toISOString()} =====`);

  try {
    await ensureSchema();
  } catch (err) {
    console.error("[worker] ensureSchema failed — aborting this run", err);
    return;
  }

  let totalProducts = 0;
  let totalDeliverable = 0;
  let totalUpserted = 0;
  let failedCategories = 0;

  if (webUnblockerEnabled()) {
    console.log("[worker] Oxylabs Web Unblocker ENABLED — Selfridges is the primary source");
  } else {
    console.log("[worker] OXYLABS_USERNAME/PASSWORD not set — Selfridges disabled, using Space NK as primary");
  }

  for (const category of SCRAPE_CATEGORIES) {
    console.log(`[worker] scraping category "${category}"`);
    let products: ScrapedProductRow[] = [];

    // 1. Selfridges first (best quality, correct GBP prices) via Web Unblocker.
    let selfridges: ScrapedProductRow[] = [];
    try {
      selfridges = await scrapeSelfridgesCategory(category);
    } catch (err) {
      console.error(`[worker] Selfridges scrape threw for "${category}" — continuing`, err);
    }
    products.push(...selfridges);
    console.log(`[worker] "${category}" Selfridges → ${selfridges.length} products`);

    // 2. Space NK + Cult Beauty fallback — skipped when Selfridges is already
    // plentiful (>100) to avoid duplicates and preserve Web Unblocker credits.
    if (selfridges.length > 100) {
      console.log(`[worker] "${category}" → skipping Space NK (Selfridges returned ${selfridges.length})`);
    } else {
      try {
        const spacenk = await scrapeCategory(category);
        products.push(...spacenk);
      } catch (err) {
        failedCategories += 1;
        console.error(`[worker] Space NK scrape threw for "${category}" — continuing`, err);
      }
    }

    products = dedupeProducts(products);

    const deliverable = products.filter((p) => p.deliverable_lebanon).length;
    totalProducts += products.length;
    totalDeliverable += deliverable;

    if (products.length > 0) {
      try {
        const n = await upsertProducts(products);
        totalUpserted += n;
        await logScrape(category, "ok", products.length);
        console.log(
          `[worker] "${category}" → ${products.length} products (${deliverable} deliverable), upserted ${n}`
        );
      } catch (err) {
        failedCategories += 1;
        console.error(`[worker] upsert failed for "${category}" — continuing`, err);
        await logScrape(category, "upsert_failed", products.length).catch(() => {});
      }
    } else {
      await logScrape(category, "empty", 0).catch(() => {});
      console.log(`[worker] "${category}" → 0 products`);
    }

    // Polite pause between categories.
    await sleep(5000);
  }

  // Lookfantastic brand pages (run after the Space NK category crawl).
  try {
    console.log(`[worker] scraping Lookfantastic brand pages…`);
    const brandProducts = await scrapeLookfantasticBrands();
    totalProducts += brandProducts.length;
    totalDeliverable += brandProducts.filter((p) => p.deliverable_lebanon).length;
    if (brandProducts.length > 0) {
      const n = await upsertProducts(brandProducts);
      totalUpserted += n;
      await logScrape("lookfantastic_brands", "ok", brandProducts.length);
      console.log(`[worker] Lookfantastic brands → ${brandProducts.length} products, upserted ${n}`);
    } else {
      await logScrape("lookfantastic_brands", "empty", 0).catch(() => {});
    }
  } catch (err) {
    failedCategories += 1;
    console.error("[worker] Lookfantastic brand scrape failed — continuing", err);
  }

  // Direct brand websites (Shopify JSON) — fill gaps: Gisou, Rare Beauty, Fenty,
  // K18, Kylie, Sol de Janeiro, etc.
  try {
    console.log(`[worker] scraping direct brand websites…`);
    const direct = await scrapeDirectBrands();
    totalProducts += direct.length;
    totalDeliverable += direct.filter((p) => p.deliverable_lebanon).length;
    if (direct.length > 0) {
      const n = await upsertProducts(direct);
      totalUpserted += n;
      await logScrape("direct_brands", "ok", direct.length);
      console.log(`[worker] direct brands → ${direct.length} products, upserted ${n}`);
    } else {
      await logScrape("direct_brands", "empty", 0).catch(() => {});
    }
  } catch (err) {
    failedCategories += 1;
    console.error("[worker] direct brand scrape failed — continuing", err);
  }

  // Boots + John Lewis brand pages (fill gaps: Huda, Rare, Rhode, K18, Gisou…).
  for (const src of [
    { name: "Boots", run: scrapeBootsBrands },
    { name: "John Lewis", run: scrapeJohnLewisBrands }
  ]) {
    try {
      console.log(`[worker] scraping ${src.name} brand pages…`);
      const products = await src.run();
      totalProducts += products.length;
      totalDeliverable += products.filter((p) => p.deliverable_lebanon).length;
      if (products.length > 0) {
        const n = await upsertProducts(products);
        totalUpserted += n;
        await logScrape(`${src.name.toLowerCase().replace(/\s+/g, "_")}_brands`, "ok", products.length);
        console.log(`[worker] ${src.name} brands → ${products.length} products, upserted ${n}`);
      } else {
        await logScrape(`${src.name.toLowerCase().replace(/\s+/g, "_")}_brands`, "empty", 0).catch(() => {});
        console.log(`[worker] ${src.name} brands → 0 products (likely bot-blocked)`);
      }
    } catch (err) {
      failedCategories += 1;
      console.error(`[worker] ${src.name} brand scrape failed — continuing`, err);
    }
  }

  const finishedAt = new Date();
  const durationMs = finishedAt.getTime() - startedAt.getTime();
  const summary = `total=${totalProducts} deliverable=${totalDeliverable} upserted=${totalUpserted} failedCategories=${failedCategories} duration=${Math.round(
    durationMs / 1000
  )}s`;
  await logScrape("__summary__", "summary", totalProducts).catch(() => {});
  console.log(`[worker] ===== scrape run FINISHED ${finishedAt.toISOString()} ${summary} =====`);
}

async function main(): Promise<void> {
  console.log("Seasons by B scraper worker started");

  const args = process.argv.slice(2);
  const once = args.includes("--once") || process.env.RUN_ONCE === "1";

  if (!process.env.DATABASE_URL) {
    console.error("[worker] DATABASE_URL is not set. Aborting.");
    process.exit(1);
  }

  if (once) {
    await runOnce();
    return;
  }

  // Run one immediate scrape on startup so the first deploy populates data
  // right away, before waiting for the first cron tick.
  console.log("[worker] running initial scrape on startup…");
  await runOnce().catch((err) => console.error("[worker] initial run error", err));

  console.log(`[worker] scheduling cron "${CRON_SCHEDULE}" (every 6 hours)`);
  cron.schedule(CRON_SCHEDULE, () => {
    runOnce().catch((err) => console.error("[worker] scheduled run error", err));
  });

  // Keep the process alive between cron ticks.
  process.stdin.resume();
}

main().catch((err) => {
  console.error("[worker] fatal", err);
  process.exit(1);
});
