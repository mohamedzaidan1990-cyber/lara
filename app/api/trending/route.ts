import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sql = getSql();
    const rows = await sql`
      select id, brand, name, category, subcategory,
             price_gbp::float8 as price_gbp, price_usd::float8 as price_usd,
             deliverable_lebanon, product_url, image_url, light_shade_image_url,
             is_bestseller, created_at::text as created_at
      from products
      where is_bestseller = true
      order by coalesce(popularity, 9999) asc, random()
      limit 8
    `;
    return NextResponse.json({ products: rows });
  } catch {
    return NextResponse.json({ products: [] });
  }
}
