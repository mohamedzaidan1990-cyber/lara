/**
 * Repair Selfridges product images. The scraper guesses <SKU>_M, which is wrong
 * for shade-based products (their image is <SKU>_<shade>_M). This script:
 *   1. Validates every product image via the PROD image-proxy (free — Vercel IP
 *      is allowed by Scene7; our datacenter/local IP is not).
 *   2. For each broken image, fetches the product's PDP og:image via Oxylabs and
 *      updates image_url + images (one Oxylabs call per broken image).
 *
 * Set VALIDATE_ONLY=1 to only report the count without spending Oxylabs credits.
 * Run:  npx ts-node scripts/fix-selfridges-images.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fetch as undiciFetch } from "undici";
function load(f: string): void { let t: string; try { t = readFileSync(resolve(process.cwd(), f), "utf8"); } catch { return; } for (const raw of t.split(/\r?\n/)) { const l = raw.trim(); if (!l || l.startsWith("#")) continue; const e = l.indexOf("="); if (e < 0) continue; const k = l.slice(0, e).trim(); if (!process.env[k]) process.env[k] = l.slice(e + 1).trim().replace(/^['"]|['"]$/g, ""); } }
load(".env.local"); load(".env");
import { getSql } from "../lib/db";

const PROXY = "https://seasonsbyb.co.uk/api/image-proxy?url=";
async function imageOk(imgUrl: string): Promise<boolean> {
  try {
    const r = await undiciFetch(PROXY + encodeURIComponent(imgUrl), { signal: AbortSignal.timeout(15000) });
    if (r.status !== 200) { await r.body?.cancel?.().catch(() => {}); return false; }
    const ct = (r.headers.get("content-type") || "").split(";")[0];
    const b = Buffer.from(await r.arrayBuffer());
    return ct.startsWith("image") && b.length > 600;
  } catch { return false; }
}

function authH(): string { return "Basic " + Buffer.from(`${process.env.OXYLABS_USERNAME}:${process.env.OXYLABS_PASSWORD}`).toString("base64"); }
async function pdpOgImage(pdpUrl: string): Promise<string> {
  try {
    const res = await undiciFetch("https://realtime.oxylabs.io/v1/queries", { method: "POST", headers: { "Content-Type": "application/json", Authorization: authH() }, body: JSON.stringify({ source: "universal", url: pdpUrl, render: "html", geo_location: "United Kingdom" }), signal: AbortSignal.timeout(120000) });
    const d = (await res.json()) as { results?: Array<{ content?: string }> };
    const html = d.results?.[0]?.content ?? "";
    let og = (html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/) || [])[1] || "";
    if (!og) return "";
    og = og.split("?")[0];
    if (!/images\.selfridges\.com/.test(og)) return "";
    return `${og}?wid=363&hei=485&fmt=webp&qlt=80`;
  } catch { return ""; }
}

async function mapPool<T, R>(items: T[], n: number, fn: (t: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cur = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (cur < items.length) { const i = cur++; out[i] = await fn(items[i], i); }
  }));
  return out;
}

async function main(): Promise<void> {
  const sql = getSql();
  const rows = (await sql`select id, product_url, image_url from products where product_url ilike '%selfridges.com%' and image_url ilike '%images.selfridges.com%'`) as Array<{ id: string; product_url: string; image_url: string }>;
  console.log(`Validating ${rows.length} Selfridges images via prod proxy…`);
  const ok = await mapPool(rows, 12, (r) => imageOk(r.image_url));
  const broken = rows.filter((_, i) => !ok[i]);
  console.log(`Working: ${rows.length - broken.length}  | broken: ${broken.length} (${Math.round((broken.length / rows.length) * 100)}%)`);

  if (process.env.VALIDATE_ONLY === "1") { console.log("VALIDATE_ONLY=1 — stopping before backfill."); return; }
  if (broken.length === 0) return;

  console.log(`\nBackfilling ${broken.length} via PDP og:image (Oxylabs)…`);
  let fixed = 0, nulled = 0, done = 0;
  await mapPool(broken, 4, async (r) => {
    const og = await pdpOgImage(r.product_url);
    if (og) {
      await sql`update products set image_url = ${og}, images = ${JSON.stringify([og])}::jsonb where id = ${r.id}`;
      fixed++;
    } else {
      await sql`update products set image_url = null, images = null where id = ${r.id}`;
      nulled++;
    }
    if (++done % 20 === 0) console.log(`  …${done}/${broken.length} (fixed ${fixed}, nulled ${nulled})`);
  });
  console.log(`\nDone. Fixed ${fixed}, nulled ${nulled} (no usable PDP image).`);
}
main().catch((e) => { console.error("fix-selfridges-images failed:", e.message); process.exit(1); });
