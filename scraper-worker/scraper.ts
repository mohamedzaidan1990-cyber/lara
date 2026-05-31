import { fetch as undiciFetch, ProxyAgent } from "undici";
import * as cheerio from "cheerio";
import type { ScrapedProductRow } from "./db";
import { convertGbpToUsd, getGBPtoUSD } from "./currency";

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

// Fragrances / EDPs don't ship internationally (flammable liquids), so we
// exclude them from every source.
export function isFragrance(name: string): boolean {
  const s = (name || "").toLowerCase();
  // "Fragrance free" / "non-perfumed" / "unscented" skincare is the OPPOSITE of
  // a fragrance — never exclude it.
  if (/fragrance[\s-]?free|non[\s-]?perfumed|unperfumed|unscented|scent[\s-]?free/.test(s)) return false;
  if (/\b(edp|edt|edc)\b/.test(s)) return true;
  return (
    s.includes("eau de parfum") ||
    s.includes("eau de toilette") ||
    s.includes("eau de cologne") ||
    s.includes("eau fraiche") ||
    s.includes("parfum") ||
    s.includes("perfume") ||
    s.includes("cologne") ||
    s.includes("fragrance")
  );
}

// Non-beauty items (clothing, jewellery, glassware) and mis-parsed markup
// blobs slip through some sources. Reject them before they reach the catalog.
export function isNonBeauty(name: string): boolean {
  const raw = name || "";
  const s = raw.toLowerCase();
  if (!s.trim()) return true;
  // Garbage from a mis-parsed nav / brand-directory page.
  if (raw.length > 180 || /[<>{}]|\n/.test(raw)) return true;
  // Protect legitimate beauty terms that merely contain a trigger substring
  // (e.g. K-beauty "glass skin", a "ring light" beauty tool).
  if (/glass\s*skin|ring\s*light/.test(s)) return false;
  return (
    /\b(t-?shirt|shirt|dress|jeans|trousers|leggings|hoodie|sweater|jumper|jacket|skirt|denim|necklace|bracelet|anklet|earrings?|jewell?ery|pendant|brooch|sunglasses|handbag|wallet|keyring)\b/.test(s) ||
    /\brings?\b/.test(s) ||
    /\bbottles?\b/.test(s) ||
    /\bglass(ware)?\b/.test(s) ||
    /\bclothing\b/.test(s) ||
    /\baccessor(y|ies)\b/.test(s)
  );
}

// Single gate for every source: exclude fragrances (don't ship internationally)
// and non-beauty / garbage rows.
export function shouldExclude(name: string): boolean {
  return isFragrance(name) || isNonBeauty(name);
}

// Pick a clean product-shot image. For image-sensitive brands (Kylie Cosmetics
// ships lifestyle/model photos as the first image), skip lifestyle/model URLs
// and prefer product shots; if none look clean, return "" so the branded
// placeholder shows instead of a model photo.
const LIFESTYLE_IMAGE_RE =
  /lifestyle|[_-]model|on-?model|campaign|banner|hero|ugc|editorial|wearing|jenner|founder|portrait|headshot/i;
const PRODUCT_IMAGE_RE = /product|pdp|front|main|packshot|swatch|compact|tube|jar/i;

function pickProductImage(images: Array<{ src?: string }> | undefined, brand: string): string {
  const srcs = (images ?? []).map((i) => i.src).filter((s): s is string => Boolean(s));
  if (srcs.length === 0) return "";
  if (!/kylie/i.test(brand)) return srcs[0];
  const clean = srcs.filter((s) => !LIFESTYLE_IMAGE_RE.test(s));
  const preferred = clean.find((s) => PRODUCT_IMAGE_RE.test(s));
  if (preferred) return preferred;
  if (clean.length > 0) return clean[0];
  return ""; // all look like lifestyle/model shots → placeholder
}

