import { ensureSchema, getSql } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { orderId: string } }) {
  if (!isAdmin()) {
    return new Response("Unauthorized", { status: 401 });
  }
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`
    select order_number, invoice_pdf from orders where id = ${params.orderId} limit 1
  `) as Array<{ order_number: string; invoice_pdf: string | null }>;
  const row = rows[0];
  if (!row || !row.invoice_pdf) {
    return new Response("Invoice not found", { status: 404 });
  }
  const buffer = Buffer.from(row.invoice_pdf, "base64");
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="seasons-by-b-${row.order_number}.pdf"`,
      "Cache-Control": "private, no-store"
    }
  });
}
