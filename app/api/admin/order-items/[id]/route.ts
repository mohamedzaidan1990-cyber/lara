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
    vendor?: string | null;
    cost_gbp?: number | string | null;
    cost_usd?: number | string | null;
    sourced?: boolean;
  };

  const costGbp = body.cost_gbp != null && body.cost_gbp !== "" ? Number(body.cost_gbp) : null;
  const costUsd = body.cost_usd != null && body.cost_usd !== "" ? Number(body.cost_usd) : null;

  await ensureSchema();
  const sql = getSql();

  await sql`
    update order_items
    set vendor    = ${body.vendor ?? null},
        cost_gbp  = ${costGbp},
        cost_usd  = ${costUsd},
        sourced   = ${body.sourced ?? false}
    where id = ${params.id}
  `;

  const rows = (await sql`
    select id, vendor, cost_gbp, cost_usd, sourced from order_items where id = ${params.id} limit 1
  `) as Array<{ id: string; vendor: string | null; cost_gbp: string | null; cost_usd: string | null; sourced: boolean }>;

  return NextResponse.json(rows[0] ?? { ok: true });
}
