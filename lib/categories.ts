import { getSql } from "./db";
import { PRODUCT_CATEGORIES, type ProductCategory } from "./featured";

export interface CategoryDef {
  slug: string;
  name: ProductCategory;
  label: string;
  blurb: string;
  defaultImage: string;
}

export const CATEGORY_DEFS: readonly CategoryDef[] = [
  {
    slug: "makeup",
    name: "Makeup",
    label: "Makeup",
    blurb: "Lipsticks, foundations and palettes from the world's most coveted houses.",
    defaultImage: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800&q=80"
  },
  {
    slug: "skincare",
    name: "Skincare",
    label: "Skincare",
    blurb: "Crèmes, serums and treatments — La Mer to Augustinus Bader.",
    defaultImage: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&q=80"
  },
  {
    slug: "fragrance",
    name: "Fragrance",
    label: "Fragrance",
    blurb: "Signature scents and niche perfumery — now shipping to your door.",
    defaultImage: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&q=80"
  },
  {
    slug: "haircare",
    name: "Haircare",
    label: "Haircare",
    blurb: "Olaplex, Kérastase, Oribe — salon-grade care for every routine.",
    defaultImage: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80"
  },
  {
    slug: "beauty-tools",
    name: "Beauty tools",
    label: "Beauty tools",
    blurb: "Dyson Airwrap, GHD, Foreo, NuFace — the devices everyone wants.",
    defaultImage: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80"
  }
] as const;

const SLUG_TO_DEF = new Map(CATEGORY_DEFS.map((d) => [d.slug, d]));
const NAME_TO_DEF = new Map(CATEGORY_DEFS.map((d) => [d.name, d]));

export function getCategoryBySlug(slug: string): CategoryDef | undefined {
  return SLUG_TO_DEF.get(slug);
}

export function getCategoryByName(name: ProductCategory): CategoryDef | undefined {
  return NAME_TO_DEF.get(name);
}

export function categorySlug(name: ProductCategory): string {
  return NAME_TO_DEF.get(name)?.slug ?? "";
}

export type CategorySort = "featured" | "newest" | "price-asc" | "price-desc";

export function parseSort(value: string | string[] | undefined): CategorySort {
  const v = Array.isArray(value) ? value[0] : value;
  if (v === "price-asc" || v === "price-desc" || v === "newest" || v === "featured") return v;
  // Default is a daily-shuffled "featured" order so the grid doesn't show
  // products bunched by brand in raw insertion order.
  return "featured";
}

