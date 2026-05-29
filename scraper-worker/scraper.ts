import { fetch as undiciFetch, ProxyAgent } from "undici";
import type { ScrapedProductRow } from "./db";
import { convertGbpToUsd } from "./currency";

// =============================================================================
// API-based scraper (no Playwright).
//
// Selfridges' Playwright/HTML scraping is reliably blocked even behind
// residential proxies. Instead we hit JSON product APIs with plain `fetch`,
// which is far cheaper to run and much harder for the retailer to fingerprint.
//
// Strategy, per category:
//   1. Try Selfridges' own product APIs (several undocumented URL shapes).
//   2. Fall back to Space NK's API (carries the same luxury beauty brands).
//   3. Fall back to Cult Beauty's API (also identical brands).
// The first endpoint that returns parseable product JSON wins; we then page
// through that same endpoint shape. Source is irrelevant to customers — every
// product is fulfilled through the personal-shopping service.
//
// All prices are GBP (UK storefronts), converted to USD via currency.ts.
// =============================================================================

// ---------- Proxy dispatcher (same pattern as lib/selfridges-import.ts) ----------
let cachedDispatcher: ProxyAgent | null = null;
function getDispatcher(): ProxyAgent | undefined {
  const url = process.env.PROXY_URL;
  if (!url) return undefined;
  if (!cachedDispatcher) {
    cachedDispatcher = new ProxyAgent(url);
    // Mask credentials so they never land in Railway logs.
    const safe = url.replace(/(\/\/[^:@/]+):[^@]+@/, "$1:***@");
    console.log(`[scraper] using proxy ${safe}`);
  }
  return cachedDispatcher;
}

export const SCRAPE_CATEGORIES = [
  "Makeup",
  "Skincare",
  "Bags",
  "Haircare",
  "Accessories",
  "Beauty tools"
] as const;

const PAGES_PER_CATEGORY = 5;
const PAGE_SIZE = 60;

// ---------- Per-source category slugs ----------
const SELFRIDGES_SLUGS: Record<string, string> = {
  Makeup: "make-up",
  Skincare: "skincare",
  Bags: "bags-purses",
  Haircare: "hair",
  Accessories: "accessories",
  "Beauty tools": "beauty-tools-and-accessories"
};

const SPACENK_SLUGS: Record<string, string> = {
  Makeup: "makeup",
  Skincare: "skincare",
  Haircare: "hair",
  "Beauty tools": "tools-brushes"
};

const CULTBEAUTY_SLUGS: Record<string, string> = {
  Makeup: "makeup",
  Skincare: "skincare",
  Haircare: "hair",
  "Beauty tools": "tools-accessories"
};

// A common, realistic desktop UA. A fuller string blends in better than the
// truncated one — bot filters flag obviously-trimmed UAs.
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function headersFor(referer: string): Record<string, string> {
  return {
    "User-Agent": USER_AGENT,
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "en-GB,en;q=0.9",
    Referer: referer,
    "x-requested-with": "XMLHttpRequest"
  };
}

// ---------- Endpoint templates ----------
// Each template knows how to build a URL for a given (1-based) page number,
// which headers to send, and the origin used to resolve relative product/image
// URLs found in the response.
interface EndpointTemplate {
  label: string;
  origin: string;
  headers: Record<string, string>;
  build: (page: number) => string;
}

function selfridgesTemplates(categoryName: string): EndpointTemplate[] {
  const slug = SELFRIDGES_SLUGS[categoryName];
  if (!slug) return [];
  const origin = "https://www.selfridges.com";
  const headers = headersFor(`https://www.selfridges.com/GB/en/cat/${slug}/`);
  return [
    {
      label: `Selfridges[cms?country] ${categoryName}`,
      origin,
      headers,
      build: (page) =>
        `${origin}/api/cms/products/query?page=${page}&pageSize=${PAGE_SIZE}&category=${slug}&country=GB&lang=en`
    },
    {
      label: `Selfridges[cms] ${categoryName}`,
      origin,
      headers,
      build: (page) => `${origin}/api/cms/products/query?page=${page}&pageSize=${PAGE_SIZE}&category=${slug}`
    },
    {
      label: `Selfridges[product/v1] ${categoryName}`,
      origin,
      headers,
      build: (page) => `${origin}/api/product/v1/categories/${slug}/products?page=${page}&pageSize=${PAGE_SIZE}`
    },
    {
      label: `Selfridges[features/api] ${categoryName}`,
      origin,
      headers,
      build: (page) => `${origin}/GB/en/features/api/products?cat=${slug}&pageSize=${PAGE_SIZE}&page=${page}`
    }
  ];
}

