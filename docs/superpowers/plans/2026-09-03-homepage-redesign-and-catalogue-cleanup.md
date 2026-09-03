# Homepage Redesign + Catalogue Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Seasons by B homepage to the approved reference layout (still-image hero, best-seller "Shop by Brand" rail, one Huda Beauty feature band), remove the Huda "free blush" promo and the Health & Nutrition category from the storefront, and stop the scraper/import paths from recreating duplicate products.

**Architecture:** Next.js 14 App Router, all data via `@neondatabase/serverless` (`getSql()`), no ORM, raw SQL in `lib/*` helpers and route handlers. No test runner is configured — each task is verified by a standalone `scripts/_verify-*.mjs` Node script (run with `node`, must fail before the change and pass after) and/or a `npm run build` + explicit manual browser check. Product de-duplication (spec change 5, step 1) is already done and committed; this plan covers everything else.

**Tech Stack:** Next.js 14.2, React 18, TypeScript, Tailwind, framer-motion, zustand, `@neondatabase/serverless`, ts-node for scripts.

**Spec:** `docs/superpowers/specs/2026-09-03-homepage-redesign-and-catalogue-cleanup-design.md`

## Global Constraints

- **Data safety:** No row in `customers`, `orders`, or `order_items` is ever read-modified-written or deleted by this work. The only `products` deletions already happened (the committed dedupe merge). Health & Nutrition rows are **archived via a boolean flag, never deleted**.
- **Branch:** all work on `claude/homepage-redesign` (already checked out). One PR. Vercel builds a preview automatically.
- **DB access in scripts:** load `.env.local` then `.env` for `DATABASE_URL` (copy the `loadDotenv` helper from `scripts/seed-products.ts:26-43`), then `const sql = neon(process.env.DATABASE_URL!)`.
- **Neon HTTP driver is autocommit per call.** Multi-statement transactions must use `sql.transaction([...])`.
- **Copy/brand:** public brand name is "Seasons by B". Keep existing accent colour `#e040a0`, fonts `--font-playfair` (serif) / `--font-dm-sans`.
- **Scraper worker** (`scraper-worker/`) deploys separately on Railway (`shimmering-respect` / `lara`). Code changes there take effect only after a manual redeploy — call this out in the task, do not attempt to deploy it.
- **Do not** remove the `is_promo_gift` field or its checkout/product-detail plumbing — it still serves the active "Summer's Hottest Look Set + EDP" gift.
- Verification scripts are throwaway: name them `scripts/_verify-<topic>.mjs` and delete them in the same commit that they verify, OR keep under `scripts/_*.mjs` (already gitignored-by-convention prefix `_`). Prefer delete-after.

---

## File Structure

**New files:**
- `lib/top-brands.ts` — `getTopBrands(limit)` query + types + fallback list. One responsibility: "which brands lead sales, and one image each".
- `components/BrandRail.tsx` — the "Shop by Brand" section (client component, big rounded cards).
- `scripts/dupe-check.ts` — prints the current count of exact duplicate name-groups (regression monitor).

**Rewritten files:**
- `components/HeroSection.tsx` — still-image hero (was full-bleed video).
- `app/HomeClient.tsx` — new section order; drops video, blush promo, K-Beauty teaser, and the `order-N` juggling.

**Modified files:**
- `lib/db.ts` — add `archived` column + archive statement to `SCHEMA_STATEMENTS`.
- `lib/featured.ts`, `lib/categories.ts`, `lib/currency.ts` — remove "Health & Nutrition".
- `lib/brands.ts`, `lib/products.ts`, `app/api/search/route.ts`, `app/api/search-suggestions/route.ts`, `app/api/trending/route.ts`, `app/sitemap.ts`, `app/api/merchant-feed/route.ts` — exclude `archived` rows.
- `app/search/SearchPageClient.tsx` — drop "Health & Nutrition" from the filter list.
- `app/category/[slug]/page.tsx` — redirect retired category slug.
- `app/page.tsx` — fetch `getTopBrands()`, pass to `HomeClient`.
- `app/layout.tsx` — remove `<PromoCartWatcher />`.
- `app/brand/[slug]/page.tsx` — remove `HudaBlushPromo`.
- `components/CartSidebar.tsx` — remove the blush progress-nudge.
- `lib/cart.ts` — one-time persisted-cart sweep of the retired gift line.
- `scraper-worker/db.ts`, `scraper-worker/scraper.ts`, `scraper-worker/currency.ts` — remove H&N, add the dedupe guard.
- `app/api/admin/save-products/route.ts`, `lib/scraper.ts` — add the dedupe guard.

**Deleted files:**
- `components/AutoVideo.tsx`, `components/HudaBlushPromo.tsx`, `lib/huda-blush-promo.ts`, `components/PromoCartWatcher.tsx`.

---

## Task 1: Archive the Health & Nutrition category (DB + reads)

