import cron from "node-cron";
import { ensureSchema, logScrape, upsertProducts, type ScrapedProductRow } from "./db";
import { scrapeSelfridgesCategory, scrapeSelfridgesBrands, scrapeSelfridgesKBeauty, scrapeSelfridgesUrls, SELFRIDGES_BENEFIT_URLS, webUnblockerEnabled, SCRAPE_CATEGORIES } from "./scraper";
import { runVariantEnrichment } from "./shade-enricher";

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

// Daily at 03:00 — Selfridges-only crawl is ~29 Oxylabs render calls/run, so a
// 6-hourly cadence burns credits fast. Override with CRON_SCHEDULE if needed.
const CRON_SCHEDULE = process.env.CRON_SCHEDULE ?? "0 3 * * *";

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

  // Selfridges is now the SOLE source: the catalog is Selfridges-only. If the
  // proxy / Oxylabs creds are missing the run scrapes nothing (existing rows stay).
  if (!webUnblockerEnabled()) {
    console.error("[worker] PROXY_URL not set — Selfridges is the only source, so nothing to scrape. Aborting run.");
    await logScrape("__summary__", "no_credentials", 0).catch(() => {});
    return;
  }
  console.log("[worker] Oxylabs Web Scraper API ENABLED — Selfridges is the SOLE source");

  // Brand pages first (deepen per-brand coverage, e.g. Huda Beauty). The
  // category loop runs afterwards and overwrites any shared product with its
  // precise category, so brand-page name-classification only affects
  // brand-exclusive items.
  try {
    console.log("[worker] scraping Selfridges brand pages…");
    const brandRows = dedupeProducts(await scrapeSelfridgesBrands());
    totalProducts += brandRows.length;
    totalDeliverable += brandRows.filter((p) => p.deliverable_lebanon).length;
    if (brandRows.length > 0) {
      const n = await upsertProducts(brandRows);
      totalUpserted += n;
      await logScrape("selfridges_brands", "ok", brandRows.length);
      console.log(`[worker] Selfridges brands → ${brandRows.length} products, upserted ${n}`);
    } else {
      await logScrape("selfridges_brands", "empty", 0).catch(() => {});
    }
  } catch (err) {
    failedCategories += 1;
    console.error("[worker] Selfridges brand scrape failed — continuing", err);
  }

  // K-Beauty dedicated crawl — Korean-brand pages + k-beauty category listings.
  // Runs after brand pages so the category loop can still overwrite with precise
  // category assignments, but the k_beauty flag is coalesced (never wiped).
  try {
    console.log("[worker] scraping Selfridges K-Beauty pages…");
    const kbRows = dedupeProducts(await scrapeSelfridgesKBeauty());
    totalProducts += kbRows.length;
    totalDeliverable += kbRows.filter((p) => p.deliverable_lebanon).length;
    if (kbRows.length > 0) {
      const n = await upsertProducts(kbRows);
      totalUpserted += n;
      await logScrape("selfridges_kbeauty", "ok", kbRows.length);
      console.log(`[worker] Selfridges K-Beauty → ${kbRows.length} products, upserted ${n}`);
    } else {
      await logScrape("selfridges_kbeauty", "empty", 0).catch(() => {});
    }
  } catch (err) {
    failedCategories += 1;
    console.error("[worker] Selfridges K-Beauty scrape failed — continuing", err);
  }

  // Benefit Cosmetics — brand slug 404s on Selfridges so we use search URLs.
  try {
    console.log("[worker] scraping Selfridges Benefit Cosmetics pages…");
    const benefitRows = dedupeProducts(await scrapeSelfridgesUrls(SELFRIDGES_BENEFIT_URLS, "benefit"));
    totalProducts += benefitRows.length;
    totalDeliverable += benefitRows.filter((p) => p.deliverable_lebanon).length;
    if (benefitRows.length > 0) {
      const n = await upsertProducts(benefitRows);
      totalUpserted += n;
      await logScrape("selfridges_benefit", "ok", benefitRows.length);
      console.log(`[worker] Selfridges Benefit → ${benefitRows.length} products, upserted ${n}`);
    } else {
      await logScrape("selfridges_benefit", "empty", 0).catch(() => {});
    }
  } catch (err) {
    failedCategories += 1;
    console.error("[worker] Selfridges Benefit scrape failed — continuing", err);
  }

  await sleep(3000);

  for (const category of SCRAPE_CATEGORIES) {
    console.log(`[worker] scraping category "${category}"`);
    let products: ScrapedProductRow[] = [];

    try {
      products = await scrapeSelfridgesCategory(category);
    } catch (err) {
      failedCategories += 1;
      console.error(`[worker] Selfridges scrape threw for "${category}" — continuing`, err);
      products = [];
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
          `[worker] "${category}" → ${products.length} Selfridges products (${deliverable} deliverable), upserted ${n}`
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

  // Variant enrichment pass: fetch Selfridges PDPs for shade-relevant products
  // and populate product_variants + light_shade_image_url.
  try {
    await runVariantEnrichment();
  } catch (err) {
    console.error("[worker] variant enrichment failed — continuing", err);
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
