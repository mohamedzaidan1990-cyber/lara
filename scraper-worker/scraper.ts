import { fetch as undiciFetch, ProxyAgent } from "undici";
import * as cheerio from "cheerio";
import type { ScrapedProductRow } from "./db";
import { convertGbpToUsd } from "./currency";

// =============================================================================
// Beauty-only product scraper (no Playwright).
//
// Focus: makeup, skincare, haircare and beauty tools — all deliverable to
// Lebanon via the personal-shopping service. Selfridges is fully Cloudflare-
// blocked to plain fetch, so it is not used. The catalog is built from two
// reachable retailers that carry the same luxury beauty brands:
//
//   * Space NK (PRIMARY) — Salesforce Commerce Cloud. Each category/sub-
//     category PAGE server-renders ~10-12 product tiles, each carrying a JSON
//     blob in `data-snk-e-cxt` (brand/name/price). We crawl the category
//     landing page plus every sub-category it links to, which multiplies the
//     volume well past the ~10 a single grid returns.
//   * Cult Beauty (SECONDARY for makeup/skincare) — THG. `.list` pages embed a
//     `productList.products` JSON array, paginated via `?pageNumber`.
//
// All scraped items are standard beauty products → deliverable_lebanon: true.
// Prices are GBP, converted to USD (with service markup) via currency.ts.
// =============================================================================

// ---------- Proxy dispatcher (same pattern as lib/selfridges-import.ts) ----------
let cachedDispatcher: ProxyAgent | null = null;
function getDispatcher(): ProxyAgent | undefined {
  const url = process.env.PROXY_URL;
  if (!url) return undefined;
  if (!cachedDispatcher) {
    cachedDispatcher = new ProxyAgent(url);
    const safe = url.replace(/(\/\/[^:@/]+):[^@]+@/, "$1:***@");
    console.log(`[scraper] using proxy ${safe}`);
  }
  return cachedDispatcher;
}

// Beauty-only. (Bags/Accessories have no reachable source and are intentionally
// excluded so runs stay focused on deliverable beauty products.)
export const SCRAPE_CATEGORIES = ["Makeup", "Skincare", "Haircare", "Beauty tools"] as const;

// Cap on how many sub-category pages to crawl per top category (keeps run time
// bounded; categories expose ~29-32 sub-pages today).
const MAX_SUBCATEGORIES = 45;

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function headersFor(referer: string): Record<string, string> {
  return {
    "User-Agent": USER_AGENT,
    Accept: "text/html,application/xhtml+xml,application/json,*/*;q=0.9",
    "Accept-Language": "en-GB,en;q=0.9",
    Referer: referer,
    "x-requested-with": "XMLHttpRequest"
  };
}

// ---------- Shared helpers ----------
interface RawProduct {
  brand: string;
  name: string;
  priceGbp: number;
  image_url: string;
  product_url: string;
}