**Files:**
- Modify: `lib/db.ts` (append to `SCHEMA_STATEMENTS`, before the closing `];` at line ~328)
- Modify: `lib/featured.ts:3-13` (`Category` union), `:104` (`CATEGORIES`), `:106-114` (`PRODUCT_CATEGORIES`)
- Modify: `lib/categories.ts:56-61` (remove the `health-nutrition` `CATEGORY_DEFS` entry)
- Modify: `lib/currency.ts:17-20` (remove the `Health & Nutrition` branch)
- Modify: `app/search/SearchPageClient.tsx:23` (remove from `CATEGORIES` array)
- Modify: `app/category/[slug]/page.tsx:22-23` (add `"health-nutrition"` to a redirect set → `/`)
- Modify: `lib/brands.ts` — `getBrandBySlug` (query ~38-43), `getBrandProducts` (query ~90-97), `getBrandsForDirectory` (query ~112-118): add `and not p.archived` / `and not archived`
- Modify: `lib/products.ts` — `getProductById` (query ~47-54): `and not archived`; `getRelatedProducts` (query ~97-110): `and not archived`
- Modify: `app/api/search/route.ts`, `app/api/search-suggestions/route.ts` — add `and not archived` (also `not p.archived` where aliased) to every `from products` query
- Modify: `app/api/trending/route.ts:14-15` — `where is_bestseller = true and not archived`
- Modify: `app/sitemap.ts` — product query: `and not archived`
- Modify: `app/api/merchant-feed/route.ts` — product query: `and not archived`
- Test: `scripts/_verify-archive.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `products.archived boolean not null default false`. `PRODUCT_CATEGORIES` / `CATEGORY_DEFS` / `CATEGORIES` no longer contain `"Health & Nutrition"`. `Category` union no longer has that member (type-level; downstream `.tsx` already only reference `CATEGORY_DEFS`).

- [ ] **Step 1: Write the verification script**

Create `scripts/_verify-archive.mjs`:

```js
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
for (const f of [".env.local", ".env"]) {
  try {
    for (const line of readFileSync(new URL("../" + f, import.meta.url), "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    }
  } catch {}
}
const sql = neon(process.env.DATABASE_URL);

const col = await sql`select column_name from information_schema.columns where table_name='products' and column_name='archived'`;
console.log("archived column exists:", col.length === 1);

const hn = await sql`select count(*)::int total, count(*) filter (where archived)::int archived from products where category = 'Health & Nutrition'`;
console.log("Health & Nutrition rows:", hn[0].total, "| archived:", hn[0].archived);

const leak = await sql`select count(*)::int n from products where category='Health & Nutrition' and not archived`;
console.log("un-archived H&N rows (must be 0):", leak[0].n);

const others = await sql`select count(*)::int n from products where archived and category <> 'Health & Nutrition'`;
console.log("archived rows outside H&N (must be 0):", others[0].n);

if (col.length !== 1 || hn[0].total !== hn[0].archived || leak[0].n !== 0 || others[0].n !== 0) {
  console.error("FAIL"); process.exit(1);
}
console.log("PASS");
```

- [ ] **Step 2: Run it — expect FAIL**

Run: `node scripts/_verify-archive.mjs`
Expected: `archived column exists: false` then `FAIL`, exit 1.

- [ ] **Step 3: Add the schema + archive statements to `lib/db.ts`**

Append to `SCHEMA_STATEMENTS` (just before the closing `];`):

```js
  // ----- Retire the Health & Nutrition (vitamins) category from the storefront.
  // Rows are archived, never deleted — fully reversible with
  //   update products set archived = false where category = 'Health & Nutrition'
  `alter table products add column if not exists archived boolean not null default false`,
  `create index if not exists products_archived_idx on products (archived)`,
  `update products set archived = true where category = 'Health & Nutrition' and archived = false`,
```

- [ ] **Step 4: Apply the schema change**

Run: `npx ts-node -e "require('./lib/db').ensureSchema().then(()=>{console.log('schema ok');process.exit(0)})"`
Expected: prints `schema ok`. (If `ts-node -e` misbehaves on Windows, create a 2-line `scripts/_apply-schema.mjs` that imports and calls `ensureSchema`, run it, delete it.)

- [ ] **Step 5: Remove "Health & Nutrition" from `lib/featured.ts`**

`Category` union (line ~3-13): delete the `  | "Health & Nutrition";` line and put the `;` on the previous member.
`CATEGORIES` (line ~104): remove `, "Health & Nutrition"`.
`PRODUCT_CATEGORIES` (line ~106-114): remove the `"Health & Nutrition"` entry and the trailing comma on the previous line.

- [ ] **Step 6: Remove the `health-nutrition` entry from `lib/categories.ts`**

Delete the whole object at lines ~56-61:

```js
  {
    slug: "health-nutrition",
    name: "Health & Nutrition",
    ...
  }
```

Ensure the preceding entry keeps its trailing comma consistent and the array still closes with `] as const;`.

- [ ] **Step 7: Remove the `Health & Nutrition` branch from `lib/currency.ts`**

Delete lines ~18-20:

```js
  if (category === "Health & Nutrition") {
    return Math.round(priceGbp * 1.595 * 100) / 100;
  }
```

- [ ] **Step 8: Remove from the search filter UI**

`app/search/SearchPageClient.tsx:23` — change:

```ts
const CATEGORIES = ["All", "Makeup", "Skincare", "Fragrance", "Home Fragrance", "Haircare", "Beauty tools", "Health & Nutrition"];
```
to end `..., "Beauty tools"];`

- [ ] **Step 9: Redirect the retired category slug**

`app/category/[slug]/page.tsx` — line ~22:

```ts
const REDIRECT_TO_BESPOKE = new Set(["bags", "accessories"]);
```
add below it:
```ts
// Health & Nutrition was retired from the storefront (Sept 2026).
const REDIRECT_TO_HOME = new Set(["health-nutrition"]);
```
and in the component body, right after the existing `if (REDIRECT_TO_BESPOKE.has(params.slug)) redirect("/bespoke");`:
```ts
  if (REDIRECT_TO_HOME.has(params.slug)) redirect("/");
```

- [ ] **Step 10: Add `and not archived` to every product read outside category scope**

For each query listed under **Files** above, add the predicate to the `where` clause. Examples:

`lib/brands.ts` `getBrandsForDirectory`:
```sql
      SELECT brand, count(*)::int as count
      FROM products
      WHERE brand IS NOT NULL AND NOT archived
      GROUP BY brand
```
`lib/brands.ts` `getBrandBySlug` (aliased `products` has no alias here — it's `from products where ${BRAND_SLUG_SQL} = $1`):
```sql
       from products
       where ${BRAND_SLUG_SQL} = $1 and not archived
```
`lib/brands.ts` `getBrandProducts`: both the `count(*)` query and the `select ... from products where brand = $1` query get `and not archived`.
`lib/products.ts` `getProductById`: `where id = ${id} and not archived`.
`lib/products.ts` `getRelatedProducts`: `where category = ${categoryName} and id <> ${excludeId} and not archived`.
`app/api/trending/route.ts`: `where is_bestseller = true and not archived`.
`app/sitemap.ts` and `app/api/merchant-feed/route.ts`: add `and not archived` (or `where not archived` if no existing `where`) to the product-selecting query.
`app/api/search/route.ts` and `app/api/search-suggestions/route.ts`: add `and not archived` to each `from products` query (there may be a brand-agg query and a product query — do both).

- [ ] **Step 11: Run the verification script — expect PASS**

Run: `node scripts/_verify-archive.mjs`
Expected: `archived column exists: true`, `un-archived H&N rows (must be 0): 0`, `archived rows outside H&N (must be 0): 0`, `PASS`.

- [ ] **Step 12: Build**

Run: `npm run build`
Expected: compiles with no type errors. (The `Category` union change may surface a missing-case error somewhere — if so, fix that file by removing the H&N case.)

- [ ] **Step 13: Manual check**

Run `npm run dev`. Verify:
- `http://localhost:3000/category/health-nutrition` → redirects to `/`.
- Header "Shop" menu (desktop) and mobile menu no longer list "Health & Nutrition".
- `http://localhost:3000/search?q=collagen` → results contain no `TRUECOLLAGEN` / vitamin products.
- `http://localhost:3000/api/merchant-feed` → search the XML/text for "Health & Nutrition" → absent.

