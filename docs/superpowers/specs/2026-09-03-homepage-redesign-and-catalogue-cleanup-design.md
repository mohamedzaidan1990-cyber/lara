# Design: Homepage Redesign + Catalogue Cleanup

**Date:** 2026-09-03
**Project:** LARA / Seasons by B (`C:\Users\User\LARA`)

---

## Overview

Five related changes, driven by a reference walkthrough of `skynhauslb.com` and a
catalogue-quality problem:

1. **Homepage layout rebuild** — replace the full-bleed hero *video* with a still
   image and restructure the page to the reference's section flow.
2. **Remove the Huda Beauty "free blush with $100 spend" promo** entirely.
3. **Remove the "Health & Nutrition" (vitamins) category** from every storefront
   surface — without deleting the product rows.
4. **"Shop by Brand" = best sellers** — a curated rail driven by real sales data
   with auto-derived card images.
5. **De-duplicate the `products` table** — one-time merge (price-locked rows win)
   plus guards so duplicates don't come back.

### Hard data-safety constraint

The **only** rows that may be deleted anywhere in this work are non-canonical
duplicate `products` rows (change 5). Specifically:

- `customers`, `orders`, `order_items` — **never touched**. `order_items` has no
  `product_id` FK; each line is a self-contained snapshot, so product changes
  cannot affect order history.
- `products` — no deletions except merging exact duplicates. Health & Nutrition
  rows are **archived (flagged), not deleted**.
- `stock_items`, `product_variants` — only re-pointed from a deleted duplicate to
  its surviving canonical row.

Every destructive step (the dedupe) runs in `--report` mode first and waits for
explicit sign-off before `--apply`.

---

## Reference layout (from the walkthrough video)

Mobile-first, top to bottom: sticky header (menu · centered logo · cart) →
full-bleed **still-photo hero** with centered headline + sub + outline "Discover"
button → **Shop by Brand** (large rounded portrait cards, one per row, brand name
bottom-left) → full-width colour "feature" band for one hero brand → **Shop by
Category** (same card style) → **Why Shop With Us** (icon + title + blurb trust
blocks) → footer + floating back-to-top.

---

## 1. Homepage layout rebuild

**Files:** `app/HomeClient.tsx` (rewrite), `components/HeroSection.tsx` (rewrite),
`app/page.tsx` (data wiring), new `components/BrandRail.tsx`, new
`lib/top-brands.ts`. Delete `components/AutoVideo.tsx` once unused.

### Hero → still image

- Drop `<AutoVideo src="/hero-top.mp4">`. `HeroSection` becomes a single
  full-bleed `<img>` (a luxury-beauty stock photo in the site's pink/cream
  palette, held in **one exported constant** so it can later be swapped for a
  `/public` asset with a one-line change), a dark gradient scrim, and a centered
  text block: `Playfair` headline, one-line subtitle, an **outline "Discover"
  button** linking to `#shop-brands`, and the existing "Request Bespoke" link.
- Keep the `{orderCount}+ orders delivered` social-proof line.
- `framer-motion` fade/stagger entrance is kept.
- Exported signature `HeroSection({ orderCount }: { orderCount?: number })` is
  unchanged.

### Section order (identical on mobile and desktop)

The current `order-1 … order-9` reordering hack is removed. New order:

1. Hero
2. **Shop by Brand** (`BrandRail`, change 4)
3. **Huda Beauty** full-width colour band — the *only* feature band. Reuse the
   existing `HudaBeautyBanner` markup from `HomeClient.tsx`, restyled full-bleed.
4. **Shop by Category** (`CategoryCards`, existing) — now 6 categories.
5. **On-page search** — the existing "What are you looking for?" /
   `SearchAutocomplete` section is **kept**.
6. **A–Z brand directory band** — the existing letter-filter grid is **kept**
   (still backed by `getBrandsForDirectory()`; full list at `/brands`).
7. **Shade Finder banner** — kept, condensed.
8. **Bespoke section** — kept. Its embedded `HeroVideo` column (the small
   `/hero.mp4` card) is **removed**; that column becomes a still editorial image
   or is dropped so the copy spans full width.
