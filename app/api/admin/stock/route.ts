import { NextResponse } from "next/server";
import { ensureSchema, getSql, type StockItemRow } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureSchema();
  const sql = getSql();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim();

  if (search && search.length >= 2) {
    const q = `%${search}%`;
    const products = (await sql`
      select id, brand, name, price_gbp, price_usd, product_url, image_url
      from products
      where (lower(name) like lower(${q}) or lower(brand) like lower(${q}))
        and deliverable_lebanon = true
      order by popularity asc nulls last, name asc
      limit 20
    `) as Array<{ id: string; brand: string; name: string; price_gbp: string; price_usd: string; product_url: string | null; image_url: string | null }>;
    return NextResponse.json({ products });
  }

  const rows = (await sql`
    select id, product_id, product_name, product_brand, product_url, image_url,
           cost_gbp, cost_usd, quantity, notes, purchased_at, created_at
    from stock_items
    order by created_at desc
  `) as StockItemRow[];
  return NextResponse.json({ items: rows });
}

export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as {
    product_id?: string | null;
    product_name?: string;
    product_brand?: string;
    product_url?: string | null;
    image_url?: string | null;
    cost_gbp?: number | string | null;
    cost_usd?: number | string | null;
    quantity?: number;
    notes?: string | null;
    purchased_at?: string | null;
  };
  if (!body.product_name?.trim() || !body.product_brand?.trim()) {
    return NextResponse.json({ error: "product_name and product_brand are required" }, { status: 400 });
  }
  const costGbp = body.cost_gbp != null && body.cost_gbp !== "" ? Number(body.cost_gbp) : null;
  const costUsd = body.cost_usd != null && body.cost_usd !== "" ? Number(body.cost_usd) : null;
  const qty = Math.max(1, Math.floor(Number(body.quantity) || 1));
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`
    insert into stock_items
      (product_id, product_name, product_brand, product_url, image_url, cost_gbp, cost_usd, quantity, notes, purchased_at)
    values
      (${body.product_id ?? null}, ${body.product_name.trim()}, ${body.product_brand.trim()},
       ${body.product_url ?? null}, ${body.image_url ?? null},
       ${costGbp}, ${costUsd}, ${qty}, ${body.notes ?? null}, ${body.purchased_at ?? null})
    returning id, product_id, product_name, product_brand, product_url, image_url,
              cost_gbp, cost_usd, quantity, notes, purchased_at, created_at
  `) as StockItemRow[];
  return NextResponse.json(rows[0], { status: 201 });
}
