/**
 * Printable shopping list of every item still to be bought — same scope as
 * awaiting-order-pdf.ts (unsourced lines on open orders; pending, delivered,
 * cancelled and refunded orders excluded) — but with the product photo next
 * to each item, a tick box, and the customers it's for. No prices.
 * Identical lines are combined. Grouped by brand.
 *
 * Writes ~/Downloads/awaiting-order-shopping-list-<date>.pdf (+ .html).
 *
 * Run:  npx tsx scripts/awaiting-order-shopping-list.ts
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { homedir } from "node:os";

function loadDotenv(file: string): void {
  let text: string;
  try { text = readFileSync(resolve(process.cwd(), file), "utf8"); } catch { return; }
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
import { chromium } from "playwright";
import { getSql } from "../lib/db";

type Row = { brand: string; name: string; qty: number; img: string | null; alts: unknown[] | null; customer: string | null; order_number: string };
type Item = { brand: string; product: string; shade: string; qty: number; img: string | null; alts: unknown[]; who: string[] };

const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

const MIME: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", avif: "image/avif" };

async function toDataUri(src: string | null): Promise<string | null> {
  if (!src) return null;
  try {
    let url = src;
    if (url.startsWith("/api/image-proxy")) {
      const u = new URL(url, "http://x").searchParams.get("url");
      if (!u) return null;
      url = u;
    }
    if (url.startsWith("/")) {
      const file = join(process.cwd(), "public", decodeURIComponent(url.split("?")[0]));
      if (!existsSync(file)) return null;
      const ext = file.split(".").pop()!.toLowerCase();
      return `data:${MIME[ext] ?? "image/jpeg"};base64,${readFileSync(file).toString("base64")}`;
    }
    let res: Response | null = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36", Accept: "image/avif,image/webp,image/*,*/*" }, signal: AbortSignal.timeout(20000) });
        if (res.ok) break;
      } catch { res = null; }
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
    if (!res || !res.ok) return null;
    const type = (res.headers.get("content-type") ?? "image/jpeg").split(";")[0];
    if (!type.startsWith("image/")) return null;
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const sql = getSql();
  const rows = (await sql`
    select oi.product_brand brand, oi.product_name name, oi.quantity qty,
           coalesce(nullif(oi.image_url, ''), p.image_url) img,
           p.alts, c.full_name customer, o.order_number
    from order_items oi
    join orders o on o.id = oi.order_id
    left join customers c on c.id = o.customer_id
    left join lateral (
      select p.image_url,
             coalesce(p.images, '[]'::jsonb) ||
             coalesce((select jsonb_agg(jsonb_build_object('s', v.shade_name, 'i', v.shade_image_url))
                       from product_variants v where v.product_id = p.id and v.shade_image_url is not null), '[]'::jsonb) alts
      from products p
      where p.product_url = oi.product_url
         or (p.brand = oi.product_brand and oi.product_name ilike p.name || '%')
      order by (p.product_url = oi.product_url) desc nulls last
      limit 1
    ) p on true
    where o.status not in ('pending', 'delivered', 'cancelled', 'refunded')
      and coalesce(oi.sourced, false) = false
    order by o.created_at
  `) as Row[];

  const agg = new Map<string, Item>();
  for (const r of rows) {
    let name = r.name.replace(/\s*—\s*Discounted price.*$/i, "").replace(/\s{2,}/g, " ").trim();
    let shade = "";
    const m = name.match(/^(.*?)\s+—\s+(?:Shade:\s*|Colour:\s*|Color:\s*)?(.+)$/);
    if (m) { name = m[1]; shade = m[2]; }
    const qty = Number(r.qty) || 1;
    const who = `${(r.customer ?? "?").trim()} (${r.order_number})`;
    const key = `${r.brand}|${name}|${shade}`.toLowerCase();
    const cur = agg.get(key);
    if (cur) { cur.qty += qty; cur.who.push(who); cur.img ??= r.img; if (!cur.alts.length) cur.alts = r.alts ?? []; }
    else agg.set(key, { brand: r.brand, product: name, shade, qty, img: r.img, alts: r.alts ?? [], who: [who] });
  }
  const list = [...agg.values()].sort((a, b) => a.brand.localeCompare(b.brand) || a.product.localeCompare(b.product) || a.shade.localeCompare(b.shade));
  const units = list.reduce((s, x) => s + x.qty, 0);

  // Try the line's own image, then the catalog shade photo matching this
  // shade, then any other catalog photo of the product (flagged "other shade").
  const norm = (t: string): string => t.toLowerCase().replace(/[^a-z0-9]/g, "");
  async function pickImage(x: Item): Promise<{ uri: string | null; other: boolean }> {
    const variants = x.alts.filter((a): a is { s: string; i: string } => typeof a === "object" && a !== null && "i" in a);
    const plain = x.alts.filter((a): a is string => typeof a === "string");
    const want = norm(x.shade);
    const same = want ? variants.filter((v) => norm(v.s) === want || norm(v.s).includes(want) || want.includes(norm(v.s))) : [];
    // Selfridges shade photos follow <id>_<SHADE>_M — derive one from the base image.
    const sm = x.img?.match(/^(https:\/\/images\.selfridges\.com\/is\/image\/selfridges\/[^_?]+)_M\?(.*)$/);
    const derived = sm && x.shade ? `${sm[1]}_${x.shade.toUpperCase().replace(/[^A-Z0-9.]/g, "")}_M?${sm[2]}` : null;
    const exact: string[] = [x.img, ...same.map((v) => v.i), derived, ...(x.shade ? [] : plain)].filter((u): u is string => !!u);
    for (const u of [...new Set(exact)]) { const d = await toDataUri(u); if (d) return { uri: d, other: false }; }
    const rest = [...plain, ...variants.map((v) => v.i)].filter((u) => !exact.includes(u));
    for (const u of [...new Set(rest)]) { const d = await toDataUri(u); if (d) return { uri: d, other: !!x.shade }; }
    return { uri: null, other: false };
  }
  const picked: Array<{ uri: string | null; other: boolean }> = [];
  for (let i = 0; i < list.length; i += 4) {
    picked.push(...(await Promise.all(list.slice(i, i + 4).map(pickImage))));
  }
  const imgs = picked.map((p) => p.uri);
  const missing = list.filter((_, i) => !imgs[i]);

  const dateStr = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  let n = 0;
  let body = "";
  let lastBrand = "";
  list.forEach((x, i) => {
    if (x.brand !== lastBrand) {
      body += `<h2>${esc(x.brand)}</h2>`;
      lastBrand = x.brand;
    }
    n++;
    body += `
      <div class="item">
        <div class="box"></div>
        <div class="img">${imgs[i] ? `<img src="${imgs[i]}">` : `<span>no photo</span>`}</div>
        <div class="txt">
          <div class="name"><span class="num">${n}.</span> ${esc(x.product)}</div>
          ${x.shade ? `<div class="shade">${esc(x.shade)}${picked[i].other ? ` <span class="oth">(photo: other shade)</span>` : ""}</div>` : ""}
          <div class="who">For: ${esc(x.who.join(", "))}</div>
        </div>
        <div class="qty">×${x.qty}</div>
      </div>`;
  });

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Shopping list — ${esc(dateStr)}</title>
<style>
  @page { size: A4; margin: 12mm 11mm; }
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Arial, sans-serif; color: #2e1a28; margin: 0; }
  header { border-bottom: 3px solid #e040a0; padding-bottom: 6px; margin-bottom: 4px; }
  h1 { font-size: 20px; margin: 0; }
  .meta { font-size: 11px; color: #604868; margin-top: 3px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .08em; color: #fff; background: #e040a0;
       padding: 4px 8px; margin: 12px 0 4px; break-after: avoid; }
  .item { display: flex; align-items: center; gap: 10px; padding: 6px 4px; border-bottom: 1px solid #f0d6e6; break-inside: avoid; }
  .box { width: 16px; height: 16px; border: 2px solid #2e1a28; border-radius: 3px; flex: none; }
  .img { width: 64px; height: 64px; flex: none; display: flex; align-items: center; justify-content: center; background: #fff; border: 1px solid #eee; }
  .img img { max-width: 62px; max-height: 62px; object-fit: contain; }
  .img span { font-size: 9px; color: #aaa; }
  .txt { flex: 1; min-width: 0; }
  .name { font-size: 13px; font-weight: 600; }
  .num { color: #aaa; font-weight: 400; }
  .shade { font-size: 12.5px; font-weight: 700; color: #c0247e; margin-top: 1px; }
  .oth { font-size: 9px; font-weight: 400; color: #999; }
  .who { font-size: 9.5px; color: #8a7590; margin-top: 2px; }
  .qty { font-size: 18px; font-weight: 700; width: 40px; text-align: right; flex: none; }
</style></head><body>
<header><h1>Seasons by B — Shopping List</h1>
<div class="meta">${esc(dateStr)} · ${list.length} products · ${units} units · open confirmed orders only (pending orders not included)</div></header>
${body}
</body></html>`;

  const stamp = new Date().toISOString().slice(0, 10);
  const base = join(homedir(), "Downloads", `awaiting-order-shopping-list-${stamp}`);
  writeFileSync(`${base}.html`, html, "utf8");

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.pdf({ path: `${base}.pdf`, format: "A4", printBackground: true, preferCSSPageSize: true });
  } finally {
    await browser.close();
  }

  console.log(`${list.length} products, ${units} units, ${list.length - missing.length} with photo.`);
  for (const x of missing) console.log(`  no photo: ${x.brand} — ${x.product} ${x.shade} (src: ${x.img ?? "none"})`);
  list.forEach((x, i) => { if (picked[i].other) console.log(`  other-shade photo: ${x.brand} — ${x.product} ${x.shade}`); });
  console.log(`Wrote ${base}.pdf`);
}
main().catch((err) => { console.error("Failed:", err); process.exit(1); });
