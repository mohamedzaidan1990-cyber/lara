# Shade Variants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Scrape per-shade product images from Selfridges PDPs, store as `product_variants`, show the lightest shade image on product cards, and add a clickable shade swatch image-switcher on the product detail page.

**Architecture:** New `product_variants` table stores each shade's full image URL (derived from existing Scene7 swatch slug by replacing `_SW` with `_M`) plus a light-first `sort_order`. The scraper worker adds a post-catalog variant enrichment pass. ProductCard shows `light_shade_image_url ?? image_url`. ProductDetail fetches variants and updates the hero image when a swatch is clicked.

**Tech Stack:** Neon Serverless Postgres (Next.js app), pg Pool (scraper-worker), Next.js 14 App Router, React hooks, TypeScript.

## Global Constraints

- Selfridges is the sole scraping source; Oxylabs Web Unblocker provides PDP access.
- Shade image URLs: Scene7 `_M` suffix at `wid=960&hei=1280&fmt=webp&qlt=80`.
- Swatch image URLs: Scene7 `_SW` suffix at `wid=64&hei=64&fmt=webp&qlt=80`.
- Image derivation: given swatch slug e.g. `R03895098_0.5N_SW`, replace `_SW` with `_M` for full image slug, replace `_SW` with nothing (keep base) for swatch.
- Actually: `image_url = swatch_slug.replace(/_SW$/i, '_M')`, `swatch_url = swatch_slug` (unchanged, already ends `_SW`).
- `sort_order` uses the same light-first scoring as `sortShadesLightFirst` in `lib/shade-options.ts` (numeric codes first, keyword scores after).
- Shade-relevant subcategories: Foundation, Concealer, Primer, Powder, Blush, Bronzer & Contour, Highlighter, Setting Spray, Lipstick, Lip Gloss & Oil, Lip Liner, Lip Care, Mascara, Eyeliner, Eyeshadow, Brows, Nails, Palettes.
- Shade-relevant fallback regex (for name matching): `/foundation|concealer|tint|bb cream|cc cream|cushion|complexion|lipstick|lip gloss|nail/i`
- Scraper-worker uses `pg` Pool (not Neon serverless). Next.js app uses `getSql()` from `lib/db.ts`.
- No TypeScript errors after changes (`npx tsc --noEmit` must pass).
- No new dependencies.
- YAGNI — do not add features beyond what each task describes.
- Frequent commits, one per logical unit.

---

### Task 1: Schema additions

**Files:**
- Modify: `lib/db.ts` (append to `SCHEMA_STATEMENTS` array)
- Modify: `scraper-worker/db.ts` (append to the SQL string inside `ensureSchema()`)

**Interfaces:**
- Produces: `product_variants` table and two new columns on `products` available to all subsequent tasks.

**Context:**
- `lib/db.ts` has `SCHEMA_STATEMENTS: string[]` array. Append new entries after the last existing entry (before the closing `]`).
- `scraper-worker/db.ts` `ensureSchema()` runs one big `client.query(...)` string. Append after the last `ALTER TABLE` line.
- Both must use `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` for idempotency.

- [ ] **Step 1: Add to `lib/db.ts` SCHEMA_STATEMENTS**

Append these entries to the `SCHEMA_STATEMENTS` array in `lib/db.ts` (after the last existing `stock_items` entry):

```typescript
  // ----- Per-shade product variants (from Selfridges PDP extraction) -----
  `create table if not exists product_variants (
    id uuid default gen_random_uuid() primary key,
    product_id uuid not null references products(id) on delete cascade,
    shade_name text not null,
    shade_image_url text,
    swatch_url text,
    sort_order int not null default 0,
    created_at timestamp default now(),
    unique (product_id, shade_name)
  )`,
  `create index if not exists product_variants_product_id_idx on product_variants (product_id)`,
  // Lightest shade image for fast card rendering (no JOIN needed per card).
  `alter table products add column if not exists light_shade_image_url text`,
  // Tracks when variant enrichment last ran for a product.
  `alter table products add column if not exists variants_checked_at timestamp`,
```

- [ ] **Step 2: Add same schema to `scraper-worker/db.ts`**

In `scraper-worker/db.ts`, the `ensureSchema()` function runs a single SQL string. Append at the end of that SQL string (before the closing backtick/paren):

