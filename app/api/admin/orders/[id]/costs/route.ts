import { NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { getGBPtoUSD } from "@/lib/currency";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    cost_gbp?: number | string;
    platform_fee_usd?: number | string;
    profit_notes?: string;
  };

  const costGbp = Number(body.cost_gbp);
  if (!Number.isFinite(costGbp) || costGbp < 0) {
    return NextResponse.json({ error: "Invalid cost_gbp" }, { status: 400 });
  }
  const platformFee = Number.isFinite(Number(body.platform_fee_usd)) ? Math.max(0, Number(body.platform_fee_usd)) : 0;

  await ensureSchema();
  const sql = getSql();

  const rows = (await sql`
    select id, total_usd, price_usd from orders where id = ${params.id} limit 1
  `) as Array<{ id: string; total_usd: string | number | null; price_usd: string | number | null }>;
  const order = rows[0];
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const rate = await getGBPtoUSD();
  const costUsd = Math.round(costGbp * rate * 100) / 100; // actual conversion, no markup
  const revenueUsd = Number(order.total_usd ?? order.price_usd) || 0;
  const profitUsd = Math.round((revenueUsd - costUsd - platformFee) * 100) / 100;

  await sql`
    update orders
    set cost_gbp = ${costGbp}, cost_usd = ${costUsd}, platform_fee_usd = ${platformFee},
        profit_usd = ${profitUsd}, profit_notes = ${body.profit_notes ?? null}, updated_at = now()
    where id = ${params.id}
  `;

  return NextResponse.json({
    ok: true,
    cost_gbp: costGbp,
    cost_usd: costUsd,
    platform_fee_usd: platformFee,
    profit_usd: profitUsd,
    revenue_usd: revenueUsd,
    rate
  });
}
