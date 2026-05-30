import { neon } from "@neondatabase/serverless";

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
  // ----- Bespoke consultation requests (AI chat) -----
  `create table if not exists bespoke_requests (
    id uuid default gen_random_uuid() primary key,
    session_id text not null,
    customer_whatsapp text,
    conversation_summary text not null,
    full_conversation jsonb,
    status text default 'new',
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
}

export interface OrderLineItem {
  brand: string;
  name: string;
  quantity: number;
  price_usd: string | number;
  price_gbp: string | number;
  product_url: string | null;
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
  return `LARA-${digits}`;
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
