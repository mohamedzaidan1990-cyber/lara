"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminOrderRow from "@/components/AdminOrderRow";
import AdminBespokeRow from "@/components/AdminBespokeRow";
import type { OrderWithCustomer, BespokeRequestRow } from "@/lib/db";

interface Props {
  initialOrders: OrderWithCustomer[];
  initialBespoke?: BespokeRequestRow[];
}

type Tab = "orders" | "bespoke";

export default function AdminDashboard({ initialOrders, initialBespoke = [] }: Props) {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);
  const [tab, setTab] = useState<Tab>("orders");

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

  const newBespoke = initialBespoke.filter((b) => b.status === "new").length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.32em] text-accent">Seasons by B — Admin</p>
          <h1 className="mt-1 font-serif text-3xl text-ink">Dashboard</h1>
        </div>
        <nav className="flex items-center gap-5 text-xs uppercase tracking-[0.18em] text-ink/70">
          <Link href="/admin" className="text-ink hover:text-accent">
            Dashboard
          </Link>
          <Link href="/admin/import" className="hover:text-accent">
            Import Products
          </Link>
          <button type="button" onClick={logout} className="text-ink/60 hover:text-accent">
            Sign out
          </button>
        </nav>
      </header>

      <div className="mt-8 flex gap-2 border-b border-ink/10">
        <TabButton active={tab === "orders"} onClick={() => setTab("orders")} label={`Orders (${orders.length})`} />
        <TabButton
          active={tab === "bespoke"}
          onClick={() => setTab("bespoke")}
          label={`Bespoke Requests${newBespoke > 0 ? ` · ${newBespoke} new` : ` (${initialBespoke.length})`}`}
        />
      </div>

      {tab === "orders" ? (
        <>
          <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Stat label="Total" value={stats.total} />
            <Stat label="Pending payment" value={stats.pendingPayment} />
            <Stat label="Payment confirmed" value={stats.paymentConfirmed} />
            <Stat label="Shipped" value={stats.shipped} />
            <Stat label="Delivered" value={stats.delivered} />
          </section>

          <section className="mt-8 overflow-x-auto border border-ink/10">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-ink/10 bg-ink/[0.02] text-left text-[10px] uppercase tracking-[0.18em] text-ink/60">
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Items</th>
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
        </>
      ) : (
        <section className="mt-8 overflow-x-auto border border-ink/10">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-ink/10 bg-ink/[0.02] text-left text-[10px] uppercase tracking-[0.18em] text-ink/60">
                <th className="px-4 py-3">Session</th>
                <th className="px-4 py-3">WhatsApp</th>
                <th className="px-4 py-3">Summary</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {initialBespoke.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-ink/50">
                    No bespoke requests yet.
                  </td>
                </tr>
              ) : (
                initialBespoke.map((b) => <AdminBespokeRow key={b.id} request={b} />)
              )}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "border-b-2 px-4 py-2 text-xs uppercase tracking-[0.18em] transition-colors " +
        (active ? "border-accent text-ink" : "border-transparent text-ink/50 hover:text-ink")
      }
    >
      {label}
    </button>
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