function spacenkTemplates(categoryName: string): EndpointTemplate[] {
  const slug = SPACENK_SLUGS[categoryName];
  if (!slug) return [];
  const origin = "https://www.spacenk.com";
  const headers = headersFor(`https://www.spacenk.com/uk/${slug}`);
  return [
    {
      label: `Space NK[api] ${categoryName}`,
      origin,
      headers,
      build: (page) => `${origin}/uk/api/products?category=${slug}&page=${page}&pageSize=${PAGE_SIZE}`
    },
    {
      label: `Space NK[demandware] ${categoryName}`,
      origin,
      headers,
      build: (page) =>
        `${origin}/on/demandware.store/Sites-SN-UK-Site/en_GB/Search-ProductGrid?cgid=${slug}&sz=${PAGE_SIZE}&start=${
          (page - 1) * PAGE_SIZE
        }`
    }
  ];
}

function cultbeautyTemplates(categoryName: string): EndpointTemplate[] {
  const slug = CULTBEAUTY_SLUGS[categoryName];
  if (!slug) return [];
  const origin = "https://www.cultbeauty.co.uk";
  const headers = headersFor(`https://www.cultbeauty.co.uk/${slug}.list`);
  return [
    {
      label: `Cult Beauty[api] ${categoryName}`,
      origin,
      headers,
      build: (page) => `${origin}/api/products?category=${slug}&page=${page}`
    }
  ];
}

// Selfridges first, then Space NK, then Cult Beauty.
function candidateEndpoints(categoryName: string): EndpointTemplate[] {
  return [
    ...selfridgesTemplates(categoryName),
    ...spacenkTemplates(categoryName),
    ...cultbeautyTemplates(categoryName)
  ];
}

// ---------- Generic JSON product extraction ----------
// The exact response shapes are undocumented and differ per source, so rather
// than hard-coding field paths we walk the JSON and pull out any object that
// looks like a product (has both a name and a price). This makes the parser
// resilient to the wrapper shape changing.
interface RawProduct {
  brand: string;
  name: string;
  priceGbp: number;
  image_url: string;
  product_url: string;
}

const NAME_KEYS = ["name", "title", "productname", "displayname", "productdisplayname", "shortdescription", "label"];
const BRAND_KEYS = ["brand", "brandname", "designer", "designername", "manufacturer", "marque"];
const PRICE_KEYS = [
  "price",
  "saleprice",
  "currentprice",
  "nowprice",
  "sellingprice",
  "finalprice",
  "amount",
  "value",
  "price_gbp",
  "pricegbp"
];
const IMAGE_KEYS = ["image", "imageurl", "img", "thumbnail", "thumbnailurl", "mainimage", "primaryimage", "media", "imagesrc"];
const URL_KEYS = ["url", "producturl", "href", "link", "seourl", "canonicalurl", "pdpurl", "slug"];

// Case-insensitive own-key lookup.
function getProp(obj: Record<string, unknown>, keys: string[]): unknown {
  const lowerMap: Record<string, unknown> = {};
  for (const k of Object.keys(obj)) lowerMap[k.toLowerCase()] = obj[k];
  for (const k of keys) {
    if (k in lowerMap && lowerMap[k] !== null && lowerMap[k] !== undefined) return lowerMap[k];
  }
  return undefined;
}

function asString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function pickName(obj: Record<string, unknown>): string {
  const v = getProp(obj, NAME_KEYS);
  return asString(v).slice(0, 200);
}

function pickBrand(obj: Record<string, unknown>): string {
  const v = getProp(obj, BRAND_KEYS);
  if (typeof v === "string") return v.trim();
  if (v && typeof v === "object") {
    const bn = getProp(v as Record<string, unknown>, ["name", "label", "title"]);
    if (typeof bn === "string") return bn.trim();
  }
  return "";
}

