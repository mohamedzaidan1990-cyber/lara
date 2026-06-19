import { neon } from "@neondatabase/serverless";

let cached: ReturnType<typeof neon> | null = null;

export function getSql(): ReturnType<typeof neon> {
  if (!cached) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is not set");
    }
    // The driver runs queries as fetch() POSTs, which Next.js can cache in
    // the Vercel Data Cache — serving stale rows for identical queries even
    // across deployments. Query results must never be cached.
    cached = neon(url, { fetchOptions: { cache: "no-store" } });
  }
  return cached;
}

export const SCHEMA_STATEMENTS = [
  `create extension if not exists "pgcrypto"`,
  `create table if not exists customers (
    id uuid default gen_random_uuid() primary key,
    full_name text not null,
    phone text not null,
    address text not null,
    created_at timestamp default now()
  )`,
  `create table if not exists orders (
    id uuid default gen_random_uuid() primary key,
    order_number text unique not null,
    customer_id uuid references customers(id),
    customer_email text,
    product_name text not null,
    product_brand text not null,
    product_url text,
    price_gbp numeric not null,
    price_usd numeric not null,
    status text default 'pending',
    payment_method text,
    payment_confirmed boolean default false,
    payment_screenshot text,
    notes text,
    created_at timestamp default now(),
    updated_at timestamp default now()
  )`,
  `alter table orders add column if not exists customer_email text`,
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
  // Multiple product images for the detail-page gallery. Backfilled from the
  // single image_url; the scraper will populate richer galleries over time.
  `alter table products add column if not exists images jsonb`,
  // Selfridges relevance rank within the category (1 = most wanted) + badge.
  `alter table products add column if not exists popularity int`,
  `alter table products add column if not exists is_bestseller boolean default false`,
  // Name-derived browse filter ("Foundation", "Lipstick", …).
  `alter table products add column if not exists subcategory text`,
  // Shade/colour options scraped on demand from the product's PDP.
  `alter table products add column if not exists shades jsonb`,
  `alter table products add column if not exists shades_checked_at timestamp`,
  // Korean-beauty flag for the /k-beauty hub.
  `alter table products add column if not exists k_beauty boolean default false`,
  `update products set images = jsonb_build_array(image_url)
     where images is null and image_url is not null and image_url <> ''`,
  `create table if not exists scrape_logs (
    id uuid default gen_random_uuid() primary key,
    query text,
    status text,
    results_count int,
    created_at timestamp default now()
  )`,
  // ----- Cart / multi-item orders -----
  `alter table orders add column if not exists total_usd numeric`,
  `alter table orders add column if not exists total_gbp numeric`,
  `alter table orders add column if not exists items_count integer`,
  // product_name/brand stay populated with a summary for backward compatibility,
  // but allow null so this never blocks an insert.
  `alter table orders alter column product_name drop not null`,
  `alter table orders alter column product_brand drop not null`,
  `alter table orders alter column price_gbp drop not null`,
  `alter table orders alter column price_usd drop not null`,
  `create table if not exists order_items (
    id uuid default gen_random_uuid() primary key,
    order_id uuid references orders(id),
    product_name text not null,
    product_brand text not null,
    product_url text,
    image_url text,
    price_gbp numeric not null,
    price_usd numeric not null,
    quantity integer default 1,
    created_at timestamp default now()
  )`,
  `create index if not exists order_items_order_id_idx on order_items (order_id)`,
  // ----- Per-item sourcing: where the admin bought it and what they paid -----
  `alter table order_items add column if not exists vendor text`,
  `alter table order_items add column if not exists cost_gbp numeric`,
  `alter table order_items add column if not exists cost_usd numeric`,
  `alter table order_items add column if not exists sourced boolean default false`,
  // ----- General expenses (shipping, packaging, fees, etc.) -----
  `create table if not exists expenses (
    id uuid default gen_random_uuid() primary key,
    description text not null,
    amount_usd numeric not null,
    amount_gbp numeric,
    category text default 'other',
    expense_date date default current_date,
    notes text,
    created_at timestamp default now()
  )`,
  // ----- Invoice + operational workflow timestamps -----
  `alter table orders add column if not exists invoice_pdf text`,
  `alter table orders add column if not exists invoice_sent_at timestamp`,
  `alter table orders add column if not exists ordered_selfridges_at timestamp`,
  `alter table orders add column if not exists shipped_at timestamp`,
  `alter table orders add column if not exists tracking_number text`,
  `alter table orders add column if not exists delivered_at timestamp`,
  // ----- Profit & loss tracking -----
  `alter table orders add column if not exists cost_gbp numeric`,
  `alter table orders add column if not exists cost_usd numeric`,
  `alter table orders add column if not exists platform_fee_usd numeric`,
  `alter table orders add column if not exists profit_usd numeric`,
  `alter table orders add column if not exists profit_notes text`,
  // ----- Price lock: prevents the scraper from overwriting manually set prices -----
  `alter table products add column if not exists price_locked boolean default false`,
  // ----- Order source (website checkout vs manual instagram/whatsapp) -----
  `alter table orders add column if not exists source text default 'website'`,
  // ----- Bespoke consultation requests (AI chat) -----
  `create table if not exists bespoke_requests (
    id uuid default gen_random_uuid() primary key,
    session_id text not null,
    customer_whatsapp text,
    conversation_summary text not null,
    full_conversation jsonb,
    status text default 'new',
    created_at timestamp default now()
  )`,
  // ----- Partial payment tracking -----
  `alter table orders add column if not exists amount_paid_usd numeric default 0`,
  // Seed confirmed orders as fully paid. WHERE clause is idempotent — only matches rows still at 0.
  `update orders set amount_paid_usd = coalesce(total_usd, price_usd, 0) where payment_confirmed = true and (amount_paid_usd = 0 or amount_paid_usd is null)`,
  // ----- Speculative stock (no customer order) -----
  `create table if not exists stock_items (
    id uuid default gen_random_uuid() primary key,
    product_id uuid references products(id) on delete set null,
    product_name text not null,
    product_brand text not null,
    product_url text,
    image_url text,
    cost_gbp numeric,
    cost_usd numeric,
    quantity int not null default 1,
    notes text,
    purchased_at date,
    created_at timestamp default now()
  )`
];

