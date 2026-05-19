import { NextResponse } from "next/server";
import { ensureSchema, getSql, ORDER_STATUSES, type OrderRow, type OrderStatus } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { sendPaymentConfirmation } from "@/lib/email";
import { sendWhatsAppConfirmation } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PatchBody {
  status?: string;
  payment_confirmed?: boolean;
}

interface JoinedRow extends OrderRow {
  full_name: string;
  phone: string;
  address: string;
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

  const existing = (await sql`
    select payment_confirmed
    from orders
    where id = ${id}
    limit 1
  `) as Array<{ payment_confirmed: boolean }>;
  const wasPaid = existing[0]?.payment_confirmed === true;

  const updated = (await sql`
    update orders
    set status = coalesce(${nextStatus ?? null}, status),
        payment_confirmed = coalesce(${nextPaid ?? null}, payment_confirmed),
        updated_at = now()
    where id = ${id}
    returning id, order_number, customer_id, customer_email, product_name, product_brand, product_url,
              price_gbp, price_usd, status, payment_method, payment_confirmed,
              payment_screenshot, notes, created_at, updated_at
  `) as OrderRow[];

  if (updated.length === 0) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const order = updated[0];

  // Notify customer when admin transitions payment_confirmed: false → true
  if (nextPaid === true && !wasPaid) {
    try {
      const joined = (await sql`
        select o.id, o.order_number, o.customer_email, o.product_brand, o.product_name, o.price_usd,
               coalesce(c.full_name, '') as full_name,
               coalesce(c.phone, '') as phone,
               coalesce(c.address, '') as address
        from orders o
        left join customers c on c.id = o.customer_id
        where o.id = ${id}
        limit 1
      `) as Array<Pick<JoinedRow, "order_number" | "customer_email" | "product_brand" | "product_name" | "price_usd" | "full_name" | "phone" | "address">>;
      const row = joined[0];
      if (row && row.customer_email) {
        const emailOrder = {
          order_number: row.order_number,
          product_brand: row.product_brand,
          product_name: row.product_name,
          price_usd: row.price_usd
        };
        const emailCustomer = {
          full_name: row.full_name,
          phone: row.phone,
          email: row.customer_email,
          address: row.address
        };
        await Promise.all([
          sendPaymentConfirmation(emailOrder, emailCustomer).catch((err) => {
            console.error("sendPaymentConfirmation error", err);
          }),
          row.phone
            ? sendWhatsAppConfirmation(row.phone, row.order_number, row.product_name).catch((err) => {
                console.error("sendWhatsAppConfirmation error", err);
              })
            : Promise.resolve()
        ]);
      }
    } catch (err) {
      console.error("payment-confirmation dispatch failed", err);
    }
  }

  return NextResponse.json({ order });
}