```sql
    CREATE TABLE IF NOT EXISTS product_variants (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      shade_name text NOT NULL,
      shade_image_url text,
      swatch_url text,
      sort_order int NOT NULL DEFAULT 0,
      created_at timestamp DEFAULT now(),
      UNIQUE (product_id, shade_name)
    );
    CREATE INDEX IF NOT EXISTS product_variants_product_id_idx ON product_variants (product_id);
    ALTER TABLE products ADD COLUMN IF NOT EXISTS light_shade_image_url text;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS variants_checked_at timestamp;
```

- [ ] **Step 3: TypeScript check**

```
cd C:\Users\User\LARA && npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add lib/db.ts scraper-worker/db.ts
git commit -m "feat: add product_variants table and light_shade_image_url/variants_checked_at columns"
```

---

### Task 2: Shade options update + product-shades API populates variants

**Files:**
- Modify: `lib/shade-options.ts`
- Modify: `app/api/product-shades/route.ts`

**Interfaces:**
- Consumes: `product_variants` table from Task 1.
- Produces: `ShadeOption.image_url` field; `/api/product-shades` now also upserts into `product_variants` and updates `products.light_shade_image_url` as a side effect when a PDP is fetched on-demand.

**Context:**
- `extractShadeOptions(html)` parses `"colours":[{"name":"...","swatch":"R03895098_0.5N_SW"}]` from Selfridges PDP HTML.
- The swatch slug pattern: `<sku>_<shadeCode>_SW` (always ends `_SW`).
- Full shade image: replace `_SW` with `_M` in the slug, then construct full URL with `wid=960&hei=1280`.
- `shadeScore(name)` function already exists in `lib/shade-options.ts` — reuse it for sort_order.
- `/api/product-shades/route.ts` calls `extractShadeOptions(html)` and caches result in `products.shades`. Extend it: after caching, also upsert into `product_variants` and update `products.light_shade_image_url`.
- The upsert should be: `INSERT INTO product_variants (product_id, shade_name, shade_image_url, swatch_url, sort_order) VALUES ... ON CONFLICT (product_id, shade_name) DO UPDATE SET shade_image_url=EXCLUDED.shade_image_url, swatch_url=EXCLUDED.swatch_url, sort_order=EXCLUDED.sort_order`.
- `light_shade_image_url` = `shade_image_url` of the variant with `sort_order = MIN(sort_order)` — pick after insert by selecting the first result ordered by `sort_order ASC LIMIT 1`.

- [ ] **Step 1: Add `image_url` to `ShadeOption` interface in `lib/shade-options.ts`**

```typescript
export interface ShadeOption {
  name: string;
  swatch_url: string;
  image_url: string;  // full per-shade product image (Scene7 _M); "" if no swatch slug
}
```

- [ ] **Step 2: Update `extractShadeOptions` to compute `image_url`**

In the `.map()` inside `extractShadeOptions`:

