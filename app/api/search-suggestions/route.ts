import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { categorySlug } from "@/lib/categories";
import { normalizeQueryTokens, normalizedHaystackSql } from "@/lib/search";
import type { ProductCategory } from "@/lib/featured";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface BrandSuggestion {
  brand: string;
  slug: string;
  category: ProductCategory;
}

export interface ProductSuggestion {
  id: string;
  name: string;
  brand: string;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ brands: [], products: [] });
  }

  // Token-based matching with accents/punctuation stripped — see /api/search.
  const tokens = normalizeQueryTokens(q);
  if (tokens.length === 0) {
    return NextResponse.json({ brands: [], products: [] });
  }

  const brandHay = normalizedHaystackSql("brand");
  const hay = normalizedHaystackSql("brand || ' ' || name");

  try {
    const sql = getSql();

    // Brands + their dominant category (so we can deep-link to the right
    // category page with the brand filter applied).
    const brandRows = (await sql(
      `select brand, category, count(*)::int as n
       from products
       where (select bool_and(${brandHay} like '%' || t || '%')
              from unnest($1::text[]) as t)
       group by brand, category`,
      [tokens]
    )) as Array<{ brand: string; category: ProductCategory; n: number }>;

    const topByBrand = new Map<string, { category: ProductCategory; n: number }>();
    for (const r of brandRows) {
      const cur = topByBrand.get(r.brand);
      if (!cur || r.n > cur.n) topByBrand.set(r.brand, { category: r.category, n: r.n });
    }
    const brands: BrandSuggestion[] = Array.from(topByBrand.entries())
      .sort((a, b) => b[1].n - a[1].n)
      .slice(0, 5)
      .map(([brand, info]) => ({ brand, category: info.category, slug: categorySlug(info.category) }));

    // Product suggestions match against brand+name combined, so typing
    // "dior lipstick" still surfaces products.
    const products = (await sql(
      `select id, name, brand
       from products
       where (select bool_and(${hay} like '%' || t || '%')
              from unnest($1::text[]) as t)
       order by brand asc, name asc
       limit 10`,
      [tokens]
    )) as ProductSuggestion[];

    return NextResponse.json({ brands, products });
  } catch {
    return NextResponse.json({ brands: [], products: [] });
  }
}
