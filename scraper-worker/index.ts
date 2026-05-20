import cron from "node-cron";
import { ensureSchema, logScrape, upsertProducts, type ScrapedProductRow } from "./db";
import { scrapeCategory, SCRAPE_CATEGORIES } from "./scraper";

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

  for (const category of SCRAPE_CATEGORIES) {
    console.log(`[worker] scraping category "${category}"`);
    let products: ScrapedProductRow[] = [];

    // Each category is isolated: one failure never stops the whole run.
    try {
      products = await scrapeCategory(category);
    } catch (err) {
      failedCategories += 1;
      console.error(`[worker] scrape threw for "${category}" — continuing to next category`, err);
      products = [];
    }

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
