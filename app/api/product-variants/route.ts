import { NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") ?? "";
  if (!/^[0-9a-fA-F-]{36}$/.test(id)) {
    return NextResponse.json({ variants: [] });
  }
  try {
    await ensureSchema();
    const sql = getSql();
    const rows = (await sql`
      select shade_name, shade_image_url, swatch_url, sort_order
      from product_variants
      where product_id = ${id}
      order by sort_order asc
    `) as Array<{ shade_name: string; shade_image_url: string | null; swatch_url: string | null; sort_order: number }>;
    return NextResponse.json({ variants: rows });
  } catch {
    return NextResponse.json({ variants: [] });
  }
}