```typescript
const swatchSlug = typeof c.swatch === "string" && c.swatch ? c.swatch : "";
const imageSlug = swatchSlug ? swatchSlug.replace(/_SW$/i, "_M") : "";
return {
  name: formatShadeName(c.name as string),
  swatch_url: swatchSlug
    ? `https://images.selfridges.com/is/image/selfridges/${swatchSlug}?wid=64&hei=64&fmt=webp&qlt=80`
    : "",
  image_url: imageSlug
    ? `https://images.selfridges.com/is/image/selfridges/${imageSlug}?wid=960&hei=1280&fmt=webp&qlt=80`
    : ""
};
```

- [ ] **Step 3: Export `shadeScore` from `lib/shade-options.ts`** (it's currently unexported — it's needed by the API route and scraper)

Change `function shadeScore(` to `export function shadeScore(`.

- [ ] **Step 4: Update `/api/product-shades/route.ts` to populate variants after PDP fetch**

After the line `await sql\`update products set shades = ...\``, add:

```typescript
// Populate product_variants from the freshly-extracted shades.
if (shades.length > 0) {
  for (const shade of shades) {
    const score = shadeScore(shade.name);
    await sql`
      insert into product_variants (product_id, shade_name, shade_image_url, swatch_url, sort_order)
      values (${id}, ${shade.name}, ${shade.image_url || null}, ${shade.swatch_url || null}, ${score})
      on conflict (product_id, shade_name) do update set
        shade_image_url = excluded.shade_image_url,
        swatch_url = excluded.swatch_url,
        sort_order = excluded.sort_order
    `;
  }
  // Update light_shade_image_url with the lightest shade that has an image.
  await sql`
    update products
    set light_shade_image_url = (
      select shade_image_url from product_variants
      where product_id = ${id} and shade_image_url is not null and shade_image_url <> ''
      order by sort_order asc
      limit 1
    )
    where id = ${id}
  `;
}
```

Import `shadeScore` at the top:
```typescript
import { extractShadeOptions, isShadeRelevant, shadeScore, type ShadeOption } from "@/lib/shade-options";
```

- [ ] **Step 5: TypeScript check**

```
cd C:\Users\User\LARA && npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add lib/shade-options.ts app/api/product-shades/route.ts
git commit -m "feat: add image_url to ShadeOption and populate product_variants from on-demand PDP fetch"
```

---

### Task 3: Scraper-worker variant enrichment pass

**Files:**
- Create: `scraper-worker/shade-enricher.ts`
- Modify: `scraper-worker/index.ts`

**Interfaces:**
- Consumes: `product_variants` and `light_shade_image_url`/`variants_checked_at` on `products` (Task 1). Oxylabs creds from env. `pg` Pool from `./db`.
- Produces: Populated `product_variants` rows and updated `products.light_shade_image_url` + `products.variants_checked_at` for enriched products.

**Context:**
- Scraper-worker uses `pg` Pool (not Neon serverless). Use `getPool()` from `./db`.
- Oxylabs endpoint: `https://realtime.oxylabs.io/v1/queries`. Same auth pattern as in `scraper.ts` (env vars `OXYLABS_USERNAME` + `OXYLABS_PASSWORD`). Request body: `{source: "universal", url, render: "html", geo_location: "United Kingdom"}`.
- Re-implement the shade extraction inline in the enricher (don't import from `lib/shade-options.ts` — that's in the Next.js app, not in the scraper-worker package). The logic is: find `"colours":[` in HTML, balanced-bracket scan to extract the JSON array, parse each `{name, swatch}` entry.
- Sort order scoring: re-implement `shadeScore` inline in the enricher (copy the LIGHT_SCORES array and logic from `lib/shade-options.ts`).
- Batch: process at most 50 products per enrichment run (configurable via `VARIANT_BATCH_SIZE` env var). This limits Oxylabs credit usage.
- Delay 2 seconds between each PDP fetch.
- Products to enrich: `SELECT id, product_url FROM products WHERE product_url LIKE '%selfridges.com%' AND (variants_checked_at IS NULL OR variants_checked_at < NOW() - INTERVAL '7 days') AND (subcategory = ANY($1) OR name ~* $2) ORDER BY COALESCE(variants_checked_at, '1970-01-01'::timestamp) ASC LIMIT $3`.
  - $1 = the SHADE_RELEVANT_SUBCATEGORIES array
  - $2 = 'foundation|concealer|tint|bb cream|cc cream|cushion|complexion|lipstick|lip gloss|nail'
  - $3 = batch size

- [ ] **Step 1: Create `scraper-worker/shade-enricher.ts`**

```typescript
import { getPool } from "./db";

const OXYLABS_ENDPOINT = "https://realtime.oxylabs.io/v1/queries";

const SHADE_RELEVANT_SUBCATEGORIES = [
  "Foundation", "Concealer", "Primer", "Powder", "Blush", "Bronzer & Contour",
  "Highlighter", "Setting Spray", "Lipstick", "Lip Gloss & Oil", "Lip Liner",
  "Lip Care", "Mascara", "Eyeliner", "Eyeshadow", "Brows", "Nails", "Palettes"
];

const SHADE_NAME_REGEX =
  "foundation|concealer|tint|bb cream|cc cream|cushion|complexion|lipstick|lip gloss|nail";

const LIGHT_SCORES: Array<[string, number]> = [
  ["ivory", 1], ["porcelain", 2], ["alabaster", 3], ["pearl", 4], ["shell", 5],
  ["fair", 6], ["light", 7], ["pale", 8], ["vanilla", 9], ["cream", 10],
  ["nude", 15], ["natural", 16], ["beige", 17], ["sand", 18], ["champagne", 19],
  ["opal", 20], ["linen", 21], ["wheat", 22],
  ["warm", 25], ["golden", 26], ["honey", 27], ["caramel", 28],
  ["tan", 35], ["medium", 36], ["tawny", 37],
  ["deep", 50], ["dark", 51], ["rich", 52], ["mocha", 53], ["coffee", 54],
  ["walnut", 55], ["chocolate", 56], ["chestnut", 57], ["mahogany", 58],
  ["espresso", 59], ["truffle", 60], ["umber", 61], ["cocoa", 62],
  ["ebony", 63], ["midnight", 64], ["noir", 65], ["black", 66], ["onyx", 67],
];

function shadeScore(name: string): number {
  const lower = name.toLowerCase();
  const numMatch = lower.match(/^(\d+(?:\.\d+)?)/);
  if (numMatch) return parseFloat(numMatch[1]) * 3;
  for (const [keyword, score] of LIGHT_SCORES) {
    if (lower.includes(keyword)) return score;
  }
  return 30;
}

function formatShadeName(raw: string): string {
  return raw.trim().split(/\s+/).map((w) =>
    /\d/.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)
  ).join(" ");
}

interface ExtractedShade {
  name: string;
  swatch_url: string;
  image_url: string;
  sort_order: number;
}

function extractShades(html: string): ExtractedShade[] {
  for (const marker of ['\\"colours\\":[', '"colours":[']) {
    const at = html.indexOf(marker);
    if (at < 0) continue;
    const start = at + marker.length - 1;
    let depth = 0;
    for (let i = start; i < html.length && i < start + 200_000; i++) {
      if (html[i] === "[") depth++;
      else if (html[i] === "]") {
        depth--;
        if (depth === 0) {
          const rawJson = html.slice(start, i + 1).replace(/\\"/g, '"');
          try {
            const arr = JSON.parse(rawJson) as Array<{ name?: string; swatch?: string }>;
            return arr
              .filter((c) => typeof c?.name === "string" && c.name.trim().length > 0)
              .map((c) => {
                const name = formatShadeName(c.name as string);
                const swatchSlug = typeof c.swatch === "string" && c.swatch ? c.swatch : "";
                const imageSlug = swatchSlug ? swatchSlug.replace(/_SW$/i, "_M") : "";
                return {
                  name,
                  swatch_url: swatchSlug
                    ? `https://images.selfridges.com/is/image/selfridges/${swatchSlug}?wid=64&hei=64&fmt=webp&qlt=80`
                    : "",
                  image_url: imageSlug
                    ? `https://images.selfridges.com/is/image/selfridges/${imageSlug}?wid=960&hei=1280&fmt=webp&qlt=80`
                    : "",
                  sort_order: shadeScore(name),
                };
              });
          } catch {
            return [];
          }
        }
      }
    }
  }
  return [];
}