9. **Why Seasons** — kept (this is the reference's "Why shop with us").

### K-Beauty

The K-Beauty teaser is **removed from the homepage body** (Huda Beauty is the
only feature band). K-Beauty stays reachable via the header nav and `/k-beauty`.

### Component cleanup

- `components/AutoVideo.tsx` — after the hero and Bespoke videos are gone it has
  no callers → delete it.
- `components/HeroScene.tsx` (three.js) is already unused and stays out of scope;
  the `three` / `@react-three/*` dependencies are left in `package.json` (removal
  is a separate optional cleanup).

---

## 2. Remove the Huda Beauty "free blush" promo

The "Spend $100 on Huda Beauty, get a Blush Filter Liquid Blush free" mechanic.

### Delete

- `components/HudaBlushPromo.tsx`
- `lib/huda-blush-promo.ts`
- `components/PromoCartWatcher.tsx`

### Edit

- `app/layout.tsx` — remove `<PromoCartWatcher />`.
- `app/HomeClient.tsx` — remove `<HudaBlushPromo />` and `HudaBeautyBanner`'s
  promo wording is not affected (banner itself stays as the feature band).
- `app/brand/[slug]/page.tsx` — remove the `params.slug === "huda-beauty"`
  `<HudaBlushPromo variant="brand" />` block and its import.
- `components/CartSidebar.tsx` — remove the "you're $X away from a free Huda
  Beauty blush" progress-nudge block and the `huda-blush-promo` import.

### Keep

- `is_promo_gift` in `lib/cart.ts` and the checkout / product-detail gift
  plumbing — still used by the **separate, active** "Summer's Hottest Look Set +
  Easy Bake Intense EDP travel spray" gift (`promoGift` on the product detail
  page). That promo is untouched.

### Persisted-cart migration

Some shoppers' persisted `zustand` carts contain a line with
`id: "promo-huda-blush-gift"`. Add a one-time sweep in the cart store's rehydrate
path that drops any line with that id, so nobody checks out with a phantom
free item after the watcher is gone.

---

## 3. Remove "Health & Nutrition" (vitamins) from the storefront

105 product rows exist. They are **archived, not deleted** (data-safety
constraint). The category disappears from every user-facing and machine-facing
surface, and the scraper stops collecting it.

### New: `archived` flag (additive, reversible)

- Schema addition in `lib/db.ts` `SCHEMA_STATEMENTS`:
  `alter table products add column if not exists archived boolean not null default false`.
- One-time data statement (idempotent):
  `update products set archived = true where category = 'Health & Nutrition' and archived = false`.
- Add `and not archived` (or `and not coalesce(archived,false)`) to the shared
  product-reading queries so archived rows never surface:
  - `lib/categories.ts` — `getCategoryStats`, `getCategoryProducts`,
    `getCategoryBrands`, `getPopularBrands`, `getCategorySubcategories`
  - `lib/brands.ts` — `getBrandBySlug`, `getBrandProducts`,
    `getBrandsForDirectory`
  - `lib/search.ts` — all product/brand search queries
  - `lib/products.ts` — `getRelatedProducts` (and `getProductById` returns null
    for an archived id, so a stale link 404s cleanly)
  - `app/sitemap.ts`, `app/api/merchant-feed/route.ts`,
    `app/api/trending/route.ts` — exclude archived
- Reverting the whole change is `update products set archived = false where
  category = 'Health & Nutrition'`.

### Category removed from code

- `lib/featured.ts` — drop `"Health & Nutrition"` from the `Category` union,
  `CATEGORIES`, and `PRODUCT_CATEGORIES`.
- `lib/categories.ts` — remove the `health-nutrition` entry from `CATEGORY_DEFS`.
- `lib/currency.ts` — remove the `Health & Nutrition` pricing branch.
- `app/search/SearchPageClient.tsx` — drop from the `CATEGORIES` filter array.
- `app/category/[slug]/page.tsx` — `/category/health-nutrition` now has no
  `CategoryDef`; add a redirect to `/` for that slug so old inbound links resolve.

