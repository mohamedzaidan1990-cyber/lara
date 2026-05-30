import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { categorySlug } from "@/lib/categories";
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

  const pattern = `%${q.toLowerCase()}%`;

  try {
    const sql = getSql();

    // Brands + their dominant category (so we can deep-link to the right
    // category page with the brand filter applied).
    const brandRows = (await sql`
      select brand, category, count(*)::int as n
      from products
      where lower(brand) like ${pattern}
      group by brand, category
    `) as Array<{ brand: string; category: ProductCategory; n: number }>;

    const topByBrand = new Map<string, { category: ProductCategory; n: number }>();
    for (const r of brandRows) {
      const cur = topByBrand.get(r.brand);
      if (!cur || r.n > cur.n) topByBrand.set(r.brand, { category: r.category, n: r.n });
    }
    const brands: BrandSuggestion[] = Array.from(topByBrand.entries())
      .sort((a, b) => b[1].n - a[1].n)
      .slice(0, 5)
      .map(([brand, info]) => ({ brand, category: info.category, slug: categorySlug(info.category) }));

    const products = (await sql`
      select id, name, brand
      from products
      where lower(name) like ${pattern}
      order by brand asc, name asc
      limit 10
    `) as ProductSuggestion[];

    return NextResponse.json({ brands, products });
  } catch {
    return NextResponse.json({ brands: [], products: [] });
  }
}
