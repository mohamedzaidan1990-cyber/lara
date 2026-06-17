/**
 * Debug: find Attraqt endpoint in PLP chunk raw content + try longer page wait.
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

const VERY_LONG_WAIT = [
  { type: "wait", wait_time_s: 15 },
  { type: "scroll", x: 0, y: 1000 }, { type: "wait", wait_time_s: 5 },
  { type: "scroll", x: 0, y: 3000 }, { type: "wait", wait_time_s: 5 },
  { type: "scroll", x: 0, y: 6000 }, { type: "wait", wait_time_s: 5 },
  { type: "scroll", x: 0, y: 10000 }, { type: "wait", wait_time_s: 8 },
];

(async () => {
  if (!process.env.OXYLABS_USERNAME) { console.error("No OXYLABS creds"); process.exit(1); }
  const { fetchWithWebUnblocker } = await import("./scraper");
  const cheerio = await import("cheerio");

  // 1. Look at the raw chunk content for URLs and API patterns
  console.log("=== Step 1: raw chunk analysis ===");
  const chunkJs = await fetchWithWebUnblocker(
    "https://www.selfridges.com/static-mfe-plp/_next/static/chunks/87c73c54-dd8d81ac9604067c.js",
    {} as never
  );
  if (chunkJs && chunkJs.length > 1000) {
    console.log("Chunk size:", (chunkJs.length / 1024).toFixed(0), "KB");
    // All https URLs
    const allUrls = [...new Set(chunkJs.match(/https?:\\?\/\\?\/[^"'`\s\\]{10,100}/g) ?? [])];
    console.log("All HTTPS URLs in chunk:", allUrls.length);
    allUrls.forEach(u => console.log(" ", u.slice(0, 100)));

    // Find patterns around "zone", "search", "api", "lister"
    const snippets: string[] = [];
    for (const kw of ["zone", "lister", "attraqt", "fredhopper", "xo", "XO", "catalog", "search", "endpoint"]) {
      const idx = chunkJs.indexOf(kw);
      if (idx >= 0) snippets.push(`[${kw}]: ...${chunkJs.slice(Math.max(0, idx-20), idx+100)}...`);
    }
    console.log("Keyword snippets:", snippets.slice(0, 8).join("\n  "));
  } else {
    console.log("Chunk empty or too small");
  }

  // 2. Try fetching the 18-xx chunk as well
  console.log("\n=== Step 2: check chunk 18 ===");
  const chunk18 = await fetchWithWebUnblocker(
    "https://www.selfridges.com/static-mfe-plp/_next/static/chunks/18-a82232ccf032754b.js",
    {} as never
  );
  if (chunk18 && chunk18.length > 1000) {
    console.log("Chunk18 size:", (chunk18.length / 1024).toFixed(0), "KB");
    const allUrls18 = [...new Set(chunk18.match(/https?:\\?\/\\?\/[^"'`\s\\]{10,100}/g) ?? [])];
    console.log("HTTPS URLs:", allUrls18.map(u => u.slice(0, 100)).join("\n  ") || "None");
    const snippets18: string[] = [];
    for (const kw of ["zone", "lister", "attraqt", "catalog", "search", "endpoint", "api"]) {
      const idx = chunk18.indexOf(kw);
      if (idx >= 0) snippets18.push(`[${kw}]: ...${chunk18.slice(Math.max(0, idx-20), idx+80)}...`);
    }
    console.log("Keyword snippets:", snippets18.slice(0, 6).join("\n  "));
  }

  // 3. Retry brand page with much longer wait
  console.log("\n=== Step 3: brand page with 15s initial wait ===");
  const brandHtml = await fetchWithWebUnblocker(
    "https://www.selfridges.com/GB/en/cat/benefit-cosmetics/?pge=1&ppp=60&sort=relevance",
    { browserInstructions: VERY_LONG_WAIT } as never
  );
  if (brandHtml && brandHtml.length > 1000) {
    const $ = cheerio.load(brandHtml);
    const cards = $("[data-testid='product-card']").length;
    const testIds = new Set<string>();
    $("[data-testid]").each((_, el) => testIds.add($(el).attr("data-testid") ?? ""));
    console.log("HTML size:", (brandHtml.length / 1024).toFixed(0), "KB");
    console.log("Product cards:", cards);
    console.log("All data-testid values:", [...testIds].join(", "));
    // Price patterns
    const prices = brandHtml.match(/£\d[\d.,]*/g) ?? [];
    console.log("Prices:", [...new Set(prices)].join(", "));
    // Product URLs
    const productLinks = [...new Set(brandHtml.match(/\/en\/product\/[^"'\s]{5,60}/g) ?? [])];
    console.log("Product URLs:", productLinks.length, productLinks.slice(0, 5).join("\n  "));
  }

  console.log("\nDone.");
})().catch(e => { console.error(e?.message ?? e); process.exit(1); });
