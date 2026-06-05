/**
 * Build multi-image galleries for every product: fetch each Selfridges product
 * page via Oxylabs, extract the coherent image set (main + angle shots + swatch
 * for the richest shade), and store it in products.images. Also sets image_url
 * to the gallery's primary, which fixes any remaining missing images.
 *
 * Resumable: only processes products without a multi-image gallery yet.
 * Run:  OXYLABS_USERNAME=.. OXYLABS_PASSWORD=.. npx ts-node scripts/build-galleries.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fetch as undiciFetch } from "undici";
function load(f: string): void { let t: string; try { t = readFileSync(resolve(process.cwd(), f), "utf8"); } catch { return; } for (const raw of t.split(/\r?\n/)) { const l = raw.trim(); if (!l || l.startsWith("#")) continue; const e = l.indexOf("="); if (e < 0) continue; const k = l.slice(0, e).trim(); if (!process.env[k]) process.env[k] = l.slice(e + 1).trim().replace(/^['"]|['"]$/g, ""); } }
load(".env.local"); load(".env");
import { getSql } from "../lib/db";

function authH(): string { return "Basic " + Buffer.from(`${process.env.OXYLABS_USERNAME}:${process.env.OXYLABS_PASSWORD}`).toString("base64"); }
async function oxy(url: string): Promise<{ status: number; html: string }> {
  try {
    const res = await undiciFetch("https://realtime.oxylabs.io/v1/queries", { method: "POST", headers: { "Content-Type": "application/json", Authorization: authH() }, body: JSON.stringify({ source: "universal", url, render: "html", geo_location: "United Kingdom" }), signal: AbortSignal.timeout(150000) });
    const d = (await res.json().catch(() => ({}))) as { results?: Array<{ content?: string; status_code?: number }> };
    const r = d.results?.[0];
    return { status: r?.status_code ?? res.status, html: r?.content ?? "" };
  } catch { return { status: 0, html: "" }; }
}
function skuFromUrl(u: string): string { const m = u.split("#")[0].replace(/\/$/, "").match(/_([A-Za-z0-9][A-Za-z0-9-]*)$/); return m ? m[1] : ""; }
function rank(id: string): number {
  if (/_M$/i.test(id)) return 0;
  if (/_O$/i.test(id)) return 0.5;
  const a = id.match(/_ALT(\d+)$/i); if (a) return 1 + parseInt(a[1], 10);
  if (/_SW$/i.test(id)) return 200;
  return 100;
}
function shadeOf(id: string): string { return id.replace(/_(M|O|ALT\d+|SW|SWATCH|PACK\d*)$/i, ""); }
function extractGallery(html: string, sku: string): string[] {
  const skuIds = [...new Set([...html.matchAll(/is\/image\/selfridges\/([A-Za-z0-9_-]+)/g)].map((m) => m[1]).filter((id) => id.startsWith(sku) && /_(M|O|ALT\d+|SW)$/i.test(id)))];
  if (skuIds.length === 0) return [];
  // Group by shade; pick the group with the most images (the hero shade).
  const groups = new Map<string, string[]>();
  for (const id of skuIds) { const s = shadeOf(id); if (!groups.has(s)) groups.set(s, []); groups.get(s)!.push(id); }
  let best: string[] = [];
  for (const g of groups.values()) if (g.length > best.length) best = g;
  best.sort((a, b) => rank(a) - rank(b));
  return best.slice(0, 6).map((id) => `https://images.selfridges.com/is/image/selfridges/${id}?wid=600&hei=800&fmt=webp&qlt=85`);
}

async function mapPool<T>(items: T[], n: number, fn: (t: T, i: number) => Promise<void>): Promise<void> {
  let cur = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (cur < items.length) { const i = cur++; await fn(items[i], i); }
  }));
}

async function main(): Promise<void> {
  if (!process.env.OXYLABS_USERNAME || !process.env.OXYLABS_PASSWORD) { console.error("OXYLABS creds missing"); process.exit(1); }
  const sql = getSql();
  const rows = (await sql`
    select id, name, product_url from products
    where product_url ilike '%selfridges.com/gb/en/product%'
      and (images is null or jsonb_array_length(images) < 2)
  `) as Array<{ id: string; name: string; product_url: string }>;
  console.log(`To process: ${rows.length}`);

  let done = 0, built = 0, single = 0, failed = 0, aborted = false;
  await mapPool(rows, 10, async (r) => {
    if (aborted) return;
    const sku = skuFromUrl(r.product_url);
    if (!sku) { failed++; return; }
    const { status, html } = await oxy(r.product_url);
    if (status === 401) { aborted = true; console.error("401 UNAUTHORIZED — stopping"); return; }
    const gallery = extractGallery(html, sku);
    if (gallery.length >= 2) {
      await sql`update products set image_url = ${gallery[0]}, images = ${JSON.stringify(gallery)}::jsonb where id = ${r.id}`;
      built++;
    } else if (gallery.length === 1) {
      await sql`update products set image_url = ${gallery[0]}, images = ${JSON.stringify(gallery)}::jsonb where id = ${r.id}`;
      single++;
    } else {
      failed++;
    }
    if (++done % 100 === 0) console.log(`  ${done}/${rows.length}  galleries=${built} single=${single} failed=${failed}`);
  });
  console.log(`\nDONE — galleries(>=2): ${built}, single: ${single}, failed: ${failed}, processed: ${done}${aborted ? " (ABORTED on 401)" : ""}`);
}
main().catch((e) => { console.error("build-galleries failed:", e.message); process.exit(1); });
