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
  `create table if not exists products (
    id uuid default gen_random_uuid() primary key,
    brand text not null,
    name text not null,
    category text not null,
    price_gbp numeric not null,
    price_usd numeric not null,
    deliverable_lebanon boolean default true,
    product_url text,
    image_url text,
    scraped_at timestamp default now()
  )`,
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
  in_lebanon: "In Lebanon",
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
}

export interface OrderWithCustomer extends OrderRow {
  full_name: string;
  phone: string;
  address: string;
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
