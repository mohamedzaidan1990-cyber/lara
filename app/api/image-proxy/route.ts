// Proxies external product images through our own domain so they always render
// in the browser, regardless of upstream hotlink/referrer protection.
//
// Usage: /api/image-proxy?url=https%3A%2F%2Fwww.spacenk.com%2F...
//
// Only known retailer / CDN hosts are allowed. The request is sent with a
// matching Referer + a real browser User-Agent, then re-served from our origin
// with a long cache lifetime.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Allowed image hosts (matched against the URL's hostname, suffix-safe — so
// "spacenk.com" also allows "www.spacenk.com" / "cdn.spacenk.com" but not
// "spacenk.com.evil.com").
const ALLOWED_HOSTS = [
  "spacenk.com", // covers cdn./media./images.spacenk.com
  "cultbeauty.co.uk", // covers cdn./media./images.cultbeauty.co.uk
  "thcdn.com", // Cult Beauty (THG) image CDN
  "selfridges.com",
  "scene7.com", // Selfridges image CDN
  // Lookfantastic (THG) — images are on thcdn.com, plus its own CDNs:
  "lookfantastic.com",
  "hearstapps.com",
  "fimgs.net",
  // Boots (boots.scene7.com is covered by scene7.com):
  "boots.com",
  "bootsstatic.com",
  // John Lewis:
  "johnlewis.com",
  "johnlewis.scene7.com",
  // Direct brand sites (most serve images via cdn.shopify.com, already allowed):
  "hudabeauty.com",
  "rarebeauty.com",
  "rhode.com",
  "gisou.com",
  "fentybeauty.com",
  "refy.beauty",
  "k18hair.com",
  "kyliecosmetics.com",
  "soldejaneiro.com",
  // Korean beauty brand CDNs (products sourced via Selfridges but may link
  // to brand-owned image hosts):
  "cosrx.com",
  "beautyofjoseon.com",
  "anuaofficial.com",
  "skin1004.com",
  "glow-recipe.com",
  "glowrecipe.com",
  // Common beauty-retailer / generic image CDNs:
  "cloudinary.com",
  "imgix.net",
  "cdn.shopify.com",
  "shopify.com"
];

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function hostAllowed(hostname: string): boolean {
  return ALLOWED_HOSTS.some((d) => hostname === d || hostname.endsWith(`.${d}`));
}

// Pick a believable Referer for the upstream host.
function refererFor(hostname: string): string {
  if (hostname.endsWith("cultbeauty.co.uk") || hostname.endsWith("thcdn.com")) {
    return "https://www.cultbeauty.co.uk/";
  }
  if (hostname.endsWith("selfridges.com") || hostname.endsWith("scene7.com")) {
    return "https://www.selfridges.com/";
  }
  if (hostname.endsWith("lookfantastic.com")) {
    return "https://www.lookfantastic.com/";
  }
  if (hostname.includes("boots")) {
    return "https://www.boots.com/";
  }
  if (hostname.includes("johnlewis")) {
    return "https://www.johnlewis.com/";
  }
  return "https://www.spacenk.com/";
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get("url");
  if (!imageUrl) return new Response("Missing url", { status: 400 });

  let target: URL;
  try {
    target = new URL(imageUrl);
  } catch {
    return new Response("Invalid url", { status: 400 });
  }
  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return new Response("Invalid protocol", { status: 400 });
  }
  if (!hostAllowed(target.hostname)) {
    return new Response("Domain not allowed", { status: 403 });
  }

  // Guard against a hung upstream tying up the function.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const upstream = await fetch(target.toString(), {
      headers: {
        Referer: refererFor(target.hostname),
        "User-Agent": USER_AGENT,
        Accept: "image/avif,image/webp,image/jpeg,image/png,*/*;q=0.8"
      },
      redirect: "follow",
      signal: controller.signal
    });

    if (!upstream.ok) {
      return new Response("Upstream image error", { status: 502 });
    }

    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    const buffer = await upstream.arrayBuffer();

    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        // Cache hard: these product images are effectively immutable per URL.
        "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable"
      }
    });
  } catch {
    return new Response("Failed to fetch image", { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
