/**
 * Debug: try benefit-cosmetics slug with full scroll depth + inspect fallback parsers.
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

// Full scroll instructions (same as main scraper)
const FULL_SCROLL = [
  { type: "wait", wait_time_s: 6 },
  { type: "scroll", x: 0, y: 2000 }, { type: "wait", wait_time_s: 2 },
  { type: "scroll", x: 0, y: 5000 }, { type: "wait", wait_time_s: 2 },
  { type: "scroll", x: 0, y: 9000 }, { type: "wait", wait_time_s: 2 },
  { type: "scroll", x: 0, y: 14000 }, { type: "wait", wait_time_s: 3 },
];

const CANDIDATES = [
  // Slug with full scroll
  "https://www.selfridges.com/GB/en/cat/benefit-cosmetics/?pge=1&ppp=60&sort=relevance",
  // Try without ppp/sort params — plain brand page
  "https://www.selfridges.com/GB/en/cat/benefit-cosmetics/",
  // Try their newer URL format
  "https://www.selfridges.com/GB/en/brands/benefit-cosmetics/",
  // Try beauty sub-path under brand slug
  "https://www.selfridges.com/GB/en/cat/benefit-cosmetics/beauty/",
];

(async () => {
  if (!process.env.OXYLABS_USERNAME) { console.error("No OXYLABS creds"); process.exit(1); }
  const { fetchWithWebUnblocker, extractSelfridgesProducts } = await import("./scraper");
  const cheerio = await import("cheerio");

  for (const url of CANDIDATES) {
    console.log(`\n=== ${url} ===`);
    const html = await fetchWithWebUnblocker(url, { browserInstructions: FULL_SCROLL } as never);
    if (!html || html.length < 1000) { console.log("  → Empty/blocked"); continue; }
    console.log(`  → HTML: ${(html.length / 1024).toFixed(0)} KB`);
    const $ = cheerio.load(html);

    // Check what structures exist
    const productCards = $('[data-testid="product-card"]').length;
    const jsonLd = $('script[type="application/ld+json"]').length;
    const hasNextData = html.includes("__NEXT_DATA__");
    console.log(`  → product-cards: ${productCards}, JSON-LD scripts: ${jsonLd}, __NEXT_DATA__: ${hasNextData}`);

    const raws = extractSelfridgesProducts($, html, "https://www.selfridges.com");
    const benefit = raws.filter(r => r.brand.toLowerCase().includes("benefit"));
    console.log(`  → Parsed: ${raws.length} total, ${benefit.length} Benefit`);
    if (benefit.length > 0) {
      benefit.forEach(r => console.log(`     ✓ ${r.name} | £${r.priceGbp}`));
    } else if (raws.length > 0) {
      console.log(`  → Sample brands: ${[...new Set(raws.map(r => r.brand))].slice(0, 5).join(", ")}`);
    }

    // If __NEXT_DATA__ exists, show a snippet to understand the data shape
    if (hasNextData && raws.length === 0) {
      const match = html.match(/"brand"\s*:\s*"([^"]{1,50})"/g);
      if (match) {
        const brands = [...new Set(match.map(m => m.replace(/.*"brand"\s*:\s*"/, "").replace(/"$/, "")))];
        console.log(`  → Brands in __NEXT_DATA__: ${brands.slice(0, 10).join(", ")}`);
      }
      // Check for product count hint
      const countMatch = html.match(/"(?:totalCount|itemsCount|count)"\s*:\s*(\d+)/);
      if (countMatch) console.log(`  → Count in data: ${countMatch[1]}`);
    }

    await new Promise(r => setTimeout(r, 3000));
  }
  console.log("\nDone.");
})().catch(e => { console.error(e?.message ?? e); process.exit(1); });
