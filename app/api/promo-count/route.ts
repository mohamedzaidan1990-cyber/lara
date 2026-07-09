import { NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROMO_LIMIT = 10;
const KIT_URL = "https://seasonsbyb.co.uk/kit/huda-x-snb-2026";

export async function GET() {
  await ensureSchema();
  const sql = getSql();

  const [countRow, kitRow] = (await Promise.all([
    sql`
      select count(*)::int as entries
      from orders
      where promo_entry = true
        and payment_confirmed = true
        and status not in ('cancelled', 'refunded')
    `,
    sql`
      select id from products
      where product_url = ${KIT_URL}
      limit 1
    `
  ])) as [Array<{ entries: number }>, Array<{ id: string }>];

  const entries = Number(countRow[0]?.entries ?? 0);
  const remaining = Math.max(0, PROMO_LIMIT - entries);

  return NextResponse.json({
    entries,
    remaining,
    limit: PROMO_LIMIT,
    kit_product_id: kitRow[0]?.id ?? null
  });
}