async function fetchPdpHtml(url: string): Promise<string> {
  const user = process.env.OXYLABS_USERNAME;
  const pass = process.env.OXYLABS_PASSWORD;
  if (!user || !pass) return "";
  const auth = Buffer.from(`${user}:${pass}`).toString("base64");
  try {
    const res = await fetch(OXYLABS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
      body: JSON.stringify({ source: "universal", url, render: "html", geo_location: "United Kingdom" }),
      signal: AbortSignal.timeout(60_000)
    });
    if (!res.ok) return "";
    const data = (await res.json()) as { results?: Array<{ content?: string }> };
    return data.results?.[0]?.content ?? "";
  } catch {
    return "";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function runVariantEnrichment(): Promise<void> {
  const user = process.env.OXYLABS_USERNAME;
  const pass = process.env.OXYLABS_PASSWORD;
  if (!user || !pass) {
    console.log("[enricher] Oxylabs creds missing — skipping variant enrichment");
    return;
  }

  const batchSize = parseInt(process.env.VARIANT_BATCH_SIZE ?? "50", 10);
  const pool = getPool();

  const { rows: products } = await pool.query<{ id: string; product_url: string }>(
    `SELECT id, product_url FROM products
     WHERE product_url LIKE '%selfridges.com%'
       AND (variants_checked_at IS NULL OR variants_checked_at < NOW() - INTERVAL '7 days')
       AND (subcategory = ANY($1) OR name ~* $2)
     ORDER BY COALESCE(variants_checked_at, '1970-01-01'::timestamp) ASC
     LIMIT $3`,
    [SHADE_RELEVANT_SUBCATEGORIES, SHADE_NAME_REGEX, batchSize]
  );

  if (products.length === 0) {
    console.log("[enricher] No products need variant enrichment");
    return;
  }

  console.log(`[enricher] Enriching ${products.length} products`);
  let enriched = 0;

  for (const product of products) {
    // Always mark checked_at so a failed fetch doesn't retry every run.
    await pool.query(
      `UPDATE products SET variants_checked_at = NOW() WHERE id = $1`,
      [product.id]
    );

    const html = await fetchPdpHtml(product.product_url);
    if (!html) {
      console.log(`[enricher] PDP fetch failed: ${product.product_url}`);
      await sleep(2000);
      continue;
    }

    const shades = extractShades(html);
    if (shades.length === 0) {
      await sleep(2000);
      continue;
    }

    for (const shade of shades) {
      await pool.query(
        `INSERT INTO product_variants (product_id, shade_name, shade_image_url, swatch_url, sort_order)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (product_id, shade_name) DO UPDATE SET
           shade_image_url = EXCLUDED.shade_image_url,
           swatch_url = EXCLUDED.swatch_url,
           sort_order = EXCLUDED.sort_order`,
        [product.id, shade.name, shade.image_url || null, shade.swatch_url || null, shade.sort_order]
      );
    }

    // Set light_shade_image_url to the lightest shade that has an image.
    await pool.query(
      `UPDATE products
       SET light_shade_image_url = (
         SELECT shade_image_url FROM product_variants
         WHERE product_id = $1
           AND shade_image_url IS NOT NULL AND shade_image_url <> ''
         ORDER BY sort_order ASC LIMIT 1
       )
       WHERE id = $1`,
      [product.id]
    );

    enriched++;
    console.log(`[enricher] ${product.product_url} → ${shades.length} shades`);
    await sleep(2000);
  }

  console.log(`[enricher] Done — enriched ${enriched}/${products.length} products`);
}
```

- [ ] **Step 2: Call `runVariantEnrichment` from `scraper-worker/index.ts` after the catalog scrape**

At the end of `runOnce()`, before the final `console.log` summary line, add:

```typescript
  // Variant enrichment pass: fetch Selfridges PDPs for shade-relevant products
  // and populate product_variants + light_shade_image_url.
  try {
    const { runVariantEnrichment } = await import("./shade-enricher");
    await runVariantEnrichment();
  } catch (err) {
    console.error("[worker] variant enrichment failed — continuing", err);
  }
```

(Import at the bottom of `runOnce()`, not top-level, to keep the existing module structure clean.)

- [ ] **Step 3: TypeScript check**

```
cd C:\Users\User\LARA && npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add scraper-worker/shade-enricher.ts scraper-worker/index.ts
git commit -m "feat: add variant enrichment pass to scraper-worker for Selfridges shade images"
```

---

### Task 4: `/api/product-variants` API endpoint

**Files:**
- Create: `app/api/product-variants/route.ts`

**Interfaces:**
- Consumes: `product_variants` table (Task 1).
- Produces: `GET /api/product-variants?id={uuid}` → `{ variants: Array<{shade_name, shade_image_url, swatch_url, sort_order}> }` ordered by `sort_order ASC`.

**Context:**
- Use `getSql()` from `@/lib/db` and `ensureSchema`.
- Validate that `id` matches UUID pattern before querying.
- Return `{ variants: [] }` on any error or missing product.
- No auth required (public read-only).

- [ ] **Step 1: Create `app/api/product-variants/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") ?? "";
  if (!/^[0-9a-fA-F-]{36}$/.test(id)) {
    return NextResponse.json({ variants: [] });
  }
  try {
    await ensureSchema();
    const sql = getSql();
    const rows = (await sql`
      select shade_name, shade_image_url, swatch_url, sort_order
      from product_variants
      where product_id = ${id}
      order by sort_order asc
    `) as Array<{ shade_name: string; shade_image_url: string | null; swatch_url: string | null; sort_order: number }>;
    return NextResponse.json({ variants: rows });
  } catch {
    return NextResponse.json({ variants: [] });
  }
}
```

- [ ] **Step 2: TypeScript check**

```
cd C:\Users\User\LARA && npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/product-variants/route.ts
git commit -m "feat: add /api/product-variants endpoint"
```

---

### Task 5: ProductCard and ProductListRow — light shade image

**Files:**
- Modify: `lib/categories.ts` (ProductListRow interface + all SELECT queries)
- Modify: `lib/brands.ts` (SELECT query in getBrandProducts)
- Modify: `lib/kbeauty.ts` (SELECT in getFeaturedKBeauty + getKBeautyProducts)
- Modify: `components/ProductCard.tsx` (ProductCardData interface + image src)
- Modify: `app/category/[slug]/page.tsx` (pass light_shade_image_url in product prop)
- Modify: `app/brand/[slug]/page.tsx` (pass light_shade_image_url in product prop)

**Interfaces:**
- Consumes: `products.light_shade_image_url` column (Task 1).
- Produces: ProductCard renders the lightest shade image instead of the default product image when available.

**Context:**
- `ProductListRow` is in `lib/categories.ts`. Add `light_shade_image_url: string | null` field.
- All SELECT queries that return ProductListRow already select `image_url`. Also select `light_shade_image_url`.
- `ProductCardData` in `components/ProductCard.tsx`. Add `light_shade_image_url?: string | null`.
- In `ProductCard`, the image src is currently `productImageSrc(product.image_url)`. Change to `productImageSrc(product.light_shade_image_url ?? product.image_url)`.
- K-beauty page passes `product={p}` directly (p is ProductListRow), so no change needed to k-beauty page — adding field to ProductListRow is sufficient.
- Category page constructs product object explicitly: add `light_shade_image_url: p.light_shade_image_url` to the object passed to ProductCard.
- Brand page constructs product object explicitly: add `light_shade_image_url: p.light_shade_image_url` to the object passed to ProductCard.

- [ ] **Step 1: Add `light_shade_image_url` to `ProductListRow` in `lib/categories.ts`**

```typescript
export interface ProductListRow {
  id: string;
  brand: string;
  name: string;
  category: ProductCategory;
  subcategory: string | null;
  price_gbp: number;
  price_usd: number;
  deliverable_lebanon: boolean;
  product_url: string;
  image_url: string;
  light_shade_image_url: string | null;  // ADD THIS
}
```

- [ ] **Step 2: Update all SELECT queries in `lib/categories.ts` (4 queries in `getCategoryProducts`)**

Each select currently ends with `image_url`. Change each to:
```sql
image_url, light_shade_image_url
```
(there are 4 SELECT blocks in getCategoryProducts, one per sort branch)

- [ ] **Step 3: Update SELECT in `lib/brands.ts` `getBrandProducts()`**

Change the select line to include `light_shade_image_url`:
```sql
select id, brand, name, category, subcategory, price_gbp::float8 as price_gbp, price_usd::float8 as price_usd,
       deliverable_lebanon, product_url, image_url, light_shade_image_url
