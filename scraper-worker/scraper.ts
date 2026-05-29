import { fetch as undiciFetch, ProxyAgent } from "undici";
import * as cheerio from "cheerio";
import type { ScrapedProductRow } from "./db";
import { convertGbpToUsd } from "./currency";

// =============================================================================
// API/fragment-based scraper (no Playwright).
//
// Verified behaviour (probed 2026-05-29):
//   * Selfridges  — every path (incl. the "public" API URLs) returns a
//                   Cloudflare 403 "Attention Required!" challenge to plain
//                   fetch from a datacenter/proxy IP. There is no usable JSON
//                   API; we keep a single best-effort probe so the logs show
//                   the block, then fall through.
//   * Space NK    — Salesforce Commerce Cloud. The Search-UpdateGrid controller
//                   returns an HTML fragment of 50-80 product tiles. Each tile
//                   carries a clean JSON blob in `data-snk-e-cxt` with brand,
//                   name and price. THIS IS THE PRIMARY SOURCE.
//   * Cult Beauty — THG. Category `.list` pages embed a `"products":[...]` JSON
//                   array with title/url/brand/price/image. Used as a fallback.
//
// Space NK and Cult Beauty carry the same luxury beauty brands as Selfridges
// (Charlotte Tilbury, La Mer, Dior, NARS, etc.) and every item is fulfilled
// through the personal-shopping service, so the source is invisible to
// customers. All prices are GBP, converted to USD via currency.ts.
//
// Note: Bags / Accessories have no working source here (Selfridges blocked;
// Space NK / Cult Beauty are beauty-only) — those categories return 0.
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

export const SCRAPE_CATEGORIES = [
  "Makeup",
  "Skincare",
  "Bags",
  "Haircare",
  "Accessories",
  "Beauty tools"
] as const;

const PAGE_SIZE = 60;
const MAX_PAGES = 5;

// ---------- Per-source category slugs ----------
const SELFRIDGES_SLUGS: Record<string, string> = {
  Makeup: "make-up",
  Skincare: "skincare",
  Bags: "bags-purses",
  Haircare: "hair",
  Accessories: "accessories",
  "Beauty tools": "beauty-tools-and-accessories"
};

// Space NK category-group IDs (verified to return products).
const SPACENK_CGID: Record<string, string> = {
  Makeup: "makeup",
  Skincare: "skincare",
  Haircare: "hair",
  "Beauty tools": "brushes-tools"
};

// Cult Beauty `.list` slugs (verified). Only slugs that actually resolve are
// listed — unmapped categories simply skip this fallback.
const CULTBEAUTY_SLUGS: Record<string, string> = {
  Makeup: "make-up",
  Skincare: "skin-care"
};

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
      // Every product here is a standard beauty item — all deliverable.
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

// ---------- Source 1: Selfridges (best-effort first probe; expected 403) ----------
async function scrapeSelfridges(categoryName: string): Promise<ScrapedProductRow[]> {
  const slug = SELFRIDGES_SLUGS[categoryName];
  if (!slug) return [];
  const url = `https://www.selfridges.com/api/cms/products/query?page=1&pageSize=${PAGE_SIZE}&category=${slug}&country=GB&lang=en`;
  const res = await fetchText(url, headersFor(`https://www.selfridges.com/GB/en/cat/${slug}/`));
  if (!res) return [];
  const preview = res.text.slice(0, 200).replace(/\s+/g, " ").trim();
  console.log(`[scraper] Selfridges ${categoryName} → HTTP ${res.status}; ${preview}`);
  if (res.status < 200 || res.status >= 300) return [];
  // If Selfridges ever serves JSON again, try to read an array of products.
  try {
    const json = JSON.parse(res.text) as unknown;
    const raws = extractGenericProducts(json, "https://www.selfridges.com");
    return toRows(dedupeRaw(raws), categoryName, "Selfridges");
  } catch {
    return [];
  }
}

// Minimal generic JSON product extractor — only used for the Selfridges probe.
function extractGenericProducts(node: unknown, origin: string, out: RawProduct[] = [], depth = 0): RawProduct[] {
  if (depth > 6 || node === null || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    for (const item of node) extractGenericProducts(item, origin, out, depth + 1);
    return out;
  }
  const obj = node as Record<string, unknown>;
  const name = typeof obj.name === "string" ? obj.name : typeof obj.title === "string" ? obj.title : "";
  const price = parsePrice(obj.price ?? obj.priceGBP ?? obj.amount);
  if (name && price !== null) {
    const url = typeof obj.url === "string" ? obj.url : typeof obj.href === "string" ? obj.href : "";
    const img = typeof obj.image === "string" ? obj.image : "";
    const brandRaw = obj.brand;
    const brand =
      typeof brandRaw === "string"
        ? brandRaw
        : brandRaw && typeof brandRaw === "object" && typeof (brandRaw as Record<string, unknown>).name === "string"
          ? ((brandRaw as Record<string, unknown>).name as string)
          : "";
    out.push({ brand, name, priceGbp: price, image_url: resolveUrl(img, origin), product_url: resolveUrl(url, origin) });
    return out;
  }
  for (const key of Object.keys(obj)) extractGenericProducts(obj[key], origin, out, depth + 1);
  return out;
}

