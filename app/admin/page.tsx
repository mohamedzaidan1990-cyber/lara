import { redirect } from "next/navigation";
import { ensureSchema, getSql, type OrderWithCustomer, type ExpenseRow } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import AdminDashboard from "./AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!isAdmin()) {
    redirect("/admin/login");
  }

  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`
    select o.id, o.order_number, o.customer_id, o.customer_email, o.product_name, o.product_brand, o.product_url,
           o.price_gbp, o.price_usd, o.total_usd, o.total_gbp, o.items_count,
           o.status, o.payment_method, o.payment_confirmed,
           o.payment_screenshot, o.notes, o.created_at, o.updated_at,
           o.invoice_sent_at, o.tracking_number,
           o.cost_gbp, o.cost_usd, o.platform_fee_usd, o.profit_usd, o.profit_notes, o.source,
           o.amount_paid_usd,
           coalesce(c.full_name, '') as full_name,
           coalesce(c.phone, '') as phone,
           coalesce(c.address, '') as address,
           coalesce(
             (select json_agg(json_build_object(
                'id', oi.id, 'brand', oi.product_brand, 'name', oi.product_name, 'quantity', oi.quantity,
                'price_usd', oi.price_usd, 'price_gbp', oi.price_gbp, 'product_url', oi.product_url,
                'vendor', oi.vendor, 'cost_gbp', oi.cost_gbp, 'cost_usd', oi.cost_usd, 'sourced', oi.sourced
              )) from order_items oi where oi.order_id = o.id),
             '[]'
           ) as items
    from orders o
    left join customers c on c.id = o.customer_id
    order by o.created_at desc
  `) as OrderWithCustomer[];

  const bespoke = (await sql`
    select id, session_id, customer_whatsapp, conversation_summary, full_conversation, status, created_at
    from bespoke_requests
    order by created_at desc
  `) as import("@/lib/db").BespokeRequestRow[];

  const expenses = (await sql`
    select id, description, amount_usd, amount_gbp, category, expense_date, notes, created_at
    from expenses
    order by expense_date desc, created_at desc
  `) as ExpenseRow[];

  return <AdminDashboard initialOrders={rows} initialBespoke={bespoke} initialExpenses={expenses} />;
}