async function toRows(raws: RawProduct[], categoryName: string, sourceBrand: string): Promise<ScrapedProductRow[]> {
  return Promise.all(
    raws
      .filter((r) => !shouldExclude(`${r.brand} ${r.name}`))
      .map(async (r) => ({
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

// Space NK serves dynamically-sized images (SFCC), e.g. ...UK200061926.jpg?sw=292&sh=292.
// Upgrade the listing thumbnail to a high-resolution render and guarantee an
// absolute https URL.
function spaceNkImageUrl(src: string): string {
  const url = resolveUrl(src, SPACENK_ORIGIN);
  if (!url || !/^https:\/\//i.test(url)) return "";
  // Bump the SFCC width/height sizing params to a crisp product-card resolution.
  let out = url.replace(/([?&]s[wh]=)\d+/gi, (_m, prefix: string) =>
    prefix.toLowerCase().includes("sw=") ? `${prefix}900` : `${prefix}1200`
  );
  // If no sizing params were present, request a larger render explicitly.
  if (!/[?&]sw=/i.test(out)) {
    out += `${out.includes("?") ? "&" : "?"}sw=900&sh=1200`;
  }
  return out;
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
      image_url: spaceNkImageUrl(img),
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

// ---------- Lookfantastic (THG, primary) ----------
// THG site like Cult Beauty, but products live under `skuListNew[].product`
// (newer THG shape) rather than `productList.products`.
const LOOKFANTASTIC_ORIGIN = "https://www.lookfantastic.com";
const LOOKFANTASTIC_MAX_PAGES = 3;

// Category `.list` slugs that resolve (makeup/electrical 404 — covered by brand
// pages below instead).
const LOOKFANTASTIC_CATEGORIES: Record<string, string> = {
  Skincare: "skincare",
  Haircare: "hair"
};

// Verified brand pages (slugs that return 200). Brands not on Lookfantastic UK
// (Huda Beauty, Rhode, Rare Beauty, REFY, Gisou, K18) are omitted.
export const LOOKFANTASTIC_BRAND_PAGES: Array<{ brand: string; slug: string; category: string }> = [
  { brand: "Charlotte Tilbury", slug: "charlotte-tilbury", category: "Makeup" },
  { brand: "Fenty Beauty", slug: "fenty-beauty", category: "Makeup" },
  { brand: "Morphe", slug: "morphe", category: "Makeup" },
  { brand: "Drunk Elephant", slug: "drunk-elephant", category: "Skincare" },
  { brand: "Sol de Janeiro", slug: "sol-de-janeiro", category: "Skincare" },
  { brand: "The Ordinary", slug: "the-ordinary", category: "Skincare" },
  { brand: "Medik8", slug: "medik8", category: "Skincare" },
  { brand: "Elemis", slug: "elemis", category: "Skincare" },
  { brand: "Olaplex", slug: "olaplex", category: "Haircare" },
  { brand: "Kerastase", slug: "kerastase", category: "Haircare" },
  { brand: "Moroccanoil", slug: "moroccanoil", category: "Haircare" },
  { brand: "ghd", slug: "ghd", category: "Beauty tools" },
  { brand: "Dyson", slug: "dyson", category: "Beauty tools" },
  { brand: "FOREO", slug: "foreo", category: "Beauty tools" }
];

// Pull THG product objects from a page (handles both skuListNew + productList).
function extractThgProducts(html: string): unknown[] {
  if (html.indexOf('"skuListNew"') >= 0) {
    const arr = extractJsonArray(html, "skuListNew", 0);
    if (arr && arr.length > 0) {
      return arr
        .map((e) => (e && typeof e === "object" && "product" in (e as Record<string, unknown>) ? (e as Record<string, unknown>).product : e))
        .filter(Boolean);
    }
  }
  const anchor = html.indexOf('"productList"');
  return extractJsonArray(html, "products", anchor >= 0 ? anchor : 0) ?? [];
}

function parseThgProducts(products: unknown[], origin: string, brandFallback?: string): RawProduct[] {
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
      brand: brand || brandFallback || "",
      name,
      priceGbp,
      image_url: cb.images?.[0]?.original ?? "",
      product_url: resolveUrl(cb.url ?? "", origin)
    });
  }
  return out;
}

// Scrape a Lookfantastic `.list` URL (category or brand) with pagination.
async function scrapeLookfantasticUrl(listUrl: string, brandFallback?: string): Promise<RawProduct[]> {
  const headers = headersFor(listUrl);
  const collected: RawProduct[] = [];
  for (let page = 1; page <= LOOKFANTASTIC_MAX_PAGES; page += 1) {
    const url = `${listUrl}?pageNumber=${page}`;
    const res = await fetchText(url, headers);
    if (!res || !ok(res.status)) break;
    const products = extractThgProducts(res.text);
    if (!products || products.length === 0) break;
    const raws = parseThgProducts(products, LOOKFANTASTIC_ORIGIN, brandFallback);
    if (raws.length === 0) break;
    collected.push(...raws);
    if (dedupeRaw(collected).length >= 60) break; // up to ~60 products per page-set
    await delay(400, 1000);
  }
  return dedupeRaw(collected).slice(0, 60);
}

async function scrapeLookfantasticCategory(categoryName: string): Promise<ScrapedProductRow[]> {
  const slug = LOOKFANTASTIC_CATEGORIES[categoryName];
  if (!slug) return [];
  const raws = await scrapeLookfantasticUrl(`${LOOKFANTASTIC_ORIGIN}/${slug}.list`);
  if (raws.length > 0) console.log(`[scraper] Lookfantastic ${categoryName} → ${raws.length} products`);
  return toRows(raws, categoryName, "Lookfantastic");
}

// Scrape all Lookfantastic brand pages (run by index.ts after the category loop).
export async function scrapeLookfantasticBrands(): Promise<ScrapedProductRow[]> {
  const all: ScrapedProductRow[] = [];
  for (const bp of LOOKFANTASTIC_BRAND_PAGES) {
    const raws = await scrapeLookfantasticUrl(`${LOOKFANTASTIC_ORIGIN}/brands/${bp.slug}.list`, bp.brand);
    if (raws.length > 0) {
      console.log(`[scraper] Lookfantastic brand ${bp.brand} → ${raws.length} products`);
      all.push(...(await toRows(raws, bp.category, "Lookfantastic")));
    }
    await delay(500, 1200);
  }
  return dedupeRows(all);
}

// ---------- Direct brand websites (Shopify JSON + HTML fallback) ----------
// Brands missing from Space NK / Lookfantastic. Most are Shopify stores whose
// /products.json is a public, unprotected endpoint. Prices come back in the
// store's own currency (USD / EUR / GBP), so we convert correctly.

function tierMultiplierUsd(usd: number): number {
  return usd < 30 ? 1.2 : usd < 50 ? 1.15 : 1.1;
}

// AED is pegged to USD at a fixed rate — never floats, so we hardcode it
// rather than hitting an FX API.
const AED_TO_USD = 0.2723;
const FX_FALLBACK: Record<string, number> = { USD: 1, GBP: 1.33, EUR: 1.08, AED: AED_TO_USD };
const fxCache: Record<string, number> = {};
// Multiplier to convert `currency` → USD.
async function rateToUsd(currency: string): Promise<number> {
  const cur = (currency || "USD").toUpperCase();
  if (cur === "USD") return 1;
  if (cur === "AED") return AED_TO_USD; // fixed peg
  if (fxCache[cur]) return fxCache[cur];
  try {
    const res = await undiciFetch(`https://api.frankfurter.app/latest?from=${cur}&to=USD`, {
      dispatcher: getDispatcher()
    });
    if (res.ok) {
      const d = (await res.json()) as { rates?: { USD?: number } };
      const r = d.rates?.USD;
      if (typeof r === "number" && r > 0) {
        fxCache[cur] = r;
        return r;
      }
    }
  } catch {
    /* fall through */
  }
  return FX_FALLBACK[cur] ?? 1;
}

// Build a row from a storefront price in any currency. price_usd is the displayed
// price converted to USD + tiered markup; price_gbp is the GBP equivalent.
async function buildDirectRow(
  brand: string,
  name: string,
  value: number,
  currency: string,
  image: string,
  productUrl: string,
  category: string
): Promise<ScrapedProductRow> {
  const r = await rateToUsd(currency);
  const usdBase = value * r;
  const priceUsd = Math.round(usdBase * tierMultiplierUsd(usdBase) * 100) / 100;
  const gbpRate = await getGBPtoUSD();
  const priceGbp = Math.round((usdBase / gbpRate) * 100) / 100;
  return {
    brand,
    name,
    category,
    price_gbp: priceGbp,
    price_usd: priceUsd,
    deliverable_lebanon: true,
    product_url: productUrl,
    image_url: image
  };
}

interface ShopifyProduct {
  title?: string;
  handle?: string;
  variants?: Array<{ price?: string }>;
  images?: Array<{ src?: string }>;
}

async function scrapeShopifyJson(
  origin: string,
  brand: string,
  category: string,
  currency: string
): Promise<ScrapedProductRow[]> {
  const res = await fetchText(`${origin}/products.json?limit=250`, headersFor(`${origin}/`));
  if (!res || !ok(res.status)) return [];
  let data: { products?: ShopifyProduct[] };
  try {
    data = JSON.parse(res.text);
  } catch {
    return [];
  }
  const products = data.products ?? [];
  if (products.length === 0) return [];

  const rows: ScrapedProductRow[] = [];
  for (const p of products) {
    const name = (p.title ?? "").trim();
    const value = parseFloat(p.variants?.[0]?.price ?? "0");
    if (!name || !(value > 0)) continue; // skip £0 samples / freebies
    if (/gift card/i.test(name)) continue;
    if (shouldExclude(`${brand} ${name}`)) continue; // fragrances + non-beauty
    const image = pickProductImage(p.images, brand);
    const productUrl = p.handle ? `${origin}/products/${p.handle}` : origin;
    rows.push(await buildDirectRow(brand, name, value, currency, image, productUrl, category));
    if (rows.length >= 60) break;
  }
  return rows;
}

interface DirectBrandPage {
  brand: string;
  url?: string;
  // Full Shopify products.json URLs (e.g. locale-specific collection feeds).
  urls?: string[];
  category: string;
  currency: string;
  // Optional sanity bounds (in the store currency) to drop bundles / mispriced
  // outliers — e.g. Huda's flaky feed.
  priceRange?: [number, number];
  selectors?: TileSelectors;
}

// Scrape a full Shopify products.json URL (already ends in /products.json…).
// `productBase` is the locale base used to build product URLs.
async function scrapeShopifyJsonUrl(
  jsonUrl: string,
  productBase: string,
  brand: string,
  category: string,
  currency: string,
  priceRange?: [number, number]
): Promise<ScrapedProductRow[]> {
  const res = await fetchText(jsonUrl, headersFor(`${productBase}/`));
  if (!res || !ok(res.status)) return [];
  let data: { products?: ShopifyProduct[] };
  try {
    data = JSON.parse(res.text);
  } catch {
    return [];
  }
  const products = data.products ?? [];
  const toUsd = await rateToUsd(currency); // store currency → USD multiplier
  const rows: ScrapedProductRow[] = [];
  for (const p of products) {
    const name = (p.title ?? "").trim();
    const value = parseFloat(p.variants?.[0]?.price ?? "0");
    if (!name || !(value > 0)) continue;
    if (/gift card/i.test(name)) continue;
    if (shouldExclude(`${brand} ${name}`)) continue; // fragrances + non-beauty
    // priceRange is in USD (post-conversion) so it works across currencies.
    const usdValue = value * toUsd;
    if (priceRange && (usdValue < priceRange[0] || usdValue > priceRange[1])) continue;
    const image = pickProductImage(p.images, brand);
    const productUrl = p.handle ? `${productBase}/products/${p.handle}` : productBase;
    rows.push(await buildDirectRow(brand, name, value, currency, image, productUrl, category));
    if (rows.length >= 60) break;
  }
  return rows;
}

async function scrapeDirectBrandWebsite(page: DirectBrandPage): Promise<ScrapedProductRow[]> {
  // Multi-URL Shopify products.json feeds (e.g. Huda UK locale collections).
  if (page.urls && page.urls.length > 0) {
    const all: ScrapedProductRow[] = [];
    for (const jsonUrl of page.urls) {
      // Product-URL base: the part before /collections/, or the origin for a
      // root /products.json feed.
      const base = jsonUrl.includes("/collections/") ? jsonUrl.split("/collections/")[0] : new URL(jsonUrl).origin;
      all.push(...(await scrapeShopifyJsonUrl(jsonUrl, base, page.brand, page.category, page.currency, page.priceRange)));
      await delay(300, 800);
    }
    const deduped = dedupeRows(all).slice(0, 120);
    if (deduped.length > 0) {
      console.log(`[scraper] Direct ${page.brand} (Shopify collections) → ${deduped.length} products`);
      return deduped;
    }
    // HTML fallback: embedded JSON-LD on the first collection page.
    const htmlUrl = page.urls[0].split("/products.json")[0];
    const base = htmlUrl.includes("/collections/") ? htmlUrl.split("/collections/")[0] : new URL(htmlUrl).origin;
    const res = await fetchText(htmlUrl, {
      ...headersFor(`${base}/`),
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    });
    if (res && ok(res.status) && !looksBlocked(res.text)) {
      const raws = parseJsonLdProducts(res.text, base, page.brand);
      const toUsd = await rateToUsd(page.currency);
      const rows: ScrapedProductRow[] = [];
      for (const raw of dedupeRaw(raws).slice(0, 60)) {
        if (shouldExclude(`${raw.brand} ${raw.name}`)) continue;
        const usdValue = raw.priceGbp * toUsd;
        if (page.priceRange && (usdValue < page.priceRange[0] || usdValue > page.priceRange[1])) continue;
        rows.push(await buildDirectRow(raw.brand || page.brand, raw.name, raw.priceGbp, page.currency, raw.image_url, raw.product_url, page.category));
      }
      if (rows.length > 0) {
        console.log(`[scraper] Direct ${page.brand} (HTML ld+json) → ${rows.length} products`);
        return rows;
      }
    }
    console.log(`[scraper] Direct ${page.brand} → 0 products`);
    return [];
  }

  if (!page.url) return [];
  let origin: string;
  try {
    origin = new URL(page.url).origin;
  } catch {
    return [];
  }

  // 1. Shopify JSON API first — clean and unprotected.
  const shop = await scrapeShopifyJson(origin, page.brand, page.category, page.currency);
  if (shop.length > 0) {
    console.log(`[scraper] Direct ${page.brand} (Shopify JSON) → ${shop.length} products`);
    return shop;
  }

  // 2. HTML fallback (non-Shopify or JSON unavailable).
  if (page.selectors) {
    const headers = {
      ...headersFor(`${origin}/`),
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    };
    const res = await fetchText(page.url, headers);
    if (res && ok(res.status) && !looksBlocked(res.text)) {
      const $ = cheerio.load(res.text);
      let raws = parseTiles($, origin, page.selectors, page.brand);
      if (raws.length === 0) raws = parseJsonLdProducts(res.text, origin, page.brand);
      const deduped = dedupeRaw(raws).slice(0, 60);
      const rows: ScrapedProductRow[] = [];
      for (const raw of deduped) {
        if (shouldExclude(`${raw.brand || page.brand} ${raw.name}`)) continue;
        rows.push(
          await buildDirectRow(raw.brand || page.brand, raw.name, raw.priceGbp, page.currency, raw.image_url, raw.product_url, page.category)
        );
      }
      if (rows.length > 0) {
        console.log(`[scraper] Direct ${page.brand} (HTML) → ${rows.length} products`);
        return rows;
      }
    } else if (res && looksBlocked(res.text)) {
      console.log(`[scraper] Direct ${page.brand} → blocked / JS-gated`);
      return [];
    }
  }
  console.log(`[scraper] Direct ${page.brand} → 0 products`);
  return [];
}

const SHOPIFY_SELECTORS: TileSelectors = {
  container: ".product-item, .grid__item, .product-card, article.product",
  name: ".product-item__title, .product-card__name, .product-name, h3",
  price: ".price, .product-price, .money, [data-price]",
  image: "img[data-src], img[data-srcset], img.product-item__image, img",
  link: 'a[href*="/products/"]'
};

export const DIRECT_BRAND_PAGES: DirectBrandPage[] = [
  // Huda Beauty via the UK locale collection feeds (priced in GBP when the
  // request geo-resolves to the UK store). priceRange drops bundles / mispriced
  // outliers if the feed ever returns a non-GBP value.
  {
    // Global Huda store prices in AED (fixed USD peg). The /gb/en_GB/ and
    // face/eyes/lips/… collection handles return 0 products; the working feeds
    // are the root catalog + all/shop-all collections.
    brand: "Huda Beauty",
    urls: [
      "https://hudabeauty.com/products.json?limit=250",
      "https://hudabeauty.com/collections/all/products.json?limit=250",
      "https://hudabeauty.com/collections/shop-all/products.json?limit=250"
    ],
    category: "Makeup",
    currency: "AED",
    priceRange: [10, 500] // USD bounds (post-conversion)
  },
  { brand: "Rare Beauty", url: "https://www.rarebeauty.com/collections/all-makeup", category: "Makeup", currency: "USD", selectors: SHOPIFY_SELECTORS },
  { brand: "Rhode", url: "https://rhode.com/collections/all", category: "Skincare", currency: "USD", selectors: SHOPIFY_SELECTORS },
  { brand: "Gisou", url: "https://gisou.com/collections/all", category: "Haircare", currency: "EUR", selectors: SHOPIFY_SELECTORS },
  { brand: "Fenty Beauty", url: "https://fentybeauty.com/collections/face", category: "Makeup", currency: "USD", selectors: SHOPIFY_SELECTORS },
  { brand: "REFY", url: "https://refy.beauty/collections/all", category: "Makeup", currency: "GBP", selectors: SHOPIFY_SELECTORS },
  { brand: "K18", url: "https://www.k18hair.com/collections/all", category: "Haircare", currency: "USD", selectors: SHOPIFY_SELECTORS },
  { brand: "Kylie Cosmetics", url: "https://kyliecosmetics.com/collections/makeup", category: "Makeup", currency: "USD", selectors: SHOPIFY_SELECTORS },
  { brand: "Sol de Janeiro", url: "https://soldejaneiro.com/collections/body-care", category: "Skincare", currency: "USD", selectors: SHOPIFY_SELECTORS }
];

export async function scrapeDirectBrands(): Promise<ScrapedProductRow[]> {
  const all: ScrapedProductRow[] = [];
  for (const page of DIRECT_BRAND_PAGES) {
    try {
      const rows = await scrapeDirectBrandWebsite(page);
      all.push(...rows);
    } catch (err) {
      console.error(`[scraper] Direct ${page.brand} failed: ${(err as Error).message}`);
    }
    await delay(500, 1200);
  }
  return dedupeRows(all);
}

// ---------- Selfridges via Oxylabs Web Unblocker (PRIMARY when enabled) ----------
// Selfridges is Akamai-gated + a Next.js App-Router micro-frontend whose product
// grid is rendered client-side only AFTER the user scrolls (lazy/virtualised).
// Oxylabs renders the page in a real browser; passing scroll `browser_instructions`
// makes the 60 product cards hydrate into the DOM, which we then parse via stable
// `data-testid` hooks. Enabled only when OXYLABS_USERNAME + OXYLABS_PASSWORD are
// set; otherwise the category falls back to Space NK + Cult Beauty.
const OXYLABS_ENDPOINT = "https://realtime.oxylabs.io/v1/queries";
const SELFRIDGES_ORIGIN = "https://www.selfridges.com";

// Each category maps to a list of Selfridges beauty listing pages
// (/GB/en/cat/beauty/<slug>/). A listing renders max 60 cards and ignores the
// `pge` param, so we crawl every sub-category to populate extensively. Slugs
// verified live from the beauty mega-menu. Fragrance is intentionally excluded
// (doesn't ship internationally); shouldExclude() also filters any stragglers.
const SELFRIDGES_LISTINGS: Record<string, string[]> = {
  Makeup: [
    "beauty/makeup",
    "beauty/makeup/face",
    "beauty/makeup/face/primer-setting-spray",
    "beauty/makeup/eyes",
    "beauty/makeup/eyebrows",
    "beauty/makeup/lips",
    "beauty/makeup/nails",
    "beauty/bestseller"
  ],
  Skincare: [
    "beauty/skincare",
    "beauty/skincare/moisturiser",
    "beauty/skincare/cleanser",
    "beauty/skincare/toners",
    "beauty/skincare/serums",
    "beauty/skincare/spf",
    "beauty/skincare/eye-cream",
    "beauty/skincare/treatments",
    "beauty/skincare/oils",
    "beauty/skincare/exfoliator",
    "beauty/skincare/masks",
    "beauty/korean-beauty-skincare",
    "beauty/suncare-tanning/suncare",
    "beauty/bodycare"
  ],
  Haircare: [
    "beauty/haircare",
    "beauty/haircare/shampoo",
    "beauty/haircare/conditioner",
    "beauty/haircare/treatments",
    "beauty/haircare/styling"
  ],
  "Beauty tools": [
    "beauty/makeup/makeup-brushes-tools",
    "beauty/skincare/skincare-tools",
    "beauty/haircare/hair-electricals"
  ]
};

// Scroll the rendered page so the full 60-card grid hydrates before we parse.
const SELFRIDGES_SCROLL_INSTRUCTIONS = [
  { type: "wait", wait_time_s: 6 },
  { type: "scroll", x: 0, y: 2000 },
  { type: "wait", wait_time_s: 2 },
  { type: "scroll", x: 0, y: 5000 },
  { type: "wait", wait_time_s: 2 },
  { type: "scroll", x: 0, y: 9000 },
  { type: "wait", wait_time_s: 2 },
  { type: "scroll", x: 0, y: 14000 },
  { type: "wait", wait_time_s: 3 }
];

export function webUnblockerEnabled(): boolean {
  return Boolean(process.env.OXYLABS_USERNAME && process.env.OXYLABS_PASSWORD);
}

interface WebUnblockerOpts {
  // Browser instructions (scroll/wait) to trigger client-side hydration.
  browserInstructions?: unknown[];
}

// Render a URL through Oxylabs and return the final HTML (or "" on failure).
export async function fetchWithWebUnblocker(url: string, opts: WebUnblockerOpts = {}): Promise<string> {
  const user = process.env.OXYLABS_USERNAME;
  const pass = process.env.OXYLABS_PASSWORD;
  if (!user || !pass) return "";
  const auth = Buffer.from(`${user}:${pass}`).toString("base64");
  const body: Record<string, unknown> = {
    source: "universal",
    url,
    render: "html",
    geo_location: "United Kingdom"
  };
  if (opts.browserInstructions) body.browser_instructions = opts.browserInstructions;
  try {
    const res = await undiciFetch(OXYLABS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`
      },
      body: JSON.stringify(body),
      // Browser render + scroll waits can take a while; generous headroom.
      signal: AbortSignal.timeout(180_000)
    });
    if (!ok(res.status)) {
      console.error(`[scraper] Oxylabs HTTP ${res.status} for ${url}`);
      return "";
    }
    const data = (await res.json()) as { results?: Array<{ content?: string }> };
    return data.results?.[0]?.content ?? "";
  } catch (err) {
    console.error(`[scraper] Oxylabs error for ${url}: ${(err as Error).message}`);
    return "";
  }
}

// Pull product data out of a deeply-nested __NEXT_DATA__ blob (Selfridges is a
// Next.js app). Best-effort: collect any object that looks like a product
// (name + brand + price). dedupe/shouldExclude downstream clean up false hits.
function parseNextDataProducts(html: string, origin: string): RawProduct[] {
  const m = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (!m) return [];
  let root: unknown;
  try {
    root = JSON.parse(m[1]);
  } catch {
    return [];
  }
  const out: RawProduct[] = [];
  const seen = new Set<unknown>();
  const stack: unknown[] = [root];
  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node !== "object" || seen.has(node)) continue;
    seen.add(node);
    if (Array.isArray(node)) {
      for (const v of node) if (v && typeof v === "object") stack.push(v);
      continue;
    }
    const obj = node as Record<string, unknown>;
    for (const v of Object.values(obj)) if (v && typeof v === "object") stack.push(v);

    const name =
      (typeof obj.name === "string" && obj.name) ||
      (typeof obj.productName === "string" && obj.productName) ||
      (typeof obj.title === "string" && obj.title) ||
      "";
    const brandRaw = obj.brand ?? obj.brandName ?? obj.designer;
    const brand =
      typeof brandRaw === "string"
        ? brandRaw
        : brandRaw && typeof brandRaw === "object" && typeof (brandRaw as Record<string, unknown>).name === "string"
          ? ((brandRaw as Record<string, unknown>).name as string)
          : "";
    const priceRaw =
      obj.price ?? obj.currentPrice ?? obj.amount ?? obj.value ?? (obj.pricing as Record<string, unknown> | undefined)?.current;
    const priceGbp = parsePrice(
      typeof priceRaw === "object" && priceRaw !== null
        ? ((priceRaw as Record<string, unknown>).value ?? (priceRaw as Record<string, unknown>).amount)
        : (priceRaw as string | number | undefined)
    );
    if (!name || !brand || priceGbp === null) continue;

    const imgRaw = obj.image ?? obj.imageUrl ?? obj.images ?? obj.media;
    let image = "";
    if (typeof imgRaw === "string") image = imgRaw;
    else if (Array.isArray(imgRaw) && imgRaw.length) {
      const first = imgRaw[0];
      image = typeof first === "string" ? first : typeof (first as Record<string, unknown>)?.url === "string" ? ((first as Record<string, unknown>).url as string) : "";
    }
    const urlRaw = obj.url ?? obj.productUrl ?? obj.pdpUrl ?? obj.link;
    const productUrl = typeof urlRaw === "string" ? resolveUrl(urlRaw, origin) : "";

    out.push({ brand, name: name.trim(), priceGbp, image_url: resolveUrl(image, origin), product_url: productUrl });
  }
  return out;
}

// Title-case an UPPERCASE Selfridges brand ("CHARLOTTE TILBURY" → "Charlotte
// Tilbury") so it matches the catalog's casing for the brand filter. Words that
// are already mixed-case are left alone.
function titleCaseBrand(s: string): string {
  const t = s.trim();
  if (/[a-z]/.test(t)) return t; // already mixed/normal case → leave alone
  return t
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .replace(/\bAnd\b/g, "and");
}

// Selfridges product hrefs end in `_<SKU>/` (optionally with a #colour fragment).
function selfridgesSku(href: string): string {
  const path = href.split("#")[0].replace(/\/$/, "");
  const m = path.match(/_([A-Za-z0-9][A-Za-z0-9-]*)$/);
  return m ? m[1] : "";
}

// Build the Scene7 product image URL from the SKU. (Routed through our
// image-proxy at render time; falls back to the branded placeholder if it 404s.)
function selfridgesImage(sku: string): string {
  if (!sku) return "";
  return `https://images.selfridges.com/is/image/selfridges/${sku}_M?wid=363&hei=485&fmt=webp&qlt=80`;
}

// Parse the hydrated PLP grid. Each card exposes stable data-testid hooks:
//   <div data-testid="product-card">
//     <h2>BRAND</h2>
//     <h2><a data-analytics-link="product_card_link" href="/GB/en/product/…_SKU/">NAME</a></h2>
//     <li data-testid="product-price"><span>Price:</span>£60.00</li>
function parseSelfridgesCards($: cheerio.CheerioAPI, origin: string): RawProduct[] {
  const out: RawProduct[] = [];
  $('[data-testid="product-card"]').each((_, el) => {
    const c = $(el);
    const brandRaw = c.find("h2").first().text().trim();
    const a = c.find('a[data-analytics-link="product_card_link"]').first();
    const name = a.text().trim();
    const href = a.attr("href") || "";
    const price = parsePrice(c.find('[data-testid="product-price"]').first().text().replace(/price:/i, "").trim());
    if (!brandRaw || !name || price === null || !href) return;
    const sku = selfridgesSku(href);
    out.push({
      brand: titleCaseBrand(brandRaw),
      name,
      priceGbp: price,
      image_url: selfridgesImage(sku),
      product_url: resolveUrl(href.split("#")[0], origin)
    });
  });
  return out;
}

// Primary: hydrated product cards. Fallbacks: JSON-LD → __NEXT_DATA__.
export function extractSelfridgesProducts($: cheerio.CheerioAPI, html: string, origin: string): RawProduct[] {
  let raws = parseSelfridgesCards($, origin);
  if (raws.length === 0) raws = parseJsonLdProducts(html, origin, "Selfridges");
  if (raws.length === 0) raws = parseNextDataProducts(html, origin);
  return dedupeRaw(raws);
}

// Crawl every Selfridges listing page for a category (each ~60 cards, `pge`
// ignored), scrolling each so the grid hydrates, then dedupe across the lot.
export async function scrapeSelfridgesCategory(category: string): Promise<ScrapedProductRow[]> {
  const slugs = SELFRIDGES_LISTINGS[category];
  if (!slugs || slugs.length === 0 || !webUnblockerEnabled()) return [];

  const collected: RawProduct[] = [];
  const seen = new Set<string>();
  for (const slug of slugs) {
    const url = `${SELFRIDGES_ORIGIN}/GB/en/cat/${slug}/?pge=1&ppp=60&sort=relevance`;
    const html = await fetchWithWebUnblocker(url, { browserInstructions: SELFRIDGES_SCROLL_INSTRUCTIONS });
    if (!html || html.length < 1000) {
      console.log(`[scraper] Selfridges ${slug} → empty response`);
      await delay(1000, 2500);
      continue;
    }
    const $ = cheerio.load(html);
    const products = extractSelfridgesProducts($, html, SELFRIDGES_ORIGIN);
    const fresh = products.filter((p) => {
      const k = p.product_url || `${p.brand}|${p.name}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    collected.push(...fresh);
    console.log(`[scraper] Selfridges ${slug} → ${products.length} parsed (${fresh.length} new, ${collected.length} total)`);
    await delay(1500, 3500); // rate limiting between listing pages
  }

  // TODO: once on a paid Oxylabs plan, fetch each product page via
  // fetchWithWebUnblocker + checkSelfridgesDelivery() to set deliverable_lebanon
  // accurately. For now everything defaults to deliverable to preserve credits.
  if (collected.length > 0) console.log(`[scraper] Selfridges ${category} → ${collected.length} unique products`);
  return toRows(collected, category, "Selfridges");
}

// Popular beauty brands whose full range is under-represented by the category
// crawl (each category page only surfaces a brand's top ~60 bestsellers). A
// dedicated brand page returns ~60 of THAT brand, so this deepens coverage.
// Slugs are Selfridges /GB/en/cat/<slug>/ brand pages; unknown slugs no-op.
// Verified live (returned a product grid). Slugs that 404'd or had no grid
// (hourglass, ghd, dyson, mac-cosmetics, rare-beauty, benefit-cosmetics,
// tom-ford-beauty, kylie-cosmetics, rhode-skin) were dropped to save credits.
export const SELFRIDGES_BRAND_SLUGS: string[] = [
  "huda-beauty",
  "charlotte-tilbury",
  "fenty-beauty",
  "nars",
  "pat-mcgrath-labs",
  "anastasia-beverly-hills",
  "too-faced",
  "urban-decay",
  "la-mer",
  "drunk-elephant",
  "the-ordinary",
  "augustinus-bader",
  "sol-de-janeiro",
  "olaplex",
  "byredo"
];

// Brand pages mix categories, so classify each product by name keywords.
function classifySelfridgesCategory(name: string): string {
  const s = (name || "").toLowerCase();
  if (/\b(brush|sponge|blender|tweezer|curler|applicator|mirror|hair ?dryer|straightener|styler|airwrap|device|sharpener)\b/.test(s)) return "Beauty tools";
  if (/\b(shampoo|conditioner|scalp|hairspray|hair ?spray|dry shampoo|leave-?in)\b/.test(s) || /\bhair\b/.test(s)) return "Haircare";
  if (/\b(lipstick|lip gloss|lip liner|lip balm|lip oil|lip stain|mascara|eyeliner|eye liner|eyeshadow|eye shadow|palette|foundation|concealer|blush|bronzer|highlighter|contour|brow|eyebrow|setting spray|setting powder|primer|kohl|lip|gloss|tint|nail|lacquer|mac)\b/.test(s)) return "Makeup";
  if (/\b(serum|moisturiser|moisturizer|cream|cleanser|toner|essence|exfoliant|exfoliator|retinol|spf|sunscreen|sun cream|face oil|mask|eye cream|peel|balm|lotion|body|hand cream|scrub|treatment|mist)\b/.test(s)) return "Skincare";
  return "Makeup";
}

// Crawl Selfridges brand pages and classify each product's category by name.
export async function scrapeSelfridgesBrands(): Promise<ScrapedProductRow[]> {
  if (!webUnblockerEnabled()) return [];
  const collected: ScrapedProductRow[] = [];
  const seen = new Set<string>();
  for (const slug of SELFRIDGES_BRAND_SLUGS) {
    const url = `${SELFRIDGES_ORIGIN}/GB/en/cat/${slug}/?pge=1&ppp=60&sort=relevance`;
    const html = await fetchWithWebUnblocker(url, { browserInstructions: SELFRIDGES_SCROLL_INSTRUCTIONS });
    if (!html || html.length < 1000) {
      console.log(`[scraper] Selfridges brand ${slug} → empty/unknown`);
      await delay(1000, 2500);
      continue;
    }
    const $ = cheerio.load(html);
    const raws = extractSelfridgesProducts($, html, SELFRIDGES_ORIGIN);
    let added = 0;
    for (const r of raws) {
      const k = r.product_url || `${r.brand}|${r.name}`;
      if (seen.has(k)) continue;
      seen.add(k);
      if (shouldExclude(`${r.brand} ${r.name}`)) continue;
      collected.push({
        brand: r.brand,
        name: r.name,
        category: classifySelfridgesCategory(r.name),
        price_gbp: r.priceGbp,
        price_usd: await convertGbpToUsd(r.priceGbp),
        deliverable_lebanon: true,
        product_url: r.product_url,
        image_url: r.image_url
      });
      added += 1;
    }
    console.log(`[scraper] Selfridges brand ${slug} → ${raws.length} parsed (${added} new)`);
    await delay(1500, 3500);
  }
  return collected;
}

// Per-product Lebanon deliverability check (DISABLED by default — uses one
// Web Unblocker credit per product). Enable once on a paid plan.
export async function checkSelfridgesDelivery(productUrl: string): Promise<boolean> {
  const html = await fetchWithWebUnblocker(productUrl);
  if (!html) return true;
  const $ = cheerio.load(html);
  const deliveryText = $("[data-delivery], .delivery-info, .shipping-info").text().toLowerCase();
  if (deliveryText.includes("lebanon") && (deliveryText.includes("not available") || deliveryText.includes("cannot"))) {
    return false;
  }
  return true; // default to deliverable
}

// ---------- Boots & John Lewis (HTML brand pages, defensive) ----------
// Both are heavily bot-protected (Boots = PerimeterX "Pardon Our Interruption",
// John Lewis = Akamai). Plain fetch from a datacenter IP is blocked; a
// residential PROXY_URL may get through. We parse cheerio tiles with a JSON-LD
// fallback and detect block/JS-gate pages so we never store garbage.

interface TileSelectors {
  container: string;
  name: string;
  brand?: string;
  price: string;
  image: string;
  link: string;
}

function looksBlocked(html: string): boolean {
  const lower = html.toLowerCase();
  if (
    lower.includes("pardon our interruption") ||
    lower.includes("access denied") ||
    lower.includes("are you a human") ||
    lower.includes("captcha") ||
    lower.includes("enable javascript to continue")
  ) {
    return true;
  }
  return html.length < 8000 && !lower.includes("product");
}

function parseTiles($: cheerio.CheerioAPI, origin: string, sel: TileSelectors, brandFallback: string): RawProduct[] {
  const out: RawProduct[] = [];
  $(sel.container).each((_, el) => {
    const node = $(el);
    const name = node.find(sel.name).first().text().trim();
    const priceGbp = parsePrice(node.find(sel.price).first().text().trim());
    if (!name || priceGbp === null) return;
    const brand = (sel.brand ? node.find(sel.brand).first().text().trim() : "") || brandFallback;
    const imgEl = node.find(sel.image).first();
    const img = imgEl.attr("src") || imgEl.attr("data-src") || (imgEl.attr("srcset") ?? "").split(" ")[0] || "";
    const href = node.find(sel.link).first().attr("href") || "";
    out.push({ brand, name, priceGbp, image_url: resolveUrl(img, origin), product_url: resolveUrl(href, origin) });
  });
  return out;
}

// Universal JSON-LD fallback: Product / ItemList nodes.
function parseJsonLdProducts(html: string, origin: string, brandFallback: string): RawProduct[] {
  const $ = cheerio.load(html);
  const out: RawProduct[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse($(el).contents().text());
    } catch {
      return;
    }
    const stack: unknown[] = [parsed];
    while (stack.length) {
      const node = stack.pop();
      if (!node || typeof node !== "object") continue;
      if (Array.isArray(node)) {
        stack.push(...node);
        continue;
      }
      const obj = node as Record<string, unknown>;
      if (Array.isArray(obj["@graph"])) stack.push(...(obj["@graph"] as unknown[]));
      if (Array.isArray(obj.itemListElement)) stack.push(...(obj.itemListElement as unknown[]));
      if (obj.item) stack.push(obj.item);
      const type = obj["@type"];
      const isProduct = type === "Product" || (Array.isArray(type) && type.includes("Product"));
      if (!isProduct) continue;
      const name = typeof obj.name === "string" ? obj.name.trim() : "";
      const offers = Array.isArray(obj.offers) ? obj.offers[0] : obj.offers;
      const priceGbp =
        offers && typeof offers === "object" ? parsePrice((offers as Record<string, unknown>).price) : null;
      if (!name || priceGbp === null) continue;
      let brand = brandFallback;
      const b = obj.brand;
      if (typeof b === "string") brand = b;
      else if (b && typeof b === "object" && typeof (b as Record<string, unknown>).name === "string")
        brand = (b as Record<string, unknown>).name as string;
      const image = typeof obj.image === "string" ? obj.image : Array.isArray(obj.image) ? (obj.image[0] as string) : "";
      const url = typeof obj.url === "string" ? obj.url : "";
      out.push({ brand, name, priceGbp, image_url: resolveUrl(image, origin), product_url: resolveUrl(url, origin) });
    }
  });
  return out;
}

async function scrapeRetailerBrandPage(
  source: string,
  origin: string,
  brand: string,
  url: string,
  category: string,
  sel: TileSelectors
): Promise<ScrapedProductRow[]> {
  const headers = {
    ...headersFor(`${origin}/`),
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
  };
  const res = await fetchText(url, headers);
  if (!res) return [];
  if (!ok(res.status)) {
    console.log(`[scraper] ${source} ${brand} → HTTP ${res.status}`);
    return [];
  }
  if (looksBlocked(res.text)) {
    console.log(`[scraper] ${source} ${brand} → blocked / JS-gated (${res.text.length}b)`);
    return [];
  }
  const $ = cheerio.load(res.text);
  let raws = parseTiles($, origin, sel, brand);
  if (raws.length === 0) raws = parseJsonLdProducts(res.text, origin, brand);
  const deduped = dedupeRaw(raws).slice(0, 60);
  if (deduped.length > 0) console.log(`[scraper] ${source} brand ${brand} → ${deduped.length} products`);
  else console.log(`[scraper] ${source} ${brand} → 0 products parsed`);
  return toRows(deduped, category, source);
}

const BOOTS_ORIGIN = "https://www.boots.com";
const BOOTS_SELECTORS: TileSelectors = {
  container: '[data-test="product-tile"], .product-grid article, li.product_tile',
  name: '[data-test="product-title"], h2.product-title, .product_name',
  brand: '[data-test="brand-name"], .brand-name',
  price: '[data-test="price"], .product-price .price, .product_price',
  image: 'img.product-image, [data-test="product-image"], img',
  link: 'a[data-test="product-link"], a'
};
export const BOOTS_BRAND_PAGES: Array<{ brand: string; url: string; category: string }> = [
  { brand: "Huda Beauty", url: "https://www.boots.com/beauty/makeup/brands/huda-beauty", category: "Makeup" },
  { brand: "Rare Beauty", url: "https://www.boots.com/beauty/makeup/brands/rare-beauty", category: "Makeup" },
  { brand: "REFY", url: "https://www.boots.com/beauty/makeup/brands/refy", category: "Makeup" },
  { brand: "Rhode", url: "https://www.boots.com/beauty/skincare/brands/rhode", category: "Skincare" },
  { brand: "e.l.f. Cosmetics", url: "https://www.boots.com/beauty/makeup/brands/elf-cosmetics", category: "Makeup" },
  { brand: "NYX", url: "https://www.boots.com/beauty/makeup/brands/nyx-professional-makeup", category: "Makeup" },
  { brand: "MAC", url: "https://www.boots.com/beauty/makeup/brands/mac", category: "Makeup" },
  { brand: "Urban Decay", url: "https://www.boots.com/beauty/makeup/brands/urban-decay", category: "Makeup" },
  { brand: "Too Faced", url: "https://www.boots.com/beauty/makeup/brands/too-faced", category: "Makeup" },
  { brand: "Benefit", url: "https://www.boots.com/beauty/makeup/brands/benefit", category: "Makeup" },
  { brand: "CeraVe", url: "https://www.boots.com/beauty/skincare/brands/cerave", category: "Skincare" },
  { brand: "La Roche-Posay", url: "https://www.boots.com/beauty/skincare/brands/la-roche-posay", category: "Skincare" },
  { brand: "Vichy", url: "https://www.boots.com/beauty/skincare/brands/vichy", category: "Skincare" },
  { brand: "Sunday Riley", url: "https://www.boots.com/beauty/skincare/brands/sunday-riley", category: "Skincare" },
  { brand: "Gisou", url: "https://www.boots.com/beauty/hair/brands/gisou", category: "Haircare" },
  { brand: "K18", url: "https://www.boots.com/beauty/hair/brands/k18", category: "Haircare" },
  { brand: "Redken", url: "https://www.boots.com/beauty/hair/brands/redken", category: "Haircare" },
  { brand: "Head & Shoulders", url: "https://www.boots.com/beauty/hair/brands/head-and-shoulders", category: "Haircare" },
  { brand: "Pantene", url: "https://www.boots.com/beauty/hair/brands/pantene", category: "Haircare" }
];

export async function scrapeBootsBrands(): Promise<ScrapedProductRow[]> {
  const all: ScrapedProductRow[] = [];
  for (const bp of BOOTS_BRAND_PAGES) {
    const rows = await scrapeRetailerBrandPage("Boots", BOOTS_ORIGIN, bp.brand, bp.url, bp.category, BOOTS_SELECTORS);
    all.push(...rows);
    await delay(600, 1400);
  }
  return dedupeRows(all);
}

const JOHN_LEWIS_ORIGIN = "https://www.johnlewis.com";
const JOHN_LEWIS_SELECTORS: TileSelectors = {
  container: '[data-test="product-card"], article.lw-product-card',
  name: '[data-test="product-title"]',
  price: '[data-test="product-price"], .lw-product-price',
  image: 'img[data-test="product-image"], img',
  link: "a"
};
export const JOHN_LEWIS_BRAND_PAGES: Array<{ brand: string; url: string; category: string }> = [
  { brand: "Huda Beauty", url: "https://www.johnlewis.com/brands/huda-beauty", category: "Makeup" },
  { brand: "Gisou", url: "https://www.johnlewis.com/brands/gisou", category: "Haircare" },
  { brand: "Charlotte Tilbury", url: "https://www.johnlewis.com/brands/charlotte-tilbury", category: "Makeup" },
  { brand: "La Mer", url: "https://www.johnlewis.com/brands/la-mer", category: "Skincare" },
  { brand: "Dior Beauty", url: "https://www.johnlewis.com/brands/dior", category: "Makeup" }
];

export async function scrapeJohnLewisBrands(): Promise<ScrapedProductRow[]> {
  const all: ScrapedProductRow[] = [];
  for (const bp of JOHN_LEWIS_BRAND_PAGES) {
    const rows = await scrapeRetailerBrandPage("John Lewis", JOHN_LEWIS_ORIGIN, bp.brand, bp.url, bp.category, JOHN_LEWIS_SELECTORS);
    all.push(...rows);
    await delay(600, 1400);
  }
  return dedupeRows(all);
}

// ---------- Public entry point ----------
export async function scrapeCategory(categoryName: string): Promise<ScrapedProductRow[]> {
  // Space NK is the primary source; Cult Beauty + Lookfantastic add more.
  const spacenk = await scrapeSpaceNk(categoryName);
  const cult = await scrapeCultBeauty(categoryName);
  const lf = await scrapeLookfantasticCategory(categoryName);
  const merged = dedupeRows([...spacenk, ...cult, ...lf]);

  if (merged.length > 0) {
    console.log(
      `[scraper] "${categoryName}" → ${merged.length} products (Space NK ${spacenk.length} + Cult Beauty ${cult.length} + Lookfantastic ${lf.length}, deduped)`
    );
  } else {
    console.log(`[scraper] "${categoryName}" → no products`);
  }
  return merged;
}
