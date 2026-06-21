"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminOrderRow from "@/components/AdminOrderRow";
import AdminBespokeRow from "@/components/AdminBespokeRow";
import AdminManualOrderModal from "@/components/AdminManualOrderModal";
import AdminAccountingTab from "@/components/AdminAccountingTab";
import AdminAwaitingOrderTab from "@/components/AdminAwaitingOrderTab";
import AdminStockTab from "@/components/AdminStockTab";
import type { OrderWithCustomer, BespokeRequestRow, ExpenseRow, StockItemRow } from "@/lib/db";

interface Props {
  initialOrders: OrderWithCustomer[];
  initialBespoke?: BespokeRequestRow[];
  initialExpenses?: ExpenseRow[];
  initialStock?: StockItemRow[];
}

type Tab = "orders" | "awaiting" | "bespoke" | "accounting" | "stock";

interface Group {
  key: string;
  label: string;
  color: string;
  match: (o: OrderWithCustomer) => boolean;
}

const GROUPS: Group[] = [
  { key: "pending", label: "Pending Payment", color: "#C0392B", match: (o) => !o.payment_confirmed && o.status === "pending" },
  { key: "payment_confirmed", label: "Payment Confirmed", color: "#E08B45", match: (o) => o.status === "payment_confirmed" },
  { key: "ordered_selfridges", label: "Ordered", color: "#3A6EA5", match: (o) => o.status === "ordered_selfridges" || o.status === "fulfilled_from_stock" },
  { key: "shipped", label: "Shipped", color: "#7A4FB0", match: (o) => o.status === "shipped" || o.status === "in_lebanon" },
  { key: "delivered", label: "Delivered", color: "#277C43", match: (o) => o.status === "delivered" }
];

