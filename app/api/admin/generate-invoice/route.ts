import { NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { generateInvoice, type InvoiceItem } from "@/lib/invoice";
import { sendInvoiceEmail } from "@/lib/email";
import { sendWhatsAppText } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface OrderJoin {
  id: string;
  order_number: string;
  customer_email: string | null;
  payment_method: string | null;
  total_usd: string | number | null;
  price_usd: string | number | null;
  created_at: string;
  full_name: string;
  phone: string;
  address: string;
}

export async function POST(req: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { orderId?: string };
  if (!body.orderId) {
    return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
  }

  await ensureSchema();
  const sql = getSql();

  const rows = (await sql`
    select o.id, o.order_number, o.customer_email, o.payment_method, o.total_usd, o.price_usd, o.created_at,
           coalesce(c.full_name, '') as full_name,
           coalesce(c.phone, '') as phone,
           coalesce(c.address, '') as address
    from orders o
    left join customers c on c.id = o.customer_id
    where o.id = ${body.orderId}
    limit 1
  `) as OrderJoin[];
  const order = rows[0];
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const itemRows = (await sql`
    select product_brand as brand, product_name as name, quantity, price_usd
    from order_items where order_id = ${order.id} order by created_at asc
  `) as Array<{ brand: string; name: string; quantity: number; price_usd: string | number }>;

  const items: InvoiceItem[] =
    itemRows.length > 0
      ? itemRows.map((r) => ({ brand: r.brand, name: r.name, quantity: Number(r.quantity) || 1, price_usd: Number(r.price_usd) || 0 }))
      : [{ brand: "Seasons by B", name: order.order_number, quantity: 1, price_usd: Number(order.total_usd ?? order.price_usd) || 0 }];

  const totalUsd = Number(order.total_usd ?? order.price_usd) || items.reduce((s, it) => s + it.price_usd * it.quantity, 0);

  const pdf = generateInvoice(
    {
      order_number: order.order_number,
      created_at: order.created_at,
      payment_confirmed: true,
      payment_method: order.payment_method,
      total_usd: totalUsd
    },
    { full_name: order.full_name, email: order.customer_email ?? "", phone: order.phone, address: order.address },
    items
  );
  const base64 = pdf.toString("base64");

  await sql`
    update orders
    set invoice_pdf = ${base64}, invoice_sent_at = now(),
        payment_confirmed = true, status = 'payment_confirmed', updated_at = now()
    where id = ${order.id}
  `;

  const firstName = (order.full_name || "there").split(" ")[0];
  // Fire-and-forget notifications.
  try {
    await Promise.all([
      order.customer_email
        ? sendInvoiceEmail({
            orderNumber: order.order_number,
            customerEmail: order.customer_email,
            customerName: order.full_name,
            pdfBase64: base64
          }).catch((err) => console.error("sendInvoiceEmail error", err))
        : Promise.resolve(),
      order.phone
        ? sendWhatsAppText(
            order.phone,
            `Hi ${firstName}! 🐝 Your payment for order ${order.order_number} has been confirmed. Your invoice has been sent to your email. We're now sourcing your items from London — estimated delivery 10-14 working days. Questions? Reply here anytime.`
          ).catch((err) => console.error("invoice whatsapp error", err))
        : Promise.resolve()
    ]);
  } catch (err) {
    console.error("invoice dispatch failed", err);
  }

  return NextResponse.json({ success: true, invoiceUrl: `/api/admin/invoice/${order.id}`, invoice_sent_at: new Date().toISOString() });
}
