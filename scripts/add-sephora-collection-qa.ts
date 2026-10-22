/**
 * Import the whole Sephora Collection range from Sephora ME (Qatar) —
 * sephora.me/qa-en/brands/sephora-collection/SEPHO — with every shade.
 *
 * Data comes straight from the site's own tRPC API (products.getProducts for
 * the brand listing, products.getProductById for each product's variants,
 * description, images and category breadcrumbs). Unlike the HTML pages, the
 * API isn't behind the bot wall, so this script can be re-run to pick up new
 * products / prices.
 *
 * Pricing (per user instruction): price_usd = round(QAR / 3.645 + 8, 2) for
 * single items, + 13 instead of + 8 for sets/kits. price_gbp = usd / 1.35.
 * price_locked = true.
 *
 * Variants: when all variants share one price they become shades
 * (product_variants) — but only if the mapped subcategory shows a shade
 * picker (isShadeRelevant); otherwise each variant becomes its own product.
 * Variants at different prices (sizes, refills) are split into one product
 * per price, as with the Summer Fridays import.
 *
 * Images are Sephora ME CDN URLs loaded directly by the browser (the CDN
 * allows hotlinking but refuses Vercel's servers, so they can't go through
 * /api/image-proxy), not self-hosted — ~2,500 images would bloat the repo.
 *
 * Products already in the catalogue (matched by Sephora product id in
 * product_url, or by name) are skipped, so existing prices and listings are
 * left exactly as they are.
 *
 * Run:  npx tsx scripts/add-sephora-collection-qa.ts --dry-run   (prints the plan)
 *       npx tsx scripts/add-sephora-collection-qa.ts             (writes)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function loadDotenv(file: string): void {
  let text: string;
  try {
    text = readFileSync(resolve(process.cwd(), file), "utf8");
  } catch {
    return;
  }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}
loadDotenv(".env.local");
loadDotenv(".env");

import { getSql } from "../lib/db";
import { isShadeRelevant } from "../lib/shade-options";

const DRY_RUN = process.argv.includes("--dry-run");
const BRAND = "Sephora Collection";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const HEADERS = { "User-Agent": UA, Accept: "*/*", Referer: "https://www.sephora.me/qa-en/brands/sephora-collection/SEPHO" };
const PDP = "https://www.sephora.me/qa-en/p/";

const round2 = (n: number) => Math.round(n * 100) / 100;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const normName = (s: string) => s.toLowerCase().split(" — ")[0].replace(/[^a-z0-9]+/g, "");

// Already in the catalogue under a different name / source (incl. the
// mix-and-match promo items) — skipped so they aren't listed twice.
const ALREADY_LISTED = /^(all that matte\(r\)s palette|palette blush blush blush|sephora x talia fawaz|sephora x waad shaat)/i;

interface Img { disBaseLink?: string; link?: string }
interface Variant { product_id: string; c_variation_attribute_name: string; c_price: number; swatchImage?: string; images?: Img[] }
interface Detail {
  id: string;
  name: string;
  c_productSlug?: string;
  c_price: number;
  longDescription?: string;
  images?: Img[];
  c_variantsInfo?: Variant[];
  c_breadcrumbs?: Array<{ name: string }>;
}
interface Hit { productId: string; productName: string; c_isInStock?: boolean }

function api(proc: string, input: unknown, meta?: unknown): string {
  return `https://www.sephora.me/api/trpc/products.${proc}?batch=1&input=${encodeURIComponent(JSON.stringify({ 0: meta ? { json: input, meta } : { json: input } }))}`;
}

async function get<T>(url: string): Promise<T> {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(url, { headers: HEADERS });
    if (r.ok) return ((await r.json()) as Array<{ result: { data: { json: T } } }>)[0].result.data.json;
    await sleep(5000 * (i + 1));
  }
  throw new Error(`Sephora API failed: ${url}`);
}

