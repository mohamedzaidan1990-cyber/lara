"use client";

import { useState } from "react";
import type { OrderWithCustomer, ExpenseRow, StockItemRow } from "@/lib/db";

interface Props {
  orders: OrderWithCustomer[];
  expenses: ExpenseRow[];
  onExpensesChange: (expenses: ExpenseRow[]) => void;
  stockItems?: StockItemRow[];
}

function fmtUsd(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(v);
}

function num(v: unknown) {
  return Number(v) || 0;
}

const CATEGORIES = ["shipping", "packaging", "fees", "customs", "other"];

export default function AdminAccountingTab({ orders, expenses, onExpensesChange, stockItems = [] }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [amountUsd, setAmountUsd] = useState("");
  const [amountGbp, setAmountGbp] = useState("");
  const [category, setCategory] = useState("other");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const paid = orders.filter((o) => o.payment_confirmed);
  const revenue = paid.reduce((s, o) => s + num(o.total_usd ?? o.price_usd), 0);

  // Per-order COGS: prefer item-level costs if any items have been costed,
  // otherwise fall back to the order-level cost_usd (entered via P&L panel).
  let cogs = 0;
  let costedOrderCount = 0;
  for (const o of paid) {
    const itemsWithCost = (o.items ?? []).filter((it) => it.cost_usd != null && it.cost_usd !== "");
    if (itemsWithCost.length > 0) {
      cogs += itemsWithCost.reduce((s, it) => s + num(it.cost_usd), 0);
      costedOrderCount++;
    } else if (o.cost_usd != null && o.cost_usd !== "") {
      cogs += num(o.cost_usd);
      costedOrderCount++;
    }
  }

  const totalExpenses = expenses.reduce((s, e) => s + num(e.amount_usd), 0);
  const stockCost = stockItems.reduce((s, it) => s + num(it.cost_usd) * (it.quantity || 1), 0);
  const stockCount = stockItems.reduce((s, it) => s + (it.quantity || 1), 0);
  const profit = revenue - cogs - totalExpenses - stockCost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  const EXCLUDED_STATUSES = new Set(["pending", "cancelled", "refunded"]);
  const outstanding = orders.filter((o) => {
    if (EXCLUDED_STATUSES.has(o.status)) return false;
    return num(o.amount_paid_usd) < num(o.total_usd ?? o.price_usd);
  });
  const totalOutstanding = outstanding.reduce(
    (s, o) => s + num(o.total_usd ?? o.price_usd) - num(o.amount_paid_usd),
    0
  );

  async function addExpense() {
    const usd = Number(amountUsd);
    if (!desc.trim() || !Number.isFinite(usd) || usd < 0) {
      alert("Please enter a description and a valid USD amount.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: desc.trim(),
          amount_usd: usd,
          amount_gbp: amountGbp ? Number(amountGbp) : null,
          category,
          expense_date: expenseDate,
          notes: notes.trim() || null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      onExpensesChange([data as ExpenseRow, ...expenses]);
      setDesc("");
      setAmountUsd("");
      setAmountGbp("");
      setCategory("other");
      setNotes("");
      setAddOpen(false);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteExpense(id: string) {
    if (!window.confirm("Delete this expense?")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/admin/expenses/${id}`, { method: "DELETE" });
      onExpensesChange(expenses.filter((e) => e.id !== id));
    } catch {
      alert("Failed to delete expense.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mt-8 space-y-8">
      {/* Summary cards */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Revenue" value={fmtUsd(revenue)} sub={`${paid.length} paid orders`} />
        <StatCard label="COGS" value={fmtUsd(cogs)} sub={`${costedOrderCount} orders costed`} color="#E08B45" />
        <StatCard label="Expenses" value={fmtUsd(totalExpenses)} sub={`${expenses.length} items`} color="#7A4FB0" />
        <StatCard
          label="Stock Invested"
          value={fmtUsd(stockCost)}
          sub={`${stockCount} item${stockCount !== 1 ? "s" : ""} in stock`}
          color="#3A6EA5"
        />
        <StatCard
          label="Net Profit"
          value={fmtUsd(profit)}
          sub={`${margin.toFixed(0)}% margin${stockCount > 0 ? ` · +${stockCount} in stock` : ""}`}
          color={profit >= 0 ? "#277C43" : "#C0392B"}
        />
      </section>

      {costedOrderCount < paid.length ? (
        <p className="text-xs text-ink/50">
          Note: {paid.length - costedOrderCount} paid order(s) have no cost entered — COGS may be understated.
        </p>
      ) : null}

      {/* Outstanding payments */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] uppercase tracking-[0.24em] text-ink/60">Outstanding Payments</h2>
          {outstanding.length > 0 ? (
            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
              {fmtUsd(totalOutstanding)} owed by {outstanding.length} order{outstanding.length !== 1 ? "s" : ""}
            </span>
          ) : (
            <span className="text-xs text-ink/40">All active orders fully paid</span>
          )}
        </div>
        {outstanding.length > 0 ? (
          <div className="mt-3 overflow-x-auto border border-ink/10">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-ink/10 bg-ink/[0.02] text-left text-[10px] uppercase tracking-[0.18em] text-ink/60">
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {outstanding.map((o) => {
                  const total = num(o.total_usd ?? o.price_usd);
                  const paidAmt = num(o.amount_paid_usd);
                  const owed = total - paidAmt;
                  return (
                    <tr key={o.id} className="border-b border-ink/10 hover:bg-ink/[0.015]">
                      <td className="px-4 py-3">
                        <p className="text-sm text-ink">{o.full_name}</p>
                        <p className="text-[11px] text-ink/50">{o.phone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs text-ink/70">{o.order_number}</p>
                        <p className="max-w-[160px] truncate text-[11px] text-ink/50">{o.product_name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <OutstandingStatusBadge status={o.status} />
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-ink">{fmtUsd(total)}</td>
                      <td className="px-4 py-3 text-right text-sm text-ink/60">
                        {paidAmt > 0 ? fmtUsd(paidAmt) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold" style={{ color: "#C0392B" }}>
                        {fmtUsd(owed)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {/* Per-item breakdown */}
      <section>
        <h2 className="text-[10px] uppercase tracking-[0.24em] text-ink/60">Item Breakdown</h2>
        <div className="mt-3 overflow-x-auto border border-ink/10">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-ink/10 bg-ink/[0.02] text-left text-[10px] uppercase tracking-[0.18em] text-ink/60">
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3 text-right">Sold</th>
                <th className="px-4 py-3 text-right">Cost</th>
                <th className="px-4 py-3 text-right">Profit</th>
                <th className="px-4 py-3 text-right">Margin</th>
              </tr>
            </thead>
            <tbody>
              {paid.flatMap((o) => {
                const items = o.items ?? [];
                if (items.length === 0) return [];
                return items.map((it, idx) => {
                  const sold = num(it.price_usd) * it.quantity;
                  const cost = it.cost_usd != null && it.cost_usd !== "" ? num(it.cost_usd) * it.quantity : null;
                  const itemProfit = cost != null ? sold - cost : null;
                  const itemMargin = cost != null && sold > 0 ? ((sold - cost) / sold) * 100 : null;
                  return (
                    <tr key={`${o.id}-${it.id ?? idx}`} className="border-b border-ink/10 hover:bg-ink/[0.015]">
                      <td className="px-4 py-3">
                        <p className="text-sm text-ink">{it.name}</p>
                        <p className="text-[11px] text-ink/50">{it.brand}{it.quantity > 1 ? ` ×${it.quantity}` : ""}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-ink">{o.full_name}</p>
                        <p className="text-[11px] text-ink/50">{o.order_number}</p>
                      </td>
                      <td className="px-4 py-3 text-xs capitalize text-ink/60">
                        {it.vendor ?? <span className="text-ink/30">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-ink">{fmtUsd(sold)}</td>
                      <td className="px-4 py-3 text-right text-sm text-ink/70">
                        {cost != null ? fmtUsd(cost) : <span className="text-ink/30">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium"
                        style={{ color: itemProfit == null ? undefined : itemProfit >= 0 ? "#277C43" : "#C0392B" }}>
                        {itemProfit != null ? fmtUsd(itemProfit) : <span className="text-ink/30">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-ink/60">
                        {itemMargin != null ? `${itemMargin.toFixed(0)}%` : <span className="text-ink/30">—</span>}
                      </td>
                    </tr>
                  );
                });
              })}
              {paid.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-ink/40">No paid orders yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* Expenses table */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] uppercase tracking-[0.24em] text-ink/60">One-off Expenses</h2>
          <button
            type="button"
            onClick={() => setAddOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white hover:opacity-90"
          >
            <span>+</span> Add Expense
          </button>
        </div>

        {addOpen ? (
          <div className="mt-4 border border-ink/10 bg-cream p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <label className="block text-[10px] uppercase tracking-[0.16em] text-ink/60">Description *</label>
                <input
                  type="text"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="mt-1 w-full border border-ink/15 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
                  placeholder="e.g. DHL shipping fee"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.16em] text-ink/60">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 w-full border border-ink/15 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.16em] text-ink/60">Amount (USD) *</label>
                <input
                  type="number"
                  value={amountUsd}
                  onChange={(e) => setAmountUsd(e.target.value)}
                  className="mt-1 w-full border border-ink/15 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.16em] text-ink/60">Amount (GBP)</label>
                <input
                  type="number"
                  value={amountGbp}
                  onChange={(e) => setAmountGbp(e.target.value)}
                  className="mt-1 w-full border border-ink/15 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
                  placeholder="optional"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.16em] text-ink/60">Date</label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="mt-1 w-full border border-ink/15 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-[10px] uppercase tracking-[0.16em] text-ink/60">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 w-full border border-ink/15 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
                  placeholder="optional"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={addExpense}
                disabled={saving}
                className="btn-primary text-xs disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Expense"}
              </button>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="btn-outline text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-4 overflow-x-auto border border-ink/10">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-ink/10 bg-ink/[0.02] text-left text-[10px] uppercase tracking-[0.18em] text-ink/60">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">USD</th>
                <th className="px-4 py-3">GBP</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-ink/50">No expenses yet.</td>
                </tr>
              ) : (
                expenses.map((e) => (
                  <tr key={e.id} className="border-b border-ink/10 hover:bg-ink/[0.02]">
                    <td className="px-4 py-3 text-xs text-ink/70">{e.expense_date ? String(e.expense_date).slice(0, 10) : '—'}</td>
                    <td className="px-4 py-3 text-sm text-ink">{e.description}</td>
                    <td className="px-4 py-3 text-xs text-ink/60 capitalize">{e.category}</td>
                    <td className="px-4 py-3 text-sm font-medium text-ink">{fmtUsd(num(e.amount_usd))}</td>
                    <td className="px-4 py-3 text-xs text-ink/70">
                      {e.amount_gbp != null ? `£${Number(e.amount_gbp).toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink/60">{e.notes ?? "—"}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => deleteExpense(e.id)}
                        disabled={deletingId === e.id}
                        className="text-xs text-ink/40 hover:text-red-500 disabled:opacity-40"
                      >
                        {deletingId === e.id ? "…" : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const OUTSTANDING_STATUS_META: Record<string, { label: string; color: string }> = {
  payment_confirmed: { label: "Confirmed", color: "#E08B45" },
  ordered_selfridges: { label: "Ordered", color: "#3A6EA5" },
  fulfilled_from_stock: { label: "From Stock", color: "#3A6EA5" },
  shipped: { label: "Shipped", color: "#7A4FB0" },
  in_lebanon: { label: "In Lebanon", color: "#7A4FB0" },
  delivered: { label: "Delivered", color: "#277C43" },
};

function OutstandingStatusBadge({ status }: { status: string }) {
  const sm = OUTSTANDING_STATUS_META[status] ?? { label: status, color: "#888" };
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-white"
      style={{ backgroundColor: sm.color }}
    >
      {sm.label}
    </span>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="border border-ink/10 bg-gold/10 p-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-ink/60">{label}</p>
      <p className="mt-2 font-serif text-2xl" style={{ color: color ?? "#23272A" }}>{value}</p>
      {sub ? <p className="mt-1 text-[11px] text-ink/50">{sub}</p> : null}
    </div>
  );
}
