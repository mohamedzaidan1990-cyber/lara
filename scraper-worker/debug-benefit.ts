/**
 * Debug: extract all URLs from XO script + try Selfridges' own product API.
 * Run: railway run --service lara npx tsx scraper-worker/debug-benefit.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
function load(f: string): void {
  let text: string;
  try { text = readFileSync(f, "utf8"); } catch { return; }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const k = line.slice(0, eq).trim();
    if (!process.env[k]) process.env[k] = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
  }
}
load(resolve(__dirname, "..", ".env.local"));
load(resolve(__dirname, ".env"));

async function directFetch(url: string): Promise<string> {
  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/html, */*",
        "Referer": "https://www.selfridges.com/",
        "Origin": "https://www.selfridges.com",
      },
      signal: AbortSignal.timeout(10000),
    });
    return await r.text();
  } catch {
    return "";
  }
}

(async () => {
  // 1. Read XO script and extract all URLs / API patterns
  console.log("=== Step 1: XO.js URL analysis ===");
  const xoJs = await directFetch("https://cdn.attraqt.io/xo.all-2.min.js");
  if (xoJs && xoJs.length > 1000) {
    const allUrls = [...new Set(xoJs.match(/["']https?:\/\/[^"'\s]{10,100}["']/g) ?? [])];
    console.log("All URLs in XO.js:", allUrls.map(u => u.replace(/["']/g, "")).join("\n  ") || "None");

    // Domain stems (without https://)
    const domains = [...new Set(xoJs.match(/["'][a-z0-9-]+\.(?:attraqt|crownpeak|xo|io|com)[^"']{0,40}["']/gi) ?? [])];
    console.log("Domain patterns:", domains.slice(0, 10).join(", ") || "None");

    // "lister" keyword
    const lIdx = xoJs.toLowerCase().indexOf("lister");
    if (lIdx >= 0) console.log("lister snippet:", xoJs.slice(Math.max(0,lIdx-30), lIdx+200));

    // "zones" keyword
    const zIdx = xoJs.indexOf("zones");
    if (zIdx >= 0) console.log("zones snippet:", xoJs.slice(Math.max(0,zIdx-30), zIdx+200));

    // ".io" or ".com" stems
    const stemMatches = xoJs.match(/["'][a-z0-9._-]{3,}\.(?:io|com|net)(?:\/[^"']{0,60})?["']/gi) ?? [];
    console.log("Domain stems:", [...new Set(stemMatches)].slice(0, 20).join("\n  "));
  }

  // 2. Try Selfridges' own product search API (internal)
  console.log("\n=== Step 2: Selfridges internal API ===");
  const selfridgesApis = [
    "https://www.selfridges.com/api/products?brand=benefit-cosmetics&pge=1&ppp=60",
    "https://www.selfridges.com/api/catalog/products?brand=benefit-cosmetics&pge=1",
    "https://www.selfridges.com/int/v1/catalog/categories/beauty/benefit-cosmetics/products?pge=1&ppp=60",
    "https://api.selfridges.com/product-catalogue/v1/catalog/categories/benefit-cosmetics/products",
    "https://api.selfridges.com/product-catalogue/v2/products?brand=benefit-cosmetics",
    "https://www.selfridges.com/cat/benefit-cosmetics/?format=json&pge=1&ppp=60",
    "https://www.selfridges.com/GB/en/cat/benefit-cosmetics/?format=json",
  ];
  for (const url of selfridgesApis) {
    const resp = await directFetch(url);
    const isJson = resp?.trim().startsWith("{") || resp?.trim().startsWith("[");
    if (resp && resp.length > 50) {
      console.log(`${url.slice(40, 90)}: HTTP ${resp.length} bytes, ${isJson ? "JSON" : resp.slice(0,30)}`);
      if (isJson) {
        console.log("JSON response:", resp.slice(0, 500));
        break;
      }
    } else {
      console.log(`${url.slice(40, 90)}: empty`);
    }
  }

  // 3. Try DNS resolution of Attraqt lister domains
  console.log("\n=== Step 3: Attraqt domain resolution test ===");
  const domains = [
    "https://lister.eu1.attraqt.io/",
    "https://lister.attraqt.io/",
    "https://api.attraqt.com/",
    "https://lister.crownpeak.io/",
    "https://api.crownpeak.com/",
  ];
  for (const url of domains) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
      console.log(url, "→ HTTP", r.status, (await r.text()).slice(0, 80));
    } catch (e: any) {
      console.log(url, "→ ERROR:", e.message?.slice(0, 60));
    }
  }

  console.log("\nDone.");
})().catch(e => { console.error(e?.message ?? e); process.exit(1); });