// ---------- Source 2: Space NK (PRIMARY) ----------
// Salesforce Commerce Cloud "Search-UpdateGrid" returns an HTML fragment of
// product tiles. Each tile's `data-snk-e-cxt` attribute holds a JSON array
// like: [{"$entity":"product","brand":"Charlotte Tilbury","name":"Magic Cream",
//         "price":195,"priceGBP":195,"currency":"GBP",...}]
const SPACENK_ORIGIN = "https://www.spacenk.com";

interface SnkCxt {
  $entity?: string;
  name?: string;
  brand?: string;
  price?: number;
  priceGBP?: number;
}

function parseSpaceNkFragment(html: string): RawProduct[] {
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
      const entry = Array.isArray(parsed) ? parsed.find((e) => (e as SnkCxt)?.$entity === "product") ?? parsed[0] : parsed;
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

async function scrapeSpaceNk(categoryName: string): Promise<ScrapedProductRow[]> {
  const cgid = SPACENK_CGID[categoryName];
  if (!cgid) return [];
  const headers = headersFor(`${SPACENK_ORIGIN}/uk/${cgid}`);

  // Only the first batch of tiles is server-rendered with price data; the
  // `start` param is ignored for anonymous requests (the rest hydrate
  // client-side), so a single request is all that's useful here.
  const url = `${SPACENK_ORIGIN}/on/demandware.store/Sites-spacenkgb-Site/en_GB/Search-UpdateGrid?cgid=${cgid}&sz=${PAGE_SIZE}&start=0`;
  const res = await fetchText(url, headers);
  if (!res) return [];
  console.log(`[scraper] Space NK ${categoryName} → HTTP ${res.status} (${res.text.length} bytes)`);
  if (res.status < 200 || res.status >= 300) return [];

  const raws = parseSpaceNkFragment(res.text);
  console.log(`[scraper] Space NK ${categoryName} → ${raws.length} products`);
  return toRows(dedupeRaw(raws), categoryName, "Space NK");
}

// ---------- Source 3: Cult Beauty (FALLBACK) ----------
// THG `.list` pages embed a `"products":[...]` JSON array in the page state.
const CULTBEAUTY_ORIGIN = "https://www.cultbeauty.co.uk";

interface CbProduct {
  title?: string;
  url?: string;
  cheapestVariant?: { price?: { price?: { amount?: string | number } } };
  content?: Array<{ key?: string; value?: { stringListValue?: string[] } }>;
  images?: Array<{ original?: string }>;
}

// Extracts a JSON array that starts at `"<key>":[` using balanced-bracket
// scanning (the array is embedded in a much larger state blob). `fromIndex`
// lets the caller anchor the search after a known parent key.
function extractJsonArray(html: string, key: string, fromIndex = 0): unknown[] | null {
  const marker = `"${key}":`;
  const start = html.indexOf(marker, fromIndex);
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

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const url = `${CULTBEAUTY_ORIGIN}/${slug}.list?pageNumber=${page}`;
    const res = await fetchText(url, headers);
    if (!res) break;

    if (page === 1) {
      console.log(`[scraper] Cult Beauty ${categoryName} page 1 → HTTP ${res.status} (${res.text.length} bytes)`);
    }
    if (res.status < 200 || res.status >= 300) break;

    // Anchor on the main "productList" object so we don't pick up a smaller
    // "you may also like" widget array that appears elsewhere on the page.
    const listAnchor = res.text.indexOf('"productList"');
    const products = extractJsonArray(res.text, "products", listAnchor >= 0 ? listAnchor : 0);
    if (!products || products.length === 0) {
      console.log(`[scraper] Cult Beauty ${categoryName} page ${page} → no products JSON (end of results)`);
      break;
    }
    const raws = parseCultBeautyProducts(products);
    if (raws.length === 0) break;
    collected.push(...raws);
    console.log(`[scraper] Cult Beauty ${categoryName} page ${page} → ${raws.length} products`);
    await delay(800, 1800);
  }

  return toRows(dedupeRaw(collected), categoryName, "Cult Beauty");
}

// ---------- Public entry point ----------
export async function scrapeCategory(categoryName: string): Promise<ScrapedProductRow[]> {
  // 1. Selfridges first (per spec). Expected to be Cloudflare-blocked; if it
  //    ever serves JSON again we take it and stop.
  const selfridges = await scrapeSelfridges(categoryName);
  if (selfridges.length > 0) {
    console.log(`[scraper] "${categoryName}" → ${selfridges.length} products from Selfridges`);
    return selfridges;
  }

  // 2. Combine Space NK + Cult Beauty. Each only server-renders ~10-20 priced
  //    products per category via plain fetch, so we union both (they carry the
  //    same brands) to build the widest catalog, then dedupe.
  const spacenk = await scrapeSpaceNk(categoryName);
  const cult = await scrapeCultBeauty(categoryName);
  const merged = dedupeRows([...spacenk, ...cult]);

  if (merged.length > 0) {
    console.log(
      `[scraper] "${categoryName}" → ${merged.length} products (Space NK ${spacenk.length} + Cult Beauty ${cult.length}, deduped)`
    );
  } else {
    console.log(`[scraper] "${categoryName}" → no source returned products`);
  }
  return merged;
}