// Sephora ME CDN image at a given width (served via our image proxy).
function img(i: Img | undefined, width = 1000): string | null {
  const u = i?.disBaseLink || i?.link;
  if (!u) return null;
  const path = u.split("?")[0].replace(/^https:\/\/bkwk-prd\.my\.commercecloud\.salesforce\.com\//, "https://img-product.sephora.me/dw/image/v2/BKWK_PRD/");
  return `${path}?sw=${width}&sm=fit&q=85`;
}
// Tidy Sephora shade labels: "10. Wild - Glitter Finish (5ml)" → "10 Wild - Glitter Finish",
// "GLOSSED-24 140 STUNNING" → "140 Stunning", "06Y Light (7.5g)" → "06Y Light".
function cleanShade(raw: string): string {
  return raw
    .trim()
    .replace(/\s*\((?:\d+(?:[.,]\d+)?\s*(?:ml|g|gr|oz|pc|pcs)\b[^)]*)\)\s*$/i, "")
    .replace(/\s+-\s+\d+(?:[.,]\d+)?\s*(?:ml|g)\s*$/i, "")
    .replace(/^[A-Z]+-\d+\s+/, "")
    .replace(/^(\d+)\.\s+/, "$1 ")
    .replace(/\b([A-Z]{3,})\b/g, (w) => w.charAt(0) + w.slice(1).toLowerCase())
    .replace(/\s+/g, " ")
    .trim();
}
const swatch = (u: string | undefined) => (u ? `${u.split("?")[0]}?sw=96&sm=fit&q=90` : null);

function describe(html: string | undefined): string {
  const t = (html ?? "")
    .replace(/<br\s*\/?>/gi, " ").replace(/<\/p>/gi, " ").replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&reg;/g, "®").replace(/&trade;/g, "™").replace(/&mdash;/g, "—").replace(/&ndash;/g, "–")
    .replace(/&nbsp;/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
  if (t.length <= 700) return t;
  const cut = t.slice(0, 700);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "));
  return end > 300 ? cut.slice(0, end + 1) : cut.replace(/\s+\S*$/, "") + "…";
}

