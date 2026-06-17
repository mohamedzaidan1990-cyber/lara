/**
 * Debug: inspect the raw HTML of the benefit-cosmetics brand page to find
 * where product data lives, and try the Next.js RSC JSON endpoint.
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

const FULL_SCROLL = [
  { type: "wait", wait_time_s: 8 },
  { type: "scroll", x: 0, y: 2000 }, { type: "wait", wait_time_s: 3 },
  { type: "scroll", x: 0, y: 5000 }, { type: "wait", wait_time_s: 3 },
  { type: "scroll", x: 0, y: 9000 }, { type: "wait", wait_time_s: 3 },
  { type: "scroll", x: 0, y: 14000 }, { type: "wait", wait_time_s: 5 },
];

(async () => {
  if (!process.env.OXYLABS_USERNAME) { console.error("No OXYLABS creds"); process.exit(1); }
  const { fetchWithWebUnblocker } = await import("./scraper");
  const cheerio = await import("cheerio");

  // 1. Fetch a known-working page to extract the Next.js build ID
  console.log("=== Step 1: get Next.js build ID from working page ===");
  const makeupHtml = await fetchWithWebUnblocker(
    "https://www.selfridges.com/GB/en/cat/beauty/makeup/?pge=1&ppp=60&sort=relevance",
    { browserInstructions: FULL_SCROLL } as never
  );
  let buildId = "";
  if (makeupHtml) {
    const m = makeupHtml.match(/"buildId"\s*:\s*"([^"]+)"/);
    if (m) { buildId = m[1]; console.log("Build ID:", buildId); }
    else console.log("No buildId found in makeup page");
  }

  // 2. If we have a buildId, try the Next.js JSON data endpoint
  if (buildId) {
    console.log("\n=== Step 2: try /_next/data/ endpoint for benefit-cosmetics ===");
    const dataUrl = `https://www.selfridges.com/_next/data/${buildId}/GB/en/cat/benefit-cosmetics.json?pge=1&ppp=60&sort=relevance`;
    console.log("URL:", dataUrl);
    const dataHtml = await fetchWithWebUnblocker(dataUrl, {} as never);
    if (dataHtml && dataHtml.length > 100) {
      console.log("Response length:", dataHtml.length);
      // Look for product-like data
      const nameMatches = dataHtml.match(/"(?:name|productName)"\s*:\s*"([^"]{5,80})"/g)?.slice(0, 10);
      if (nameMatches) console.log("Product names found:", nameMatches);
      else console.log("No product names found. First 500 chars:", dataHtml.slice(0, 500));
    } else {
      console.log("Empty/short response");
    }
  }

  // 3. Inspect the benefit-cosmetics brand page HTML structure
  console.log("\n=== Step 3: inspect benefit-cosmetics brand page structure ===");
  const brandHtml = await fetchWithWebUnblocker(
    "https://www.selfridges.com/GB/en/cat/benefit-cosmetics/?pge=1&ppp=60&sort=relevance",
    { browserInstructions: FULL_SCROLL } as never
  );
  if (brandHtml && brandHtml.length > 1000) {
    const $ = cheerio.load(brandHtml);
    console.log("HTML size:", (brandHtml.length / 1024).toFixed(0), "KB");

    // What data-testid values exist?
    const testIds = new Set<string>();
    $("[data-testid]").each((_, el) => testIds.add($(el).attr("data-testid") ?? ""));
    console.log("data-testid values:", [...testIds].slice(0, 20).join(", "));

    // What script tags contain useful data?
    let scriptDataFound = false;
    $("script").each((_, el) => {
      const content = $(el).html() ?? "";
      if (content.includes("Benefit") && content.length > 200) {
        console.log("Script with Benefit data (first 300 chars):", content.slice(0, 300));
        scriptDataFound = true;
        return false; // break
      }
    });
    if (!scriptDataFound) console.log("No script tags contain 'Benefit'");

    // Look for any product-like anchors
    const productLinks = $("a[href*='/product/']").length;
    console.log("Product link <a> tags:", productLinks);
    if (productLinks > 0) {
      $("a[href*='/product/']").slice(0, 5).each((_, el) => {
        console.log(" ", $(el).attr("href")?.slice(0, 80));
      });
    }

    // First 1000 chars of body to see page type
    console.log("Page body start:", $("body").text().slice(0, 300).replace(/\s+/g, " "));
  }

  console.log("\nDone.");
})().catch(e => { console.error(e?.message ?? e); process.exit(1); });
