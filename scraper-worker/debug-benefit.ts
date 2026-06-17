/**
 * Debug: find Attraqt/Crownpeak zone ID in app chunk + call API with live key.
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
const TEST_KEY = "2038840f-437c-4401-a023-42bf5afed4eb";

(async () => {
  if (!process.env.OXYLABS_USERNAME) { console.error("No OXYLABS creds"); process.exit(1); }
  const { fetchWithWebUnblocker } = await import("./scraper");

  // 1. Look in the 382KB app chunk for zone ID and API endpoint
  console.log("=== Step 1: scan 382KB chunk for Attraqt/Crownpeak zone ===");
  const chunk = await fetchWithWebUnblocker(
    "https://www.selfridges.com/static-mfe-plp/_next/static/chunks/61721e05-f20ea982f6316ee4.js",
    {} as never
  );
  if (chunk && chunk.length > 1000) {
    console.log("Chunk size:", (chunk.length / 1024).toFixed(0), "KB");

    // Search for known Attraqt/Crownpeak patterns
    for (const kw of ["attraqt", "crownpeak", "xo.all", "zone", "lister", "eu1", "eu2", "api.xo", "search-api", "searchapi"]) {
      const idx = chunk.toLowerCase().indexOf(kw.toLowerCase());
      if (idx >= 0) {
        console.log(`[${kw}]: ...${chunk.slice(Math.max(0, idx-30), idx+200)}...`);
      }
    }

    // All HTTPS URLs
    const allUrls = [...new Set(chunk.match(/https?:\\?\/\\?\/[^"'`\s\\)]{10,120}/g) ?? [])];
    const relevantUrls = allUrls.filter(u =>
      /attraqt|crownpeak|search|catalog|product|lister|xo\./i.test(u)
    );
    if (relevantUrls.length) console.log("Relevant URLs:", relevantUrls.join("\n  "));
    else console.log("No relevant URLs found. Total URLs:", allUrls.length, "Sample:", allUrls.slice(0, 3).join(", "));

    // UUID-like strings that could be zone IDs
    const uuids = [...new Set(chunk.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi) ?? [])];
    console.log("UUID-like strings in chunk:", uuids.join(", ") || "None");
  }

  // 2. Try calling the Crownpeak/Attraqt API directly with the live key
  // Common Crownpeak Search endpoint patterns
  console.log("\n=== Step 2: try Crownpeak/Attraqt API with live key ===");
  const crownpeakEndpoints = [
    `https://lister.eu1.attraqt.io/zones-v2/?key=${LIVE_KEY}&pge=1&ppp=60&term=benefit`,
    `https://lister.eu1.attraqt.io/zones-v2/?key=${LIVE_KEY}&brand=benefit-cosmetics&pge=1&ppp=60`,
    `https://api.crownpeak.io/zones-v2/?key=${LIVE_KEY}&pge=1&ppp=60&term=benefit+cosmetics`,
    `https://lister.eu2.attraqt.io/zones-v2/?key=${LIVE_KEY}&pge=1&ppp=60&brand=benefit`,
    `https://search.selfridges.com/zones-v2/?key=${LIVE_KEY}&pge=1&ppp=60&term=benefit+cosmetics`,
    `https://lister.eu1.attraqt.io/search?apiKey=${LIVE_KEY}&query=benefit+cosmetics&rows=60`,
  ];
  for (const url of crownpeakEndpoints) {
    const resp = await fetchWithWebUnblocker(url, {} as never);
    const isJson = resp?.trim().startsWith("{") || resp?.trim().startsWith("[");
    console.log("→", url.slice(0, 70), "→", resp?.length ?? 0, "bytes", isJson ? "JSON" : "");
    if (isJson && resp && resp.length > 100) {
      console.log("  Response:", resp.slice(0, 400));
      break;
    }
  }

  // 3. Look at the utag.js more carefully for the Attraqt zone setup
  console.log("\n=== Step 3: full Attraqt config from utag.js ===");
  const utagJs = await fetchWithWebUnblocker(
    "https://tags.tiqcdn.com/utag/selfridges/main/prod/utag.js",
    {} as never
  );
  if (utagJs && utagJs.length > 1000) {
    // Get more context around crownpeak/attraqt
    let idx = 0;
    let found = 0;
    while (found < 5) {
      const next = utagJs.toLowerCase().indexOf("attraqt", idx);
      if (next < 0) break;
      console.log(`Attraqt[${found}]: ${utagJs.slice(Math.max(0, next-20), next+300)}`);
      idx = next + 1;
      found++;
    }
    // Find UUID patterns (zone IDs)
    const uuids = [...new Set(utagJs.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi) ?? [])];
    console.log("UUIDs in utag.js:", uuids.join(", ") || "None");
  }

  console.log("\nDone.");
})().catch(e => { console.error(e?.message ?? e); process.exit(1); });
