"use client";

import { useState } from "react";
import type { OrderWithCustomer, ExpenseRow } from "@/lib/db";

interface Props {
  orders: OrderWithCustomer[];
  expenses: ExpenseRow[];
  onExpensesChange: (expenses: ExpenseRow[]) => void;
}

function fmtUsd(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(v);
}

function num(v: unknown) {
  return Number(v) || 0;
}

const CATEGORIES = ["shipping", "packaging", "fees", "customs", "other"];

export default function AdminAccountingTab({ orders, expenses, onExpensesChange }: Props) {
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

  const costed = orders.filter((o) => o.cost_usd != null && o.cost_usd !== "");
  const cogs = costed.reduce((s, o) => s + num(o.cost_usd), 0);

  const totalExpenses = expenses.reduce((s, e) => s + num(e.amount_usd), 0);
  const profit = revenue - cogs - totalExpenses;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

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
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Revenue" value={fmtUsd(revenue)} sub={`${paid.length} paid orders`} />
        <StatCard label="COGS" value={fmtUsd(cogs)} sub={`${costed.length} orders costed`} color="#E08B45" />
        <StatCard label="Expenses" value={fmtUsd(totalExpenses)} sub={`${expenses.length} items`} color="#7A4FB0" />
        <StatCard
          label="Net Profit"
          value={fmtUsd(profit)}
          sub={`${margin.toFixed(0)}% margin`}
          color={profit >= 0 ? "#277C43" : "#C0392B"}
        />
      </section>

      {costed.length < paid.length ? (
        <p className="text-xs text-ink/50">
          Note: {paid.length - costed.length} paid order(s) have no cost entered — COGS may be understated.
        </p>
      ) : null}

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
                    <td className="px-4 py-3 text-xs text-ink/70">{e.expense_date?.slice(0, 10)}</td>
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

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="border border-ink/10 bg-gold/10 p-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-ink/60">{label}</p>
      <p className="mt-2 font-serif text-2xl" style={{ color: color ?? "#23272A" }}>{value}</p>
      {sub ? <p className="mt-1 text-[11px] text-ink/50">{sub}</p> : null}
    </div>
  );
}