- [ ] **Step 14: Commit**

```bash
git rm scripts/_verify-archive.mjs 2>/dev/null; rm -f scripts/_verify-archive.mjs
git add lib/db.ts lib/featured.ts lib/categories.ts lib/currency.ts app/search/SearchPageClient.tsx app/category/ lib/brands.ts lib/products.ts app/api/search/route.ts app/api/search-suggestions/route.ts app/api/trending/route.ts app/sitemap.ts app/api/merchant-feed/route.ts
git commit -m "Retire Health & Nutrition category from the storefront (archive, not delete)"
```

---

## Task 2: Stop the scraper + admin import recreating duplicates and H&N

**Files:**
- Modify: `scraper-worker/db.ts:125-128` (`VALID_CATEGORIES`), `:163-168` (upsert category `ARRAY[...]` guard), `:129-210` (`upsertProducts` — add the pre-insert dedupe guard)
- Modify: `scraper-worker/scraper.ts:43` (`SCRAPE_CATEGORIES`), `:1054-1058` and `:1745` (`Health & Nutrition` path maps — remove those keys)
- Modify: `scraper-worker/currency.ts:11` (remove the H&N line)
- Modify: `app/api/admin/save-products/route.ts:56-69` (add the guard before the insert)
- Modify: `lib/scraper.ts:~110-125` (add the guard before its `insert into products`)
- Test: `scripts/_verify-guard.mjs`

**Interfaces:**
- Consumes: `products.archived` (Task 1) is irrelevant here; the guard keys on `lower(trim(brand))` + `lower(trim(name))`.
- Produces: no new exports. Behaviour change only: an insert whose `(brand,name)` already exists under a different `product_url` is skipped.

- [ ] **Step 1: Write the verification script**

Create `scripts/_verify-guard.mjs` — it inserts a synthetic duplicate through the same guard logic and asserts it is rejected, then cleans up:

```js
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
for (const f of [".env.local", ".env"]) { try { for (const l of readFileSync(new URL("../"+f,import.meta.url),"utf8").split(/\r?\n/)) { const m=l.match(/^([A-Z_]+)=(.*)$/); if(m&&!process.env[m[1]])process.env[m[1]]=m[2].replace(/^['"]|['"]$/g,""); } } catch {} }
const sql = neon(process.env.DATABASE_URL);

// pick a real product, try to "re-scrape" it under a fake URL using the guard
const [p] = await sql`select brand, name from products where not archived order by random() limit 1`;
const fakeUrl = "https://example.com/dupe-guard-test-" + Date.now();
const existing = await sql`select id from products where lower(trim(brand)) = lower(trim(${p.brand})) and lower(trim(name)) = lower(trim(${p.name})) limit 1`;
const wouldSkip = existing.length > 0;
console.log(`guard would skip re-insert of "${p.brand} — ${p.name}":`, wouldSkip);
if (!wouldSkip) { console.error("FAIL: guard query did not find the existing row"); process.exit(1); }
console.log("PASS");
```

