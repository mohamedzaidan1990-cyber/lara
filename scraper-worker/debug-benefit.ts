/**
 * Debug: call Attraqt/Crownpeak API DIRECTLY (no Oxylabs) using Node.js fetch.
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

const LIVE_KEY = "ddc91fb9-7db9-4fcc-90f0-4f0b770abf56";
const THIRD_UUID = "a8156fd8-8ef4-4421-a4d0-e2e26fd1ff1d";

async function directFetch(url: string, label?: string): Promise<string> {
  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, */*",
        "Referer": "https://www.selfridges.com/",
        "Origin": "https://www.selfridges.com",
      }
    });
    const text = await r.text();
    const logLabel = label ?? url.slice(0, 70);
    console.log(`${logLabel} → HTTP ${r.status}, ${text.length} bytes`);
    if (text.length > 0) console.log("  First 300:", text.slice(0, 300));
    return text;
  } catch (e: any) {
    console.log(`${url.slice(0, 70)} → ERROR: ${e.message}`);
    return "";
  }
}

(async () => {
  // 1. Try the Attraqt config endpoint to discover zones
  console.log("=== Step 1: Attraqt config discovery ===");
  await directFetch(`https://cdn.attraqt.io/config.js?siteId=${LIVE_KEY}`, "config with LIVE_KEY");
  await directFetch(`https://cdn.attraqt.io/config.js?siteId=${THIRD_UUID}`, "config with THIRD_UUID");
  await directFetch(`https://cdn.attraqt.io/sites/${LIVE_KEY}.json`, "sites with LIVE_KEY");
  await directFetch(`https://cdn.attraqt.io/sites/${THIRD_UUID}.json`, "sites with THIRD_UUID");

  // 2. Try the Attraqt zones API with discovered UUIDs as zone IDs
  console.log("\n=== Step 2: Attraqt zones-v2 API (direct fetch) ===");
  const zoneEndpoints = [
    `https://lister.eu1.attraqt.io/zones-v2/?zone=${THIRD_UUID}&pge=1&ppp=60`,
    `https://lister.eu1.attraqt.io/zones-v2/?zone=${LIVE_KEY}&pge=1&ppp=60`,
    `https://lister.eu1.attraqt.io/zones-v2/?zone=${THIRD_UUID}&pge=1&ppp=60&term=benefit+cosmetics`,
    `https://lister.eu1.attraqt.io/zones-v2/?zone=${LIVE_KEY}&pge=1&ppp=60&term=benefit+cosmetics`,
    `https://lister.eu2.attraqt.io/zones-v2/?zone=${THIRD_UUID}&pge=1&ppp=60`,
    `https://lister.eu2.attraqt.io/zones-v2/?zone=${LIVE_KEY}&pge=1&ppp=60`,
  ];
  for (const url of zoneEndpoints) {
    const resp = await directFetch(url);
    if (resp && resp.length > 100 && (resp.startsWith("{") || resp.startsWith("["))) {
      console.log("** JSON HIT **", url);
      break;
    }
  }

  // 3. Try the newer Crownpeak Search APIs
  console.log("\n=== Step 3: Crownpeak Search API ===");
  const crownpeakEndpoints = [
    `https://api.crownpeak.io/v2/products?siteId=${LIVE_KEY}&brand=benefit-cosmetics`,
    `https://search.crownpeak.io/v1/query?siteId=${LIVE_KEY}&q=benefit+cosmetics`,
    `https://cdn.attraqt.io/xo.all-2.min.js`,
  ];
  for (const url of crownpeakEndpoints) {
    await directFetch(url);
  }

  // 4. Inspect what the XO config script actually does when fetched with site context
  console.log("\n=== Step 4: XO script with key ===");
  const xoWithKey = await directFetch(`https://cdn.attraqt.io/xo.all-?key=${LIVE_KEY}`, "XO with key");
  if (xoWithKey.length > 100) {
    const apiUrlMatch = xoWithKey.match(/https?:\/\/[^"'\s]{20,100}(?:lister|zones|search|api)[^"'\s]{0,60}/gi);
    if (apiUrlMatch) console.log("API URLs in XO response:", [...new Set(apiUrlMatch)].slice(0, 5).join("\n  "));
  }

  console.log("\nDone.");
})().catch(e => { console.error(e?.message ?? e); process.exit(1); });
