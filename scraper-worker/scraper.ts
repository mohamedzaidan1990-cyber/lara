import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, BrowserContext, Page } from "playwright-core";
import type { ScrapedProductRow } from "./db";
import { convertGbpToUsd } from "./currency";

// Register the stealth plugin once, at module load. The plugin's type comes
// from the puppeteer-extra ecosystem and isn't structurally identical to
// playwright-extra's expected plugin type, so we cast.
chromium.use(StealthPlugin() as never);

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15"
];

const LAUNCH_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-blink-features=AutomationControlled",
  "--disable-features=IsolateOrigins,site-per-process",
  "--flag-switches-begin",
  "--disable-site-isolation-trials",
  "--flag-switches-end"
];

const EXTRA_HEADERS: Record<string, string> = {
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-GB,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  DNT: "1"
};

// Selfridges category slugs mapped to our internal category names.
const SELFRIDGES_SLUGS: Record<string, string> = {
  Makeup: "make-up",
  Skincare: "skincare",
  Bags: "bags-purses",
  Haircare: "hair",
  Accessories: "accessories",
  "Beauty tools": "beauty-tools-and-accessories"
};

export const SCRAPE_CATEGORIES = [
  "Makeup",
  "Skincare",
  "Bags",
  "Haircare",
  "Accessories",
  "Beauty tools"
] as const;

const PAGES_PER_CATEGORY = 5;
const PRODUCTS_PER_PAGE = 60;

const BEAUTY_CATEGORIES = new Set(["Makeup", "Skincare", "Haircare", "Beauty tools"]);

interface RawCard {
  brand: string;
  name: string;
  priceText: string;
  href: string;
  img: string;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDelay(min = 2000, max = 5000): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, randomInt(min, max)));
}

function randomUA(): string {
  return USER_AGENTS[randomInt(0, USER_AGENTS.length - 1)];
}

function randomViewport(): { width: number; height: number } {
  return { width: randomInt(1280, 1920), height: randomInt(800, 1080) };
}

function parsePriceGbp(text: string): number | null {
  const m = text.replace(/[, ]/g, (c) => (c === "," ? "" : c)).match(/£?\s?([\d]+(?:\.\d{1,2})?)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function isFragrance(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("eau de parfum") ||
    lower.includes("eau de toilette") ||
    lower.includes("fragrance") ||
    lower.includes("parfum") ||
    lower.includes("perfume") ||
    lower.includes("cologne")
  );
}

function inferBeautyCategory(text: string, fallback: string): string {
  const lower = text.toLowerCase();
  if (
    lower.includes("hair dryer") ||
    lower.includes("straightener") ||
    lower.includes("airwrap") ||
    lower.includes("curling") ||
    lower.includes("brush set") ||
    lower.includes("makeup brush") ||
    lower.includes("massage gun") ||
    lower.includes("tweezer") ||
    lower.includes("microcurrent") ||
    lower.includes("device")
  ) {
    return "Beauty tools";
  }
  if (
    lower.includes("shampoo") ||
    lower.includes("conditioner") ||
    lower.includes("hair oil") ||
    lower.includes("hair mask") ||
    lower.includes("haircare")
  ) {
    return "Haircare";
  }
  if (
    lower.includes("foundation") ||
    lower.includes("concealer") ||
    lower.includes("lipstick") ||
    lower.includes("mascara") ||
    lower.includes("eyeshadow") ||
    lower.includes("blush") ||
    lower.includes("makeup")
  ) {
    return "Makeup";
  }
  if (
    lower.includes("serum") ||
    lower.includes("cream") ||
    lower.includes("moistur") ||
    lower.includes("cleanser") ||
    lower.includes("toner") ||
    lower.includes("skincare")
  ) {
    return "Skincare";
  }
  return fallback;
}

async function newStealthPage(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    userAgent: randomUA(),
    viewport: randomViewport(),
    locale: "en-GB",
    timezoneId: "Europe/London",
    extraHTTPHeaders: EXTRA_HEADERS
  });
  const page = await context.newPage();
  return { context, page };
}

// Realistic mouse movement + natural scrolling to look human before extracting.
async function humanize(page: Page): Promise<void> {
  try {
    for (let i = 0; i < 3; i += 1) {
      await page.mouse.move(randomInt(100, 1200), randomInt(100, 700), { steps: randomInt(5, 15) });
      await randomDelay(200, 600);
    }
    const steps = randomInt(4, 7);
    for (let i = 0; i < steps; i += 1) {
      await page.mouse.wheel(0, randomInt(500, 900));
      await randomDelay(400, 1000);
    }
    // settle back near the top
    await page.mouse.wheel(0, -randomInt(800, 1500));
    await randomDelay(400, 800);
  } catch {
    // movement failures are non-fatal
  }
}