// Sephora breadcrumbs (e.g. Makeup > Face > Blush) → our category/subcategory.
function mapCategory(bc: string[], name: string): [string, string] {
  const [top, mid = "", leaf = ""] = bc;
  const n = name.toLowerCase();
  if (top === "Makeup") {
    if (mid === "Brows") return ["Makeup", "Brows"];
    if (mid === "Brushes & sponges") {
      if (leaf === "Sponges & Applicators") return ["Beauty tools", "Sponges"];
      if (leaf === "Brush Cleaners") return ["Beauty tools", "Cleansers"];
      return ["Beauty tools", "Brushes & Applicators"];
    }
    if (mid === "Eyes") {
      if (leaf === "Mascara") return ["Makeup", "Mascara"];
      if (leaf === "Eyeliners" || leaf === "Eye pencils & khol") return ["Makeup", "Eyeliner"];
      if (leaf === "Lashes") return ["Makeup", "Other"];
      return ["Makeup", "Eyeshadow"]; // Eyeshadow, Eye Palette, Base
    }
    if (mid === "Face") {
      const m: Record<string, string> = {
        Blush: "Blush", Bronzer: "Bronzer & Contour", Contour: "Bronzer & Contour", "Concealers & Correctors": "Concealer",
        "Face Palette": "Palettes", Foundation: "Foundation", Highlighters: "Highlighter", "Mattifying Powder": "Powder", Powder: "Powder"
      };
      if (leaf === "Primer & Setting Spray") return ["Makeup", /spray|mist|setting/.test(n) && !/primer/.test(n) ? "Setting Spray" : "Primer"];
      return ["Makeup", m[leaf] ?? "Other"];
    }
    if (mid === "Lips") {
      if (leaf === "Gloss" || leaf === "Lip oil") return ["Makeup", "Lip Gloss & Oil"];
      if (leaf === "Lip Liner") return ["Makeup", "Lip Liner"];
      if (leaf === "Lip Balm" || leaf === "Lip Primer & Plumper") return ["Makeup", "Lip Care"];
      return ["Makeup", "Lipstick"];
    }
    if (mid === "Makeup Accessories") {
      if (leaf === "Lashes") return ["Makeup", "Other"];
      if (leaf === "Manucure kit") return ["Makeup", "Nails"];
      return ["Beauty tools", "Accessories"];
    }
    if (mid === "Makeup Remover") return ["Skincare", "Cleanser"];
    if (mid === "Makeup Sets") return ["Makeup", "Sets"];
    if (mid === "Nails") return ["Makeup", "Nails"];
    return ["Makeup", "Other"];
  }
  if (top === "Skincare") {
    if (mid === "Cleansers & Makeup Removers") return ["Skincare", leaf === "Toners" ? "Toner & Essence" : "Cleanser"];
    if (mid === "Face Accessories") return ["Beauty tools", leaf === "Tweezers" || leaf === "Other face accessorizes" ? "Accessories" : "Skin Devices"];
    if (mid === "Masks") return ["Skincare", "Masks"];
    if (mid === "Moisturizers") {
      const m: Record<string, string> = {
        "Day Cream": "Moisturiser", "Night Cream": "Moisturiser", "Eye Cream": "Eye Care", "Face Scrub & Peeling": "Exfoliator & Peel",
        "Face oil": "Face Oil", "Lip Care": "Lip Care", "Serum & Face Oils": "Serum"
      };
      return ["Skincare", m[leaf] ?? "Other"];
    }
    if (mid === "Set") return ["Skincare", "Sets"];
    if (mid === "Sun Care") return ["Skincare", "SPF & Sun Care"];
    if (/serum/.test(n)) return ["Skincare", "Serum"];
    if (/cream|moistur/.test(n)) return ["Skincare", "Moisturiser"];
    return ["Skincare", "Other"];
  }
  if (top === "Bath & Body") return mid === "Body Accessories" ? ["Beauty tools", "Accessories"] : ["Skincare", "Body & Hand"];
  if (top === "Fragrance") return ["Fragrance", mid === "Gift Sets" ? "Gift Sets" : /mist/.test(n) ? "Hair & Body Mist" : "Other"];
  if (top === "Hair") {
    if (mid === "Tools & Accessories") return ["Beauty tools", "Hair Tools"];
    const m: Record<string, string> = { Shampoo: "Shampoo", Conditioner: "Conditioner", "Serum & Oil": "Hair Oil" };
    if (mid === "Sets") return ["Haircare", "Other"];
    return ["Haircare", m[leaf] ?? "Treatments & Masks"];
  }
  return ["Makeup", "Other"];
}

// Single products whose names happen to contain "set"/"duo".
const NOT_SETS = /shape & set brow|duo cheek brush|gleam & blush duo/i;

function isSet(bc: string[], name: string): boolean {
  if (NOT_SETS.test(name)) return false;
  return bc.some((b) => /\bsets?\b|\bkit\b/i.test(b)) || /\b(set|kit|duo|trio|calendar|vault)\b/i.test(name);
}

interface Planned {
  pid: string;
  name: string;
  category: string;
  subcategory: string;
  qar: number;
  set: boolean;
  productUrl: string;
  image: string;
  images: string[];
  description: string;
  shades: Array<{ name: string; image: string; swatch: string }>;
  // First variant's label (e.g. a design or edition) — used to tell apart
  // different Sephora products that share a name.
  label: string;
}

