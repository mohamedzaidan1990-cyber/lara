/**
 * Debug: find Attraqt API endpoint in mfe-plp chunks and call it directly.
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

(async () => {
  if (!process.env.OXYLABS_USERNAME) { console.error("No OXYLABS creds"); process.exit(1); }
  const { fetchWithWebUnblocker } = await import("./scraper");

  // 1. Fetch the main PLP chunk to find Attraqt config/endpoint
  console.log("=== Step 1: fetch mfe-plp chunk to find Attraqt API ===");
  const chunkUrls = [
    "https://www.selfridges.com/static-mfe-plp/_next/static/chunks/main-app-44ecd935c743f9f8.js",
    "https://www.selfridges.com/static-mfe-plp/_next/static/chunks/87c73c54-dd8d81ac9604067c.js",
  ];
  let attraqtApiUrl = "";
  let siteId = "";
  for (const url of chunkUrls) {
    console.log("Fetching:", url.split("/").pop());
    const js = await fetchWithWebUnblocker(url, {} as never);
    if (!js || js.length < 1000) { console.log("Empty"); continue; }
    console.log("Size:", (js.length / 1024).toFixed(0), "KB");

    // Find Attraqt API/zone URLs
    const attraqtMatches = js.match(/attraqt[^"']{0,100}/gi) ?? [];
    if (attraqtMatches.length > 0) {
      console.log("Attraqt references:", [...new Set(attraqtMatches)].slice(0, 5).join("\n  "));
    }

    // Find zone ID or site ID patterns
    const zoneMatches = js.match(/["'](?:zone[_-]?id|siteId|scene_id|site)['"]\s*[:=]\s*["']([^"']{5,50})["']/gi) ?? [];
    if (zoneMatches.length > 0) {
      console.log("Zone/site IDs:", zoneMatches.slice(0, 5).join("\n  "));
    }

    // Find any https URLs containing attraqt or search API
    const apiUrls = [...new Set(js.match(/https?:\/\/[^"'\s]{10,100}(?:attraqt|search|catalog|product)[^"'\s]{0,60}/gi) ?? [])];
    if (apiUrls.length > 0) {
      console.log("API URLs found:", apiUrls.slice(0, 10).join("\n  "));
      attraqtApiUrl = apiUrls[0];
    }

    // Find selfridges-specific attraqt config
    const m = js.match(/(?:lister|api|search)\.(?:eu\d|us\d)?\.?attraqt\.[a-z]+\/[^"'\s]{0,80}/i);
    if (m) { console.log("Attraqt endpoint:", m[0]); attraqtApiUrl = "https://" + m[0]; }

    const sm = js.match(/siteId['"]\s*[:=]\s*["']([^"']{5,40})['"]/i);
    if (sm) siteId = sm[1];
  }

  // 2. Try Attraqt API endpoints directly
  console.log("\n=== Step 2: try Attraqt / XO API endpoints ===");
  // The Attraqt XO search API is typically:
  // https://lister.eu1.attraqt.io/zones-v2/?zone={zone}&...
  // or https://search.selfridges.com/...
  const apiEndpoints = [
    "https://search.selfridges.com/v2/products?brand=benefit-cosmetics&pge=1&ppp=60",
    "https://lister.eu1.attraqt.io/zones-v2/",
    "https://api.attraqt.io/catalog/v1/query?site=selfridges&brand=benefit-cosmetics",
    attraqtApiUrl,
  ].filter(Boolean);

  for (const url of apiEndpoints) {
    if (!url) continue;
    console.log("Trying:", url.slice(0, 80));
    const resp = await fetchWithWebUnblocker(url, {} as never);
    if (resp && resp.length > 50) {
      const isJson = resp.trim().startsWith("{") || resp.trim().startsWith("[");
      console.log("Got", resp.length, "bytes,", isJson ? "JSON" : "HTML", "first 200:", resp.slice(0, 200));
    } else {
      console.log("Empty/null response");
    }
  }

  // 3. Fetch the attraqt XO script itself to understand the API
  console.log("\n=== Step 3: inspect attraqt XO script ===");
  const xoJs = await fetchWithWebUnblocker("https://cdn.attraqt.io/xo.all-2.min.js", {} as never);
  if (xoJs && xoJs.length > 100) {
    console.log("XO script size:", (xoJs.length / 1024).toFixed(0), "KB");
    // Find selfridges-specific zone or config
    const selfridgesRef = xoJs.match(/selfridges[^"'\s]{0,60}/gi) ?? [];
    console.log("Selfridges refs:", [...new Set(selfridgesRef)].slice(0, 5).join(", "));
    const apiRef = xoJs.match(/https?:\/\/[^"'\s]{10,80}(?:api|lister|search)[^"'\s]{0,40}/gi) ?? [];
    console.log("API URLs:", [...new Set(apiRef)].slice(0, 5).join("\n  "));
  }

  console.log("\nDone.");
})().catch(e => { console.error(e?.message ?? e); process.exit(1); });
