import { getSql } from "./db";

export interface ScrapedProduct {
  brand: string;
  name: string;
  category: string;
  price_gbp: number;
  price_usd: number;
  deliverable_lebanon: boolean;
  product_url: string;
  image_url: string;
}

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function gbpToUsd(gbp: number): number {
  const rate = Number(process.env.GBP_TO_USD_RATE ?? 1.27);
  return Math.round(gbp * 1.1 * rate * 100) / 100;
}

function randomDelay(min = 1500, max = 3000): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function logScrape(query: string, status: string, count: number): Promise<void> {
  try {
    const sql = getSql();
    await sql`
      insert into scrape_logs (query, status, results_count)
      values (${query}, ${status}, ${count})
    `;
  } catch {
    // ignore logging failures
  }
}

async function persistProducts(products: ScrapedProduct[], category: string): Promise<void> {
  if (products.length === 0) return;
  try {
    const sql = getSql();
    for (const p of products) {
      await sql`
        insert into products (brand, name, category, price_gbp, price_usd, deliverable_lebanon, product_url, image_url)
        values (${p.brand}, ${p.name}, ${category}, ${p.price_gbp}, ${p.price_usd}, ${p.deliverable_lebanon}, ${p.product_url}, ${p.image_url})
      `;
    }
  } catch {
    // ignore persistence failures
  }
}

async function readCachedProducts(query: string): Promise<ScrapedProduct[]> {
  try {
    const sql = getSql();
    const term = `%${query.toLowerCase()}%`;
    const rows = (await sql`
      select brand, name, category, price_gbp, price_usd, deliverable_lebanon, product_url, image_url
      from products
      where lower(brand) like ${term} or lower(name) like ${term}
      order by scraped_at desc
      limit 12
    `) as Array<{
      brand: string;
      name: string;
      category: string;
      price_gbp: string;
      price_usd: string;
      deliverable_lebanon: boolean;
      product_url: string | null;
      image_url: string | null;
    }>;
    return rows.map((r) => ({
      brand: r.brand,
      name: r.name,
      category: r.category,
      price_gbp: Number(r.price_gbp),
      price_usd: Number(r.price_usd),
      deliverable_lebanon: r.deliverable_lebanon,
      product_url: r.product_url ?? "",
      image_url: r.image_url ?? ""
    }));
  } catch {
    return [];
  }
}

async function scrapeWithPlaywright(query: string): Promise<ScrapedProduct[]> {
  // Dynamic import keeps Playwright out of the build graph for environments
  // (e.g. Vercel) where the binary isn't available.
  const { chromium } = await import("playwright");

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  try {
    const context = await browser.newContext({
      userAgent: USER_AGENT,
      viewport: { width: 1280, height: 800 },
      locale: "en-GB"
    });
    const page = await context.newPage();

    const searchUrl = `https://www.selfridges.com/GB/en/cat/?pge=1&ppp=60&sort=relevance&term=${encodeURIComponent(query)}`;
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector('[data-testid*="product"], a[href*="/cat/"]', { timeout: 10000 }).catch(() => {});

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
      return out.slice(0, 12);
    });

    const products: ScrapedProduct[] = [];

    for (const card of cards) {
      const priceMatch = card.priceText.match(/([\d,]+(?:\.\d{1,2})?)/);
      if (!priceMatch) continue;
      const priceGbp = Number(priceMatch[1].replace(/,/g, ""));
      if (!Number.isFinite(priceGbp) || priceGbp <= 0) continue;

      let deliverable = true;
      try {
        await randomDelay();
        await page.goto(card.href, { waitUntil: "domcontentloaded", timeout: 30000 });
        const bodyText = (await page.textContent("body").catch(() => "")) ?? "";
        const lower = bodyText.toLowerCase();
        if (lower.includes("delivery") || lower.includes("returns")) {
          deliverable = lower.includes("lebanon");
        }
      } catch {
        deliverable = true;
      }

      products.push({
        brand: card.brand,
        name: card.name,
        category: "All",
        price_gbp: priceGbp,
        price_usd: gbpToUsd(priceGbp),
        deliverable_lebanon: deliverable,
        product_url: card.href,
        image_url: card.img
      });
    }

    return products;
  } finally {
    await browser.close().catch(() => {});
  }
}

export async function searchSelfridges(query: string, category: string): Promise<ScrapedProduct[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const live = await scrapeWithPlaywright(trimmed);
    if (live.length > 0) {
      const tagged = live.map((p) => ({ ...p, category: category && category !== "All" ? category : p.category }));
      await persistProducts(tagged, category && category !== "All" ? category : "All");
      await logScrape(trimmed, "ok", tagged.length);
      return tagged;
    }
    await logScrape(trimmed, "empty", 0);
  } catch (err) {
    await logScrape(trimmed, "failed", 0);
    console.error("scraper error", err);
  }

  const cached = await readCachedProducts(trimmed);
  if (cached.length > 0) return cached;

  const { FALLBACK_PRODUCTS } = await import("./featured");
  return FALLBACK_PRODUCTS.map((p) => ({
    brand: p.brand,
    name: p.name,
    category: p.category,
    price_gbp: p.price_gbp,
    price_usd: p.price_usd,
    deliverable_lebanon: p.deliverable_lebanon,
    product_url: p.product_url,
    image_url: p.image_url
  }));
}
