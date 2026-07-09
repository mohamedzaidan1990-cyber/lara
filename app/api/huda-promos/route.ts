import { NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KIT_URL = "https://hudabeauty.com/en-qa/products/easy-bake-intense-kit-set_137";

export async function GET() {
  await ensureSchema();
  const sql = getSql();

  const rows = (await sql`
    select id, product_url from products
    where product_url = ${KIT_URL}
    limit 1
  `) as Array<{ id: string; product_url: string }>;

  return NextResponse.json({
    kit_product_id: rows[0]?.id ?? null
  });
}
