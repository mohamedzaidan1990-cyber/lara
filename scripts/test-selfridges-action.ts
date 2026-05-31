/**
 * Final Selfridges scraping attempts (run with OXYLABS creds in env):
 *   1. Server-action / scroll-rendered page (lazy product load)
 *   2. Next.js /_next/data/[buildId] endpoint
 *   3. Internal search API URLs
 *   4. Parse JS bundles for the product API URL
 *
 * Saves artifacts to scripts/_out/ (no /tmp on Windows).
 */
import { fetch as undiciFetch } from "undici";
import { mkdirSync, writeFileSync } from "node:fs";

const OXY = "https://realtime.oxylabs.io/v1/queries";
function authH(): string {
  return "Basic " + Buffer.from(`${process.env.OXYLABS_USERNAME}:${process.env.OXYLABS_PASSWORD}`).toString("base64");
}
async function oxyRaw(body: Record<string, unknown>): Promise<{ status: number; content: string }> {
  const res = await undiciFetch(OXY, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authH() },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(180_000)
  });
  const data = (await res.json().catch(() => ({}))) as {
    results?: Array<{ content?: string; status_code?: number }>;
    message?: string;
  };
  const r = data.results?.[0];
  if (!r && data.message) console.log("   oxylabs message:", data.message);
  return { status: r?.status_code ?? res.status, content: r?.content ?? "" };
}
async function fetchWithWebUnblocker(url: string): Promise<string> {
  return (await oxyRaw({ source: "universal", url, render: "html", geo_location: "United Kingdom" })).content;
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const OUT = "scripts/_out";
mkdirSync(OUT, { recursive: true });

function reportProducts(label: string, html: string): number {
  const brands = html.match(/"brand":\s*"[^"]+"/g) || [];
  const prices = html.match(/"price":\s*"?\d+/g) || [];
  const productLinks = html.match(/\/GB\/en\/cat\/[^"']*?R\d{6,}/g) || [];
  const namedBrand = ["Charlotte Tilbury", "Dior", "Chanel", "Clinique", "MAC", "Estée", "Lancôme", "Hourglass"].filter((b) => html.includes(b));
  console.log(`   [${label}] htmlLen=${html.length} "brand"=${brands.length} "price"=${prices.length} productLinks=${productLinks.length} brandText=${namedBrand.length}`);
  if (brands.length) console.log("      sample brands:", brands.slice(0, 5));
  if (prices.length) console.log("      sample prices:", prices.slice(0, 5));
  if (productLinks.length) console.log("      sample links:", [...new Set(productLinks)].slice(0, 3));
  if (namedBrand.length) console.log("      brand text hits:", namedBrand);
  return brands.length + productLinks.length;
}

async function attempt1(): Promise<number> {
  console.log("\n########## ATTEMPT 1 — server action / scroll-rendered page ##########");
  let best = 0;
  // 1a: exactly as specified
  const bodyA = {
    source: "universal",
    url: "https://www.selfridges.com/GB/en/cat/beauty/makeup/",
    render: "html",
    geo_location: "United Kingdom",
    browser_instructions: [
      { type: "wait", wait_time_s: 5 },
      { type: "scroll", selector: "body", distance: 1000 },
      { type: "wait", wait_time_s: 3 },
      { type: "scroll", selector: "body", distance: 2000 },
      { type: "wait", wait_time_s: 3 }
    ]
  };
  const a = await oxyRaw(bodyA);
  console.log("  1a status:", a.status);
  best = Math.max(best, reportProducts("1a-as-specified", a.content));
  if (a.content.length > 2000) writeFileSync(`${OUT}/selfridges-1a.html`, a.content);

  // 1b: Oxylabs-native scroll coords + wait_for_element on a product tile
  const bodyB = {
    source: "universal",
    url: "https://www.selfridges.com/GB/en/cat/beauty/makeup/?pge=1&ppp=60&sort=relevance",
    render: "html",
    geo_location: "United Kingdom",
    browser_instructions: [
      { type: "wait", wait_time_s: 6 },
      { type: "scroll", x: 0, y: 2000 },
      { type: "wait", wait_time_s: 4 },
      { type: "scroll", x: 0, y: 5000 },
      { type: "wait", wait_time_s: 4 }
    ]
  };
  const b = await oxyRaw(bodyB);
  console.log("  1b status:", b.status);
  best = Math.max(best, reportProducts("1b-native-scroll", b.content));
  if (b.content.length > 2000) writeFileSync(`${OUT}/selfridges-1b.html`, b.content);
  return best;
}

async function attempt2(): Promise<number> {
  console.log("\n########## ATTEMPT 2 — Next.js /_next/data endpoint ##########");
  const html = await fetchWithWebUnblocker("https://www.selfridges.com/GB/en/");
  const buildId = (html.match(/"buildId":"([^"]+)"/) || [])[1];
  console.log("  buildId:", buildId, "(App Router omits buildId/_next-data; expected undefined)");
  if (!buildId) return 0;
  let best = 0;
  for (const path of ["GB/en/cat/beauty/makeup.json", "GB/en/cat/make-up.json"]) {
    const dataUrl = `https://www.selfridges.com/_next/data/${buildId}/${path}`;
    const resp = await fetchWithWebUnblocker(dataUrl);
    console.log(`  ${dataUrl} → len ${resp.length}`);
    console.log("   first 300:", resp.slice(0, 300).replace(/\s+/g, " "));
    best = Math.max(best, reportProducts("2-next-data", resp));
    await sleep(1500);
  }
  return best;
}

async function attempt3(): Promise<number> {
  console.log("\n########## ATTEMPT 3 — internal search API URLs ##########");
  const searchUrls = [
    "https://www.selfridges.com/api/search/v1/products?q=&category=beauty-makeup&page=1&pageSize=60&country=GB",
    "https://www.selfridges.com/api/search?term=&category=make-up&page=1&pageSize=60",
    "https://www.selfridges.com/GB/en/api/search?category=make-up&pageSize=60",
    "https://www.selfridges.com/api/v1/products?category=make-up&page=1&ppp=60",
    "https://www.selfridges.com/api/plp/v1/products?slug=beauty/makeup&page=1",
    "https://www.selfridges.com/api/experience/v1/products?category=makeup&locale=en_GB"
  ];
  let best = 0;
  for (const url of searchUrls) {
    const { status, content } = await oxyRaw({ source: "universal", url, geo_location: "United Kingdom" });
    const isShell = content.includes("<!DOCTYPE html>");
    const isJson = (() => { try { JSON.parse(content); return true; } catch { return false; } })();
    console.log(`\n  [${status}] shell=${isShell} json=${isJson} len=${content.length}`);
    console.log(`   ${url}`);
    console.log(`   first 300: ${content.slice(0, 300).replace(/\s+/g, " ")}`);
    if (!isShell) best = Math.max(best, reportProducts("3-search", content));
    await sleep(2000);
  }
  return best;
}

async function attempt4(): Promise<number> {
  console.log("\n########## ATTEMPT 4 — parse JS bundles for API URL ##########");
  const html = await fetchWithWebUnblocker("https://www.selfridges.com/GB/en/cat/beauty/makeup/");
  // The shell references the PLP MFE chunks under /static-mfe-plp/.
  const raw = [...html.matchAll(/\/(?:static-mfe-plp\/)?_next\/static\/chunks\/[^"'\s\\]+\.js/g)].map((m) => m[0]);
  const chunkUrls = [...new Set(raw.map((c) => (c.startsWith("/static-mfe-plp") ? c : `/static-mfe-plp${c}`)))];
  console.log("  PLP chunk URLs:", chunkUrls.length);
  let best = 0;
  for (const chunkUrl of chunkUrls.slice(0, 6)) {
    const js = await fetchWithWebUnblocker(`https://www.selfridges.com${chunkUrl}`);
    const apiPatterns = js.match(/https:\/\/[^"'\s]*selfridges[^"'\s]*api[^"'\s]*/gi) || [];
    const relApi = js.match(/["'`]\/[a-z0-9/_-]*(?:api|graphql|product|listing|search)[a-z0-9/_-]*/gi) || [];
    if (apiPatterns.length || relApi.length) {
      console.log(`  chunk ${chunkUrl} (len ${js.length})`);
      if (apiPatterns.length) console.log("    abs API:", [...new Set(apiPatterns)].slice(0, 10));
      if (relApi.length) console.log("    rel API:", [...new Set(relApi.map((s) => s.slice(1)))].filter((p) => !/license|github/i.test(p)).slice(0, 10));
    } else {
      console.log(`  chunk ${chunkUrl} (len ${js.length}) — no API URLs`);
    }
    await sleep(1500);
  }
  return best;
}

(async () => {
  const r1 = await attempt1();
  const r2 = await attempt2();
  const r3 = await attempt3();
  const r4 = await attempt4();
  console.log("\n\n================ SUMMARY ================");
  console.log(`Attempt 1 (scroll render): product signals = ${r1}`);
  console.log(`Attempt 2 (_next/data):    product signals = ${r2}`);
  console.log(`Attempt 3 (search API):    product signals = ${r3}`);
  console.log(`Attempt 4 (JS bundles):    see API URLs above`);
  const winner = [["1", r1], ["2", r2], ["3", r3]].filter(([, n]) => (n as number) > 0).sort((a, b) => (b[1] as number) - (a[1] as number))[0];
  console.log(winner ? `\n>>> WINNER: Attempt ${winner[0]} returned product data (${winner[1]} signals).` : "\n>>> No attempt returned product data.");
})().catch((e) => { console.error("FATAL", e.message); process.exit(1); });
