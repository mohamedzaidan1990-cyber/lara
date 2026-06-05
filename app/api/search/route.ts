import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";

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
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { query?: string; category?: string };
  const query = (body.query ?? "").trim();
  const category = body.category ?? "All";

  if (!query) {
    return NextResponse.json({ products: [] });
  }

  const pattern = `%${query.toLowerCase()}%`;
  const cat = category && category !== "All" ? category : null;

  try {
    const sql = getSql();
    const rows = (await sql`
      select id, brand, name, category,
             price_gbp::float8 as price_gbp, price_usd::float8 as price_usd,
             deliverable_lebanon, product_url, image_url
      from products
      where (${cat}::text is null or category = ${cat})
        and (lower(brand) like ${pattern} or lower(name) like ${pattern})
      order by
        case when lower(brand) like ${pattern} then 0 else 1 end,
        brand asc, name asc
      limit 60
    `) as SearchRow[];
    return NextResponse.json({ products: rows });
  } catch {
    return NextResponse.json({ products: [] });
  }
}
