import { NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { generateInvoice, type InvoiceItem } from "@/lib/invoice";
import { sendInvoiceEmail } from "@/lib/email";

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
  amount_paid_usd: string | number | null;
  payment_confirmed: boolean | null;
  full_name: string;
  phone: string;
  address: string;
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { sendEmail?: boolean };

  await ensureSchema();
  const sql = getSql();

  const rows = (await sql`
    SELECT o.id, o.order_number, o.customer_email, o.payment_method, o.total_usd, o.price_usd,
           o.created_at, o.amount_paid_usd, o.payment_confirmed,
           COALESCE(c.full_name, '') AS full_name,
           COALESCE(c.phone, '') AS phone,
           COALESCE(c.address, '') AS address
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    WHERE o.id = ${params.id}
    LIMIT 1
  `) as OrderJoin[];

  const order = rows[0];
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const itemRows = (await sql`
    SELECT product_brand AS brand, product_name AS name, quantity, price_usd
    FROM order_items WHERE order_id = ${order.id} ORDER BY created_at ASC
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
      payment_confirmed: !!order.payment_confirmed,
      payment_method: order.payment_method,
      total_usd: totalUsd,
      amount_paid_usd: Number(order.amount_paid_usd) || undefined,
    },
    { full_name: order.full_name, email: order.customer_email ?? "", phone: order.phone, address: order.address },
    items
  );
  const base64 = pdf.toString("base64");
  const now = new Date().toISOString();

  // Regenerate stored PDF without touching order status or payment_confirmed
  await sql`
    UPDATE orders SET invoice_pdf = ${base64}, invoice_sent_at = ${now}, updated_at = now()
    WHERE id = ${order.id}
  `;

  if (body.sendEmail && order.customer_email) {
    await sendInvoiceEmail({
      orderNumber: order.order_number,
      customerEmail: order.customer_email,
      customerName: order.full_name,
      pdfBase64: base64,
    }).catch((err) => console.error("[resend-invoice] email error", err));
  }

  return NextResponse.json({ success: true, invoice_sent_at: now });
}
