import { Pool } from "pg";

// Returns true for Morphe individual brushes (not brush sets, kits, bundles, etc.).
// These get a special price formula: GBP × 1.45 + $5.
function isMorpheIndividualBrush(brand: string, name: string): boolean {
  if ((brand || "").toLowerCase() !== "morphe") return false;
  const n = (name || "").toLowerCase();
  if (!n.includes("brush")) return false;
  return !/(set|kit|bundle|collection|duo|trio|pack|vault|bag|case)\b/.test(n);
}

// Brands that Selfridges cannot deliver to Lebanon — never stored in the catalog.
export const EXCLUDED_BRANDS = new Set([
  "real techniques",
  "anastasia beverly hills",
]);

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    pool = new Pool({
      connectionString,
      // Neon requires TLS; the managed cert isn't in the default CA bundle
      // inside the Railway container, so don't reject unauthorized.
      ssl: { rejectUnauthorized: false }
    });
  }
  return pool;
}

export interface ScrapedProductRow {
  brand: string;
  name: string;
  category: string;
  price_gbp: number;
  price_usd: number;
  deliverable_lebanon: boolean;
  product_url: string;
  image_url: string;
  // Selfridges relevance rank within the category crawl (1 = most wanted);
  // null for brand-page finds, which aren't relevance-ordered per category.
  popularity?: number | null;
  is_bestseller?: boolean;
  // Name-derived browse filter ("Foundation", "Lipstick", …); "Other" when
  // no rule matches.
  subcategory?: string;
  // Korean-beauty flag; set when the brand is on the K-Beauty list.
  k_beauty?: boolean;
}

export async function ensureSchema(): Promise<void> {
  const client = getPool();
  await client.query(`
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    CREATE TABLE IF NOT EXISTS products (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      brand text NOT NULL,
      name text NOT NULL,
      category text NOT NULL,
      price_gbp numeric NOT NULL,
      price_usd numeric NOT NULL,
      deliverable_lebanon boolean DEFAULT true,
      product_url text,
      image_url text,
      scraped_at timestamp DEFAULT now()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS products_product_url_idx ON products (product_url);

    ALTER TABLE products ADD COLUMN IF NOT EXISTS images jsonb;

    ALTER TABLE products ADD COLUMN IF NOT EXISTS popularity int;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS is_bestseller boolean DEFAULT false;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory text;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS k_beauty boolean DEFAULT false;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS price_locked boolean DEFAULT false;

    CREATE TABLE IF NOT EXISTS scrape_logs (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      query text,
      status text,
      results_count int,
      created_at timestamp DEFAULT now()
    );

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
  `);

  // Remove brands that Selfridges cannot deliver to Lebanon.
  await client.query(`
    DELETE FROM products WHERE lower(brand) = ANY($1::text[])
  `, [Array.from(EXCLUDED_BRANDS)]);
}

export async function upsertProducts(products: ScrapedProductRow[]): Promise<number> {
  if (products.length === 0) return 0;
  const client = getPool();
  let n = 0;
  for (const p of products) {
    if (!p.product_url) continue;
    // Final guard against mis-parsed markup blobs (huge / HTML-laden values).
    if (!p.brand || !p.name || p.brand.length > 180 || p.name.length > 200 || /[<>{}]/.test(p.brand + p.name)) {
      continue;
    }
    // Skip brands that Selfridges cannot deliver to Lebanon.
    if (EXCLUDED_BRANDS.has(p.brand.toLowerCase())) continue;

    // Morphe individual brushes: GBP × 1.45 + $5 (no exchange-rate conversion).
    // Brush sets, kits, bundles, collections keep the standard pricing.
    const priceUsd = isMorpheIndividualBrush(p.brand, p.name)
      ? Number(p.price_gbp) * 1.45 + 5
      : p.price_usd;

    const images = p.image_url ? JSON.stringify([p.image_url]) : null;
    try {
      await client.query(
        `INSERT INTO products
           (brand, name, category, price_gbp, price_usd, deliverable_lebanon, product_url, image_url, images, popularity, is_bestseller, subcategory, k_beauty)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (product_url) DO UPDATE SET
           brand = excluded.brand,
           name = excluded.name,
           category = excluded.category,
           price_gbp = case when products.price_locked then products.price_gbp else excluded.price_gbp end,
           price_usd = case when products.price_locked then products.price_usd else excluded.price_usd end,
           deliverable_lebanon = excluded.deliverable_lebanon,
           -- Preserve an existing image: the crawl only knows the guessed
           -- <SKU>_M URL, but a backfill may have stored the correct shade
           -- image (<SKU>_<shade>_M). Don't let the daily run clobber it.
           image_url = case when coalesce(products.image_url, '') = '' then excluded.image_url else products.image_url end,
           images = case when coalesce(products.image_url, '') = '' then excluded.images else products.images end,
           -- Brand-page finds carry no rank; never let them wipe the rank the
           -- category crawl assigned.
           popularity = coalesce(excluded.popularity, products.popularity),
           is_bestseller = excluded.is_bestseller,
           subcategory = coalesce(excluded.subcategory, products.subcategory),
           -- Preserve manual k_beauty tags from the tagging script; only update
           -- when the scraper explicitly knows it's K-Beauty.
           k_beauty = coalesce(excluded.k_beauty, products.k_beauty),
           scraped_at = now()`,
        [
          p.brand,
          p.name,
          p.category,
          p.price_gbp,
          priceUsd,
          p.deliverable_lebanon,
          p.product_url,
          p.image_url,
          images,
          p.popularity ?? null,
          p.is_bestseller ?? false,
          p.subcategory ?? null,
          p.k_beauty ?? null
        ]
      );
      n += 1;
    } catch (err) {
      console.error("[db] upsert failed", p.product_url, err);
    }
  }
  return n;
}

export async function logScrape(query: string, status: string, count: number): Promise<void> {
  try {
    const client = getPool();
    await client.query(
      `INSERT INTO scrape_logs (query, status, results_count) VALUES ($1, $2, $3)`,
      [query, status, count]
    );
  } catch (err) {
    console.error("[db] logScrape failed", err);
  }
}