- [ ] **Step 2: Run it — expect PASS already** (it only tests the guard's SELECT, which is valid SQL now)

Run: `node scripts/_verify-guard.mjs`
Expected: `guard would skip re-insert ...: true`, `PASS`. (This script documents the guard's contract; the code steps below wire it into the insert paths.)

- [ ] **Step 3: Add the guard to `scraper-worker/db.ts` `upsertProducts`**

Inside the `for (const p of products)` loop, after the existing category/brand validation and before the `INSERT ... ON CONFLICT (product_url)` call, add:

```js
    // Dedupe guard: the same product is often reachable under several
    // product_urls (en-gb / en-qa / en-us, Selfridges vs Sephora). If a row
    // with this brand+name already exists under a different URL, skip — don't
    // create a twin. (An exact product_url match still updates via ON CONFLICT.)
    const dupe = await client.query(
      `select 1 from products
        where lower(trim(brand)) = lower(trim($1))
          and lower(trim(name))  = lower(trim($2))
          and product_url is distinct from $3
        limit 1`,
      [p.brand, p.name, p.product_url]
    );
    if (dupe.rowCount && dupe.rowCount > 0) {
      console.warn(`[db] dedupe-guard skip: ${p.brand} — ${p.name}`);
      continue;
    }
```

- [ ] **Step 4: Remove H&N from `scraper-worker/db.ts`**

`VALID_CATEGORIES` (line ~125-128): remove `"Health & Nutrition"`.
Upsert `category = case when excluded.category = ANY(ARRAY['Makeup',...,'Health & Nutrition'])` (line ~163-168): remove `,'Health & Nutrition'` from the array literal.

- [ ] **Step 5: Remove H&N from `scraper-worker/scraper.ts`**

`SCRAPE_CATEGORIES` (line ~43): remove `"Health & Nutrition"`.
The category→path map (line ~1054): delete the whole `"Health & Nutrition": [ "foodhall/health-nutrition", ... ],` key.
The subcategory map (line ~1745): delete the `"Health & Nutrition": [ ... ],` key.

- [ ] **Step 6: Remove H&N from `scraper-worker/currency.ts`**

Delete line ~11: `if (category === "Health & Nutrition") return 1.1; ...`

- [ ] **Step 7: Add the guard to `app/api/admin/save-products/route.ts`**

In the `for (const p of incoming)` loop, after the `if (!productUrl || !name || priceGbp === null) continue;` check, add:

```ts
    // Dedupe guard — see scraper-worker/db.ts. Skip when this brand+name
    // already exists under a different URL.
    const dupe = (await sql`
      select 1 from products
      where lower(trim(brand)) = lower(trim(${brand}))
        and lower(trim(name))  = lower(trim(${name}))
        and product_url is distinct from ${productUrl}
      limit 1
    `) as unknown[];
    if (dupe.length > 0) {
      console.warn("[save-products] dedupe-guard skip:", brand, "—", name);
      continue;
    }
```

- [ ] **Step 8: Add the guard to `lib/scraper.ts`**

Locate its `insert into products (...) ... on conflict (product_url) do update ...` (around line 116). Immediately before it, add the same guarded `select 1 from products where lower(trim(brand)) = lower(trim(<brandVar>)) and lower(trim(name)) = lower(trim(<nameVar>)) and product_url is distinct from <urlVar> limit 1` check using this file's local variable names, and `continue;` / skip when a row is found. (Match the surrounding loop's style; if it's a `Promise.all(map(...))` rather than a `for` loop, filter the array before the insert map instead.)

- [ ] **Step 9: Build + verify**

Run: `npm run build` — expected: passes.
Run: `node scripts/_verify-guard.mjs` — expected: `PASS`.

- [ ] **Step 10: Commit**

```bash
rm -f scripts/_verify-guard.mjs
git add scraper-worker/ app/api/admin/save-products/route.ts lib/scraper.ts
git commit -m "Guard scraper + admin import against duplicate (brand,name) rows; drop H&N from scraper"
```

- [ ] **Step 11: Note for the human**

Add to the PR description: *"`scraper-worker/*` changed — redeploy the Railway `lara` service after merge."*

---

## Task 3: Duplicate-count regression monitor

**Files:**
- Create: `scripts/dupe-check.ts`
- Modify: `package.json` (add `"dupe-check": "ts-node scripts/dupe-check.ts"` to `scripts`)

**Interfaces:**
- Consumes: `DATABASE_URL`.
- Produces: `npm run dupe-check` — exits 0 and prints the count of exact `(brand,name)` duplicate groups among non-archived products; exits 1 if the count exceeds a baseline passed as `--max=N` (default 9, the known held-for-review set).

- [ ] **Step 1: Write `scripts/dupe-check.ts`**

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
function loadDotenv(file: string): void {
  let text: string;
  try { text = readFileSync(resolve(process.cwd(), file), "utf8"); } catch { return; }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("="); if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    const v = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}
loadDotenv(".env.local"); loadDotenv(".env");
import { getSql } from "../lib/db";

async function main() {
  const maxArg = process.argv.find((a) => a.startsWith("--max="));
  const max = maxArg ? Number(maxArg.slice(6)) : 9;
  const sql = getSql();
  const rows = (await sql`
    select brand, name, count(*)::int c
    from products
    where not archived
    group by lower(trim(brand)), lower(trim(name)), brand, name
    having count(*) > 1
    order by c desc, brand
  `) as { brand: string; name: string; c: number }[];
  console.log(`exact duplicate (brand,name) groups: ${rows.length} (baseline ${max})`);
  for (const r of rows) console.log(`  [${r.c}x] ${r.brand} — ${r.name}`);
  if (rows.length > max) { console.error(`FAIL: ${rows.length} > ${max}`); process.exit(1); }
  console.log("OK");
}
main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Add the npm script**

`package.json` `"scripts"` — add: `"dupe-check": "ts-node scripts/dupe-check.ts",`

- [ ] **Step 3: Run it — expect OK**

Run: `npm run dupe-check`
Expected: `exact duplicate (brand,name) groups: 9 (baseline 9)` then `OK`, exit 0.

- [ ] **Step 4: Verify it can fail**

Run: `npm run dupe-check -- --max=2`
Expected: prints the 9 groups, `FAIL: 9 > 2`, exit 1.

- [ ] **Step 5: Commit**

```bash
git add scripts/dupe-check.ts package.json
git commit -m "Add npm run dupe-check regression monitor for product duplicates"
```

---

## Task 4: Remove the Huda Beauty "free blush" promo

**Files:**
- Delete: `components/HudaBlushPromo.tsx`, `lib/huda-blush-promo.ts`, `components/PromoCartWatcher.tsx`
- Modify: `app/layout.tsx:7` (import), `:136` (`<PromoCartWatcher />`)
- Modify: `app/HomeClient.tsx:13` (import), `:112-116` (the `HudaBeautyBanner` + `HudaBlushPromo` block — keep `HudaBeautyBanner`, drop `HudaBlushPromo`)
- Modify: `app/brand/[slug]/page.tsx:5` (import), `:86` (`HudaBlushPromo` usage)
- Modify: `components/CartSidebar.tsx:9` (import), `:22-24` (`hudaSpend`/`hudaRemaining`/`hasHudaGift`), `:80-108` (the promo nudge block)
- Modify: `lib/cart.ts:31-62` (add an `onRehydrateStorage` sweep)
- Test: manual (cart behaviour) + `npm run build`

**Interfaces:**
- Consumes: nothing.
- Produces: `HudaBlushPromo`, `PromoCartWatcher`, `HUDA_BLUSH_PROMO`, `hudaSubtotal` no longer exist. `is_promo_gift` on `CartItem` and all its checkout/product-detail usage is untouched.

- [ ] **Step 1: Delete the three files**

```bash
git rm components/HudaBlushPromo.tsx lib/huda-blush-promo.ts components/PromoCartWatcher.tsx
```

- [ ] **Step 2: `app/layout.tsx`**

Remove line 7 `import PromoCartWatcher from "@/components/PromoCartWatcher";` and line ~136 `<PromoCartWatcher />`.

- [ ] **Step 3: `app/HomeClient.tsx`**

Remove line 13 `import HudaBlushPromo from "@/components/HudaBlushPromo";`.
Change the block at lines ~112-116 from:
```tsx
      {/* ── 2 MOBILE / 3 DESKTOP: Huda Beauty banner ── */}
      <div className="order-2 lg:order-3">
        <HudaBeautyBanner />
        <HudaBlushPromo variant="homepage" />
      </div>
```
to just `<HudaBeautyBanner />` (its wrapper/position is reworked in Task 8; for now leave the `<div className="order-2 lg:order-3">` wrapper with only `<HudaBeautyBanner />` inside).

- [ ] **Step 4: `app/brand/[slug]/page.tsx`**

Remove line 5 import and the line ~86 `{params.slug === "huda-beauty" ? <HudaBlushPromo variant="brand" /> : null}` (delete the whole ternary line).

- [ ] **Step 5: `components/CartSidebar.tsx`**

Remove line 9 `import { HUDA_BLUSH_PROMO, hudaSubtotal } from "@/lib/huda-blush-promo";`.
Remove lines ~22-24 (`const hudaSpend` / `hudaRemaining` / `hasHudaGift`).
Remove the entire block at lines ~81-108 — the comment `{/* Huda Beauty blush promo: ... */}` and the `{hasHudaGift ? (...) : hudaSpend > 0 && hudaRemaining > 0 ? (...) : null}` expression. Leave the `<ul className="space-y-4">` that follows.

- [ ] **Step 6: `lib/cart.ts` — sweep the retired gift line from persisted carts**

Change the `persist(...)` options object (lines ~56-60) to add a rehydrate hook:

```ts
    {
      name: "snb-cart",
      partialize: (state) => ({ items: state.items }),
      // One-time cleanup: the retired "free Huda blush" promo injected a line
      // with this id. Drop it on load so no one checks out with a phantom gift.
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.items = state.items.filter((i) => i.id !== "promo-huda-blush-gift");
      }
    }
```

- [ ] **Step 7: Build**

Run: `npm run build`
Expected: passes, no unresolved imports of the deleted modules. If the build reports `HUDA_BLUSH_PROMO` / `hudaSubtotal` still imported somewhere, grep `rg "huda-blush-promo|HUDA_BLUSH_PROMO|HudaBlushPromo|PromoCartWatcher"` and clean each hit (there should be none left outside `docs/`).

- [ ] **Step 8: Manual check**

`npm run dev`:
- Add >$100 of Huda Beauty products to the cart → **no** free blush line appears, **no** "$X away from a free blush" nudge.
- In devtools console: `JSON.parse(localStorage['snb-cart']).state.items` — manually add `{id:"promo-huda-blush-gift",...}` via `localStorage.setItem`, reload → the line is gone.
- Add the "Summer's Hottest Look Set" to the cart → its EDP gift line **still** auto-adds (regression check for the untouched promo).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "Remove the Huda Beauty free-blush promo (banner, cart watcher, nudge, persisted gift line)"
```

---

## Task 5: `lib/top-brands.ts` — best-seller brand data

**Files:**
- Create: `lib/top-brands.ts`
- Test: `scripts/_verify-top-brands.mjs`

**Interfaces:**
- Consumes: `getSql` from `lib/db`, `brandSlug` from `lib/brands`.
- Produces:
  ```ts
  export interface TopBrand { brand: string; slug: string; imageUrl: string; unitsSold: number; }
  export async function getTopBrands(limit?: number): Promise<TopBrand[]>; // default limit 6
  ```
  Never throws (catch → returns the fallback list). Every returned item has a non-empty `imageUrl`.

- [ ] **Step 1: Write the verification script**

Create `scripts/_verify-top-brands.mjs`:

```js
import { readFileSync } from "node:fs";
for (const f of [".env.local", ".env"]) { try { for (const l of readFileSync(new URL("../"+f,import.meta.url),"utf8").split(/\r?\n/)) { const m=l.match(/^([A-Z_]+)=(.*)$/); if(m&&!process.env[m[1]])process.env[m[1]]=m[2].replace(/^['"]|['"]$/g,""); } } catch {} }
const { getTopBrands } = await import("../lib/top-brands.ts");
const brands = await getTopBrands(6);
console.log(JSON.stringify(brands, null, 2));
const ok =
  Array.isArray(brands) &&
  brands.length === 6 &&
  brands.every((b) => b.brand && b.slug && b.imageUrl && typeof b.unitsSold === "number") &&
  brands[0].brand.toLowerCase().includes("huda"); // Huda Beauty is the clear #1 seller
console.log(ok ? "PASS" : "FAIL");
process.exit(ok ? 0 : 1);
```

Note: `.mjs` importing a `.ts` needs ts-node's loader — run with `node --loader ts-node/esm scripts/_verify-top-brands.mjs`. If that is flaky on this machine, instead make the verify a `.ts` file run with `npx ts-node`.

- [ ] **Step 2: Run it — expect FAIL** (`Cannot find module '../lib/top-brands.ts'`)

Run: `node --loader ts-node/esm scripts/_verify-top-brands.mjs`
Expected: module-not-found error / `FAIL`.

- [ ] **Step 3: Write `lib/top-brands.ts`**

```ts
import { getSql } from "./db";
import { brandSlug } from "./brands";

export interface TopBrand {
  brand: string;
  slug: string;
  imageUrl: string;
  unitsSold: number;
}

// Shown when sales data is too thin to fill the rail. Ordered by long-run
// prominence; images resolved from the catalogue at query time.
const FALLBACK_BRANDS = [
  "Huda Beauty",
  "Charlotte Tilbury",
  "Kiehl's",
  "Benefit Cosmetics",
  "Fenty Beauty",
  "Sol De Janeiro",
];

export async function getTopBrands(limit = 6): Promise<TopBrand[]> {
  try {
    const sql = getSql();
    const rows = (await sql`
      with sold as (
        select lower(trim(product_brand)) as bkey,
               sum(quantity)::int as units,
               count(distinct order_id)::int as orders
        from order_items
        where product_brand is not null and trim(product_brand) <> ''
        group by 1
      ),
      ranked as (
        select p.brand,
               s.units,
               row_number() over (partition by lower(trim(p.brand)) order by count(*) desc) as rn
        from sold s
        join products p on lower(trim(p.brand)) = s.bkey and not p.archived
        where s.orders >= 3
        group by p.brand, s.units, s.bkey
      )
      select r.brand, r.units as "unitsSold",
             coalesce(
               (select p2.image_url from products p2
                 where lower(trim(p2.brand)) = lower(trim(r.brand)) and not p2.archived
                   and coalesce(p2.image_url, '') <> ''
                 order by coalesce(p2.is_bestseller, false) desc,
                          p2.popularity asc nulls last,
                          p2.scraped_at desc
                 limit 1),
               ''
             ) as "imageUrl"
      from ranked r
      where r.rn = 1
      order by r.units desc
      limit ${limit}
    `) as Array<{ brand: string; unitsSold: number; imageUrl: string }>;

    const withImages = rows.filter((r) => r.imageUrl);
    const result = withImages.map((r) => ({
      brand: r.brand,
      slug: brandSlug(r.brand),
      imageUrl: r.imageUrl,
      unitsSold: r.unitsSold,
    }));

    if (result.length >= limit) return result.slice(0, limit);
    return padFromFallback(result, limit, sql);
  } catch {
    return [];
  }
}

async function padFromFallback(
  have: TopBrand[],
  limit: number,
  sql: ReturnType<typeof getSql>
): Promise<TopBrand[]> {
  const haveKeys = new Set(have.map((b) => b.brand.toLowerCase()));
  for (const name of FALLBACK_BRANDS) {
    if (have.length >= limit) break;
    if (haveKeys.has(name.toLowerCase())) continue;
    const img = (await sql`
      select image_url from products
      where lower(trim(brand)) = lower(trim(${name})) and not archived and coalesce(image_url,'') <> ''
      order by coalesce(is_bestseller,false) desc, popularity asc nulls last
      limit 1
    `) as Array<{ image_url: string }>;
    if (img[0]?.image_url) {
      have.push({ brand: name, slug: brandSlug(name), imageUrl: img[0].image_url, unitsSold: 0 });
    }
  }
  return have.slice(0, limit);
}
```

- [ ] **Step 4: Run the verification — expect PASS**

Run: `node --loader ts-node/esm scripts/_verify-top-brands.mjs`
Expected: prints 6 brands (Huda Beauty first), each with a real `imageUrl`, `PASS`.

- [ ] **Step 5: Commit**

```bash
rm -f scripts/_verify-top-brands.mjs
git add lib/top-brands.ts
git commit -m "Add lib/top-brands.ts — best-seller brand rail data with auto images"
```

---

## Task 6: `components/BrandRail.tsx`

**Files:**
- Create: `components/BrandRail.tsx`
- Test: rendered in Task 8 (`npm run build` here for type-check)

**Interfaces:**
- Consumes: `TopBrand[]` from `lib/top-brands`, `productImageSrc` from `lib/images`.
- Produces: `export default function BrandRail({ brands }: { brands: TopBrand[] }): JSX.Element` — renders `<section id="shop-brands">`; returns `null` when `brands` is empty.

- [ ] **Step 1: Write `components/BrandRail.tsx`**

```tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { productImageSrc } from "@/lib/images";
import type { TopBrand } from "@/lib/top-brands";

export default function BrandRail({ brands }: { brands: TopBrand[] }) {
  if (!brands || brands.length === 0) return null;

  return (
    <section id="shop-brands" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <p className="text-[11px] uppercase tracking-[0.32em] text-accent">Our best sellers</p>
        <h2 className="mt-2 font-serif text-3xl text-ink">Shop by Brand</h2>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {brands.map((b, i) => (
          <motion.div
            key={b.slug}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45, delay: Math.min(i, 5) * 0.06, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link
              href={`/brand/${b.slug}`}
              className="group relative block overflow-hidden rounded-[2rem] border border-white/60 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-pop"
            >
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-ink/[0.04]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={productImageSrc(b.imageUrl)}
                  alt={b.brand}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />
                <h3 className="absolute bottom-4 left-5 font-serif text-2xl text-white drop-shadow">
                  {b.brand}
                </h3>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npm run build`
Expected: passes (component is not yet mounted anywhere, but it must compile).

- [ ] **Step 3: Commit**

```bash
git add components/BrandRail.tsx
git commit -m "Add BrandRail component for the Shop by Brand section"
```

---

## Task 7: Rewrite `components/HeroSection.tsx` — still-image hero

**Files:**
- Rewrite: `components/HeroSection.tsx`
- Asset: `public/hero-home.jpg` (already committed)
- Test: `npm run build` + manual

**Interfaces:**
- Consumes: `public/hero-home.jpg`, `whatsappRequestLink` from `lib/links`.
- Produces: `export default function HeroSection({ orderCount }: { orderCount?: number })` — signature unchanged. No longer imports `AutoVideo`.

- [ ] **Step 1: Replace the file contents**

```tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { whatsappRequestLink } from "@/lib/links";

// Swap this constant to change the hero image (drop a file in /public).
const HERO_IMAGE = "/hero-home.jpg";

const fade = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

export default function HeroSection({ orderCount = 0 }: { orderCount?: number }) {
  const bespoke = whatsappRequestLink();

  return (
    <section className="relative flex min-h-[88vh] w-full items-center justify-center overflow-hidden bg-ink">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={HERO_IMAGE}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover object-top"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/35 to-ink/25" />

      <motion.div
        className="relative z-10 mx-auto max-w-2xl px-6 py-24 text-center"
        initial="hidden"
        animate="show"
        transition={{ staggerChildren: 0.15, delayChildren: 0.1 }}
      >
        <motion.p
          variants={fade}
          transition={{ duration: 0.6 }}
          className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/80"
        >
          🐝 London → Lebanon in 14 days
        </motion.p>
        <motion.h1
          variants={fade}
          transition={{ duration: 0.6 }}
          className="mt-5 font-serif text-[40px] font-bold leading-[1.08] text-white sm:text-[56px]"
        >
          London&apos;s Finest, <span className="text-accent">Sweetly Delivered</span> To You
        </motion.h1>
        <motion.p
          variants={fade}
          transition={{ duration: 0.6 }}
          className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-white/85"
        >
          Luxury beauty, skincare and personal sourcing — curated in London, delivered to your door
          with a pop of joy in 10–14 days.
        </motion.p>
        <motion.div
          variants={fade}
          transition={{ duration: 0.6 }}
          className="mt-9 flex flex-wrap items-center justify-center gap-3"
        >
          <Link href="#shop-brands" className="btn-primary">
            Discover
          </Link>
          <a href={bespoke} target="_blank" rel="noreferrer" className="btn-outline border-white/60 text-white">
            Request Bespoke
          </a>
        </motion.div>
        {orderCount > 0 ? (
          <motion.p
            variants={fade}
            transition={{ duration: 0.6 }}
            className="mt-7 inline-flex items-center gap-2 text-sm text-white/80"
          >
            <span aria-hidden className="inline-flex h-2 w-2 rounded-full bg-accent" />
            <strong className="text-white">{orderCount}+ orders</strong> delivered to Lebanon — and counting
          </motion.p>
        ) : null}
      </motion.div>
    </section>
  );
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: passes.

- [ ] **Step 3: Manual check**

`npm run dev` → homepage hero shows `hero-home.jpg`, no video network request (devtools Network → filter "mp4" → nothing for `hero-top.mp4`), headline legible on a 375px-wide viewport, "Discover" scrolls to the brand rail once Task 8 lands.

- [ ] **Step 4: Commit**

```bash
git add components/HeroSection.tsx
git commit -m "Hero: replace background video with a still image"
```

---

## Task 8: Rewrite `app/HomeClient.tsx` + wire `app/page.tsx`; delete `AutoVideo`

**Files:**
- Rewrite: `app/HomeClient.tsx`
- Modify: `app/page.tsx`
- Delete: `components/AutoVideo.tsx`
- Test: `npm run build` + manual

**Interfaces:**
- Consumes: `getCategoryStats`, `getBrandsForDirectory`, `getPublicOrderCount` (existing), `getTopBrands` (Task 5), `BrandRail` (Task 6), `HeroSection` (Task 7).
- Produces: `HomeClient({ categories, brands, topBrands, orderCount })` — **new prop `topBrands: TopBrand[]`**.

- [ ] **Step 1: Update `app/page.tsx`**

```tsx
import HomeClient from "./HomeClient";
import { getCategoryStats } from "@/lib/categories";
import { getBrandsForDirectory } from "@/lib/brands";
import { getPublicOrderCount } from "@/lib/order-stats";
import { getTopBrands } from "@/lib/top-brands";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [categoryStats, brands, topBrands, orderCount] = await Promise.all([
    getCategoryStats(),
    getBrandsForDirectory(),
    getTopBrands(6),
    getPublicOrderCount(),
  ]);
  return (
    <HomeClient
      categories={categoryStats}
      brands={brands}
      topBrands={topBrands}
      orderCount={orderCount}
    />
  );
}
```

- [ ] **Step 2: Rewrite `app/HomeClient.tsx`**

Keep these existing helper components **unchanged** in the file: `ShadeFinderBanner`, `CategoryCards`, `BespokeSection` (but see Step 3), `HudaBeautyBanner`, `WhySeasons`. Remove `KBeautyTeaser`, `HeroVideo`, and the `AutoVideo` / `HudaBlushPromo` imports. New top of file + new `HomeClient` body:

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { CategoryStat } from "@/lib/categories";
import type { BrandDirectoryEntry } from "@/lib/brands";
import type { TopBrand } from "@/lib/top-brands";
import { whatsappRequestLink } from "@/lib/links";
import HeroSection from "@/components/HeroSection";
import BrandRail from "@/components/BrandRail";
import SearchAutocomplete from "@/components/SearchAutocomplete";

interface Props {
  categories: CategoryStat[];
  brands: BrandDirectoryEntry[];
  topBrands: TopBrand[];
  orderCount?: number;
}

export default function HomeClient({ categories, brands, topBrands, orderCount = 0 }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeLetter, setActiveLetter] = useState<string | null>(null);

  const grouped = brands.reduce<Record<string, BrandDirectoryEntry[]>>((acc, b) => {
    const l = b.brand[0]?.toUpperCase() ?? "#";
    (acc[l] ||= []).push(b);
    return acc;
  }, {});
  const letters = Object.keys(grouped).sort();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <div className="flex flex-col">
      <HeroSection orderCount={orderCount} />

      <BrandRail brands={topBrands} />

      <HudaBeautyBanner />

      <div id="shop-categories">
        <CategoryCards categories={categories} />
      </div>

      {/* On-page search — kept per requirements */}
      <section id="shop" className="mx-auto w-full max-w-7xl px-4 pb-2 pt-6 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.32em] text-accent">Search the edit</p>
          <h2 className="mt-2 font-serif text-3xl text-ink">What are you looking for?</h2>
          <div className="mt-6">
            <SearchAutocomplete query={query} setQuery={setQuery} onSubmit={onSubmit} />
          </div>
        </div>
      </section>

      {/* A–Z brand directory — kept per requirements */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-4 pt-8 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-white/60 bg-white/40 p-6 backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.32em] text-accent">Browse by brand</p>
              <h2 className="mt-1 font-serif text-xl text-ink">All Brands A–Z</h2>
            </div>
            <Link href="/brands" className="text-[11px] uppercase tracking-[0.2em] text-ink/60 transition-colors hover:text-accent">
              Full directory →
            </Link>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-wrap lg:overflow-visible lg:pb-0">
            {letters.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setActiveLetter(activeLetter === l ? null : l)}
                className={
                  "h-9 w-9 shrink-0 rounded-full border text-sm font-bold transition-all " +
                  (activeLetter === l
                    ? "border-accent bg-accent text-white"
                    : "border-ink/15 bg-white text-ink hover:border-accent hover:text-accent")
                }
              >
                {l}
              </button>
            ))}
          </div>
          {activeLetter && grouped[activeLetter] ? (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-ink/10 pt-4">
              {grouped[activeLetter].map((b) => (
                <Link
                  key={b.brand}
                  href={`/brand/${b.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 bg-white px-3 py-1.5 text-xs font-bold text-ink transition-all hover:border-accent hover:text-accent"
                >
                  {b.brand}
                  <span className="text-[10px] font-normal text-ink/40">{b.count}</span>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <ShadeFinderBanner />

      <BespokeSection />

      <WhySeasons />
    </div>
  );
}
```

Then **delete** from the rest of the file: the `KBeautyTeaser` function and the `HeroVideo` function. Keep `ShadeFinderBanner`, `CategoryCards`, `BespokeSection`, `HudaBeautyBanner`, `WhySeasons`.

- [ ] **Step 3: Fix `BespokeSection` — remove its `<HeroVideo />`**

In `BespokeSection`, replace the `<HeroVideo />` element (last child of the grid) with a still image column:

```tsx
        <div className="relative mx-auto w-full max-w-lg">
          <div className="absolute -inset-6 rounded-[2.75rem] bg-accent/15 blur-3xl" aria-hidden />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/hero-home.jpg"
            alt="Seasons by B"
            className="relative aspect-[4/5] w-full rounded-[2rem] border-2 border-white object-cover shadow-pop"
          />
        </div>
```

- [ ] **Step 4: Delete `AutoVideo`**

```bash
git rm components/AutoVideo.tsx
```

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: passes. If it complains about `AutoVideo` still imported, grep `rg "AutoVideo"` in `app/` `components/` — there must be zero hits.

- [ ] **Step 6: Manual check** — `npm run dev`, homepage:

- Section order top→bottom: Hero → **Shop by Brand** (6 cards) → Huda Beauty band → Shop by Category (6 cards, no "Health & Nutrition") → "What are you looking for?" search → All Brands A–Z → Shade Finder banner → Bespoke → Why Seasons.
- Hero "Discover" button scrolls to the brand rail.
- No K-Beauty teaser on the page; `/k-beauty` still reachable from the header.
- Each brand card links to `/brand/<slug>` and loads.
- No `mp4` requests in the Network tab.
- 375px viewport: no horizontal scroll, hero readable.

- [ ] **Step 7: Commit**

```bash
git add app/HomeClient.tsx app/page.tsx
git commit -m "Homepage: new section order, best-seller brand rail, drop hero/bespoke video + K-Beauty teaser"
```

---

## Task 9: Fix stale `lib/promotions.ts` references

**Files:**
- Modify: `lib/promotions.ts`
- Test: `scripts/_verify-promos.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `PROMOS` only contains keys that exist in `products`.

- [ ] **Step 1: Write `scripts/_verify-promos.mjs`**

```js
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
for (const f of [".env.local", ".env"]) { try { for (const l of readFileSync(new URL("../"+f,import.meta.url),"utf8").split(/\r?\n/)) { const m=l.match(/^([A-Z_]+)=(.*)$/); if(m&&!process.env[m[1]])process.env[m[1]]=m[2].replace(/^['"]|['"]$/g,""); } } catch {} }
const sql = neon(process.env.DATABASE_URL);
const src = readFileSync(new URL("../lib/promotions.ts", import.meta.url), "utf8");
const ids = [...src.matchAll(/"([0-9a-f-]{36})"/g)].map((m) => m[1]);
console.log("promo ids in file:", ids);
let bad = 0;
for (const id of ids) {
  const r = await sql`select brand, name from products where id = ${id}`;
  console.log(id, "→", r[0] ? `${r[0].brand} / ${r[0].name}` : "MISSING");
  if (!r[0]) bad++;
}
console.log(bad === 0 ? "PASS" : `FAIL: ${bad} missing`);
process.exit(bad === 0 ? 0 : 1);
```

- [ ] **Step 2: Run it — expect FAIL** (both current ids report `MISSING`)

Run: `node scripts/_verify-promos.mjs`
Expected: two `MISSING` lines, `FAIL: 2 missing`.

- [ ] **Step 3: Decide the fix**

Ask the human which products (if any) should carry a "Special Promotion" compare-at price. If they have no answer, replace the `PROMOS` map with an empty object and a comment:

```ts
// No active compare-at promotions. Add entries as { "<product uuid>":
// { compareAtUsd: <number>, label: "Special Promotion" } } — the uuid MUST
// exist in `products` (scripts/_verify-promos style check).
const PROMOS: Record<string, Promo> = {};
```

- [ ] **Step 4: Run the verification — expect PASS**

Run: `node scripts/_verify-promos.mjs`
Expected: `promo ids in file: []`, `PASS`.

- [ ] **Step 5: Commit**

```bash
rm -f scripts/_verify-promos.mjs
git add lib/promotions.ts
git commit -m "Clear stale product ids from lib/promotions.ts (referenced rows no longer exist)"
```

---

## Task 10: Full build + PR

- [ ] **Step 1: Clean build**

Run: `npm run build`
Expected: passes with no errors or new warnings.

- [ ] **Step 2: Grep for leftovers**

Run: `rg -n "AutoVideo|HudaBlushPromo|PromoCartWatcher|huda-blush-promo|Health & Nutrition|health-nutrition" app/ components/ lib/ scraper-worker/`
Expected: zero hits outside comments that intentionally document the removal.

- [ ] **Step 3: `npm run dupe-check`**

Expected: `9 (baseline 9)`, `OK`.

- [ ] **Step 4: Manual smoke on `npm run dev`**

- `/` — full section order, brand rail images load, no console errors.
- `/category/skincare` — loads; `/category/health-nutrition` → `/`.
- `/brand/huda-beauty` — loads, no blush promo block.
- `/search?q=vitamin` — no archived products.
- `/k-beauty` — still works.
- Cart: add Huda products past $100 → no free gift; add Summer's Hottest Look Set → EDP gift still auto-adds.

- [ ] **Step 5: Push + open PR**

```bash
git push -u origin claude/homepage-redesign
gh pr create --title "Homepage redesign + catalogue cleanup" --body "$(cat <<'EOF'
Implements docs/superpowers/specs/2026-09-03-homepage-redesign-and-catalogue-cleanup-design.md.

- Product de-dupe: 182 groups merged, 249 rows removed (committed earlier); guards added so scraper/import can't recreate twins; `npm run dupe-check` monitor.
- Health & Nutrition retired from the storefront — rows archived (`products.archived`), not deleted; category removed from types, nav, routing, sitemap, feed, scraper.
- Huda Beauty free-blush promo removed (banner, cart watcher, cart nudge); persisted-cart sweep for the retired gift line. The separate "Summer's Hottest Look Set + EDP" gift is untouched.
- Homepage rebuilt: still-image hero (`/hero-home.jpg`), best-seller "Shop by Brand" rail (`lib/top-brands.ts`), single Huda Beauty feature band, K-Beauty teaser dropped from the body. On-page search + A–Z directory kept.
- `lib/promotions.ts` stale ids cleared.

**Post-merge:** redeploy the Railway `lara` scraper worker (`scraper-worker/*` changed).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- Change 1 (layout) → Tasks 6, 7, 8. Hero still image ✓, section order ✓, on-page search + A–Z kept ✓ (user override of spec noted), Huda-only band ✓, K-Beauty teaser dropped ✓, `AutoVideo` deleted ✓, Bespoke video removed ✓.
- Change 2 (blush promo) → Task 4. Three deletes ✓, layout/brand/cartsidebar edits ✓, persisted-cart sweep ✓, `is_promo_gift` kept ✓.
- Change 3 (Health & Nutrition) → Tasks 1, 2. Archive flag ✓, read-path filters ✓, code removal ✓, scraper removal ✓, redirect ✓. **Deviation from spec:** spec listed deletion as forbidden and archiving as the method — matches. Spec also mentioned `app/api/trending` — covered ✓.
- Change 4 (best-seller brands) → Tasks 5, 6, 8. `getTopBrands` ✓, fallback ✓, auto images ✓, `BrandRail` ✓, wired in `page.tsx` ✓.
- Change 5 (dedupe) → step 1 done pre-plan; step 2 (guards) → Task 2; monitor → Task 3. **Deviation:** spec put the monitor in `AdminDashboard`; plan makes it `npm run dupe-check` instead (less UI surface, still visible + CI-able). Acceptable.
- Stale `lib/promotions.ts` (found during dedupe) → Task 9.

**Placeholder scan:** Task 2 Step 8 (`lib/scraper.ts`) and Task 8 Step 2/3 reference "match the surrounding style / keep these helpers" rather than pasting the full file — acceptable because the full current file contents are large and the change is a localized insert; the exact guard SQL and the exact new `HomeClient` body are given verbatim. Task 9 Step 3 defers the promo-product decision to the human — that is a genuine product decision, not a plan gap, and has a concrete default (empty map).

**Type consistency:** `TopBrand { brand; slug; imageUrl; unitsSold }` defined in Task 5, consumed identically in Tasks 6 and 8. `getTopBrands(limit = 6)` — called as `getTopBrands(6)` in `page.tsx`. `HomeClient` new prop `topBrands: TopBrand[]` defined in Task 8 Step 2, passed in Task 8 Step 1. `HeroSection({ orderCount })` signature unchanged across Tasks 7 and 8.
