/**
 * Debug: fetch one Selfridges search page and print all brand+name pairs without
 * any brand filter, so we can see what's actually coming back.
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
  const { fetchWithWebUnblocker, extractSelfridgesProducts } = await import("./scraper");
  const cheerio = await import("cheerio");

  const URLS = [
    "https://www.selfridges.com/GB/en/cat/?pge=1&ppp=60&sort=relevance&term=benefit+cosmetics",
    "https://www.selfridges.com/GB/en/cat/?pge=1&ppp=60&sort=relevance&term=benefit",
  ];

  for (const url of URLS) {
    console.log(`\n=== ${url} ===`);
    const html = await fetchWithWebUnblocker(url, {
      browserInstructions: [
        { type: "wait", wait_time_s: 6 },
        { type: "scroll", x: 0, y: 2000 }, { type: "wait", wait_time_s: 2 },
        { type: "scroll", x: 0, y: 5000 }, { type: "wait", wait_time_s: 2 },
      ]
    } as Parameters<typeof fetchWithWebUnblocker>[1]);
    if (!html || html.length < 1000) { console.log("Empty response"); continue; }
    console.log(`HTML length: ${html.length}`);
    const $ = cheerio.load(html);
    const raws = extractSelfridgesProducts($, html, "https://www.selfridges.com");
    console.log(`Parsed ${raws.length} products:`);
    for (const r of raws) {
      const isBenefit = r.brand.toLowerCase().includes("benefit");
      console.log(`  ${isBenefit ? "✓" : "✗"} brand="${r.brand}" | ${r.name.slice(0, 60)}`);
    }
  }
})().catch(e => { console.error(e?.message ?? e); process.exit(1); });