function parsePrice(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) && raw > 0 ? raw : null;
  if (typeof raw === "string") {
    const m = raw.replace(/,/g, "").match(/([\d]+(?:\.\d{1,2})?)/);
    if (!m) return null;
    const n = Number(m[1]);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

function resolveUrl(raw: string, origin: string): string {
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  if (raw.startsWith("/")) return `${origin}${raw}`;
  return `${origin}/${raw}`;
}

function dedupeRaw(rows: RawProduct[]): RawProduct[] {
  const seen = new Set<string>();
  const out: RawProduct[] = [];
  for (const r of rows) {
    const key = r.product_url || `${r.brand}|${r.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

function dedupeRows(rows: ScrapedProductRow[]): ScrapedProductRow[] {
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

async function toRows(raws: RawProduct[], categoryName: string, sourceBrand: string): Promise<ScrapedProductRow[]> {
  return Promise.all(
    raws.map(async (r) => ({
      brand: r.brand || sourceBrand,
      name: r.name,
      category: categoryName,
      price_gbp: r.priceGbp,
      price_usd: await convertGbpToUsd(r.priceGbp),
      deliverable_lebanon: true,
      product_url: r.product_url,
      image_url: r.image_url
    }))
  );
}

function delay(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(
  url: string,
  headers: Record<string, string>
): Promise<{ status: number; text: string } | null> {
  try {
    const res = await undiciFetch(url, { headers, redirect: "follow", dispatcher: getDispatcher() });
    return { status: res.status, text: await res.text() };
  } catch (err) {
    console.error(`[scraper] fetch error for ${url}: ${(err as Error).message}`);
    return null;
  }
}

function ok(status: number): boolean {
  return status >= 200 && status < 300;
}

// ---------- Space NK (PRIMARY) ----------
// SFCC category/sub-category pages render product tiles whose `data-snk-e-cxt`
// attribute holds JSON like:
//   [{"$entity":"product","brand":"Charlotte Tilbury","name":"Magic Cream",
//     "price":195,"priceGBP":195,"currency":"GBP",...}]
const SPACENK_ORIGIN = "https://www.spacenk.com";

// Top category → landing path on Space NK (note: haircare lives under /haircare).
const SPACENK_LANDINGS: Record<string, string> = {
  Makeup: "makeup",
  Skincare: "skincare",
  Haircare: "haircare"
};

// Beauty tools are scattered across the tool sub-pages of each section.
const SPACENK_TOOL_PATHS = [
  "/uk/makeup/brushes-tools",
  "/uk/skincare/skincare-tools",
  "/uk/haircare/hair-tools"
];

interface SnkCxt {
  $entity?: string;
  name?: string;
  brand?: string;
  price?: number;
  priceGBP?: number;
}

function parseSpaceNkTiles(html: string): RawProduct[] {
  const $ = cheerio.load(html);
  const out: RawProduct[] = [];
  $(".product[data-pid]").each((_, el) => {
    const tile = $(el);
    const cxtRaw =
      tile.find('[data-snk-e="productImpression"]').first().attr("data-snk-e-cxt") ||
      tile.find("[data-snk-e-cxt]").first().attr("data-snk-e-cxt");
    if (!cxtRaw) return;

    let cxt: SnkCxt | undefined;
    try {
      const parsed = JSON.parse(cxtRaw) as unknown;
      const entry = Array.isArray(parsed)
        ? (parsed.find((e) => (e as SnkCxt)?.$entity === "product") ?? parsed[0])
        : parsed;
      cxt = entry as SnkCxt;
    } catch {
      return;
    }
    if (!cxt) return;

    const name = (cxt.name ?? "").trim();
    const priceGbp = parsePrice(cxt.priceGBP ?? cxt.price);
    if (!name || priceGbp === null) return;

    const href = tile.find("a.link").first().attr("href") || tile.find("a[href]").first().attr("href") || "";
    const img =
      tile.find("img.tile-image").first().attr("src") ||
      tile.find("img").first().attr("src") ||
      tile.find("img").first().attr("data-src") ||
      "";

    out.push({
      brand: (cxt.brand ?? "").trim(),
      name,
      priceGbp,
      image_url: resolveUrl(img, SPACENK_ORIGIN),
      product_url: resolveUrl(href, SPACENK_ORIGIN)
    });
  });
  return out;
}

// Pull sub-category page links (up to 2 levels deep) out of a landing page.
function extractSpaceNkSublinks(html: string, base: string): string[] {
  const set = new Set<string>();
  const re = new RegExp(`href="(/uk/${base}/[a-z0-9-]+(?:/[a-z0-9-]+)?)"`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const path = m[1].split("?")[0];
    if (path.endsWith(".html")) continue; // skip product detail pages
    set.add(path);
  }
  return [...set];
}

// Crawl a section: landing page + every sub-category page it links to.
async function crawlSpaceNkSection(base: string, label: string): Promise<RawProduct[]> {
  const headers = headersFor(`${SPACENK_ORIGIN}/uk/${base}`);
  const collected: RawProduct[] = [];

  const landing = await fetchText(`${SPACENK_ORIGIN}/uk/${base}`, headers);
  let subs: string[] = [];
  if (landing && ok(landing.status)) {
    collected.push(...parseSpaceNkTiles(landing.text));
    subs = extractSpaceNkSublinks(landing.text, base).slice(0, MAX_SUBCATEGORIES);
  }
  console.log(
    `[scraper] Space NK ${label}: landing → ${collected.length} products, ${subs.length} sub-categories to crawl`
  );

  for (const path of subs) {
    const res = await fetchText(`${SPACENK_ORIGIN}${path}`, headers);
    if (res && ok(res.status)) collected.push(...parseSpaceNkTiles(res.text));
    await delay(400, 1000);
  }
  return collected;
}

// Fetch a fixed list of pages (used for the scattered Beauty-tools pages).
async function crawlSpaceNkPages(paths: string[], label: string): Promise<RawProduct[]> {
  const headers = headersFor(`${SPACENK_ORIGIN}/uk/`);
  const collected: RawProduct[] = [];
  for (const path of paths) {
    const res = await fetchText(`${SPACENK_ORIGIN}${path}`, headers);
    if (res && ok(res.status)) collected.push(...parseSpaceNkTiles(res.text));
    await delay(400, 1000);
  }
  console.log(`[scraper] Space NK ${label}: ${dedupeRaw(collected).length} products from ${paths.length} pages`);
  return collected;
}

async function scrapeSpaceNk(categoryName: string): Promise<ScrapedProductRow[]> {
  let raws: RawProduct[];
  if (categoryName === "Beauty tools") {
    raws = await crawlSpaceNkPages(SPACENK_TOOL_PATHS, categoryName);
  } else {
    const base = SPACENK_LANDINGS[categoryName];
    if (!base) return [];
    raws = await crawlSpaceNkSection(base, categoryName);
  }
  const deduped = dedupeRaw(raws);
  console.log(`[scraper] Space NK ${categoryName} → ${deduped.length} unique products`);
  return toRows(deduped, categoryName, "Space NK");
}

// ---------- Cult Beauty (SECONDARY) ----------
const CULTBEAUTY_ORIGIN = "https://www.cultbeauty.co.uk";
const CULTBEAUTY_SLUGS: Record<string, string> = {
  Makeup: "make-up",
  Skincare: "skin-care"
};
const CULTBEAUTY_MAX_PAGES = 8;

interface CbProduct {
  title?: string;
  url?: string;
  cheapestVariant?: { price?: { price?: { amount?: string | number } } };
  content?: Array<{ key?: string; value?: { stringListValue?: string[] } }>;
  images?: Array<{ original?: string }>;
}

// Extracts a JSON array that starts at `"<key>":[` using balanced-bracket
// scanning. `fromIndex` anchors the search after a known parent key.
function extractJsonArray(html: string, key: string, fromIndex = 0): unknown[] | null {
  const start = html.indexOf(`"${key}":`, fromIndex);
  if (start < 0) return null;
  const open = html.indexOf("[", start);
  if (open < 0) return null;

  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = open; i < html.length; i += 1) {
    const ch = html[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "[") depth += 1;
    else if (ch === "]") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(open, i + 1)) as unknown[];
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function parseCultBeautyProducts(products: unknown[]): RawProduct[] {
  const out: RawProduct[] = [];
  for (const p of products) {
    if (!p || typeof p !== "object") continue;
    const cb = p as CbProduct;
    const name = (cb.title ?? "").trim();
    const priceGbp = parsePrice(cb.cheapestVariant?.price?.price?.amount);
    if (!name || priceGbp === null) continue;

    let brand = "";
    for (const c of cb.content ?? []) {
      if (c.key === "brand") {
        const v = c.value?.stringListValue;
        if (Array.isArray(v) && typeof v[0] === "string") brand = v[0];
      }
    }

    out.push({
      brand,
      name,
      priceGbp,
      image_url: cb.images?.[0]?.original ?? "",
      product_url: resolveUrl(cb.url ?? "", CULTBEAUTY_ORIGIN)
    });
  }
  return out;
}

async function scrapeCultBeauty(categoryName: string): Promise<ScrapedProductRow[]> {
  const slug = CULTBEAUTY_SLUGS[categoryName];
  if (!slug) return [];
  const headers = headersFor(`${CULTBEAUTY_ORIGIN}/${slug}.list`);
  const collected: RawProduct[] = [];

  for (let page = 1; page <= CULTBEAUTY_MAX_PAGES; page += 1) {
    const url = `${CULTBEAUTY_ORIGIN}/${slug}.list?pageNumber=${page}`;
    const res = await fetchText(url, headers);
    if (!res || !ok(res.status)) break;

    // Anchor on the main "productList" object (avoids smaller widget arrays).
    const anchor = res.text.indexOf('"productList"');
    const products = extractJsonArray(res.text, "products", anchor >= 0 ? anchor : 0);
    if (!products || products.length === 0) break;

    const raws = parseCultBeautyProducts(products);
    if (raws.length === 0) break;
    collected.push(...raws);
    await delay(400, 1000);
  }

  const deduped = dedupeRaw(collected);
  if (deduped.length > 0) console.log(`[scraper] Cult Beauty ${categoryName} → ${deduped.length} unique products`);
  return toRows(deduped, categoryName, "Cult Beauty");
}

// ---------- Public entry point ----------
export async function scrapeCategory(categoryName: string): Promise<ScrapedProductRow[]> {
  // Space NK is the primary source; Cult Beauty adds extra makeup/skincare.
  const spacenk = await scrapeSpaceNk(categoryName);
  const cult = await scrapeCultBeauty(categoryName);
  const merged = dedupeRows([...spacenk, ...cult]);

  if (merged.length > 0) {
    console.log(
      `[scraper] "${categoryName}" → ${merged.length} products (Space NK ${spacenk.length} + Cult Beauty ${cult.length}, deduped)`
    );
  } else {
    console.log(`[scraper] "${categoryName}" → no products`);
  }
  return merged;
}
