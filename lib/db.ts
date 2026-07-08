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
  // Seed confirmed orders as fully paid. WHERE clause is idempotent — only matches rows still uninitialized.
  `update orders set amount_paid_usd = coalesce(total_usd, price_usd, 0) where payment_confirmed = true and amount_paid_usd is null`,
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
  )`,
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
  // ----- Promo entry flag -----
  `alter table orders add column if not exists promo_entry boolean default false`,
  // ----- Seed: Habibti Lip And Cheek Best Sellers Kit -----
  `insert into products (brand, name, category, price_gbp, price_usd, product_url, image_url, price_locked, deliverable_lebanon)
   values (
     'Huda Beauty',
     'Habibti Lip And Cheek Best Sellers Kit',
     'Makeup',
     43.30,
     55,
     'https://hudabeauty.com/en-qa/products/habibti-lip-and-cheek-best-sellers-kit-2026-hb01665?variant=50974606393622',
     'https://hudabeauty.com/cdn/shop/files/PDP-SECTION1-HABIBTILIP_CHEEK-TILE1.jpg?v=1769546543',
     true,
     true
   ) on conflict (product_url) do nothing`,
  // ----- One-time backfill: mark SBB-734384 as a promo entry -----
  `update orders set promo_entry = true where order_number = 'SBB-734384' and promo_entry = false`,
  // ----- One-time backfill: mark SBB-220816 as a promo entry -----
  `update orders set promo_entry = true where order_number = 'SBB-220816' and promo_entry = false`,
  // ----- Per-item Lebanon arrival tracking -----
  `alter table order_items add column if not exists in_lebanon boolean default false`,
  // ----- Backfill order cost/profit from item costs (idempotent: skips rows where value already matches) -----
  `update orders o
   set cost_usd   = sub.total_cost_usd,
       cost_gbp   = sub.total_cost_gbp,
       profit_usd = round((coalesce(o.total_usd, o.price_usd, 0) - sub.total_cost_usd - coalesce(o.platform_fee_usd, 0))::numeric, 2)
   from (
     select order_id,
            round(sum(cost_usd)::numeric, 2) as total_cost_usd,
            round(sum(cost_gbp)::numeric, 2) as total_cost_gbp
     from order_items
     where cost_usd is not null
     group by order_id
   ) sub
   where o.id = sub.order_id
     and (o.cost_usd is distinct from sub.total_cost_usd)`,
  // ----- New promo: Summer's Hottest Look Set + EDP gift (July 2026) -----
  // Reset old promo entries (Habibti Kit promo is over). Idempotent: once set to false they won't match again.
  `update orders set promo_entry = false where promo_entry = true and created_at < '2026-07-02 00:00:00'::timestamp`,
  // Add Summer's Hottest Look Set to catalogue.
  `insert into products (brand, name, category, price_gbp, price_usd, product_url, image_url, price_locked, deliverable_lebanon)
   values (
     'Huda Beauty',
     'Summer''s Hottest Look Set',
     'Makeup',
     110,
     140,
     'https://hudabeauty.com/en-qa/products/summers-hottest-look-set_136',
     'https://hudabeauty.com/cdn/shop/files/STRAWBERRY-LATTE-COLLECTION-BUNDLES_SUMMERS-HOTTEST-LOOK-PACKSHOT.webp?v=1774850353',
     true,
     true
   ) on conflict (product_url) do update set price_usd = 150, price_locked = true`,
  // Add Easy Bake Intense EDP Travel Spray 10ml.
  `insert into products (brand, name, category, price_gbp, price_usd, product_url, image_url, price_locked, deliverable_lebanon)
   values (
     'Huda Beauty',
     'Easy Bake Intense Eau de Parfum Travel Spray 10ml',
     'Fragrance',
     25,
     42,
     'https://hudabeauty.com/en-qa/products/easy-bake-intense-eau-de-parfum-travel-spray-10ml-hb01781',
     'https://hudabeauty.com/cdn/shop/files/EASY-BAKE-INTENSE-FRAGRANCE-10ML-ECOMM_01.webp?v=1777881528',
     true,
     true
   ) on conflict (product_url) do update set price_usd = 42, price_locked = true`,
  // ----- Huda Beauty expanded catalogue (July 2026) -----
  `insert into products (brand, name, category, price_gbp, price_usd, product_url, image_url, price_locked, deliverable_lebanon)
   values (
     'Huda Beauty', 'Easy Bake Intense Kit', 'Fragrance', 107, 155,
     'https://hudabeauty.com/en-qa/products/easy-bake-intense-kit-set_137',
     'https://hudabeauty.com/cdn/shop/files/01-NEVER-TOO-MUCH-KIT_beacdb2c-e21d-4fcb-a492-a626103f2ca5.webp?v=1777873077',
     true, true
   ) on conflict (product_url) do update set price_usd = 155, price_locked = true`,
  `insert into products (brand, name, category, price_gbp, price_usd, product_url, image_url, price_locked, deliverable_lebanon)
   values (
     'Huda Beauty', 'Blush Filter Liquid Blush', 'Makeup', 24, 39,
     'https://hudabeauty.com/en-gb/products/blush-filter-liquid-blush-hb01345m',
     'https://hudabeauty.com/cdn/shop/files/BLUSH-FILTER-REFRESH_PDP_PACKSHOTS_FINAL_6-STRAWBERRY-LATTE.webp?v=1774424494',
     true, true
   ) on conflict (product_url) do nothing`,
  `insert into products (brand, name, category, price_gbp, price_usd, product_url, image_url, price_locked, deliverable_lebanon)
   values (
     'Huda Beauty', 'FAUX FILLER Extra Shine Lip Gloss', 'Makeup', 19, 24,
     'https://hudabeauty.com/en-gb/products/faux-filler-extra-shine-lip-gloss-hb01251m',
     'https://hudabeauty.com/cdn/shop/files/STRAWBERRY-LATTE_FFGLOSS_PDP_PACKSHOTS_LIGHTCEALER_1.webp?v=1774885552',
     true, true
   ) on conflict (product_url) do nothing`,
  `insert into products (brand, name, category, price_gbp, price_usd, product_url, image_url, price_locked, deliverable_lebanon)
   values (
     'Huda Beauty', 'Tantour Contour & Bronzer Cream', 'Makeup', 24, 30,
     'https://hudabeauty.com/en-gb/products/tantour-contour-bronzer-cream-hb00281m',
     'https://cdn.shopify.com/s/files/1/0959/8962/9206/files/PDP-SECTION1-TANTOUR-MEDIUM-TILE1.webp?v=1759616886',
     true, true
   ) on conflict (product_url) do nothing`,
  `insert into products (brand, name, category, price_gbp, price_usd, product_url, image_url, price_locked, deliverable_lebanon)
   values (
     'Huda Beauty', 'Makeout Sesh Lip Duo Rosy Nudes', 'Makeup', 39, 50,
     'https://hudabeauty.com/en-qa/products/makeout-sesh-lip-duo-rosy-nudes-hb01753',
     'https://cdn.shopify.com/s/files/1/0959/8962/9206/files/PDP-SECTION1-MAKEOUTSESH-ROSYNUDES-TILE1.webp?v=1761570576',
     true, true
   ) on conflict (product_url) do nothing`,
  `insert into products (brand, name, category, price_gbp, price_usd, product_url, image_url, price_locked, deliverable_lebanon)
   values (
     'ONE/SIZE by Patrick Starrr', 'Oil Sucker Liquid Blotting Paper Touch Up Spray', 'Makeup', 35, 45,
     'https://www.sephora.me/qa-en/p/oil-sucker-liquid-blotting-paper-touch-up-spray/814356',
     'https://cdn.shopify.com/s/files/1/0352/4139/4313/files/OilSuckerSpray_4x5_2ca20768-5bbf-4fd3-b80a-716acd83bbf7.jpg',
     true, true
   ) on conflict (product_url) do nothing`,
  `insert into products (brand, name, category, price_gbp, price_usd, product_url, image_url, price_locked, deliverable_lebanon)
   values (
     'Fenty Skin', 'Butta Drop Hydrating Body Milk', 'Skincare', 40, 52,
     'https://www.sephora.me/qa-en/p/butta-drop-body-milk/730936',
     'https://cdn.shopify.com/s/files/1/0341/3458/9485/files/FSB_SPR26_T2PRODUCT_ECOMM_BODYMILK_LOTION_FENTYFRESH_1200X1500_72DPI_1.jpg?v=1783013212',
     true, true
   ) on conflict (product_url) do nothing`,
  `insert into products (brand, name, category, price_gbp, price_usd, product_url, image_url, price_locked, deliverable_lebanon)
   values
     ('Fenty Skin', 'Butta Drop Hydrating Body Milk — Amber Bouquet', 'Skincare', 40, 52,
      'https://www.sephora.me/qa-en/p/butta-drop-body-milk-amber-bouquet/813825',
      'https://cdn.shopify.com/s/files/1/0341/3458/9485/files/FSB_SPR26_T2PRODUCT_ECOMM_BODYMILK_LOTION_AMBERBOUQUET_1200X1500_72DPI.jpg?v=1778713227',
      true, true),
     ('Fenty Skin', 'Butta Drop Hydrating Body Milk — Vanilla Dream', 'Skincare', 40, 52,
      'https://www.sephora.me/qa-en/p/butta-drop-hydrating-body-milk-vanilla-dream/797084',
      'https://cdn.shopify.com/s/files/1/0341/3458/9485/files/FSB_SPR26_T2PRODUCT_ECOMM_BODYMILK_LOTION_VANILLADREAMS_1200X1500_72DPI.jpg?v=1769535173',
      true, true),
     ('Fenty Skin', 'Butta Drop Hydrating Body Milk — Salted Caramel', 'Skincare', 40, 52,
      'https://www.sephora.me/qa-en/p/butta-drop-milk-salted-caramel/765583',
      'https://cdn.shopify.com/s/files/1/0341/3458/9485/files/FS_FALL25_T2PRODUCT_ECOMM_BODY-MILK-SALTED-CARAMEL_1200X1500_72DPI.jpg?v=1754005575',
      true, true)
   on conflict (product_url) do nothing`,
  // ----- Huda Beauty × Seasons by B Kit — exclusive promo bundle (July 2026) -----
  `insert into products (brand, name, category, price_gbp, price_usd, product_url, image_url, price_locked, deliverable_lebanon)
   values (
     'Huda Beauty',
     'Huda Beauty × Seasons by B Kit',
     'Makeup',
     155,
     200,
     'https://seasonsbyb.co.uk/kit/huda-x-snb-2026',
     'https://hudabeauty.com/cdn/shop/files/STRAWBERRY-LATTE-COLLECTION-BUNDLES_SUMMERS-HOTTEST-LOOK-PACKSHOT.webp',
     true,
     true
   ) on conflict (product_url) do update set price_usd = 200, price_locked = true`
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
  | "fulfilled_from_stock"
  | "shipped"
  | "in_lebanon"
  | "ready_to_deliver"
  | "partially_delivered"
  | "delivered"
  | "cancelled"
  | "refunded";

export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "payment_confirmed",
  "ordered_selfridges",
  "fulfilled_from_stock",
  "shipped",
  "in_lebanon",
  "ready_to_deliver",
  "partially_delivered",
  "delivered",
  "cancelled",
  "refunded"
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  payment_confirmed: "Payment confirmed",
  ordered_selfridges: "Ordered from Selfridges",
  fulfilled_from_stock: "Fulfilled from stock",
  shipped: "Shipped",
  in_lebanon: "In transit",
  ready_to_deliver: "Ready to deliver",
  partially_delivered: "Partially delivered",
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
  promo_entry?: boolean | null;
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
  in_lebanon?: boolean;
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
