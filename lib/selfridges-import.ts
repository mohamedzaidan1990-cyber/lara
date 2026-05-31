import * as cheerio from "cheerio";
import { fetch as undiciFetch, ProxyAgent } from "undici";
import { convertGbpToUsd } from "./currency";

// Build a dispatcher once per cold start. If PROXY_URL isn't set we let
// undici's default agent talk directly to the upstream.
let cachedDispatcher: ProxyAgent | null = null;
function getDispatcher(): ProxyAgent | undefined {
  const url = process.env.PROXY_URL;
  if (!url) return undefined;
  if (!cachedDispatcher) cachedDispatcher = new ProxyAgent(url);
  return cachedDispatcher;
}

// Oxylabs Web Unblocker — renders JS + bypasses Akamai server-side. Used when
// OXYLABS_USERNAME/PASSWORD are set; fixes the 403s the proxy path hits on
// Selfridges product pages.
const OXYLABS_ENDPOINT = "https://realtime.oxylabs.io/v1/queries";

function webUnblockerEnabled(): boolean {
  return Boolean(process.env.OXYLABS_USERNAME && process.env.OXYLABS_PASSWORD);
}

async function fetchWithWebUnblocker(url: string): Promise<string> {
  const user = process.env.OXYLABS_USERNAME;
  const pass = process.env.OXYLABS_PASSWORD;
  if (!user || !pass) return "";
  const auth = Buffer.from(`${user}:${pass}`).toString("base64");
  const res = await undiciFetch(OXYLABS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
    body: JSON.stringify({ source: "universal", url, render: "html", geo_location: "United Kingdom" }),
    signal: AbortSignal.timeout(180_000)
  });
  if (!res.ok) throw new Error(`Oxylabs HTTP ${res.status}`);
  const data = (await res.json()) as { results?: Array<{ content?: string }> };
  return data.results?.[0]?.content ?? "";
}

export interface ImportedProduct {
  url: string;
  ok: boolean;
  error?: string;
  brand?: string;
  name?: string;
  category?: string;
  price_gbp?: number;
  price_usd?: number;
  image_url?: string;
  deliverable_lebanon?: boolean;
}

const FETCH_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-GB,en;q=0.9"
};

const PRODUCT_CATEGORIES = new Set(["Makeup", "Skincare", "Bags", "Haircare", "Accessories", "Beauty tools"]);

function inferCategoryFromUrl(url: string): string | null {
  const u = url.toLowerCase();
  if (u.includes("/make-up/") || u.includes("/makeup/")) return "Makeup";
  if (u.includes("/skincare/") || u.includes("/skin-care/")) return "Skincare";
  if (u.includes("/bags-purses/") || u.includes("/bags/") || u.includes("/handbags/")) return "Bags";
  if (u.includes("/hair/") || u.includes("/haircare/")) return "Haircare";
  if (u.includes("/accessories/")) return "Accessories";
  return null;
}

function inferCategoryFromText(text: string): string | null {
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
  if (lower.includes("bag") || lower.includes("tote") || lower.includes("clutch") || lower.includes("pouch") || lower.includes("satchel")) {
    return "Bags";
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
    lower.includes("shampoo") ||
    lower.includes("conditioner") ||
    lower.includes("hair oil") ||
    lower.includes("hair mask")
  ) {
    return "Haircare";
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
  if (
    lower.includes("scarf") ||
    lower.includes("wallet") ||
    lower.includes("belt") ||
    lower.includes("sunglass") ||
    lower.includes("card holder") ||
    lower.includes("necklace") ||
    lower.includes("bracelet") ||
    lower.includes("earring")
  ) {
    return "Accessories";
  }
  return null;
}

function resolveCategory(url: string, text: string): string {
  return inferCategoryFromUrl(url) ?? inferCategoryFromText(text) ?? "Beauty tools";
}

function parsePrice(raw: string | number | undefined | null): number | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw === "number") return Number.isFinite(raw) && raw > 0 ? raw : null;
  const m = raw.replace(/,/g, "").match(/([\d]+(?:\.\d{1,2})?)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function cleanText(s: string | undefined | null): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

interface LdFields {
  name?: string;
  brand?: string;
  price?: string | number;
  image?: string;
}

// Walks JSON-LD blocks looking for a Product node (handles arrays and @graph).
function extractLdProduct($: cheerio.CheerioAPI): LdFields {
  const out: LdFields = {};
  const blocks = $('script[type="application/ld+json"]');
  blocks.each((_, el) => {
    const txt = $(el).contents().text();
    if (!txt) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(txt);
    } catch {
      return;
    }
    const candidates: unknown[] = [];
    const pushAll = (v: unknown) => {
      if (Array.isArray(v)) v.forEach(pushAll);
      else if (v && typeof v === "object") {
        const obj = v as Record<string, unknown>;
        if (Array.isArray(obj["@graph"])) (obj["@graph"] as unknown[]).forEach(pushAll);
        candidates.push(obj);
      }
    };
    pushAll(parsed);

    for (const c of candidates) {
      const obj = c as Record<string, unknown>;
      const type = obj["@type"];
      const isProduct = type === "Product" || (Array.isArray(type) && type.includes("Product"));
      if (!isProduct) continue;

      if (!out.name && typeof obj.name === "string") out.name = obj.name;

      if (!out.brand) {
        const brand = obj.brand;
        if (typeof brand === "string") out.brand = brand;
        else if (brand && typeof brand === "object") {
          const bn = (brand as Record<string, unknown>).name;
          if (typeof bn === "string") out.brand = bn;
        }
      }

      if (!out.image) {
        const image = obj.image;
        if (typeof image === "string") out.image = image;
        else if (Array.isArray(image) && typeof image[0] === "string") out.image = image[0] as string;
      }

      if (out.price === undefined) {
        const offers = obj.offers;
        const offerList = Array.isArray(offers) ? offers : offers ? [offers] : [];
        for (const offer of offerList) {
          if (offer && typeof offer === "object") {
            const price = (offer as Record<string, unknown>).price;
            if (typeof price === "string" || typeof price === "number") {
              out.price = price;
              break;
            }
          }
        }
      }
    }
  });
  return out;
}

