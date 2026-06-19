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
    set vendor   = ${body.vendor ?? null},
        cost_gbp = ${costGbp},
        cost_usd = ${costUsd},
        sourced  = ${body.sourced ?? false}
    where id = ${params.id}
  `;

  const rows = (await sql`
    select id, vendor, cost_gbp, cost_usd, sourced, order_id
    from order_items where id = ${params.id} limit 1
  `) as Array<{ id: string; vendor: string | null; cost_gbp: string | null; cost_usd: string | null; sourced: boolean; order_id: string }>;

  const row = rows[0];
  if (!row) return NextResponse.json({ ok: true });

  // When marked sourced, check if all items in this order are now done.
  // If so, auto-advance to ordered_selfridges (only from payment_confirmed status).
  let orderStatus: string | null = null;
  if (body.sourced === true) {
    const orderRows = (await sql`
      select status from orders where id = ${row.order_id} limit 1
    `) as Array<{ status: string }>;

    if (orderRows[0]?.status === "payment_confirmed") {
      const unsourced = (await sql`
        select count(*)::int as cnt from order_items
        where order_id = ${row.order_id} and sourced = false
      `) as Array<{ cnt: number }>;

      if ((unsourced[0]?.cnt ?? 1) === 0) {
        await sql`
          update orders
          set status = 'ordered_selfridges', ordered_selfridges_at = now(), updated_at = now()
          where id = ${row.order_id}
        `;
        orderStatus = "ordered_selfridges";
      }
    }
  }

  return NextResponse.json({
    id: row.id,
    vendor: row.vendor,
    cost_gbp: row.cost_gbp,
    cost_usd: row.cost_usd,
    sourced: row.sourced,
    order_id: row.order_id,
    order_status: orderStatus
  });
}
