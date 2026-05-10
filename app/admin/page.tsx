import { redirect } from "next/navigation";
import { ensureSchema, getSql, type OrderWithCustomer } from "@/lib/db";
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
    select o.id, o.order_number, o.customer_id, o.product_name, o.product_brand, o.product_url,
           o.price_gbp, o.price_usd, o.status, o.payment_method, o.payment_confirmed,
           o.payment_screenshot, o.notes, o.created_at, o.updated_at,
           coalesce(c.full_name, '') as full_name,
           coalesce(c.phone, '') as phone,
           coalesce(c.address, '') as address
    from orders o
    left join customers c on c.id = o.customer_id
    order by o.created_at desc
  `) as OrderWithCustomer[];

  return <AdminDashboard initialOrders={rows} />;
}