function plan(d: Detail): Planned[] {
  const bc = (d.c_breadcrumbs ?? []).map((b) => b.name);
  const [category, subcategory] = mapCategory(bc, d.name);
  const set = isSet(bc, d.name);
  const description = describe(d.longDescription);
  const gallery = (d.images ?? []).map((i) => img(i)).filter((x): x is string => Boolean(x)).slice(0, 6);
  const variants = d.c_variantsInfo ?? [];
  // c_productSlug is already "<handle>/<Pid>".
  const slugPath = (d.c_productSlug ?? "").replace(/^\/+/, "");
  const base = `${PDP}${slugPath.includes(d.id) ? slugPath : `${slugPath || "p"}/${d.id}`}`;
  const one = (name: string, v: Variant[], qar: number, suffix = false): Planned => {
    const first = img(v[0]?.images?.[0]) ?? gallery[0];
    return {
      pid: d.id,
      name,
      category,
      subcategory,
      qar,
      set,
      productUrl: suffix && v[0] ? `${base}?productVariantId=${v[0].product_id}` : base,
      image: first ?? "",
      images: suffix ? [first, ...gallery.slice(1)].filter((x): x is string => Boolean(x)) : gallery,
      description,
      shades: [],
      label: (v[0]?.c_variation_attribute_name ?? "").trim()
    };
  };

  if (variants.length <= 1) return [one(d.name, variants, variants[0]?.c_price ?? d.c_price)];

  const byPrice = new Map<number, Variant[]>();
  for (const v of variants) byPrice.set(v.c_price, [...(byPrice.get(v.c_price) ?? []), v]);
  const shadePicker = isShadeRelevant(subcategory, d.name);
  const out: Planned[] = [];
  const multiPrice = byPrice.size > 1;
  for (const [qar, group] of byPrice) {
    if (group.length > 1 && shadePicker) {
      const p = one(multiPrice ? `${d.name} ${group[0].c_variation_attribute_name}` : d.name, group, qar, multiPrice);
      if (!multiPrice) p.image = img(group[0].images?.[0]) ?? p.image;
      p.shades = group
        .filter((v, i) => group.findIndex((w) => cleanShade(w.c_variation_attribute_name) === cleanShade(v.c_variation_attribute_name)) === i)
        .map((v) => {
        const shot = img(v.images?.[0]) ?? p.image;
        return { name: cleanShade(v.c_variation_attribute_name), image: shot, swatch: swatch(v.swatchImage) ?? shot };
      });
      out.push(p);
    } else {
      // One product per variant: sizes at different prices, or colours/scents
      // on a product type with no shade picker.
      for (const v of group) out.push(one(`${d.name} ${v.c_variation_attribute_name.trim()}`, [v], qar, true));
    }
  }
  return out;
}