export default function AdminDashboard({ initialOrders, initialBespoke = [], initialExpenses = [], initialStock = [] }: Props) {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);
  const [expenses, setExpenses] = useState<ExpenseRow[]>(initialExpenses);
  const [stockItems, setStockItems] = useState<StockItemRow[]>(initialStock);
  const [tab, setTab] = useState<Tab>("orders");
  const [filter, setFilter] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const g of GROUPS) c[g.key] = orders.filter(g.match).length;
    return c;
  }, [orders]);

  const visibleOrders = useMemo(() => {
    if (!filter) return orders;
    const g = GROUPS.find((x) => x.key === filter);
    return g ? orders.filter(g.match) : orders;
  }, [orders, filter]);

  const pnl = useMemo(() => {
    const num = (v: unknown) => Number(v) || 0;
    const revenue = orders.filter((o) => o.payment_confirmed).reduce((s, o) => s + num(o.total_usd ?? o.price_usd), 0);
    const costed = orders.filter((o) => o.cost_usd != null && o.cost_usd !== "");
    const cost = costed.reduce((s, o) => s + num(o.cost_usd), 0);
    const profit = costed.reduce((s, o) => s + num(o.profit_usd), 0);
    const costedRevenue = costed.reduce((s, o) => s + num(o.total_usd ?? o.price_usd), 0);
    const margin = costedRevenue > 0 ? (profit / costedRevenue) * 100 : 0;
    return { revenue, cost, profit, margin, hasCost: costed.length > 0 };
  }, [orders]);

  const awaitingCount = useMemo(() => {
    return orders
      .filter((o) => o.payment_confirmed && !["shipped", "in_lebanon", "delivered", "cancelled", "refunded"].includes(o.status))
      .flatMap((o) => o.items ?? [])
      .filter((it) => it.id && !it.sourced).length;
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
          <Link href="/admin" className="text-ink hover:text-accent">Dashboard</Link>
          <Link href="/admin/import" className="hover:text-accent">Import Products</Link>
          <button type="button" onClick={logout} className="text-ink/60 hover:text-accent">Sign out</button>
        </nav>
      </header>

      <div className="mt-8 flex gap-2 border-b border-ink/10">
        <TabButton active={tab === "orders"} onClick={() => setTab("orders")} label={`Orders (${orders.length})`} />
        <TabButton
          active={tab === "bespoke"}
          onClick={() => setTab("bespoke")}
          label={`Bespoke Requests${newBespoke > 0 ? ` · ${newBespoke} new` : ` (${initialBespoke.length})`}`}
        />
        <TabButton
          active={tab === "awaiting"}
          onClick={() => setTab("awaiting")}
          label={`Awaiting Order${awaitingCount > 0 ? ` · ${awaitingCount}` : ""}`}
        />
        <TabButton active={tab === "accounting"} onClick={() => setTab("accounting")} label="Accounting" />
        <TabButton active={tab === "stock"} onClick={() => setTab("stock")} label="Stock" />
      </div>

      {tab === "accounting" ? (
        <AdminAccountingTab orders={orders} expenses={expenses} onExpensesChange={setExpenses} stockItems={stockItems} />
      ) : tab === "stock" ? (
        <AdminStockTab items={stockItems} onItemsChange={setStockItems} orders={orders} onOrderUpdated={handleUpdated} />
      ) : tab === "awaiting" ? (
        <AdminAwaitingOrderTab orders={orders} onOrderUpdated={handleUpdated} />
      ) : tab === "orders" ? (
        <>
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => setShowManual(true)}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-white shadow-md transition-opacity hover:opacity-90"
            >
              <span aria-hidden>+</span> Add Manual Order
            </button>
          </div>

          <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {GROUPS.map((g) => {
              const active = filter === g.key;
              return (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => setFilter(active ? null : g.key)}
                  className={"border p-4 text-left transition-all " + (active ? "shadow-soft" : "border-ink/10 hover:-translate-y-0.5")}
                  style={active ? { borderColor: g.color } : undefined}
                >
                  <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: g.color }} />
                  <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-ink/60">{g.label}</p>
                  <p className="mt-1 font-serif text-3xl text-ink">{counts[g.key]}</p>
                </button>
              );
            })}
          </section>

          {pnl.hasCost ? (
            <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <PnlStat label="Total Revenue" value={fmtUsd(pnl.revenue)} />
              <PnlStat label="Total Cost" value={fmtUsd(pnl.cost)} />
              <PnlStat label="Total Profit" value={fmtUsd(pnl.profit)} color={pnl.profit >= 0 ? "#277C43" : "#C0392B"} />
              <PnlStat label="Avg Margin" value={`${pnl.margin.toFixed(0)}%`} />
            </section>
          ) : null}

          {filter ? (
            <p className="mt-4 text-xs text-ink/60">
              Showing {GROUPS.find((g) => g.key === filter)?.label}.{" "}
              <button type="button" onClick={() => setFilter(null)} className="text-accent hover:underline">
                Clear filter
              </button>
            </p>
          ) : null}

          <section className="mt-6 overflow-x-auto border border-ink/10">
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
                {visibleOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-sm text-ink/50">No orders here.</td>
                  </tr>
                ) : (
                  visibleOrders.map((o) => (
                    <AdminOrderRow
                      key={o.id}
                      order={o}
                      onUpdated={handleUpdated}
                      onStockAdded={(newItems) => setStockItems((prev) => [...newItems, ...prev])}
                    />
                  ))
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
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-ink/50">No bespoke requests yet.</td>
                </tr>
              ) : (
                initialBespoke.map((b) => <AdminBespokeRow key={b.id} request={b} />)
              )}
            </tbody>
          </table>
        </section>
      )}
      {showManual ? (
        <AdminManualOrderModal
          onClose={() => setShowManual(false)}
          onCreated={(order) => {
            setOrders((prev) => [order, ...prev]);
            setShowManual(false);
          }}
        />
      ) : null}
    </div>
  );
}

function fmtUsd(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function PnlStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="border border-ink/10 bg-gold/10 p-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-ink/60">{label}</p>
      <p className="mt-2 font-serif text-2xl" style={{ color: color ?? "#23272A" }}>
        {value}
      </p>
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
