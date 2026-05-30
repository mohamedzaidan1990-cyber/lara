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
  "cloudinary.com",
  "imgix.net",
  "cdn.shopify.com",
  "shopify.com"
];

function shouldProxy(hostname: string): boolean {
  return PROXY_HOSTS.some((d) => hostname === d || hostname.endsWith(`.${d}`));
}

export function productImageSrc(url: string | null | undefined): string {
  if (!url) return "";
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return url; // not an absolute URL — leave as-is
  }
  if (shouldProxy(hostname)) {
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}
