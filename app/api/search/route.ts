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
  subcategory: string | null;
  price_gbp: number;
  price_usd: number;
  deliverable_lebanon: boolean;
  product_url: string;
  image_url: string;
  light_shade_image_url: string | null;
}

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

    // Exact token match first
    const rows = (await sql(
      `select id, brand, name, category, subcategory,
              price_gbp::float8 as price_gbp, price_usd::float8 as price_usd,
              deliverable_lebanon, product_url, image_url, light_shade_image_url
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

    if (rows.length > 0) {
      return NextResponse.json({ products: rows });
    }

    // Fuzzy fallback via pg_trgm for typos / close spellings
    const fuzzy = (await sql(
      `select id, brand, name, category, subcategory,
              price_gbp::float8 as price_gbp, price_usd::float8 as price_usd,
              deliverable_lebanon, product_url, image_url, light_shade_image_url
       from products
       where ($1::text is null or category = $1)
         and word_similarity($2, lower(brand || ' ' || name)) > 0.15
       order by word_similarity($2, lower(brand || ' ' || name)) desc
       limit 60`,
      [cat, query.toLowerCase()]
    )) as SearchRow[];

    return NextResponse.json({ products: fuzzy });
  } catch {
    return NextResponse.json({ products: [] });
  }
}
