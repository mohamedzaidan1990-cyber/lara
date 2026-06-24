"use client";

import { useMemo, useState } from "react";
import type { OrderWithCustomer } from "@/lib/db";

interface ClientEntry {
  key: string;
  name: string;
  phone: string;
  address: string;
  orders: OrderWithCustomer[];
  totalSpent: number;
  outstanding: number;
}

function num(v: unknown) {
  return Number(v) || 0;
}

function fmtUsd(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "#C0392B" },
  payment_confirmed: { label: "Confirmed", color: "#E08B45" },
  ordered_selfridges: { label: "Ordered", color: "#3A6EA5" },
  fulfilled_from_stock: { label: "From Stock", color: "#3A6EA5" },
  shipped: { label: "Shipped", color: "#7A4FB0" },
  in_lebanon: { label: "In Lebanon", color: "#7A4FB0" },
  delivered: { label: "Delivered", color: "#277C43" },
  cancelled: { label: "Cancelled", color: "#999" },
  refunded: { label: "Refunded", color: "#999" },
};

export default function AdminClientsTab({ orders }: { orders: OrderWithCustomer[] }) {
  const [search, setSearch] = useState("");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const clients = useMemo(() => {
    const map = new Map<string, ClientEntry>();
    for (const o of orders) {
      const key = o.customer_id ?? `${o.full_name}||${o.phone}`;
      if (!map.has(key)) {
        map.set(key, { key, name: o.full_name, phone: o.phone, address: o.address, orders: [], totalSpent: 0, outstanding: 0 });
      }
      const c = map.get(key)!;
      c.orders.push(o);
      const total = num(o.total_usd ?? o.price_usd);
      const paid = num(o.amount_paid_usd);
      if (o.payment_confirmed) c.totalSpent += total;
      if (!["pending", "cancelled", "refunded"].includes(o.status) && paid < total) {
        c.outstanding += total - paid;
      }
    }
    for (const c of map.values()) {
      c.orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.orders[0].created_at).getTime() - new Date(a.orders[0].created_at).getTime()
    );
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return clients;
    return clients.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q)
    );
  }, [clients, search]);

  return (
    <div className="mt-8 space-y-6">
      <div className="flex items-center gap-4">
        <input
          type="search"
          placeholder="Search by name or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm border border-ink/15 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <p className="text-xs text-ink/50">
          {filtered.length} client{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-ink/40">No clients found.</p>
        ) : (
          filtered.map((c) => {
            const isOpen = expandedKey === c.key;
            return (
              <div key={c.key} className="border border-ink/10">
                <button
                  type="button"
                  onClick={() => setExpandedKey(isOpen ? null : c.key)}
                  className="flex w-full items-start gap-4 px-4 py-4 text-left hover:bg-ink/[0.02]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink">{c.name}</p>
                    <p className="mt-0.5 text-xs text-ink/60">{c.phone}</p>
                    {c.address ? (
                      <p className="mt-0.5 max-w-xs truncate text-xs text-ink/40">{c.address}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-6 text-right">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.16em] text-ink/50">Orders</p>
                      <p className="mt-0.5 font-serif text-lg text-ink">{c.orders.length}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.16em] text-ink/50">Spent</p>
                      <p className="mt-0.5 font-serif text-lg text-ink">{fmtUsd(c.totalSpent)}</p>
                    </div>
                    {c.outstanding > 0 ? (
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.16em] text-ink/50">Owes</p>
                        <p className="mt-0.5 font-serif text-lg" style={{ color: "#C0392B" }}>
                          {fmtUsd(c.outstanding)}
                        </p>
                      </div>
                    ) : null}
                    <span className="text-xs text-ink/30">{isOpen ? "▲" : "▼"}</span>
                  </div>
                </button>

                {isOpen ? (
                  <div className="overflow-x-auto border-t border-ink/10">
                    <table className="min-w-full">
                      <thead>
                        <tr className="bg-ink/[0.02] text-left text-[10px] uppercase tracking-[0.16em] text-ink/50">
                          <th className="px-4 py-2">Order</th>
                          <th className="px-4 py-2">Items</th>
                          <th className="px-4 py-2 text-right">Total</th>
                          <th className="px-4 py-2 text-right">Paid</th>
                          <th className="px-4 py-2">Status</th>
                          <th className="px-4 py-2">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {c.orders.map((o) => {
                          const total = num(o.total_usd ?? o.price_usd);
                          const paid = num(o.amount_paid_usd);
                          const owed = total - paid;
                          const sm = STATUS_META[o.status] ?? { label: o.status, color: "#888" };
                          return (
                            <tr key={o.id} className="border-t border-ink/10 hover:bg-ink/[0.015]">
                              <td className="px-4 py-3 font-mono text-xs text-ink/70">{o.order_number}</td>
                              <td className="px-4 py-3 text-sm text-ink">{o.product_name}</td>
                              <td className="px-4 py-3 text-right text-sm text-ink">{fmtUsd(total)}</td>
                              <td className="px-4 py-3 text-right text-sm">
                                {owed > 0.01 ? (
                                  <span style={{ color: "#C0392B" }}>
                                    {paid > 0 ? fmtUsd(paid) : "—"}
                                    <span className="ml-1 text-[10px]">({fmtUsd(owed)} owed)</span>
                                  </span>
                                ) : (
                                  <span className="text-ink/60">{fmtUsd(paid)}</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className="inline-block rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-white"
                                  style={{ backgroundColor: sm.color }}
                                >
                                  {sm.label}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-ink/50">{o.created_at.slice(0, 10)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
