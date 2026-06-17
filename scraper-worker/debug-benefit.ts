/**
 * Debug: try alternative Benefit Cosmetics URL strategies on Selfridges.
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

const SCROLL = [
  { type: "wait", wait_time_s: 6 },
  { type: "scroll", x: 0, y: 2000 }, { type: "wait", wait_time_s: 2 },
  { type: "scroll", x: 0, y: 5000 }, { type: "wait", wait_time_s: 2 },
  { type: "scroll", x: 0, y: 9000 }, { type: "wait", wait_time_s: 2 },
];

const CANDIDATES = [
  // Brand slug (was 404 before — retry in case Selfridges updated)
  "https://www.selfridges.com/GB/en/cat/benefit-cosmetics/?pge=1&ppp=60&sort=relevance",
  // Category pages with brand facet filter
  "https://www.selfridges.com/GB/en/cat/beauty/?pge=1&ppp=60&sort=relevance&brands=Benefit+Cosmetics",
  "https://www.selfridges.com/GB/en/cat/beauty/makeup/?pge=1&ppp=60&sort=relevance&brands=Benefit+Cosmetics",
  "https://www.selfridges.com/GB/en/cat/beauty/?pge=1&ppp=60&sort=relevance&bsp=Benefit+Cosmetics",
];

(async () => {
  if (!process.env.OXYLABS_USERNAME) { console.error("No OXYLABS creds"); process.exit(1); }
  const { fetchWithWebUnblocker, extractSelfridgesProducts } = await import("./scraper");
  const cheerio = await import("cheerio");

  for (const url of CANDIDATES) {
    console.log(`\n=== ${url} ===`);
    const html = await fetchWithWebUnblocker(url, { browserInstructions: SCROLL } as never);
    if (!html || html.length < 1000) { console.log("  → Empty/blocked response"); continue; }
    console.log(`  → HTML length: ${html.length}`);
    const $ = cheerio.load(html);
    const raws = extractSelfridgesProducts($, html, "https://www.selfridges.com");
    const benefit = raws.filter(r => r.brand.toLowerCase().includes("benefit"));
    console.log(`  → ${raws.length} products total, ${benefit.length} Benefit`);
    for (const r of benefit) {
      console.log(`     ✓ ${r.brand} | ${r.name.slice(0, 70)}`);
    }
    if (benefit.length === 0 && raws.length > 0) {
      console.log(`  → Sample brands: ${[...new Set(raws.map(r => r.brand))].slice(0, 6).join(", ")}`);
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  console.log("\nDone.");
})().catch(e => { console.error(e?.message ?? e); process.exit(1); });