export function checkDeliverability(html: string): boolean {
  const lower = html.toLowerCase();
  const idx = lower.indexOf("lebanon");
  if (idx === -1) return true; // not mentioned → assume it ships
  const windowText = lower.slice(Math.max(0, idx - 200), idx + 200);
  const negatives = [
    "not available",
    "excluded",
    "cannot",
    "can't",
    "does not ship",
    "doesn't ship",
    "not deliver",
    "unavailable",
    "not eligible"
  ];
  return !negatives.some((w) => windowText.includes(w));
}

export function parseProductHtml(html: string, url: string): Omit<ImportedProduct, "price_usd"> {
  const $ = cheerio.load(html);
  const ld = extractLdProduct($);

  let name =
    cleanText(ld.name) ||
    cleanText($('[data-test="product-name"]').first().text()) ||
    cleanText($("h1").first().text()) ||
    cleanText($('meta[property="og:title"]').attr("content")) ||
    cleanText($("title").text());
  // Strip common title suffixes.
  name = name.replace(/\s*[|–-]\s*Selfridges.*$/i, "").trim();

  const brand =
    cleanText(ld.brand) ||
    cleanText($('[data-test="brand-name"]').first().text()) ||
    cleanText($('[itemprop="brand"]').first().text()) ||
    cleanText($('meta[property="og:brand"]').attr("content"));

  const priceRaw =
    ld.price ??
    ($('[data-test="price"]').first().text() ||
      $('meta[itemprop="price"]').attr("content") ||
      $('[itemprop="price"]').attr("content") ||
      $(".price").first().text());
  const price_gbp = parsePrice(priceRaw);

  const image_url =
    cleanText($('meta[property="og:image"]').attr("content")) ||
    cleanText(ld.image) ||
    cleanText($('meta[name="twitter:image"]').attr("content"));

  const category = resolveCategory(url, `${brand} ${name}`);
  const deliverable_lebanon = checkDeliverability(html);

  if (!name || price_gbp === null) {
    return {
      url,
      ok: false,
      error: !name ? "Could not extract product name (page may be bot-blocked)" : "Could not extract a GBP price",
      brand: brand || undefined,
      name: name || undefined,
      category,
      price_gbp: price_gbp ?? undefined,
      image_url: image_url || undefined,
      deliverable_lebanon
    };
  }

  return {
    url,
    ok: true,
    brand: brand || "Selfridges",
    name,
    category,
    price_gbp,
    image_url,
    deliverable_lebanon
  };
}

export async function importOne(url: string): Promise<ImportedProduct> {
  let html: string;
  try {
    if (webUnblockerEnabled()) {
      // Preferred: Web Unblocker (renders JS, bypasses Akamai).
      html = await fetchWithWebUnblocker(url);
      if (!html) return { url, ok: false, error: "Web Unblocker returned empty content" };
    } else {
      // Fallback: direct/proxy fetch (works for non-gated pages).
      const res = await undiciFetch(url, {
        headers: FETCH_HEADERS,
        redirect: "follow",
        dispatcher: getDispatcher()
      });
      if (!res.ok) {
        return { url, ok: false, error: `Fetch failed (HTTP ${res.status})` };
      }
      html = await res.text();
    }
  } catch (err) {
    return { url, ok: false, error: `Fetch error: ${(err as Error).message}` };
  }

  const parsed = parseProductHtml(html, url);
  if (!parsed.ok || parsed.price_gbp === undefined) {
    return parsed as ImportedProduct;
  }

  const price_usd = await convertGbpToUsd(parsed.price_gbp);
  return { ...parsed, price_usd };
}

// Fetch + parse a batch with bounded concurrency.
export async function importMany(urls: string[], concurrency = 5): Promise<ImportedProduct[]> {
  const results: ImportedProduct[] = new Array(urls.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < urls.length) {
      const i = cursor++;
      results[i] = await importOne(urls[i]);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, urls.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export function isValidProductCategory(c: string): boolean {
  return PRODUCT_CATEGORIES.has(c);
}