// Generic listing-page card extractor. `linkIncludes` narrows which anchors
// count as product links for the target site.
async function extractCards(page: Page, linkIncludes: string, max: number): Promise<RawCard[]> {
  return page.evaluate(
    ({ linkIncludes, max }) => {
      const out: Array<{ brand: string; name: string; priceText: string; href: string; img: string }> = [];
      const seen = new Set<string>();
      const priceRe = /£\s?[\d,]+(?:\.\d{1,2})?/;
      const nodes = document.querySelectorAll("article, li, div");
      nodes.forEach((node) => {
        const link = node.querySelector(`a[href*="${linkIncludes}"]`) as HTMLAnchorElement | null;
        if (!link) return;
        const href = link.href;
        if (!href || seen.has(href)) return;

        const brandEl = node.querySelector('[class*="brand" i], [data-testid*="brand" i]');
        const nameEl = node.querySelector(
          '[class*="name" i], [data-testid*="name" i], [class*="title" i], [class*="description" i]'
        );
        const priceEl = node.querySelector('[class*="price" i], [data-testid*="price" i]');
        const img = node.querySelector("img") as HTMLImageElement | null;

        const brand = (brandEl?.textContent ?? "").trim();
        let name = (nameEl?.textContent ?? link.textContent ?? "").trim();
        let priceText = (priceEl?.textContent ?? "").trim();

        // Fall back to scanning the node's text for a £ price.
        if (!priceText) {
          const m = (node.textContent ?? "").match(priceRe);
          if (m) priceText = m[0];
        }
        if (!priceText) return;
        if (!name) return;
        // Trim absurdly long captured text.
        if (name.length > 160) name = name.slice(0, 160).trim();

        const imgSrc = img?.getAttribute("src") || img?.getAttribute("data-src") || "";
        seen.add(href);
        out.push({ brand, name, priceText, href, img: imgSrc });
      });
      return out.slice(0, max);
    },
    { linkIncludes, max }
  );
}

async function loadListing(page: Page, url: string, waitSelector?: string): Promise<boolean> {
  try {
    // 90s timeout — proxied requests through residential IPs can be slow.
    // networkidle waits for the page to fully settle (incl. lazy product tiles).
    await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
    // Human-like settle pause.
    await page.waitForTimeout(3000 + Math.random() * 3000);
    if (waitSelector) {
      // Best-effort: if the selector never appears we still try to extract.
      await page.waitForSelector(waitSelector, { timeout: 30000 }).catch(() => {});
    }
    await humanize(page);
    return true;
  } catch (err) {
    console.error(`[scraper] failed to load ${url}`, err);
    return false;
  }
}

