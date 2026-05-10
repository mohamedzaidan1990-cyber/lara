"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminOrderRow from "@/components/AdminOrderRow";
import type { OrderWithCustomer } from "@/lib/db";

interface Props {
  initialOrders: OrderWithCustomer[];
}

export default function AdminDashboard({ initialOrders }: Props) {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);

  const stats = useMemo(() => {
    const total = orders.length;
    const pendingPayment = orders.filter((o) => !o.payment_confirmed && o.status === "pending").length;
    const paymentConfirmed = orders.filter((o) => o.payment_confirmed && o.status === "payment_confirmed").length;
    const shipped = orders.filter((o) => o.status === "shipped" || o.status === "in_lebanon").length;
    const delivered = orders.filter((o) => o.status === "delivered").length;
    return { total, pendingPayment, paymentConfirmed, shipped, delivered };
  }, [orders]);

  function handleUpdated(next: OrderWithCustomer) {
    setOrders((prev) => prev.map((o) => (o.id === next.id ? next : o)));
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.32em] text-gold">Lara</p>
          <h1 className="mt-1 font-serif text-3xl text-ink">Orders</h1>
        </div>
        <button type="button" onClick={logout} className="text-xs uppercase tracking-[0.18em] text-ink/60 hover:text-gold">
          Sign out
        </button>
      </header>

      <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Total" value={stats.total} />
        <Stat label="Pending payment" value={stats.pendingPayment} />
        <Stat label="Payment confirmed" value={stats.paymentConfirmed} />
        <Stat label="Shipped" value={stats.shipped} />
        <Stat label="Delivered" value={stats.delivered} />
      </section>

      <section className="mt-10 overflow-x-auto border border-ink/10">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-ink/10 bg-ink/[0.02] text-left text-[10px] uppercase tracking-[0.18em] text-ink/60">
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">USD</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Paid</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-ink/50">
                  No orders yet.
                </td>
              </tr>
            ) : (
              orders.map((o) => <AdminOrderRow key={o.id} order={o} onUpdated={handleUpdated} />)
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-ink/10 p-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-ink/60">{label}</p>
      <p className="mt-2 font-serif text-3xl text-ink">{value}</p>
    </div>
  );
}