### Scraper worker (deploys separately on Railway — flag for redeploy)

- `scraper-worker/scraper.ts` — remove `"Health & Nutrition"` from
  `SCRAPE_CATEGORIES`, the category→path map (`foodhall/health-nutrition…`), and
  the subcategory map.
- `scraper-worker/db.ts` — remove from `VALID_CATEGORIES` and the upsert
  `category = case when excluded.category = ANY(ARRAY[...])` guard.
- `scraper-worker/currency.ts` — remove the `Health & Nutrition` branch.

---

## 4. "Shop by Brand" = best sellers

### New: `lib/top-brands.ts`

`getTopBrands(limit = 6): Promise<TopBrand[]>` where
`TopBrand = { brand: string; slug: string; imageUrl: string; unitsSold: number }`.

**Ranking** — real sales from `order_items`, joined case-insensitively to the
live (non-archived) catalogue:

```
with sold as (
  select lower(trim(product_brand)) as bkey,
         sum(quantity)::int as units,
         count(distinct order_id)::int as orders
  from order_items
  group by 1
)
select p.brand,
       s.units,
       -- card image: that brand's best-selling product, else a bestseller,
       -- else the lowest-popularity (most-wanted) product
       (select image_url from products p2
         where lower(trim(p2.brand)) = s.bkey and not p2.archived
           and coalesce(p2.image_url,'') <> ''
         order by (select coalesce(sum(oi.quantity),0) from order_items oi
                    where oi.product_url = p2.product_url) desc,
                  coalesce(p2.is_bestseller,false) desc,
                  p2.popularity asc nulls last
         limit 1) as image_url
from sold s
join lateral (
  select brand from products p1
  where lower(trim(p1.brand)) = s.bkey and not p1.archived
  group by brand order by count(*) desc limit 1
) p on true
where s.orders >= 3            -- filter one-off bulk buys
order by s.units desc
limit ${limit}
```

- Current top 6 by this rule: **Huda Beauty, Charlotte Tilbury, Kiehl's, Benefit
  Cosmetics, Fenty Beauty, Sol de Janeiro**.
- **Fallback:** if the query returns fewer than `limit` rows (thin data), pad
  from a hardcoded curated list in the same file.
- `slug` via existing `brandSlug()` from `lib/brands.ts`.

### New: `components/BrandRail.tsx`

Renders the reference's card style: large rounded portrait cards, brand name
bottom-left on a soft scrim, one per row on mobile / 3-up on desktop. Each card
links to `/brand/[slug]`. Section id `shop-brands` (hero "Discover" target).
Reuses the `framer-motion` reveal pattern already in `CategoryCards`.

### Wiring

`app/page.tsx` fetches `getTopBrands()` alongside the existing
`getCategoryStats()` / `getBrandsForDirectory()` / `getPublicOrderCount()` and
passes `topBrands` into `HomeClient`. The A–Z directory still uses
`getBrandsForDirectory()` (change 1, section 6).

---

## 5. De-duplicate the `products` table

**Confirmed scale:** 7,750 rows; **191 exact `lower(brand)+lower(name)` duplicate
groups = 263 surplus rows**, plus regional-URL near-duplicates, some at
inconsistent prices. Root cause: the same product scraped under different
`product_url`s (`en-gb` / `en-qa` / `en-us`, Selfridges vs Sephora), and ~192
rows with a null `product_url` (outside the unique index).

### Step 1 — one-time merge: `scripts/dedupe-products.ts`

Grouping key: `lower(trim(brand))` + `lower(trim(name))`.

**Canonical row per group**, in priority order:

1. **Any row whose `id` is hard-referenced in code** — `lib/promotions.ts`
   (`236f4952…`, `39bcccfb…`). Never deleted. (The ex-`huda-blush-promo` id is no
   longer referenced after change 2.)
2. **`price_locked = true`** — a manually curated price wins.
3. Row that **owns `product_variants`, or has `shades` / `k_beauty` / a non-empty
   `image_url`**.