// Pulls a positive number out of a value that might be a number, a numeric
// string ("£42.00", "42"), or a nested object like {value: 42}/{amount: 42}.
function coerceNumber(v: unknown, depth = 0): number | null {
  if (typeof v === "number") return Number.isFinite(v) && v > 0 ? v : null;
  if (typeof v === "string") {
    const m = v.replace(/,/g, "").match(/([\d]+(?:\.\d{1,2})?)/);
    if (!m) return null;
    const n = Number(m[1]);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  if (v && typeof v === "object" && depth < 2) {
    const inner = getProp(v as Record<string, unknown>, ["value", "amount", "gbp", "now", "current", "min"]);
    if (inner !== undefined) return coerceNumber(inner, depth + 1);
  }
  return null;
}

function pickPrice(obj: Record<string, unknown>): number | null {
  for (const key of PRICE_KEYS) {
    const v = getProp(obj, [key]);
    if (v === undefined) continue;
    const n = coerceNumber(v);
    if (n !== null) return n;
  }
  return null;
}

function pickImage(obj: Record<string, unknown>): string {
  const v = getProp(obj, IMAGE_KEYS);
  if (typeof v === "string") return v.trim();
  if (Array.isArray(v) && v.length > 0) {
    const first = v[0];
    if (typeof first === "string") return first.trim();
    if (first && typeof first === "object") {
      const u = getProp(first as Record<string, unknown>, ["url", "src", "href"]);
      if (typeof u === "string") return u.trim();
    }
  }
  if (v && typeof v === "object") {
    const u = getProp(v as Record<string, unknown>, ["url", "src", "href"]);
    if (typeof u === "string") return u.trim();
  }
  return "";
}

function pickUrl(obj: Record<string, unknown>): string {
  const v = getProp(obj, URL_KEYS);
  return asString(v);
}

function resolveUrl(raw: string, origin: string): string {
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  if (raw.startsWith("/")) return `${origin}${raw}`;
  return `${origin}/${raw}`;
}

// Recursively collect product-like objects from arbitrary JSON.
function collectProducts(node: unknown, origin: string, out: RawProduct[], depth = 0): void {
  if (depth > 8 || node === null || typeof node !== "object") return;

  if (Array.isArray(node)) {
    for (const item of node) collectProducts(item, origin, out, depth + 1);
    return;
  }

  const obj = node as Record<string, unknown>;
  const name = pickName(obj);
  const priceGbp = pickPrice(obj);

  // Treat as a product only when it has both a name and a usable price.
  if (name && priceGbp !== null) {
    const product_url = resolveUrl(pickUrl(obj), origin);
    const image_url = resolveUrl(pickImage(obj), origin);
    out.push({ brand: pickBrand(obj), name, priceGbp, image_url, product_url });
    // Don't descend into a confirmed product node — its children are details.
    return;
  }

  for (const key of Object.keys(obj)) collectProducts(obj[key], origin, out, depth + 1);
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

async function toRows(raws: RawProduct[], categoryName: string, sourceBrand: string): Promise<ScrapedProductRow[]> {
  return Promise.all(
    raws.map(async (r) => ({
      brand: r.brand || sourceBrand,
      name: r.name,
      category: categoryName,
      price_gbp: r.priceGbp,
      price_usd: await convertGbpToUsd(r.priceGbp),
      // Every product here is a standard beauty/accessory item — all deliverable.
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

function sourceBrandFor(label: string): string {
  if (label.startsWith("Space NK")) return "Space NK";
  if (label.startsWith("Cult Beauty")) return "Cult Beauty";
  return "Selfridges";
}

// Page through a single endpoint shape. Logs HTTP status (and the first 500
// chars of page 1) so it's easy to see in Railway logs which endpoint works.
async function scrapeEndpoint(tpl: EndpointTemplate, categoryName: string): Promise<ScrapedProductRow[]> {
  const collected: RawProduct[] = [];

  for (let page = 1; page <= PAGES_PER_CATEGORY; page += 1) {
    const url = tpl.build(page);
    let status = 0;
    let text = "";
    try {
      const res = await undiciFetch(url, {
        headers: tpl.headers,
        redirect: "follow",
        dispatcher: getDispatcher()
      });
      status = res.status;
      text = await res.text();
    } catch (err) {
      console.error(`[scraper] ${tpl.label} page ${page} fetch error: ${(err as Error).message}`);
      break;
    }

    if (page === 1) {
      const preview = text.slice(0, 500).replace(/\s+/g, " ").trim();
      console.log(`[scraper] ${tpl.label} page 1 → HTTP ${status}; first 500 chars: ${preview}`);
    } else {
      console.log(`[scraper] ${tpl.label} page ${page} → HTTP ${status}`);
    }

    if (status < 200 || status >= 300) break;

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      console.log(`[scraper] ${tpl.label} page ${page} → response is not JSON, skipping this endpoint`);
      break;
    }

    const raws: RawProduct[] = [];
    collectProducts(json, tpl.origin, raws);
    if (raws.length === 0) {
      console.log(`[scraper] ${tpl.label} page ${page} → JSON had no product-shaped objects`);
      break;
    }

    collected.push(...raws);
    console.log(`[scraper] ${tpl.label} page ${page} → ${raws.length} products`);
    await delay(800, 1800);
  }

  return toRows(dedupeRaw(collected), categoryName, sourceBrandFor(tpl.label));
}

// ---------- Public entry point ----------
export async function scrapeCategory(categoryName: string): Promise<ScrapedProductRow[]> {
  const templates = candidateEndpoints(categoryName);
  if (templates.length === 0) {
    console.log(`[scraper] no API endpoints configured for "${categoryName}"`);
    return [];
  }

  for (const tpl of templates) {
    try {
      const rows = await scrapeEndpoint(tpl, categoryName);
      if (rows.length > 0) {
        console.log(`[scraper] "${categoryName}" → selected source ${tpl.label} (${rows.length} products)`);
        return rows;
      }
    } catch (err) {
      console.error(`[scraper] ${tpl.label} failed: ${(err as Error).message}`);
    }
  }

  console.log(`[scraper] "${categoryName}" → no endpoint returned products`);
  return [];
}