```

- [ ] **Step 4: Update SELECT in `lib/kbeauty.ts` (`getFeaturedKBeauty` and `getKBeautyProducts`)**

Both selects: add `light_shade_image_url` after `image_url`.

- [ ] **Step 5: Add `light_shade_image_url` to `ProductCardData` in `components/ProductCard.tsx`**

```typescript
export interface ProductCardData {
  id?: string;
  brand: string;
  name: string;
  price_gbp: number;
  price_usd: number;
  deliverable_lebanon: boolean;
  product_url: string;
  image_url: string;
  category?: string;
  subcategory?: string | null;
  light_shade_image_url?: string | null;  // ADD THIS
}
```

- [ ] **Step 6: Update image src in `ProductCard` component**

Find the image rendering code in `ProductCard` (currently uses `product.image_url`). Change the image src expression to:
```typescript
productImageSrc(product.light_shade_image_url ?? product.image_url)
```
(There may be multiple places: the main image and the fallback. Find the main image rendered in the card and apply this change.)

- [ ] **Step 7: Update `app/category/[slug]/page.tsx` product prop**

In the ProductCard invocation, add:
```typescript
light_shade_image_url: p.light_shade_image_url
```
to the product object already being constructed.

- [ ] **Step 8: Update `app/brand/[slug]/page.tsx` product prop**

Same as Step 7 — add `light_shade_image_url: p.light_shade_image_url` to the product object.

- [ ] **Step 9: TypeScript check**

```
cd C:\Users\User\LARA && npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 10: Commit**

