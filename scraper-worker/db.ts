import { neon, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Required for the neon serverless driver in long-running Node processes.
neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket;

let cached: ReturnType<typeof neon> | null = null;

export function getSql(): ReturnType<typeof neon> {
  if (!cached) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is not set");
    }
    cached = neon(url);
  }
  return cached;
}

export const SCHEMA_STATEMENTS = [
  `create extension if not exists "pgcrypto"`,
  `create table if not exists products (
    id uuid default gen_random_uuid() primary key,
    brand text not null,
    name text not null,
    category text not null,
    price_gbp numeric not null,
    price_usd numeric not null,
    deliverable_lebanon boolean default true,
    product_url text unique,
    image_url text,
    scraped_at timestamp default now()
  )`,
  `create unique index if not exists products_product_url_idx on products (product_url)`,
  `create table if not exists scrape_logs (
    id uuid default gen_random_uuid() primary key,
    query text,
    status text,
    results_count int,
    created_at timestamp default now()
  )`
];

export async function ensureSchema(): Promise<void> {
  const sql = getSql();
  for (const stmt of SCHEMA_STATEMENTS) {
    await sql(stmt);
  }
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

export async function upsertProducts(products: ScrapedProductRow[]): Promise<number> {
  if (products.length === 0) return 0;
  const sql = getSql();
  let n = 0;
  for (const p of products) {
    if (!p.product_url) continue;
    try {
      await sql`
        insert into products (brand, name, category, price_gbp, price_usd, deliverable_lebanon, product_url, image_url)
        values (${p.brand}, ${p.name}, ${p.category}, ${p.price_gbp}, ${p.price_usd}, ${p.deliverable_lebanon}, ${p.product_url}, ${p.image_url})
        on conflict (product_url) do update set
          brand = excluded.brand,
          name = excluded.name,
          category = excluded.category,
          price_gbp = excluded.price_gbp,
          price_usd = excluded.price_usd,
          deliverable_lebanon = excluded.deliverable_lebanon,
          image_url = excluded.image_url,
          scraped_at = now()
      `;
      n += 1;
    } catch (err) {
      console.error("[db] upsert failed", p.product_url, err);
    }
  }
  return n;
}

export async function logScrape(query: string, status: string, count: number): Promise<void> {
  try {
    const sql = getSql();
    await sql`
      insert into scrape_logs (query, status, results_count)
      values (${query}, ${status}, ${count})
    `;
  } catch (err) {
    console.error("[db] logScrape failed", err);
  }
}
