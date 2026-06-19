import { getSql } from "./db";
import { PAGE_SIZE, dailySeed, type CategorySort, type ProductListRow } from "./categories";
import type { ProductCategory } from "./featured";

// URL slug for a brand ("Kiehl'S" → "kiehl-s", "Estée Lauder" → "estee-lauder").
export function brandSlug(brand: string): string {
  return (brand || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// SQL expression producing the same slug from the brand column, so a slug in
// the URL can be resolved back to the exact stored brand name. Must stay in
// lockstep with brandSlug() above.
const BRAND_SLUG_SQL = `trim(both '-' from regexp_replace(replace(translate(lower(brand), 'àáâãäåāèéêëēìíîïīòóôõöøùúûüūçñÿ', 'aaaaaaaeeeeeiiiiioooooouuuuucny'), '&', 'and'), '[^a-z0-9]+', '-', 'g'))`;

export interface BrandCategoryCount {
  category: ProductCategory;
  count: number;
}

export interface BrandInfo {
  brand: string;
  total: number;
  categories: BrandCategoryCount[];
}

// Resolve a brand slug to the stored brand name + per-category counts.
// Returns null when no products carry that brand.
export async function getBrandBySlug(slug: string): Promise<BrandInfo | null> {
  try {
    const sql = getSql();
    const rows = (await sql(
      `select brand, category, count(*)::int as count
       from products
       where ${BRAND_SLUG_SQL} = $1
       group by brand, category
       order by count desc`,
      [slug]
    )) as Array<{ brand: string; category: ProductCategory; count: number }>;
    if (rows.length === 0) return null;
    return {
      brand: rows[0].brand,
      total: rows.reduce((n, r) => n + r.count, 0),
      categories: rows.map((r) => ({ category: r.category, count: r.count }))
    };
  } catch {
    return null;
  }
}

export interface BrandProductsResult {
  products: ProductListRow[];
  total: number;
  page: number;
  totalPages: number;
  sort: CategorySort;
}

// Every product for a brand, across ALL categories, paginated.
export async function getBrandProducts(
  brand: string,
  sort: CategorySort,
  page: number
): Promise<BrandProductsResult> {
  const sql = getSql();
  const safePage = page < 1 ? 1 : page;
  const offset = (safePage - 1) * PAGE_SIZE;

  const totalRows = (await sql`
    select count(*)::int as n from products where brand = ${brand}
  `) as Array<{ n: number }>;
  const total = totalRows[0]?.n ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const orderBy =
    sort === "price-asc"
      ? "price_gbp asc, scraped_at desc"
      : sort === "price-desc"
        ? "price_gbp desc, scraped_at desc"
        : sort === "newest"
          ? "scraped_at desc, name asc"
          : // featured — deterministic daily shuffle, stable across pagination.
            "md5(id::text || $2) asc";
  const params: unknown[] = sort === "featured" ? [brand, dailySeed()] : [brand];

  const rows = (await sql(
    `select id, brand, name, category, subcategory, price_gbp::float8 as price_gbp, price_usd::float8 as price_usd,
            deliverable_lebanon, product_url, image_url, light_shade_image_url
     from products
     where brand = $1
     order by ${orderBy}
     limit ${PAGE_SIZE} offset ${offset}`,
    params
  )) as ProductListRow[];

  return { products: rows, total, page: safePage, totalPages, sort };
}
