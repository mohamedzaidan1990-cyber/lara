/**
 * Free salvage of missing product images: for brands with an open Shopify store,
 * fetch their /products.json and match missing-image products by name, then
 * store the brand-site image (served via our image-proxy). Conservative matching
 * — leaves the placeholder rather than risk a wrong image.
 *
 * Run:  npx ts-node scripts/match-brand-images.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fetch as undiciFetch } from "undici";
function load(f: string): void { let t: string; try { t = readFileSync(resolve(process.cwd(), f), "utf8"); } catch { return; } for (const raw of t.split(/\r?\n/)) { const l = raw.trim(); if (!l || l.startsWith("#")) continue; const e = l.indexOf("="); if (e < 0) continue; const k = l.slice(0, e).trim(); if (!process.env[k]) process.env[k] = l.slice(e + 1).trim().replace(/^['"]|['"]$/g, ""); } }
load(".env.local");
import { getSql } from "../lib/db";

// Lowercased brand -> candidate Shopify domains (first that returns valid JSON wins).
const BRAND_DOMAINS: Record<string, string[]> = {
  "refy": ["refy.beauty"],
  "huda beauty": ["hudabeauty.com"],
  "morphe": ["morphe.com", "www.morphe.com"],
  "victoria beckham beauty": ["victoriabeckhambeauty.com"],
  "westman atelier": ["www.westman-atelier.com", "westman-atelier.com"],
  "rodial": ["rodial.co.uk", "rodial.com"],
  "by terry": ["www.byterry.com", "byterry.com"],
  "trish mcevoy": ["trishmcevoy.com"],
  "slip": ["www.slip.com", "slip.com"],
  "supergoop!": ["supergoop.com"],
  "supergoop": ["supergoop.com"],
  "paula's choice": ["www.paulaschoice.com"],
  "paula'choice": ["www.paulaschoice.com"],
  "sculpted by aimee": ["sculptedbyaimee.com"],
  "fara homidi": ["farahomidi.com"],
  "isamaya beauty": ["isamaya.com"],
  "pixi": ["pixibeauty.com", "pixibeauty.co.uk"],
  "uklash": ["uklash.com", "www.uklash.com"],
  "ruka": ["ruka.co"],
  "brunae body": ["brunaebody.com"],
  "rare beauty": ["www.rarebeauty.com"],
  "fenty beauty": ["fentybeauty.com"],
  "k18": ["www.k18hair.com"],
  "gisou": ["gisou.com"],
  "sol de janeiro": ["soldejaneiro.com"],
  "the ordinary": ["theordinary.com"],
  "olaplex": ["olaplex.com"]
};

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

interface ShopifyEntry { title: string; tokens: Set<string>; image: string }

function norm(s: string): string {
  return (s || "").toLowerCase()
    .replace(/\b\d+(\.\d+)?\s?(ml|g|gm|oz|fl|pcs|pc|pack|kg|cm|mm|x)\b/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ").trim();
}
const STOP = new Set(["the", "and", "for", "with", "set", "kit", "mini", "new", "edition", "limited"]);
function toks(s: string): string[] { return norm(s).split(" ").filter((w) => w.length >= 3 && !STOP.has(w)); }

async function fetchShopify(domain: string): Promise<ShopifyEntry[]> {
  const out: ShopifyEntry[] = [];
  for (const page of [1, 2]) {
    try {
      const r = await undiciFetch(`https://${domain}/products.json?limit=250&page=${page}`, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(20000) });
      if (!r.ok) break;
      const data = (await r.json()) as { products?: Array<{ title?: string; images?: Array<{ src?: string }> }> };
      const prods = data.products ?? [];
      if (prods.length === 0) break;
      for (const p of prods) {
        const title = (p.title ?? "").trim();
        const image = p.images?.[0]?.src ?? "";
        if (title && image) out.push({ title, tokens: new Set(toks(title)), image });
      }
      if (prods.length < 250) break;
    } catch { break; }
  }
  return out;
}

function bestMatch(name: string, entries: ShopifyEntry[]): ShopifyEntry | null {
  const pt = toks(name);
  if (pt.length < 2) return null;
  const ptSet = new Set(pt);
  let best: ShopifyEntry | null = null;
  let bestScore = 0;
  for (const e of entries) {
    let shared = 0;
    for (const t of ptSet) if (e.tokens.has(t)) shared += 1;
    const overlap = shared / ptSet.size;
    if (overlap > bestScore) { bestScore = overlap; best = e; }
  }
  // Conservative: need >=70% of the product's significant tokens AND >=2 shared.
  if (best && bestScore >= 0.7) {
    let shared = 0;
    for (const t of ptSet) if (best.tokens.has(t)) shared += 1;
    if (shared >= 2) return best;
  }
  return null;
}

async function main(): Promise<void> {
  const sql = getSql();
  const missing = (await sql`select id, brand, name from products where (image_url is null or image_url = '') and product_url ilike '%selfridges.com%'`) as Array<{ id: string; brand: string; name: string }>;

  // Group by lowercased brand, only for brands we have a domain for.
  const byBrand = new Map<string, Array<{ id: string; name: string }>>();
  for (const m of missing) {
    const key = m.brand.toLowerCase();
    if (!BRAND_DOMAINS[key]) continue;
    if (!byBrand.has(key)) byBrand.set(key, []);
    byBrand.get(key)!.push({ id: m.id, name: m.name });
  }
  console.log(`Missing total: ${missing.length}. Matchable brands present: ${byBrand.size}`);

  let fixed = 0;
  for (const [brand, items] of byBrand) {
    let entries: ShopifyEntry[] = [];
    let usedDomain = "";
    for (const d of BRAND_DOMAINS[brand]) {
      entries = await fetchShopify(d);
      if (entries.length > 0) { usedDomain = d; break; }
    }
    if (entries.length === 0) { console.log(`  ${brand}: no open store (${items.length} skipped)`); continue; }
    let brandFixed = 0;
    for (const it of items) {
      const m = bestMatch(it.name, entries);
      if (m) {
        await sql`update products set image_url = ${m.image}, images = ${JSON.stringify([m.image])}::jsonb where id = ${it.id}`;
        brandFixed += 1; fixed += 1;
      }
    }
    console.log(`  ${brand} (${usedDomain}, ${entries.length} catalog): matched ${brandFixed}/${items.length}`);
  }
  console.log(`\nDONE — recovered ${fixed} images for free.`);
}
main().catch((e) => { console.error("match-brand-images failed:", e.message); process.exit(1); });
