import { getSql } from "./db";
import type { ProductCategory } from "./featured";

export interface ProductDetail {
  id: string;
  brand: string;
  name: string;
  category: ProductCategory;
  price_gbp: number;
  price_usd: number;
  deliverable_lebanon: boolean;
  product_url: string | null;
  image_url: string | null;
  images: string[];
}

interface ProductDetailRow extends Omit<ProductDetail, "images"> {
  images: unknown;
}

function normaliseImages(raw: unknown, fallback: string | null): string[] {
  let list: string[] = [];
  if (Array.isArray(raw)) {
    list = raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
  } else if (typeof raw === "string" && raw.trim().length > 0) {
    // jsonb may arrive as a JSON-encoded string from some drivers.
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) list = parsed.filter((x): x is string => typeof x === "string" && x.length > 0);
    } catch {
      list = [raw];
    }
  }
  if (list.length === 0 && fallback) list = [fallback];
  // De-dupe while preserving order.
  return Array.from(new Set(list));
}

export async function getProductById(id: string): Promise<ProductDetail | null> {
  // Guard: ids are uuids; a malformed id would throw on the cast.
  if (!/^[0-9a-fA-F-]{36}$/.test(id)) return null;
  try {
    const sql = getSql();
    const rows = (await sql`
      select id, brand, name, category,
             price_gbp::float8 as price_gbp, price_usd::float8 as price_usd,
             deliverable_lebanon, product_url, image_url, images
      from products
      where id = ${id}
      limit 1
    `) as ProductDetailRow[];
    const row = rows[0];
    if (!row) return null;
    return { ...row, images: normaliseImages(row.images, row.image_url) };
  } catch {
    return null;
  }
}

export interface RelatedProduct {
  id: string;
  brand: string;
  name: string;
  category: ProductCategory;
  price_gbp: number;
  price_usd: number;
  deliverable_lebanon: boolean;
  product_url: string | null;
  image_url: string | null;
}

// "You might also like" — random products from the same category, excluding the
// current product.
export async function getRelatedProducts(
  categoryName: ProductCategory,
  excludeId: string,
  limit = 4
): Promise<RelatedProduct[]> {
  try {
    const sql = getSql();
    const rows = (await sql`
      select id, brand, name, category,
             price_gbp::float8 as price_gbp, price_usd::float8 as price_usd,
             deliverable_lebanon, product_url, image_url
      from products
      where category = ${categoryName} and id <> ${excludeId}
      order by random()
      limit ${limit}
    `) as RelatedProduct[];
    return rows;
  } catch {
    return [];
  }
}
