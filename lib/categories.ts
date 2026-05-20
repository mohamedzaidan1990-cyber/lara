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
    defaultImage: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=1200&q=80"
  },
  {
    slug: "skincare",
    name: "Skincare",
    label: "Skincare",
    blurb: "Crèmes, serums and treatments — La Mer to Augustinus Bader.",
    defaultImage: "https://images.unsplash.com/photo-1631730486572-226d1f595b68?w=1200&q=80"
  },
  {
    slug: "bags",
    name: "Bags",
    label: "Bags",
    blurb: "Hand-picked luxury bags from Gucci, Loewe, Bottega and beyond.",
    defaultImage: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=1200&q=80"
  },
  {
    slug: "haircare",
    name: "Haircare",
    label: "Haircare",
    blurb: "Olaplex, Kérastase, Oribe — salon-grade care for every routine.",
    defaultImage: "https://images.unsplash.com/photo-1626015449814-fcb3f72c1b14?w=1200&q=80"
  },
  {
    slug: "accessories",
    name: "Accessories",
    label: "Accessories",
    blurb: "Scarves, sunglasses, belts and small leather goods.",
    defaultImage: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=1200&q=80"
  },
  {
    slug: "beauty-tools",
    name: "Beauty tools",
    label: "Beauty tools",
    blurb: "Dyson Airwrap, GHD, Foreo, NuFace — the devices everyone wants.",
    defaultImage: "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=1200&q=80"
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

export type CategorySort = "newest" | "price-asc" | "price-desc";

export function parseSort(value: string | string[] | undefined): CategorySort {
  const v = Array.isArray(value) ? value[0] : value;
  if (v === "price-asc" || v === "price-desc" || v === "newest") return v;
  return "newest";
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
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  sort: CategorySort;
}

export async function getCategoryProducts(
  categoryName: ProductCategory,
  sort: CategorySort,
  page: number
): Promise<CategoryProductsResult> {
  const sql = getSql();
  const safePage = page < 1 ? 1 : page;
  const offset = (safePage - 1) * PAGE_SIZE;

  const totalRows = (await sql`
    select count(*)::int as n
    from products
    where category = ${categoryName}
  `) as Array<{ n: number }>;
  const total = totalRows[0]?.n ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  let rows: ProductListRow[] = [];
  if (sort === "price-asc") {
    rows = (await sql`
      select id, brand, name, category, price_gbp::float8 as price_gbp, price_usd::float8 as price_usd,
             deliverable_lebanon, product_url, image_url
      from products
      where category = ${categoryName}
      order by price_gbp asc, scraped_at desc
      limit ${PAGE_SIZE} offset ${offset}
    `) as ProductListRow[];
  } else if (sort === "price-desc") {
    rows = (await sql`
      select id, brand, name, category, price_gbp::float8 as price_gbp, price_usd::float8 as price_usd,
             deliverable_lebanon, product_url, image_url
      from products
      where category = ${categoryName}
      order by price_gbp desc, scraped_at desc
      limit ${PAGE_SIZE} offset ${offset}
    `) as ProductListRow[];
  } else {
    rows = (await sql`
      select id, brand, name, category, price_gbp::float8 as price_gbp, price_usd::float8 as price_usd,
             deliverable_lebanon, product_url, image_url
      from products
      where category = ${categoryName}
      order by scraped_at desc, brand asc
      limit ${PAGE_SIZE} offset ${offset}
    `) as ProductListRow[];
  }

  return {
    products: rows,
    total,
    page: safePage,
    pageSize: PAGE_SIZE,
    totalPages,
    sort
  };
}

export { PRODUCT_CATEGORIES };
