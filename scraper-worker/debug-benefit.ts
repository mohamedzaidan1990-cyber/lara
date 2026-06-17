/**
 * Debug: find Attraqt zone ID in Tealium utag.js + try app-specific chunks.
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

  // 1. Fetch Tealium utag.js for Selfridges — contains Attraqt zone config
  console.log("=== Step 1: Tealium utag.js ===");
  const utagJs = await fetchWithWebUnblocker(
    "https://tags.tiqcdn.com/utag/selfridges/main/prod/utag.js",
    {} as never
  );
  if (utagJs && utagJs.length > 1000) {
    console.log("utag size:", (utagJs.length / 1024).toFixed(0), "KB");
    // Find Attraqt-related config
    const attraqtIdx = utagJs.toLowerCase().indexOf("attraqt");
    if (attraqtIdx >= 0) {
      console.log("Attraqt config snippet:", utagJs.slice(Math.max(0, attraqtIdx - 50), attraqtIdx + 300));
    } else {
      console.log("No 'attraqt' in utag.js");
    }
    // Find XO config
    const xoIdx = utagJs.indexOf('"xo"');
    if (xoIdx >= 0) console.log("XO config:", utagJs.slice(xoIdx, xoIdx + 200));
    // Find lister/search endpoints
    const listerMatch = utagJs.match(/lister[^"'\s]{0,60}/gi) ?? [];
    console.log("Lister refs:", [...new Set(listerMatch)].slice(0, 5).join(", "));
    // Find zone IDs
    const zoneMatch = utagJs.match(/zone[^"'\s]{0,50}/gi) ?? [];
    console.log("Zone refs:", [...new Set(zoneMatch)].slice(0, 5).join(", "));
    // Find any API URLs
    const apiUrls = [...new Set(utagJs.match(/https?:\/\/[^"'\s]{10,80}(?:attraqt|search|api|catalog)[^"'\s]{0,40}/gi) ?? [])];
    console.log("API URLs:", apiUrls.slice(0, 10).join("\n  ") || "None");
  } else {
    console.log("Empty utag.js");
  }

  // 2. Fetch app-specific PLP chunks from the RSC payload chunk references
  // RSC mentioned: 61721e05-f20ea982f6316ee4.js, 891cff7f-...
  console.log("\n=== Step 2: app PLP chunks from RSC references ===");
  const appChunks = [
    "https://www.selfridges.com/static-mfe-plp/_next/static/chunks/61721e05-f20ea982f6316ee4.js",
    "https://www.selfridges.com/static-mfe-plp/_next/static/chunks/125-dc8dbcc481ecd967.js",
    "https://www.selfridges.com/static-mfe-plp/_next/static/chunks/387-d3f35cc7e6b7a3fd.js",
  ];
  for (const url of appChunks) {
    const name = url.split("/").pop()!;
    const js = await fetchWithWebUnblocker(url, {} as never);
    if (!js || js.length < 500) { console.log(name, "→ empty"); continue; }
    console.log(name, "→", (js.length / 1024).toFixed(0), "KB");
    const allUrls = [...new Set(js.match(/https?:\\?\/\\?\/[^"'`\s\\]{10,100}/g) ?? [])];
    const apiUrls = allUrls.filter(u => /attraqt|search|catalog|api|product|lister/i.test(u));
    if (apiUrls.length > 0) console.log("  API URLs:", apiUrls.slice(0, 5).join("\n    "));
    const attraqt = js.toLowerCase().indexOf("attraqt");
    if (attraqt >= 0) console.log("  Attraqt snippet:", js.slice(Math.max(0,attraqt-20), attraqt+200));
  }

  // 3. Try Attraqt's public XO API with common Selfridges patterns
  console.log("\n=== Step 3: try common Attraqt XO API patterns ===");
  const xoEndpoints = [
    "https://lister.eu1.attraqt.io/zones-v2/?zone=selfridges_gb_en_benefit-cosmetics&pge=1&ppp=60",
    "https://lister.eu1.attraqt.io/zones-v2/?zone=selfridges_plp&term=benefit+cosmetics&pge=1",
    "https://lister.eu2.attraqt.io/zones-v2/?zone=selfridges_gb_en&term=benefit+cosmetics",
    "https://api.xo.io/zones/selfridges/gb/en/benefit-cosmetics?pge=1&ppp=60",
  ];
  for (const url of xoEndpoints) {
    const resp = await fetchWithWebUnblocker(url, {} as never);
    const isJson = resp?.trim().startsWith("{") || resp?.trim().startsWith("[");
    if (resp && resp.length > 50 && isJson) {
      console.log("JSON HIT:", url);
      console.log("Response:", resp.slice(0, 400));
      break;
    }
    console.log("No hit:", url.slice(0, 70));
  }

  console.log("\nDone.");
})().catch(e => { console.error(e?.message ?? e); process.exit(1); });
