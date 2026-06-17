/**
 * Debug: find API endpoints and price data in benefit-cosmetics RSC payload.
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

  const brandHtml = await fetchWithWebUnblocker(
    "https://www.selfridges.com/GB/en/cat/benefit-cosmetics/?pge=1&ppp=60&sort=relevance",
    { browserInstructions: FULL_SCROLL } as never
  );

  if (!brandHtml || brandHtml.length < 1000) {
    console.log("Empty response"); process.exit(1);
  }

  const $ = cheerio.load(brandHtml);
  console.log("HTML size:", (brandHtml.length / 1024).toFixed(0), "KB");

  // 1. Find price patterns (£xx)
  const priceMatches = brandHtml.match(/£\d+[\d.,]*/g) ?? [];
  console.log("\n--- Price patterns (£) ---");
  console.log("Count:", priceMatches.length, "Sample:", priceMatches.slice(0, 10).join(", "));

  // 2. Find any /product/ URL patterns
  const productUrls = [...new Set(brandHtml.match(/\/GB\/en\/(?:cat|product)\/[^"'\s,]+/g) ?? [])];
  console.log("\n--- Product URL patterns ---");
  console.log("Count:", productUrls.length, "Sample:", productUrls.slice(0, 10).join("\n  "));

  // 3. Find API/fetch patterns in script content
  const apiPatterns: string[] = [];
  $("script").each((_, el) => {
    const content = $(el).html() ?? "";
    const matches = content.match(/(?:fetch|xhr|api|endpoint)[^\s"']*["'][^"']{5,80}["']/gi) ?? [];
    apiPatterns.push(...matches);
    const urlMatches = content.match(/["'](?:https?:\/\/[^"']{10,100})["']/g) ?? [];
    for (const u of urlMatches) {
      if (u.includes("api") || u.includes("catalog") || u.includes("product")) {
        apiPatterns.push(u);
      }
    }
  });
  console.log("\n--- API/fetch patterns in scripts ---");
  console.log([...new Set(apiPatterns)].slice(0, 10).join("\n  ") || "None found");

  // 4. Find RSC data chunks (__next_f)
  let rscChunks = 0;
  let rscWithBenefit = 0;
  $("script").each((_, el) => {
    const content = $(el).html() ?? "";
    if (content.includes("__next_f")) {
      rscChunks++;
      if (content.toLowerCase().includes("benefit")) rscWithBenefit++;
    }
  });
  console.log("\n--- RSC chunks ---");
  console.log("Total __next_f chunks:", rscChunks, "with 'benefit':", rscWithBenefit);

  // 5. All script src attributes (external scripts)
  const extScripts: string[] = [];
  $("script[src]").each((_, el) => extScripts.push($(el).attr("src") ?? ""));
  console.log("\n--- External script URLs ---");
  console.log(extScripts.slice(0, 10).join("\n  ") || "None");

  // 6. Sample RSC payload content
  const rscSamples: string[] = [];
  $("script").each((_, el) => {
    const content = $(el).html() ?? "";
    if (content.includes("__next_f") && rscSamples.length < 3) {
      rscSamples.push(content.slice(0, 200));
    }
  });
  console.log("\n--- RSC chunk samples (first 200 chars each) ---");
  rscSamples.forEach((s, i) => console.log(`[${i}]:`, s.replace(/\n/g, " ")));

  // 7. Try fetching Selfridges internal API directly
  console.log("\n--- Trying Selfridges API endpoints ---");
  const apiUrls = [
    "https://www.selfridges.com/api/products?brand=benefit-cosmetics&pge=1&ppp=60",
    "https://www.selfridges.com/api/catalog/products?brand=benefit-cosmetics",
    "https://api.selfridges.com/products/v1/search?brand=benefit-cosmetics",
    "https://www.selfridges.com/GB/en/cat/benefit-cosmetics/?pge=1&ppp=60&format=json",
  ];
  for (const url of apiUrls) {
    const resp = await fetchWithWebUnblocker(url, {} as never);
    if (resp && resp.length > 50 && !resp.startsWith("<")) {
      console.log("API HIT:", url);
      console.log("Response:", resp.slice(0, 300));
      break;
    } else {
      console.log("No hit:", url.slice(40), `(${resp?.length ?? 0} bytes, starts: ${resp?.slice(0,20) ?? "null"})`);
    }
  }

  console.log("\nDone.");
})().catch(e => { console.error(e?.message ?? e); process.exit(1); });
