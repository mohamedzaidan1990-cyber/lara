/**
 * De-duplicate the `products` table.
 *
 * Groups products by normalised identity — lower(trim(brand)) + lower(trim(name)) —
 * and, for every group with more than one row, keeps a single canonical row and
 * merges the rest into it.
 *
 * Canonical row, in priority order:
 *   1. id hard-referenced in application code (lib/promotions.ts)      — never deleted
 *   2. price_locked = true                                            — curated price wins
 *   3. owns product_variants / has shades / k_beauty / a real image   — richest row
 *   4. most recent scraped_at                                         — freshest price
 *   5. lowest id                                                      — deterministic tie-break
 *
 * Merge actions per group:
 *   - product_variants.product_id  -> canonical (drop variant on shade_name clash)
 *   - stock_items.product_id       -> canonical
 *   - products (the losers)        -> DELETE
 *   - if canonical.image_url is empty, backfill it from a loser
 *
 * order_items is NOT touched — each line is a self-contained snapshot with no
 * product_id FK, so order history is unaffected.
 *
 * Modes:
 *   npx ts-node scripts/dedupe-products.ts            # --report (default): write scripts/out/dedupe-report.md, no writes
 *   npx ts-node scripts/dedupe-products.ts --apply    # execute the merge in one transaction
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
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

// Product ids referenced directly from application code — must survive.
const CODE_REFERENCED = new Set<string>([
  "236f4952-5fc1-436e-b609-6e6f2fd53f9d", // lib/promotions.ts
  "39bcccfb-6e26-45ce-97e7-f3cf2429e08a", // lib/promotions.ts
]);

interface Row {
  id: string;
  brand: string;
  name: string;
  k: string;
  pu: number | null;
  pg: number | null;
  locked: boolean;
  product_url: string | null;
  image_url: string;
  k_beauty: boolean | null;
  has_shades: boolean;
  is_bestseller: boolean | null;
  popularity: number | null;
  scraped_at: string | null;
  created_at: string | null;
  nvariants: number;
  nstock: number;
}

function score(r: Row): number[] {
  const ts = r.scraped_at ? Date.parse(r.scraped_at) : 0;
  return [
    CODE_REFERENCED.has(r.id) ? 1 : 0,
    r.locked ? 1 : 0,
    r.nvariants, // the row with the most shade variants is the real PDP
    (r.image_url ? 1 : 0) + (r.k_beauty ? 1 : 0) + (r.has_shades ? 1 : 0) + (r.is_bestseller ? 1 : 0),
    Number.isFinite(ts) ? ts : 0,
  ];
}

function cmpScoreDesc(a: Row, b: Row): number {
  const sa = score(a);
  const sb = score(b);
  for (let i = 0; i < sa.length; i++) {
    if (sa[i] !== sb[i]) return sb[i] - sa[i];
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; // lowest id wins
}

function fmtDate(s: string | null): string {
  return s ? s.slice(0, 10) : "—";
}

function reason(r: Row): string {
  if (CODE_REFERENCED.has(r.id)) return "referenced in application code";
  if (r.locked) return "price_locked (curated price)";
  if (r.nvariants > 0) return `owns ${r.nvariants} product_variants (most in group)`;
  const bits = [
    r.image_url ? "has image" : null,
    r.k_beauty ? "k_beauty" : null,
    r.has_shades ? "has shades" : null,
    r.is_bestseller ? "bestseller" : null,
  ].filter(Boolean);
  if (bits.length) return `richest row (${bits.join(", ")})`;
  return "most recently scraped";
}

function money(n: number | null): string {
  return n == null ? "—" : `$${n.toFixed(2)}`;
}

// A size/volume token in the name (50ml, 7g, 2.5ml, pack of four…). When a
// group's rows disagree on price AND the name carries no size, the "duplicates"
// may actually be different sizes/variants with the size dropped from the name
// (e.g. "Le Labo Thé Noir 29 eau de parfum", "Gucci Kids' Ballet Flats") — those
// are held back for a human call rather than auto-merged.
function hasSizeToken(name: string): boolean {
  return /(\d+(\.\d+)?\s?(ml|g|kg|oz|cm|mm|l)\b)|(pack of|set of|x\d+|\d+-piece|\d+ piece)/i.test(name);
}

async function main() {
  const apply = process.argv.includes("--apply");
  const sql = getSql();

  const rows = (await sql(`
    with keyed as (
      select *, lower(trim(brand)) || chr(31) || lower(trim(name)) as k
      from products
    ),
    dups as (select k from keyed group by k having count(*) > 1)
    select ke.id, ke.brand, ke.name, ke.k,
           ke.price_usd::float8 as pu, ke.price_gbp::float8 as pg,
           coalesce(ke.price_locked, false) as locked,
           ke.product_url, coalesce(ke.image_url, '') as image_url,
           ke.k_beauty, (ke.shades is not null) as has_shades,
           ke.is_bestseller, ke.popularity,
           ke.scraped_at::text as scraped_at, ke.created_at::text as created_at,
           (select count(*) from product_variants v where v.product_id = ke.id)::int as nvariants,
           (select count(*) from stock_items s where s.product_id = ke.id)::int as nstock
    from keyed ke join dups d on d.k = ke.k
    order by ke.k, ke.id
  `)) as Row[];

  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    if (!groups.has(r.k)) groups.set(r.k, []);
    groups.get(r.k)!.push(r);
  }

  const totalRow = (await sql(`select count(*)::int as n from products`)) as { n: number }[];
  const totalProducts = totalRow[0].n;

  const sortedGroups = [...groups.values()].sort((a, b) =>
    `${a[0].brand} ${a[0].name}`.localeCompare(`${b[0].brand} ${b[0].name}`)
  );

  interface Plan {
    keep: Row;
    losers: Row[];
    conflict: boolean;
    normaliseTo: { usd: number; gbp: number } | null;
    review: boolean; // held back: price conflict + no size token → needs a human call
  }

  const plans: Plan[] = sortedGroups.map((g) => {
    g.sort(cmpScoreDesc);
    const [keep, ...losers] = g;
    const prices = new Set(g.map((r) => (r.pu == null ? "null" : r.pu.toFixed(2))));
    const conflict = prices.size > 1;
    const gMaxUsd = Math.max(...g.map((r) => r.pu ?? 0));
    const gMaxGbp = Math.max(...g.map((r) => r.pg ?? 0));
    const review = conflict && !keep.locked && !hasSizeToken(keep.name);
    const normaliseTo =
      conflict && !review && !keep.locked && (keep.pu ?? 0) < gMaxUsd ? { usd: gMaxUsd, gbp: gMaxGbp } : null;
    return { keep, losers, conflict, normaliseTo, review };
  });

  const merges = plans.filter((p) => !p.review);
  const reviews = plans.filter((p) => p.review);

  const surplus = merges.reduce((n, p) => n + p.losers.length, 0);
  const priceConflictGroups = merges.filter((p) => p.conflict).length;
  const variantRepoints = merges.reduce((n, p) => n + p.losers.reduce((m, l) => m + l.nvariants, 0), 0);
  const stockRepoints = merges.reduce((n, p) => n + p.losers.reduce((m, l) => m + l.nstock, 0), 0);

  function renderGroup(p: Plan): string[] {
    const { keep, losers, conflict, normaliseTo } = p;
    const out: string[] = [];
    out.push(`### ${keep.brand} — ${keep.name}  (${losers.length + 1}×)${conflict ? "  ⚠️ price conflict" : ""}`);
    out.push("");
    if (conflict) {
      out.push(`prices in group: ${[keep, ...losers].map((r) => money(r.pu)).join(", ")}`);
      if (p.review) out.push(`→ **held for review** — no size in name, may be different sizes/variants; NOT merged`);
      else if (keep.locked) out.push(`→ canonical is price_locked; price stays **${money(keep.pu)}**`);
      else if (normaliseTo) out.push(`→ price normalised to **${money(normaliseTo.usd)}** (highest in group)`);
      else out.push(`→ price stays **${money(keep.pu)}** (already the highest)`);
      out.push("");
    }
    out.push(
      `KEEP  \`${keep.id}\`  ${money(keep.pu)} / ${money(keep.pg)}  locked=${keep.locked}  variants=${keep.nvariants}  stock=${keep.nstock}  scraped=${fmtDate(keep.scraped_at)}`
    );
    out.push(`      reason: ${reason(keep)}`);
    out.push(`      url: ${keep.product_url ?? "(none)"}`);
    for (const l of losers) {
      out.push(
        `DROP  \`${l.id}\`  ${money(l.pu)} / ${money(l.pg)}  locked=${l.locked}  variants=${l.nvariants}  stock=${l.nstock}  scraped=${fmtDate(l.scraped_at)}`
      );
      out.push(`      url: ${l.product_url ?? "(none)"}`);
      if (l.nvariants > 0 && !p.review) out.push(`      → ${l.nvariants} variants re-pointed to KEEP`);
      if (l.nstock > 0 && !p.review) out.push(`      → ${l.nstock} stock_items re-pointed to KEEP`);
    }
    out.push("");
    return out;
  }

  const header = [
    "# Duplicate products — merge report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `- Products in table: **${totalProducts}**`,
    `- Duplicate groups: **${groups.size}**  (${merges.length} auto-merge, ${reviews.length} held for review)`,
    `- Surplus rows to delete: **${surplus}**  → table ends at **${totalProducts - surplus}**`,
    `- Auto-merge groups with a price conflict (name has size): **${priceConflictGroups}** — kept price normalised to the highest`,
    `- product_variants to re-point: **${variantRepoints}**`,
    `- stock_items to re-point: **${stockRepoints}**`,
    "",
    "Canonical rule: code-referenced → price_locked → most product_variants → richest → newest scrape → lowest id.",
    "`order_items`, `orders`, `customers` are never touched.",
    "",
    "---",
    "",
    `## Held for review (${reviews.length}) — NOT merged by --apply`,
    "",
    "Price disagrees and the name carries no size, so these may be genuinely",
    "different sizes/variants. Decide each one manually.",
    "",
    ...reviews.flatMap(renderGroup),
    "---",
    "",
    `## Auto-merge (${merges.length})`,
    "",
    ...merges.flatMap(renderGroup),
  ];

  const outDir = resolve(process.cwd(), "docs/superpowers");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, "dedupe-report.md");
  writeFileSync(outPath, header.join("\n"), "utf8");

  console.log(
    `groups=${groups.size} autoMerge=${merges.length} review=${reviews.length} surplus=${surplus} priceConflicts=${priceConflictGroups} variantRepoints=${variantRepoints} stockRepoints=${stockRepoints}`
  );
  console.log(`report written to ${outPath}`);

  if (!apply) {
    console.log("\n--report only. Re-run with --apply to execute the merge.");
    return;
  }

  console.log("\n--apply: executing merge…");

  // The neon() HTTP driver is autocommit per call, so each group is merged as
  // one atomic sql.transaction([...]) (BEGIN/COMMIT in a single request).
  let groupsMerged = 0;
  for (const p of merges) {
    const { keep, losers } = p;
    const loserIds = losers.map((r) => r.id);
    if (loserIds.length === 0) continue;

    const stmts = [
      // Move variants that don't collide on shade_name…
      sql`
        update product_variants v
           set product_id = ${keep.id}
         where v.product_id = any(${loserIds}::uuid[])
           and not exists (
             select 1 from product_variants c
             where c.product_id = ${keep.id} and c.shade_name = v.shade_name
           )`,
      // …then drop any that remain on a loser.
      sql`delete from product_variants where product_id = any(${loserIds}::uuid[])`,
      // Re-point speculative stock.
      sql`update stock_items set product_id = ${keep.id} where product_id = any(${loserIds}::uuid[])`,
    ];

    // Backfill a missing image on the canonical row from a loser.
    if (!keep.image_url) {
      const donor = losers.find((r) => r.image_url);
      if (donor) {
        stmts.push(sql`
          update products
             set image_url = ${donor.image_url},
                 images = case when images is null then jsonb_build_array(${donor.image_url}::text) else images end
           where id = ${keep.id} and coalesce(image_url, '') = ''`);
      }
    }

    // Normalise an unlocked canonical row up to the group's highest price.
    if (p.normaliseTo) {
      stmts.push(sql`
        update products set price_usd = ${p.normaliseTo.usd}, price_gbp = ${p.normaliseTo.gbp}
        where id = ${keep.id} and coalesce(price_locked, false) = false`);
    }

    stmts.push(sql`delete from products where id = any(${loserIds}::uuid[])`);

    await (sql as unknown as { transaction: (q: unknown[]) => Promise<unknown> }).transaction(stmts);
    groupsMerged++;
  }

  const after = (await sql(`select count(*)::int as n from products`)) as { n: number }[];
  console.log(`done. merged ${groupsMerged} groups. products: ${totalProducts} → ${after[0].n} (−${totalProducts - after[0].n})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
