import cron from "node-cron";
import { ensureSchema, logScrape, upsertProducts, type ScrapedProductRow } from "./db";
import { scrapeSelfridges } from "./scraper";

const SEARCH_TERMS = [
  "charlotte tilbury",
  "la mer skincare",
  "dior makeup",
  "sisley skincare",
  "nars makeup",
  "ysl beauty",
  "gucci bag",
  "valentino bag",
  "loewe bag",
  "bottega veneta bag",
  "mulberry bag",
  "jo malone",
  "elemis skincare",
  "clinique"
];

const CRON_SCHEDULE = process.env.CRON_SCHEDULE ?? "0 */6 * * *";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runOnce(): Promise<void> {
  const startedAt = new Date();
  console.log(`[worker] run started ${startedAt.toISOString()}`);

  try {
    await ensureSchema();
  } catch (err) {
    console.error("[worker] ensureSchema failed", err);
    return;
  }

  let totalProducts = 0;
  let totalDeliverable = 0;
  let totalUpserted = 0;

  for (const term of SEARCH_TERMS) {
    console.log(`[worker] scraping "${term}"`);
    let products: ScrapedProductRow[] = [];
    try {
      products = await scrapeSelfridges(term);
    } catch (err) {
      console.error(`[worker] scrape threw for "${term}"`, err);
      products = [];
    }

    const deliverable = products.filter((p) => p.deliverable_lebanon).length;
    totalProducts += products.length;
    totalDeliverable += deliverable;

    if (products.length > 0) {
      const n = await upsertProducts(products);
      totalUpserted += n;
      await logScrape(term, "ok", products.length);
      console.log(`[worker] "${term}" → ${products.length} products (${deliverable} deliverable), upserted ${n}`);
    } else {
      await logScrape(term, "empty", 0);
      console.log(`[worker] "${term}" → 0 products`);
    }

    // polite pause between search terms
    await sleep(3000);
  }

  const finishedAt = new Date();
  const durationMs = finishedAt.getTime() - startedAt.getTime();
  const summary = `total=${totalProducts} deliverable=${totalDeliverable} upserted=${totalUpserted} duration=${Math.round(durationMs / 1000)}s`;
  await logScrape("__summary__", "summary", totalProducts);
  console.log(`[worker] run finished ${finishedAt.toISOString()} ${summary}`);
}

async function main(): Promise<void> {
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

  console.log(`[worker] scheduling cron "${CRON_SCHEDULE}"`);
  cron.schedule(CRON_SCHEDULE, () => {
    runOnce().catch((err) => console.error("[worker] runOnce error", err));
  });

  // Kick off an immediate run on boot so deploy-time logs are useful.
  if (process.env.RUN_ON_BOOT !== "0") {
    runOnce().catch((err) => console.error("[worker] initial run error", err));
  }

  // Keep the process alive
  process.stdin.resume();
}

main().catch((err) => {
  console.error("[worker] fatal", err);
  process.exit(1);
});