function toRows(
  cards: RawCard[],
  categoryName: string,
  opts: { inferBeauty?: boolean } = {}
): Promise<ScrapedProductRow[]> {
  return Promise.all(
    cards
      .map((c) => {
        const priceGbp = parsePriceGbp(c.priceText);
        if (priceGbp === null) return null;
        const fullText = `${c.brand} ${c.name}`;
        const category = opts.inferBeauty ? inferBeautyCategory(fullText, categoryName) : categoryName;
        return { c, priceGbp, category, fullText };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .map(async ({ c, priceGbp, category, fullText }) => ({
        brand: c.brand || "Selfridges",
        name: c.name,
        category,
        price_gbp: priceGbp,
        price_usd: await convertGbpToUsd(priceGbp),
        deliverable_lebanon: !isFragrance(fullText),
        product_url: c.href,
        image_url: c.img
      }))
  );
}

function dedupeByUrl(rows: ScrapedProductRow[]): ScrapedProductRow[] {
  const seen = new Set<string>();
  const out: ScrapedProductRow[] = [];
  for (const r of rows) {
    if (!r.product_url || seen.has(r.product_url)) continue;
    seen.add(r.product_url);
    out.push(r);
  }
  return out;
}

// ---------- Primary source: Selfridges category pages ----------
// Selectors that Selfridges uses for product tiles. Best-effort — the
// extractor still runs even if none of these appear in the DOM.
const SELFRIDGES_PRODUCT_SELECTOR = '.product-card, [data-test="product"], .cat-product';

async function scrapeSelfridgesCategory(browser: Browser, categoryName: string): Promise<ScrapedProductRow[]> {
  const slug = SELFRIDGES_SLUGS[categoryName];
  if (!slug) return [];

  const { context, page } = await newStealthPage(browser);
  const collected: ScrapedProductRow[] = [];
  try {
    // Warm-up: hit the Selfridges homepage first so we pick up session
    // cookies and look like a returning visitor before requesting a
    // listing page. Cookies live on the context, so this benefits every
    // subsequent page navigation in this run.
    try {
      console.log(`[scraper] Selfridges warm-up: homepage`);
      await page.goto("https://www.selfridges.com/GB/en/", { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(2000 + Math.random() * 2000);
    } catch (err) {
      console.warn(`[scraper] homepage warm-up failed — continuing to category pages anyway`, err);
    }

    for (let pge = 1; pge <= PAGES_PER_CATEGORY; pge += 1) {
      const url = `https://www.selfridges.com/GB/en/cat/${slug}/?pge=${pge}&ppp=${PRODUCTS_PER_PAGE}&sort=relevance`;
      console.log(`[scraper] Selfridges ${categoryName} page ${pge}: ${url}`);
      const ok = await loadListing(page, url, SELFRIDGES_PRODUCT_SELECTOR);
      if (!ok) break;

      const cards = await extractCards(page, "/GB/en/cat/", PRODUCTS_PER_PAGE);
      if (cards.length === 0) {
        console.log(`[scraper] Selfridges ${categoryName} page ${pge} → 0 cards (likely blocked or empty)`);
        // No point paging further if a page yields nothing.
        break;
      }
      const rows = await toRows(cards, categoryName);
      collected.push(...rows);
      console.log(`[scraper] Selfridges ${categoryName} page ${pge} → ${rows.length} products`);
      await randomDelay(2500, 5000);
    }
  } finally {
    await context.close().catch(() => {});
  }
  return dedupeByUrl(collected);
}

// ---------- Fallback sources (weaker bot protection) ----------
async function scrapeListingSite(
  browser: Browser,
  label: string,
  url: string,
  linkIncludes: string,
  categoryName: string,
  inferBeauty: boolean
): Promise<ScrapedProductRow[]> {
  const { context, page } = await newStealthPage(browser);
  try {
    console.log(`[scraper] ${label}: ${url}`);
    const ok = await loadListing(page, url);
    if (!ok) return [];
    const cards = await extractCards(page, linkIncludes, PRODUCTS_PER_PAGE);
    if (cards.length === 0) {
      console.log(`[scraper] ${label} → 0 cards`);
      return [];
    }
    const rows = await toRows(cards, categoryName, { inferBeauty });
    console.log(`[scraper] ${label} → ${rows.length} products`);
    return dedupeByUrl(rows);
  } finally {
    await context.close().catch(() => {});
  }
}

// Best-effort listing URLs. These retailers change paths over time, so treat
// these as starting points that may need occasional tuning.
const SPACENK_PATHS: Record<string, string> = {
  Makeup: "https://www.spacenk.com/uk/makeup",
  Skincare: "https://www.spacenk.com/uk/skincare",
  Haircare: "https://www.spacenk.com/uk/hair",
  "Beauty tools": "https://www.spacenk.com/uk/tools-brushes"
};

const CULTBEAUTY_PATHS: Record<string, string> = {
  Makeup: "https://www.cultbeauty.com/makeup.list",
  Skincare: "https://www.cultbeauty.com/skincare.list",
  Haircare: "https://www.cultbeauty.com/hair.list",
  "Beauty tools": "https://www.cultbeauty.com/tools-accessories.list"
};

const BROWNS_PATHS: Record<string, string> = {
  Bags: "https://www.brownsfashion.com/uk/shopping/womens-bags",
  Accessories: "https://www.brownsfashion.com/uk/shopping/womens-accessories"
};

async function scrapeFallback(browser: Browser, categoryName: string): Promise<ScrapedProductRow[]> {
  const collected: ScrapedProductRow[] = [];

  if (BEAUTY_CATEGORIES.has(categoryName)) {
    const spacenk = SPACENK_PATHS[categoryName];
    if (spacenk) {
      const rows = await scrapeListingSite(browser, `Space NK ${categoryName}`, spacenk, "/p/", categoryName, true);
      collected.push(...rows);
    }
    if (collected.length === 0) {
      const cult = CULTBEAUTY_PATHS[categoryName];
      if (cult) {
        const rows = await scrapeListingSite(
          browser,
          `Cult Beauty ${categoryName}`,
          cult,
          ".html",
          categoryName,
          true
        );
        collected.push(...rows);
      }
    }
  } else {
    // Bags / Accessories → Browns
    const browns = BROWNS_PATHS[categoryName];
    if (browns) {
      const rows = await scrapeListingSite(
        browser,
        `Browns ${categoryName}`,
        browns,
        "/shopping/",
        categoryName,
        false
      );
      collected.push(...rows);
    }
  }

  return dedupeByUrl(collected);
}

// ---------- Public entry point ----------
export async function scrapeCategory(categoryName: string): Promise<ScrapedProductRow[]> {
  const launchOptions: Record<string, unknown> = {
    headless: true,
    args: LAUNCH_ARGS
  };
  if (process.env.PROXY_URL) {
    launchOptions.proxy = { server: process.env.PROXY_URL };
    // Mask the password so credentials don't show up in Railway logs.
    const safe = process.env.PROXY_URL.replace(/(\/\/[^:@/]+):[^@]+@/, "$1:***@");
    console.log(`[scraper] using proxy ${safe}`);
  }

  let browser: Browser | null = null;
  try {
    browser = (await chromium.launch(launchOptions)) as Browser;

    let products = await scrapeSelfridgesCategory(browser, categoryName);

    if (products.length === 0) {
      console.log(`[scraper] Selfridges returned 0 for "${categoryName}" — trying fallback retailers`);
      products = await scrapeFallback(browser, categoryName);
    }

    return products;
  } catch (err) {
    console.error(`[scraper] scrapeCategory failed for "${categoryName}"`, err);
    return [];
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}
