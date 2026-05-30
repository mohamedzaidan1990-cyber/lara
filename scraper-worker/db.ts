import { Pool } from "pg";

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

    CREATE TABLE IF NOT EXISTS scrape_logs (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      query text,
      status text,
      results_count int,
      created_at timestamp DEFAULT now()
    );
  `);
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
    const images = p.image_url ? JSON.stringify([p.image_url]) : null;
    try {
      await client.query(
        `INSERT INTO products
           (brand, name, category, price_gbp, price_usd, deliverable_lebanon, product_url, image_url, images)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (product_url) DO UPDATE SET
           brand = excluded.brand,
           name = excluded.name,
           category = excluded.category,
           price_gbp = excluded.price_gbp,
           price_usd = excluded.price_usd,
           deliverable_lebanon = excluded.deliverable_lebanon,
           image_url = excluded.image_url,
           images = excluded.images,
           scraped_at = now()`,
        [
          p.brand,
          p.name,
          p.category,
          p.price_gbp,
          p.price_usd,
          p.deliverable_lebanon,
          p.product_url,
          p.image_url,
          images
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
