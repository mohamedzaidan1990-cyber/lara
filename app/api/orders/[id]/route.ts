import { NextResponse } from "next/server";
import { ensureSchema, getSql, ORDER_STATUSES, type OrderRow, type OrderStatus } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PatchBody {
  status?: string;
  payment_confirmed?: boolean;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = params.id;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as PatchBody;
  const nextStatus =
    body.status && (ORDER_STATUSES as string[]).includes(body.status)
      ? (body.status as OrderStatus)
      : undefined;
  const nextPaid = typeof body.payment_confirmed === "boolean" ? body.payment_confirmed : undefined;

  if (nextStatus === undefined && nextPaid === undefined) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  await ensureSchema();
  const sql = getSql();

  const updated = (await sql`
    update orders
    set status = coalesce(${nextStatus ?? null}, status),
        payment_confirmed = coalesce(${nextPaid ?? null}, payment_confirmed),
        updated_at = now()
    where id = ${id}
    returning id, order_number, customer_id, product_name, product_brand, product_url,
              price_gbp, price_usd, status, payment_method, payment_confirmed,
              payment_screenshot, notes, created_at, updated_at
  `) as OrderRow[];

  if (updated.length === 0) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ order: updated[0] });
}
