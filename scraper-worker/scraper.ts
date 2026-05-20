import { chromium, type Browser, type Page } from "@playwright/test";
import type { ScrapedProductRow } from "./db";
import { convertGbpToUsd } from "./currency";

const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15"
];

const ALLOWED_CATEGORIES = new Set([
  "Makeup",
  "Skincare",
  "Bags",
  "Haircare",
  "Accessories",
  "Beauty tools"
]);

function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function randomDelay(min = 2000, max = 4000): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function inferCategory(text: string, fallback: string): string {
  const lower = text.toLowerCase();
  if (
    lower.includes("hair dryer") ||
    lower.includes("hairdryer") ||
    lower.includes("straightener") ||
    lower.includes("airwrap") ||
    lower.includes("airstrait") ||
    lower.includes("curling iron") ||
    lower.includes("curl tong") ||
    lower.includes("curling tong") ||
    lower.includes("hair brush") ||
    lower.includes("hairbrush") ||
    lower.includes("makeup brush") ||
    lower.includes("brush set") ||
    lower.includes("massage gun") ||
    lower.includes("tweezer") ||
    lower.includes("microcurrent") ||
    lower.includes("facial toning device") ||
    lower.includes("cleansing device")
  ) {
    return "Beauty tools";
  }
  if (
    lower.includes("bag") ||
    lower.includes("tote") ||
    lower.includes("clutch") ||
    lower.includes("pouch") ||
    lower.includes("satchel") ||
    lower.includes("crossbody") ||
    lower.includes("cross-body")
  ) {
    return "Bags";
  }
  if (
    lower.includes("foundation") ||
    lower.includes("concealer") ||
    lower.includes("lipstick") ||
    lower.includes("lip gloss") ||
    lower.includes("lip oil") ||
    lower.includes("lip liner") ||
    lower.includes("mascara") ||
    lower.includes("eyeliner") ||
    lower.includes("blush") ||
    lower.includes("eyeshadow") ||
    lower.includes("bronzer") ||
    lower.includes("highlighter") ||
    lower.includes("setting spray") ||
    lower.includes("makeup")
  ) {
    return "Makeup";
  }
  if (
    lower.includes("shampoo") ||
    lower.includes("conditioner") ||
    lower.includes("hair oil") ||
    lower.includes("hair mask") ||
    lower.includes("hair perfector") ||
    lower.includes("hair spray") ||
    lower.includes("hairspray") ||
    lower.includes("haircare") ||
    lower.includes("hair care")
  ) {
    return "Haircare";
  }
  if (
    lower.includes("cream") ||
    lower.includes("serum") ||
    lower.includes("moistur") ||
    lower.includes("cleans") ||
    lower.includes("toner") ||
    lower.includes("skincare") ||
    lower.includes("skin care") ||
    lower.includes("mask") ||
    lower.includes("exfoliant") ||
    lower.includes("retinol") ||
    lower.includes("hyaluronic")
  ) {
    return "Skincare";
  }
  if (
    lower.includes("scarf") ||
    lower.includes("wallet") ||
    lower.includes("belt") ||
    lower.includes("sunglass") ||
    lower.includes("card holder") ||
    lower.includes("cardholder") ||
    lower.includes("jewel") ||
    lower.includes("necklace") ||
    lower.includes("bracelet") ||
    lower.includes("earring") ||
    lower.includes("hair clip") ||
    lower.includes("accessor")
  ) {
    return "Accessories";
  }
  if (ALLOWED_CATEGORIES.has(fallback)) return fallback;
  return "Accessories";
}

