import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { brandSlug } from "@/lib/brands";
import { normalizeQueryTokens, normalizedHaystackSql } from "@/lib/search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface BrandSuggestion {
  brand: string;
  // Slug for the /brand/[slug] page, which lists the brand across ALL
  // categories (a brand pick must never hide part of their range).
  slug: string;
  count: number;
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

    const brandRows = (await sql(
      `select brand, count(*)::int as n
       from products
       where (select bool_and(${brandHay} like '%' || t || '%')
              from unnest($1::text[]) as t)
       group by brand
       order by n desc
       limit 5`,
      [tokens]
    )) as Array<{ brand: string; n: number }>;

    const brands: BrandSuggestion[] = brandRows.map((r) => ({
      brand: r.brand,
      slug: brandSlug(r.brand),
      count: r.n
    }));

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