async function main(): Promise<void> {
  const hits: Hit[] = [];
  for (let off = 0; ; off += 36) {
    const d = await get<{ hits: Hit[]; total: number }>(
      api("getProducts", { refine: ["c_brand=SEPHO"], locale: "en-QA", category: "SEPHO", targetCategoryId: null, offset: off, q: null, isBrandPage: true }, {
        values: { targetCategoryId: ["undefined"], q: ["undefined"] },
        v: 1
      })
    );
    hits.push(...d.hits);
    if (off + 36 >= d.total) break;
    await sleep(500);
  }
  console.log(`Sephora ME lists ${hits.length} ${BRAND} products`);

  const sql = getSql();
  const existing = (await sql`select id, name, product_url from products where brand ilike 'sephora%'`) as Array<{ id: string; name: string; product_url: string | null }>;
  const existingPids = new Set(existing.map((e) => /\/(P\d+)/.exec(e.product_url ?? "")?.[1]).filter(Boolean));
  const existingNames = new Set(existing.map((e) => normName(e.name)));

  const planned: Planned[] = [];
  const skipped: string[] = [];
  for (const h of hits) {
    if (existingPids.has(h.productId) || existingNames.has(normName(h.productName)) || ALREADY_LISTED.test(h.productName)) {
      skipped.push(h.productName);
      continue;
    }
    const d = await get<Detail>(api("getProductById", { locale: "en-QA", productId: h.productId }));
    planned.push(...plan(d));
    await sleep(400);
  }

  // Different Sephora products sharing a name: suffix each with its variant
  // label, or its QAR price when the labels don't differ.
  const byName = new Map<string, Planned[]>();
  for (const p of planned) byName.set(p.name, [...(byName.get(p.name) ?? []), p]);
  for (const [name, group] of byName) {
    if (group.length < 2) continue;
    // Same name, same price, both with shades (e.g. Glossed Lip Gloss's two
    // shade ranges): one product on our side with every shade.
    if (group.every((p) => p.shades.length && p.qar === group[0].qar)) {
      const [keep, ...rest] = group;
      for (const p of rest) {
        for (const s of p.shades) if (!keep.shades.some((k) => k.name.toLowerCase().replace(/ - .*$/, "") === s.name.toLowerCase().replace(/ - .*$/, ""))) keep.shades.push(s);
        planned.splice(planned.indexOf(p), 1);
      }
      byName.set(name, [keep]);
      continue;
    }
    const labelsDiffer = new Set(group.map((p) => p.label)).size === group.length && group.every((p) => p.label);
    for (const p of group) p.name = `${p.name} – ${labelsDiffer && p.shades.length === 0 ? p.label : `QAR ${p.qar} edition`}`;
  }

  const shadeCount = planned.reduce((s, p) => s + p.shades.length, 0);
  console.log(`Planned: ${planned.length} products (${planned.filter((p) => p.set).length} sets), ${shadeCount} shades; skipped ${skipped.length} already in catalogue`);
  for (const s of skipped) console.log(`  skip  ${s}`);
  if (DRY_RUN) {
    writeFileSync(resolve(process.cwd(), "sephora-collection-plan.json"), JSON.stringify(planned, null, 1));
    for (const p of planned) {
      const usd = round2(p.qar / 3.645 + (p.set ? 13 : 8));
      console.log(`  ${p.category} / ${p.subcategory} | ${p.name} | QAR ${p.qar} → $${usd}${p.set ? " (set)" : ""}${p.shades.length ? ` | ${p.shades.length} shades` : ""}`);
    }
    console.log("\nDry run — nothing written (plan saved to sephora-collection-plan.json).");
    return;
  }

  let n = 0;
  for (const p of planned) {
    const priceUsd = round2(p.qar / 3.645 + (p.set ? 13 : 8));
    const priceGbp = round2(priceUsd / 1.35);
    const rows = (await sql`
      insert into products (brand, name, category, subcategory, description, price_gbp, price_usd,
                            product_url, image_url, images, price_locked, deliverable_lebanon)
      values (${BRAND}, ${p.name}, ${p.category}, ${p.subcategory}, ${p.description}, ${priceGbp}, ${priceUsd},
              ${p.productUrl}, ${p.image}, ${JSON.stringify(p.images)}::jsonb, true, true)
      on conflict (product_url) do update set
        name = excluded.name, category = excluded.category, subcategory = excluded.subcategory,
        description = excluded.description, price_gbp = excluded.price_gbp, price_usd = excluded.price_usd,
        image_url = excluded.image_url, images = excluded.images, price_locked = true
      returning id
    `) as Array<{ id: string }>;
    const id = rows[0].id;
    for (let i = 0; i < p.shades.length; i++) {
      const s = p.shades[i];
      await sql`
        insert into product_variants (product_id, shade_name, shade_image_url, swatch_url, sort_order)
        values (${id}, ${s.name}, ${s.image}, ${s.swatch}, ${(i + 1) * 10})
        on conflict (product_id, shade_name) do update set
          shade_image_url = excluded.shade_image_url, swatch_url = excluded.swatch_url, sort_order = excluded.sort_order
      `;
    }
    if (p.shades.length) await sql`update products set variants_checked_at = now() where id = ${id}`;
    if (++n % 50 === 0) console.log(`  ${n}/${planned.length} written`);
  }
  console.log(`Done: ${n} products written.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