```bash
git add lib/categories.ts lib/brands.ts lib/kbeauty.ts components/ProductCard.tsx app/category/[slug]/page.tsx app/brand/[slug]/page.tsx
git commit -m "feat: product cards show lightest shade image when available"
```

---

### Task 6: ProductDetail shade image switcher

**Files:**
- Modify: `app/product/[id]/ProductDetailClient.tsx`

**Interfaces:**
- Consumes: `GET /api/product-variants?id={productId}` (Task 4) → `{ variants: Array<{shade_name, shade_image_url, swatch_url, sort_order}> }`.
- Consumes: `product.light_shade_image_url` via `ProductDetail` type (see `lib/products.ts` — add field there if not present).
- Produces: Hero image updates to the clicked shade's `shade_image_url`; active swatch highlighted.

**Context:**
- `ProductDetailClient` receives `product: ProductDetail`. Check `lib/products.ts` to see if `light_shade_image_url` is in `ProductDetail`; add it if not.
- `ShadePicker` currently fetches from `/api/product-shades`. The new design fetches from `/api/product-variants` instead.
- If variants returned → use them (has both swatch_url for the circle and shade_image_url for the hero).
- If variants empty → fall back to `/api/product-shades` (swatch circle only, no hero image change).
- State to add to `ProductDetailClient`:
  - `const [variantImage, setVariantImage] = useState<string | null>(product.light_shade_image_url ?? null)` — initialise from product's pre-computed lightest shade image.
  - Hero image source: use `variantImage` when set, otherwise fall back to `productImageSrc(gallery[activeImage])`.