4. **Most recent `scraped_at`** — freshest price.

If a tie remains, lowest `id` for determinism.

**Merge actions per group:**

- `update stock_items set product_id = :canonical where product_id = any(:losers)`
- `update product_variants set product_id = :canonical where product_id =
  any(:losers)` — on `unique (product_id, shade_name)` conflict, delete the
  losing variant row instead.
- `delete from products where id = any(:losers)`

**Modes:**

- `--report` (default): writes `scripts/out/dedupe-report.md` — every group with
  the kept row (id, price, url, why-chosen) and each deleted row (id, price, url).
  No writes. **Requires sign-off.**
- `--apply`: runs the merge inside a single transaction; prints a summary
  (groups processed, rows deleted, variants/stock re-pointed).

### Step 2 — prevent recurrence

- `scraper-worker/db.ts` `upsertProducts`: when the `ON CONFLICT (product_url)`
  finds no match, first
  `select id from products where lower(trim(brand)) = lower(trim($1)) and
  lower(trim(name)) = lower(trim($2)) limit 1` — if a row exists, **skip the
  insert** and `console.warn` instead of creating a twin.
- Same guard in `app/api/admin/import-product/route.ts` and
  `app/api/admin/save-products/route.ts`.
- `app/admin/AdminDashboard.tsx` (Stock tab) — surface a small "N duplicate
  name-groups" figure so regressions stay visible. Query:
  `select count(*) from (select 1 from products where not archived
  group by lower(trim(brand)), lower(trim(name)) having count(*) > 1) t`.
- **Not** adding a `unique(lower(brand),lower(name))` index — too many legitimate
  edge cases (refills, relaunches, null brands). The code guard + dashboard
  monitor is the safer control.

---

## Sequencing

Each numbered item is its own commit on branch `claude/homepage-redesign`; ships
as one PR (Vercel auto-deploys a preview — verified before merge).

1. Branch + normalise CRLF-only working-tree noise.
2. **5-Step 1 `--report`** → user reviews `dedupe-report.md` → **`--apply`**.
3. **3** (archive + de-list Health & Nutrition) and **5-Step 2** (dedupe guards).
4. **2** (remove blush promo).
5. **4** (`lib/top-brands.ts` + `BrandRail`).
6. **1** (hero + layout rebuild) — last, built against the final section set.
7. Preview build, manual mobile-viewport check, PR.
8. Redeploy the Railway scraper worker (change 3) after merge.

---

## Testing / Verification

No automated component tests exist; verification is manual (`npm run dev`) plus
targeted DB checks:

- **Dedupe:** after `--apply`, re-run the duplicate-count query → expect 0 exact
  groups; `select count(*) from products` dropped by exactly the reported surplus;
  `order_items` / `orders` / `customers` row counts unchanged; spot-check that
  `lib/promotions.ts` ids and every `price_locked` product still exist; product
  detail pages for a few merged items still load; `/brand/huda-beauty` variants
  intact.
- **Health & Nutrition:** `/category/health-nutrition` redirects to `/`; header
  Shop menu and mobile menu no longer list it; site search for "collagen" /
  "vitamin" returns no archived rows; sitemap and `/api/merchant-feed` exclude
  them; `select count(*) from products where category='Health & Nutrition'`
  still 105, all `archived = true`.
- **Blush promo:** adding $100+ of Huda Beauty to the cart no longer injects a
  free blush; cart sidebar shows no promo nudge; a persisted cart that had the
  gift line loses it on reload; the Summer's Hottest Look Set still auto-adds its
  EDP gift.
- **Shop by Brand:** rail shows 6 brands, each with an image, each linking to the
  right `/brand/[slug]`; hero "Discover" scrolls to it.
- **Layout:** hero is a still image, loops nothing, text legible on mobile and
  desktop; section order matches this spec; A–Z grid and on-page search still
  present and working; no references to deleted `AutoVideo` / `HudaBlushPromo` /
  `PromoCartWatcher` remain (`npm run build` passes).
