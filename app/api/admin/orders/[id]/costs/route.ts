import { NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    platform_fee_usd?: number | string;
    profit_notes?: string;
  };

  const platformFee = Number.isFinite(Number(body.platform_fee_usd)) ? Math.max(0, Number(body.platform_fee_usd)) : 0;

  await ensureSchema();
  const sql = getSql();

  const rows = (await sql`
    select id, coalesce(total_usd, price_usd, 0) as revenue_usd from orders where id = ${params.id} limit 1
  `) as Array<{ id: string; revenue_usd: string | number }>;
  const order = rows[0];
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Derive cost from item costs — never take a manual cost_gbp input.
  const costSums = (await sql`
    select sum(cost_usd) as total_cost_usd, sum(cost_gbp) as total_cost_gbp
    from order_items where order_id = ${params.id}
  `) as Array<{ total_cost_usd: string | null; total_cost_gbp: string | null }>;

  const costUsd = costSums[0]?.total_cost_usd != null ? Math.round(Number(costSums[0].total_cost_usd) * 100) / 100 : null;
  const costGbp = costSums[0]?.total_cost_gbp != null ? Math.round(Number(costSums[0].total_cost_gbp) * 100) / 100 : null;
  const revenueUsd = Number(order.revenue_usd) || 0;
  const profitUsd = costUsd != null ? Math.round((revenueUsd - costUsd - platformFee) * 100) / 100 : null;

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
    revenue_usd: revenueUsd
  });
}