- When a shade swatch is clicked:
  - Call `setSelectedShade(name)` (existing)
  - Call `setVariantImage(shadeImageUrl ?? null)`
- When shade is cleared: `setVariantImage(product.light_shade_image_url ?? null)` (revert to lightest, not product default).
- The `ShadePicker` must call back with both name and optional image URL.

**Exact ShadePicker change:**

New signature:
```typescript
function ShadePicker({
  productId,
  label,
  selected,
  onSelect,  // (name: string | null, imageUrl?: string | null) => void
  error
}: {
  productId: string;
  label: string;
  selected: string | null;
  onSelect: (name: string | null, imageUrl?: string | null) => void;
  error: boolean;
})
```

Inside ShadePicker:
- Add state: `const [variants, setVariants] = useState<ProductVariant[] | null>(null)` where:
  ```typescript
  interface ProductVariant { shade_name: string; shade_image_url: string | null; swatch_url: string | null; sort_order: number; }
  ```
- Add effect: fetch `/api/product-variants?id={productId}`. If response has `variants.length > 0`, use them. Otherwise fetch `/api/product-shades` and convert to variant shape (shade_image_url: null).
- Display swatches from `variants` (either real variants or shade-only fallback).
- On click: `onSelect(active ? null : name, variant?.shade_image_url ?? null)`.
- Swatch display uses `variant.swatch_url` for the circle image.
- When `selected` matches a `variant.shade_name`, highlight that button with the active style (border-accent bg-accent/10).

**In `ProductDetailClient`:**
- Change `handleShadeSelect(name)` to `handleShadeSelect(name: string | null, imageUrl?: string | null)`.
- Inside: `setSelectedShade(name); if (name) { setShadeError(false); setVariantImage(imageUrl ?? null); } else { setVariantImage(product.light_shade_image_url ?? null); }`
- Hero image: at the top of the component body where `activeSrc` is computed:
  ```typescript
  const activeSrc = variantImage ? productImageSrc(variantImage) : productImageSrc(gallery[activeImage]);
  ```

**About `lib/products.ts`:**
- Check that `ProductDetail` type includes `light_shade_image_url: string | null`. If not, add it and update the SELECT in the function that fetches product details.

- [ ] **Step 1: Check `lib/products.ts` and add `light_shade_image_url` if missing**

Read `lib/products.ts`. If `ProductDetail` doesn't have `light_shade_image_url: string | null`, add it and add `light_shade_image_url` to the SELECT query.

- [ ] **Step 2: Refactor `ShadePicker` to fetch variants and use dual-source approach**

Full replacement of the `ShadePicker` function inside `ProductDetailClient.tsx` with the new implementation described above.

- [ ] **Step 3: Add `variantImage` state and update hero image in `ProductDetailClient`**

- Add `const [variantImage, setVariantImage] = useState<string | null>(product.light_shade_image_url ?? null)`.
- Change `activeSrc` line.
- Update `handleShadeSelect` signature and body.
- Pass updated `onSelect` callback to ShadePicker.

- [ ] **Step 4: TypeScript check**

```
cd C:\Users\User\LARA && npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add app/product/[id]/ProductDetailClient.tsx lib/products.ts
git commit -m "feat: product detail shows shade image switcher with hero image update on swatch click"
```
