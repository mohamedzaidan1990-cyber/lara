// Builds the <img src> for a product image. Retailer/CDN images that may be
// hotlink-protected are routed through our own /api/image-proxy so they render
// reliably; anything else (e.g. our own assets) is returned unchanged.

const PROXY_HOSTS = [
  "spacenk.com",
  "cultbeauty.co.uk",
  "thcdn.com",
  "selfridges.com",
  "scene7.com",
  "lookfantastic.com",
  "hearstapps.com",
  "fimgs.net",
  "boots.com",
  "bootsstatic.com",
  "johnlewis.com",
  "hudabeauty.com",
  "rarebeauty.com",
  "rhode.com",
  "gisou.com",
  "fentybeauty.com",
  "refy.beauty",
  "k18hair.com",
  "kyliecosmetics.com",
  "soldejaneiro.com",
  "cloudinary.com",
  "imgix.net",
  "cdn.shopify.com",
  "shopify.com"
];

function shouldProxy(hostname: string): boolean {
  return PROXY_HOSTS.some((d) => hostname === d || hostname.endsWith(`.${d}`));
}

// Scraped URLs often request small renditions (e.g. Selfridges' wid=363).
// The CDNs generate any size on demand, so upgrade size params at render
// time instead of re-scraping: Scene7-style wid/hei/qlt (Selfridges, Boots,
// John Lewis), generic width/height (Shopify, THG) and w/h (imgix).
// Aspect ratio is preserved by scaling paired height params.
const MIN_WIDTH = 800;

function upgradeCdnParams(url: string): string {
  try {
    const u = new URL(url);
    const q = u.searchParams;

    const wid = parseInt(q.get("wid") ?? "", 10);
    if (Number.isFinite(wid) && wid > 0 && wid < MIN_WIDTH) {
      const hei = parseInt(q.get("hei") ?? "", 10);
      q.set("wid", String(MIN_WIDTH));
      if (Number.isFinite(hei) && hei > 0) q.set("hei", String(Math.round((hei * MIN_WIDTH) / wid)));
      if (q.has("qlt")) q.set("qlt", "85");
    }

    for (const [wKey, hKey] of [["width", "height"], ["w", "h"]] as const) {
      const w = parseInt(q.get(wKey) ?? "", 10);
      if (Number.isFinite(w) && w > 0 && w < MIN_WIDTH) {
        const h = parseInt(q.get(hKey) ?? "", 10);
        q.set(wKey, String(MIN_WIDTH));
        if (Number.isFinite(h) && h > 0) q.set(hKey, String(Math.round((h * MIN_WIDTH) / w)));
      }
    }

    return u.toString();
  } catch {
    return url;
  }
}

export function productImageSrc(url: string | null | undefined): string {
  if (!url) return "";
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return url; // not an absolute URL — leave as-is
  }
  const upgraded = upgradeCdnParams(url);
  if (shouldProxy(hostname)) {
    return `/api/image-proxy?url=${encodeURIComponent(upgraded)}`;
  }
  return upgraded;
}