export async function ensureSchema(): Promise<void> {
  const sql = getSql();
  for (const stmt of SCHEMA_STATEMENTS) {
    await sql(stmt);
  }
}

export type OrderStatus =
  | "pending"
  | "payment_confirmed"
  | "ordered_selfridges"
  | "shipped"
  | "in_lebanon"
  | "delivered"
  | "cancelled"
  | "refunded";

export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "payment_confirmed",
  "ordered_selfridges",
  "shipped",
  "in_lebanon",
  "delivered",
  "cancelled",
  "refunded"
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  payment_confirmed: "Payment confirmed",
  ordered_selfridges: "Ordered from Selfridges",
  shipped: "Shipped",
  in_lebanon: "In transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded"
};

export interface CustomerRow {
  id: string;
  full_name: string;
  phone: string;
  address: string;
  created_at: string;
}

export interface OrderRow {
  id: string;
  order_number: string;
  customer_id: string | null;
  customer_email: string | null;
  product_name: string;
  product_brand: string;
  product_url: string | null;
  price_gbp: string;
  price_usd: string;
  status: OrderStatus;
  payment_method: string | null;
  payment_confirmed: boolean;
  payment_screenshot: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  total_usd?: string | number | null;
  total_gbp?: string | number | null;
  items_count?: number | null;
  invoice_sent_at?: string | null;
  ordered_selfridges_at?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  tracking_number?: string | null;
  cost_gbp?: string | number | null;
  cost_usd?: string | number | null;
  platform_fee_usd?: string | number | null;
  profit_usd?: string | number | null;
  profit_notes?: string | null;
  source?: string | null;
  amount_paid_usd?: string | number | null;
}

export interface OrderLineItem {
  id?: string;
  brand: string;
  name: string;
  quantity: number;
  price_usd: string | number;
  price_gbp: string | number;
  product_url: string | null;
  vendor?: string | null;
  cost_gbp?: string | number | null;
  cost_usd?: string | number | null;
  sourced?: boolean;
}

export interface ExpenseRow {
  id: string;
  description: string;
  amount_usd: string | number;
  amount_gbp: string | number | null;
  category: string;
  expense_date: string;
  notes: string | null;
  created_at: string;
}

export interface OrderWithCustomer extends OrderRow {
  full_name: string;
  phone: string;
  address: string;
  items?: OrderLineItem[];
}

export interface ProductRow {
  id: string;
  brand: string;
  name: string;
  category: string;
  price_gbp: string;
  price_usd: string;
  deliverable_lebanon: boolean;
  product_url: string | null;
  image_url: string | null;
  scraped_at: string;
}

export function generateOrderNumber(): string {
  const digits = Math.floor(100000 + Math.random() * 900000);
  return `SBB-${digits}`;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  product_name: string;
  product_brand: string;
  product_url: string | null;
  image_url: string | null;
  price_gbp: string | number;
  price_usd: string | number;
  quantity: number;
}

export type BespokeStatus = "new" | "contacted" | "fulfilled" | "declined";

export const BESPOKE_STATUSES: BespokeStatus[] = ["new", "contacted", "fulfilled", "declined"];

export interface BespokeRequestRow {
  id: string;
  session_id: string;
  customer_whatsapp: string | null;
  conversation_summary: string;
  full_conversation: Array<{ role: string; content: string }> | null;
  status: BespokeStatus;
  created_at: string;
}

export interface StockItemRow {
  id: string;
  product_id: string | null;
  product_name: string;
  product_brand: string;
  product_url: string | null;
  image_url: string | null;
  cost_gbp: string | number | null;
  cost_usd: string | number | null;
  quantity: number;
  notes: string | null;
  purchased_at: string | null;
  created_at: string;
}
