import { NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { amount_paid_usd?: number | string };
  const amountPaid = Number(body.amount_paid_usd);
  if (!Number.isFinite(amountPaid) || amountPaid < 0) {
    return NextResponse.json({ error: "Invalid amount_paid_usd" }, { status: 400 });
  }
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`
    update orders set amount_paid_usd = ${amountPaid}, updated_at = now()
    where id = ${params.id}
    returning id, amount_paid_usd, coalesce(total_usd, price_usd, 0) as total_usd
  `) as Array<{ id: string; amount_paid_usd: string; total_usd: string }>;
  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const total = Number(rows[0].total_usd) || 0;
  const paid = Number(rows[0].amount_paid_usd) || 0;
  return NextResponse.json({ amount_paid_usd: paid, total_usd: total, balance_due: Math.max(0, total - paid) });
}
