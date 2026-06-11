import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { normalizeQueryTokens, normalizedHaystackSql } from "@/lib/search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SearchRow {
  id: string;
  brand: string;
  name: string;
  category: string;
  price_gbp: number;
  price_usd: number;
  deliverable_lebanon: boolean;
  product_url: string;
  image_url: string;
}

// Catalogue search over the products table. Returns real product rows (with id)
// so every result opens the product detail page — same flow as the category
// grids — rather than the quick-order form.
//
// Matching is token-based: the query is split into normalized words and every
// word must appear in the normalized brand+name string. This makes
// "dior lipstick" (brand + name), "kiehls" (apostrophe in the stored brand)
// and "kerastase" (accents) all match, where a whole-phrase LIKE would not.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { query?: string; category?: string };
  const query = (body.query ?? "").trim();
  const category = body.category ?? "All";

  const tokens = normalizeQueryTokens(query);
  if (tokens.length === 0) {
    return NextResponse.json({ products: [] });
  }

  const cat = category && category !== "All" ? category : null;
  const hay = normalizedHaystackSql("brand || ' ' || name");
  const brandHay = normalizedHaystackSql("brand");

  try {
    const sql = getSql();
    // Rank products whose BRAND matches more of the query first, so a search
    // for "dior" leads with Dior's own products before name-only matches.
    const rows = (await sql(
      `select id, brand, name, category,
              price_gbp::float8 as price_gbp, price_usd::float8 as price_usd,
              deliverable_lebanon, product_url, image_url
       from products
       where ($1::text is null or category = $1)
         and (select bool_and(${hay} like '%' || t || '%')
              from unnest($2::text[]) as t)
       order by
         (select count(*) from unnest($2::text[]) as t
          where ${brandHay} like '%' || t || '%') desc,
         brand asc, name asc
       limit 60`,
      [cat, tokens]
    )) as SearchRow[];
    return NextResponse.json({ products: rows });
  } catch {
    return NextResponse.json({ products: [] });
  }
}