async function checkLebanonDeliverability(page: Page, productUrl: string): Promise<boolean> {
  try {
    await page.goto(productUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await randomDelay(1500, 2500);

    // Try to open the Delivery & Returns accordion if present
    const triggers = await page.$$('button, a, h2, h3');
    for (const trigger of triggers) {
      const text = ((await trigger.textContent().catch(() => "")) ?? "").toLowerCase();
      if (text.includes("delivery") && text.includes("return")) {
        await trigger.click({ timeout: 3000 }).catch(() => {});
        await randomDelay(500, 1200);
        break;
      }
    }

    const bodyText = ((await page.textContent("body").catch(() => "")) ?? "").toLowerCase();
    if (!bodyText) return true;
    if (bodyText.includes("does not ship to lebanon") || bodyText.includes("not available in lebanon")) {
      return false;
    }
    if (bodyText.includes("lebanon")) {
      // explicit positive mention
      return true;
    }
    // No explicit signal — assume deliverable; the storefront will surface "Ask us" otherwise.
    return true;
  } catch {
    return true;
  }
}

async function scrapeOneSearch(browser: Browser, term: string): Promise<ScrapedProductRow[]> {
  const context = await browser.newContext({
    userAgent: randomUA(),
    viewport: { width: 1366, height: 900 },
    locale: "en-GB",
    extraHTTPHeaders: {
      "Accept-Language": "en-GB,en;q=0.9"
    }
  });
  const page = await context.newPage();

  try {
    const searchUrl = `https://www.selfridges.com/GB/en/cat/?pge=1&ppp=40&sort=relevance&term=${encodeURIComponent(term)}`;
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector('[data-testid*="product"], a[href*="/cat/"]', { timeout: 12000 }).catch(() => {});
    await randomDelay();

    const cards = await page.evaluate(() => {
      const out: Array<{
        brand: string;
        name: string;
        priceText: string;
        href: string;
        img: string;
      }> = [];
      const nodes = document.querySelectorAll("article, li, div");
      const seen = new Set<string>();
      nodes.forEach((node) => {
        const link = node.querySelector('a[href*="/GB/en/cat/"]') as HTMLAnchorElement | null;
        if (!link) return;
        const href = link.href;
        if (seen.has(href)) return;
        const brandEl = node.querySelector('[class*="brand" i], [data-testid*="brand" i]');
        const nameEl = node.querySelector('[class*="name" i], [data-testid*="name" i], [class*="title" i]');
        const priceEl = node.querySelector('[class*="price" i], [data-testid*="price" i]');
        const img = node.querySelector("img") as HTMLImageElement | null;
        const brand = (brandEl?.textContent ?? "").trim();
        const name = (nameEl?.textContent ?? link.textContent ?? "").trim();
        const priceText = (priceEl?.textContent ?? "").trim();
        if (!brand || !name || !priceText) return;
        seen.add(href);
        out.push({
          brand,
          name,
          priceText,
          href,
          img: img?.src ?? ""
        });
      });
      // Limit to 50 products per search term to avoid timeouts.
      return out.slice(0, 50);
    });

    if (cards.length === 0) {
      console.log(`[scraper] "${term}" returned 0 results — continuing`);
      return [];
    }

    const products: ScrapedProductRow[] = [];

    for (const card of cards) {
      const priceMatch = card.priceText.match(/([\d,]+(?:\.\d{1,2})?)/);
      if (!priceMatch) continue;
      const priceGbp = Number(priceMatch[1].replace(/,/g, ""));
      if (!Number.isFinite(priceGbp) || priceGbp <= 0) continue;

      // Random 2000–5000ms pause between product page visits (anti bot-detection).
      await randomDelay(2000, 5000);
      const deliverable = await checkLebanonDeliverability(page, card.href);
      const category = inferCategory(`${card.brand} ${card.name} ${term}`, "");

      products.push({
        brand: card.brand,
        name: card.name,
        category,
        price_gbp: priceGbp,
        price_usd: await convertGbpToUsd(priceGbp),
        deliverable_lebanon: deliverable,
        product_url: card.href,
        image_url: card.img
      });
    }

    return products;
  } finally {
    await context.close().catch(() => {});
  }
}

export async function scrapeSelfridges(term: string): Promise<ScrapedProductRow[]> {
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled"
      ]
    });
    const result = await scrapeOneSearch(browser, term);
    return result;
  } catch (err) {
    console.error(`[scraper] failed for "${term}"`, err);
    return [];
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}