export function parseBrand(value: string | string[] | undefined): string | null {
  const v = Array.isArray(value) ? value[0] : value;
  const trimmed = (v ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

// Stable per-day seed: the catalog reshuffles each calendar day but stays
// consistent for everyone (and across pagination) within that day.
export function dailySeed(): string {
  return new Date().toISOString().slice(0, 10);
}

export function parsePage(value: string | string[] | undefined): number {
  const v = Array.isArray(value) ? value[0] : value;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

export const PAGE_SIZE = 24;

export interface ProductListRow {
  id: string;
  brand: string;
  name: string;
  category: ProductCategory;
  price_gbp: number;
  price_usd: number;
  deliverable_lebanon: boolean;
  product_url: string;
  image_url: string;
}

export interface BrandCount {
  brand: string;
  count: number;
}

// Distinct brands available within a category, for the brand filter dropdown.
export async function getCategoryBrands(categoryName: ProductCategory): Promise<BrandCount[]> {
  try {
    const sql = getSql();
    const rows = (await sql`
      select brand, count(*)::int as count
      from products
      where category = ${categoryName}
      group by brand
      order by brand asc
    `) as BrandCount[];
    return rows;
  } catch {
    return [];
  }
}

interface CountRow {
  category: ProductCategory;
  n: number;
}

export interface CategoryStat extends CategoryDef {
  count: number;
}

export async function getCategoryStats(): Promise<CategoryStat[]> {
  try {
    const sql = getSql();
    const rows = (await sql`
      select category, count(*)::int as n
      from products
      group by category
    `) as CountRow[];
    const byName = new Map(rows.map((r) => [r.category, r.n]));
    return CATEGORY_DEFS.map((def) => ({
      ...def,
      count: byName.get(def.name) ?? 0
    }));
  } catch {
    return CATEGORY_DEFS.map((def) => ({ ...def, count: 0 }));
  }
}

export interface CategoryProductsResult {
  products: ProductListRow[];
  // Number of products matching the active filter (drives pagination + count).
  total: number;
  // Total products in the category, ignoring the brand filter.
  categoryTotal: number;
  page: number;
  pageSize: number;
  totalPages: number;
  sort: CategorySort;
  brand: string | null;
}

export interface CategoryProductsOptions {
  brand?: string | null;
  seed?: string;
}

export async function getCategoryProducts(
  categoryName: ProductCategory,
  sort: CategorySort,
  page: number,
  opts: CategoryProductsOptions = {}
): Promise<CategoryProductsResult> {
  const sql = getSql();
  const brand = opts.brand?.trim() ? opts.brand.trim() : null;
  const seed = opts.seed ?? dailySeed();
  const safePage = page < 1 ? 1 : page;
  const offset = (safePage - 1) * PAGE_SIZE;

  // Unfiltered category total (for "Showing X of Y").
  const catTotalRows = (await sql`
    select count(*)::int as n from products where category = ${categoryName}
  `) as Array<{ n: number }>;
  const categoryTotal = catTotalRows[0]?.n ?? 0;

  // Filtered total — the `${brand}::text is null` trick keeps a single query for
  // both the filtered and unfiltered cases.
  const totalRows = (await sql`
    select count(*)::int as n
    from products
    where category = ${categoryName}
      and (${brand}::text is null or brand = ${brand})
  `) as Array<{ n: number }>;
  const total = totalRows[0]?.n ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  let rows: ProductListRow[] = [];
  if (sort === "price-asc") {
    rows = (await sql`
      select id, brand, name, category, price_gbp::float8 as price_gbp, price_usd::float8 as price_usd,
             deliverable_lebanon, product_url, image_url
      from products
      where category = ${categoryName} and (${brand}::text is null or brand = ${brand})
      order by price_gbp asc, scraped_at desc
      limit ${PAGE_SIZE} offset ${offset}
    `) as ProductListRow[];
  } else if (sort === "price-desc") {
    rows = (await sql`
      select id, brand, name, category, price_gbp::float8 as price_gbp, price_usd::float8 as price_usd,
             deliverable_lebanon, product_url, image_url
      from products
      where category = ${categoryName} and (${brand}::text is null or brand = ${brand})
      order by price_gbp desc, scraped_at desc
      limit ${PAGE_SIZE} offset ${offset}
    `) as ProductListRow[];
  } else if (sort === "newest") {
    rows = (await sql`
      select id, brand, name, category, price_gbp::float8 as price_gbp, price_usd::float8 as price_usd,
             deliverable_lebanon, product_url, image_url
      from products
      where category = ${categoryName} and (${brand}::text is null or brand = ${brand})
      order by scraped_at desc, brand asc
      limit ${PAGE_SIZE} offset ${offset}
    `) as ProductListRow[];
  } else {
    // featured — deterministic daily shuffle, stable across pagination.
    rows = (await sql`
      select id, brand, name, category, price_gbp::float8 as price_gbp, price_usd::float8 as price_usd,
             deliverable_lebanon, product_url, image_url
      from products
      where category = ${categoryName} and (${brand}::text is null or brand = ${brand})
      order by md5(id::text || ${seed}) asc
      limit ${PAGE_SIZE} offset ${offset}
    `) as ProductListRow[];
  }

  return {
    products: rows,
    total,
    categoryTotal,
    page: safePage,
    pageSize: PAGE_SIZE,
    totalPages,
    sort,
    brand
  };
}

export { PRODUCT_CATEGORIES };
