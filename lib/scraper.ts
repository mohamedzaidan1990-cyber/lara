import { getSql } from "./db";
import { convertGbpToUsd } from "./currency";

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

const ALLOWED_CATEGORIES = new Set([
  "Makeup",
  "Skincare",
  "Bags",
  "Haircare",
  "Accessories",
  "Beauty tools"
]);

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
  if (lower.includes("bag") || lower.includes("tote") || lower.includes("clutch") || lower.includes("pouch") || lower.includes("satchel") || lower.includes("crossbody") || lower.includes("cross-body")) {
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

async function persistProducts(products: ScrapedProduct[]): Promise<void> {
  if (products.length === 0) return;
  try {
    const sql = getSql();
    for (const p of products) {
      await sql`
        insert into products (brand, name, category, price_gbp, price_usd, deliverable_lebanon, product_url, image_url)
        values (${p.brand}, ${p.name}, ${p.category}, ${p.price_gbp}, ${p.price_usd}, ${p.deliverable_lebanon}, ${p.product_url}, ${p.image_url})
        on conflict (product_url) do update set
          brand = excluded.brand,
          name = excluded.name,
          category = excluded.category,
          price_gbp = excluded.price_gbp,
          price_usd = excluded.price_usd,
          deliverable_lebanon = excluded.deliverable_lebanon,
          image_url = excluded.image_url,
          scraped_at = now()
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

async function scrapeWithPlaywright(query: string, requestedCategory: string): Promise<ScrapedProduct[]> {
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

      const category = inferCategory(`${card.brand} ${card.name}`, requestedCategory);

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
    await browser.close().catch(() => {});
  }
}

export async function searchSelfridges(query: string, category: string): Promise<ScrapedProduct[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const requestedCategory = ALLOWED_CATEGORIES.has(category) ? category : "All";

  try {
    const live = await scrapeWithPlaywright(trimmed, requestedCategory === "All" ? "" : requestedCategory);
    if (live.length > 0) {
      const filtered =
        requestedCategory === "All"
          ? live
          : live.filter((p) => p.category === requestedCategory);
      const result = filtered.length > 0 ? filtered : live;
      await persistProducts(result);
      await logScrape(trimmed, "ok", result.length);
      return result;
    }
    await logScrape(trimmed, "empty", 0);
  } catch (err) {
    await logScrape(trimmed, "failed", 0);
    console.error("scraper error", err);
  }

  const cached = await readCachedProducts(trimmed);
  if (cached.length > 0) {
    return requestedCategory === "All"
      ? cached
      : cached.filter((p) => p.category === requestedCategory).concat(cached.filter((p) => p.category !== requestedCategory)).slice(0, 12);
  }

  const { getFallbackProducts } = await import("./featured");
  const fallbackProducts = await getFallbackProducts();
  const fallback = fallbackProducts.map((p) => ({
    brand: p.brand,
    name: p.name,
    category: p.category,
    price_gbp: p.price_gbp,
    price_usd: p.price_usd,
    deliverable_lebanon: p.deliverable_lebanon,
    product_url: p.product_url,
    image_url: p.image_url
  }));
  if (requestedCategory === "All") return fallback;
  const matching = fallback.filter((p) => p.category === requestedCategory);
  return matching.length > 0 ? matching : fallback;
}
