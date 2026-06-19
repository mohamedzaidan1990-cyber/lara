"use client";

import { useEffect, useState } from "react";
import type { OrderWithCustomer, OrderLineItem, OrderStatus } from "@/lib/db";

interface FlatItem {
  item: OrderLineItem;
  order: OrderWithCustomer;
}

interface Draft {
  vendor: string;        // "selfridges" | free text
  vendorOther: string;   // free text when not selfridges
  cost_gbp: string;
  sourced: boolean;
}

interface Props {
  orders: OrderWithCustomer[];
  onOrderUpdated: (next: OrderWithCustomer) => void;
}

function fmt(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(v);
}

function fmtGbp(v: number) {
  return `£${v.toFixed(2)}`;
}

function deriveDraft(item: OrderLineItem): Draft {
  const vendor = item.vendor ?? "";
  const isSelfridges = vendor === "" || vendor.toLowerCase() === "selfridges";
  return {
    vendor: isSelfridges ? "selfridges" : "other",
    vendorOther: isSelfridges ? "" : vendor,
    cost_gbp: item.cost_gbp != null ? String(item.cost_gbp) : "",
    sourced: item.sourced ?? false
  };
}

export default function AdminAwaitingOrderTab({ orders, onOrderUpdated }: Props) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [rate, setRate] = useState(1.34);
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    fetch("/api/exchange-rate")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && Number.isFinite(d.rate) && d.rate > 0) setRate(d.rate); })
      .catch(() => {});
  }, []);

  // Items from payment-confirmed orders that haven't shipped/delivered yet
  const flat: FlatItem[] = orders
    .filter((o) => o.payment_confirmed && !["shipped", "in_lebanon", "delivered", "cancelled", "refunded"].includes(o.status))
    .flatMap((o) => (o.items ?? []).map((item) => ({ item, order: o })))
    .filter((fi) => fi.item.id); // only items with a DB id

  const pending = flat.filter((fi) => !(fi.item.sourced ?? false));
  const done = flat.filter((fi) => fi.item.sourced ?? false);

  function getDraft(item: OrderLineItem): Draft {
    if (!item.id) return deriveDraft(item);
    return drafts[item.id] ?? deriveDraft(item);
  }

  function setDraft(id: string, patch: Partial<Draft>) {
    setDrafts((prev) => ({ ...prev, [id]: { ...(prev[id] ?? deriveDraft({ id } as OrderLineItem)), ...patch } }));
  }

  async function save(fi: FlatItem) {
    const { item, order } = fi;
    if (!item.id) return;
    const d = getDraft(item);
    const vendorName = d.vendor === "selfridges" ? "selfridges" : d.vendorOther.trim() || "other";
    const costGbpVal = d.cost_gbp !== "" ? Number(d.cost_gbp) : null;
    setSaving(item.id);
    try {
      const res = await fetch(`/api/admin/order-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor: vendorName,
          cost_gbp: costGbpVal,
          cost_usd: costGbpVal != null ? Math.round(costGbpVal * rate * 100) / 100 : null,
          sourced: d.sourced
        })
      });
      if (!res.ok) throw new Error("Save failed");
      const updated = await res.json() as { vendor: string | null; cost_gbp: string | null; cost_usd: string | null; sourced: boolean; order_status?: string | null };
      const nextItems = (order.items ?? []).map((it) =>
        it.id === item.id
          ? { ...it, vendor: updated.vendor, cost_gbp: updated.cost_gbp, cost_usd: updated.cost_usd, sourced: updated.sourced }
          : it
      );
      const statusPatch = updated.order_status
        ? { status: updated.order_status as OrderStatus, ordered_selfridges_at: new Date().toISOString() }
        : {};
      onOrderUpdated({ ...order, items: nextItems, ...statusPatch });
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(null);
    }
  }

  async function toggleSourced(fi: FlatItem) {
    const { item } = fi;
    if (!item.id) return;
    const d = getDraft(item);
    const next = !d.sourced;
    setDraft(item.id, { sourced: next });
    // Auto-save immediately when checkbox is toggled
    const vendorName = d.vendor === "selfridges" ? "selfridges" : d.vendorOther.trim() || "other";
    const costGbpVal = d.cost_gbp !== "" ? Number(d.cost_gbp) : null;
    setSaving(item.id);
    try {
      const res = await fetch(`/api/admin/order-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor: vendorName,
          cost_gbp: costGbpVal,
          cost_usd: costGbpVal != null ? Math.round(costGbpVal * rate * 100) / 100 : null,
          sourced: next
        })
      });
      if (!res.ok) throw new Error("Save failed");
      const updated = await res.json() as { vendor: string | null; cost_gbp: string | null; cost_usd: string | null; sourced: boolean; order_status?: string | null };
      const nextItems = (fi.order.items ?? []).map((it) =>
        it.id === item.id
          ? { ...it, vendor: updated.vendor, cost_gbp: updated.cost_gbp, cost_usd: updated.cost_usd, sourced: updated.sourced }
          : it
      );
      const statusPatch = updated.order_status
        ? { status: updated.order_status as OrderStatus, ordered_selfridges_at: new Date().toISOString() }
        : {};
      onOrderUpdated({ ...fi.order, items: nextItems, ...statusPatch });
    } catch (err) {
      alert((err as Error).message);
      setDraft(item.id, { sourced: !next }); // revert
    } finally {
      setSaving(null);
    }
  }

  if (flat.length === 0) {
    return (
      <div className="mt-16 text-center">
        <p className="text-3xl">✓</p>
        <p className="mt-3 text-sm text-ink/50">No items waiting to be ordered.</p>
        <p className="mt-1 text-xs text-ink/40">Items appear here when a customer's payment is confirmed.</p>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-2">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div className="flex gap-6 text-sm">
          <span>
            <span className="font-medium text-ink">{pending.length}</span>
            <span className="text-ink/50"> to order</span>
          </span>
          <span>
            <span className="font-medium text-ink">{done.length}</span>
            <span className="text-ink/50"> ordered</span>
          </span>
        </div>
        {done.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            className="text-xs text-ink/50 hover:text-accent"
          >
            {showDone ? "Hide ordered items" : `Show ${done.length} ordered`}
          </button>
        ) : null}
      </div>

      <ItemTable items={pending} drafts={drafts} saving={saving} rate={rate} onSetDraft={setDraft} onSave={save} onToggle={toggleSourced} dim={false} />

      {showDone && done.length > 0 ? (
        <div className="mt-6">
          <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-ink/40">Already Ordered</p>
          <ItemTable items={done} drafts={drafts} saving={saving} rate={rate} onSetDraft={setDraft} onSave={save} onToggle={toggleSourced} dim />
        </div>
      ) : null}
    </div>
  );
}

function ItemTable({
  items, drafts, saving, rate, onSetDraft, onSave, onToggle, dim
}: {
  items: FlatItem[];
  drafts: Record<string, Draft>;
  saving: string | null;
  rate: number;
  onSetDraft: (id: string, patch: Partial<Draft>) => void;
  onSave: (fi: FlatItem) => void;
  onToggle: (fi: FlatItem) => void;
  dim: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <div className="overflow-x-auto border border-ink/10">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-ink/10 bg-ink/[0.02] text-left text-[10px] uppercase tracking-[0.18em] text-ink/60">
            <th className="px-4 py-3 w-10">Done</th>
            <th className="px-4 py-3">Item</th>
            <th className="px-4 py-3">Qty × Price</th>
            <th className="px-4 py-3">Client</th>
            <th className="px-4 py-3">Ordered From</th>
            <th className="px-4 py-3">Cost Paid</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {items.map((fi) => {
            const { item, order } = fi;
            const id = item.id!;
            const d = drafts[id] ?? deriveDraft(item);
            const isBusy = saving === id;
            const costGbpNum = d.cost_gbp !== "" ? Number(d.cost_gbp) : null;
            const costUsdPreview = costGbpNum != null ? costGbpNum * rate : null;

            return (
              <tr
                key={id}
                className={"border-b border-ink/10 " + (dim ? "opacity-50" : "hover:bg-ink/[0.015]")}
              >
                {/* Sourced checkbox */}
                <td className="px-4 py-4">
                  <button
                    type="button"
                    onClick={() => onToggle(fi)}
                    disabled={isBusy}
                    className={
                      "flex h-6 w-6 items-center justify-center rounded border transition-colors " +
                      (d.sourced
                        ? "border-green-600 bg-green-600 text-white"
                        : "border-ink/25 bg-white hover:border-accent")
                    }
                    title={d.sourced ? "Mark as not ordered" : "Mark as ordered"}
                  >
                    {d.sourced ? "✓" : ""}
                  </button>
                </td>

                {/* Item */}
                <td className="px-4 py-4">
                  <p className="text-sm font-medium text-ink">{item.name}</p>
                  <p className="text-xs text-ink/50">{item.brand}</p>
                  {item.product_url ? (
                    <a href={item.product_url} target="_blank" rel="noreferrer" className="text-[11px] text-accent hover:underline">
                      View product ↗
                    </a>
                  ) : null}
                </td>

                {/* Qty × price */}
                <td className="px-4 py-4 whitespace-nowrap text-sm text-ink">
                  {item.quantity > 1 ? <span className="text-ink/50">×{item.quantity} </span> : null}
                  {fmt(Number(item.price_usd) * item.quantity)}
                </td>

                {/* Client */}
                <td className="px-4 py-4">
                  <p className="text-sm text-ink">{order.full_name}</p>
                  <p className="text-[11px] text-ink/50">{order.order_number}</p>
                  <p className="text-[11px] text-ink/50">{order.phone}</p>
                </td>

                {/* Vendor */}
                <td className="px-4 py-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => onSetDraft(id, { vendor: "selfridges" })}
                        className={
                          "rounded px-2.5 py-1 text-[11px] font-medium transition-colors " +
                          (d.vendor === "selfridges"
                            ? "bg-accent text-white"
                            : "border border-ink/15 text-ink/60 hover:border-accent/50")
                        }
                      >
                        Selfridges
                      </button>
                      <button
                        type="button"
                        onClick={() => onSetDraft(id, { vendor: "other" })}
                        className={
                          "rounded px-2.5 py-1 text-[11px] font-medium transition-colors " +
                          (d.vendor === "other"
                            ? "bg-accent text-white"
                            : "border border-ink/15 text-ink/60 hover:border-accent/50")
                        }
                      >
                        Other
                      </button>
                    </div>
                    {d.vendor === "other" ? (
                      <input
                        type="text"
                        value={d.vendorOther}
                        onChange={(e) => onSetDraft(id, { vendorOther: e.target.value })}
                        placeholder="e.g. Boots, Nykaa…"
                        className="w-36 border border-ink/15 bg-white px-2 py-1 text-xs focus:border-accent focus:outline-none"
                      />
                    ) : null}
                  </div>
                </td>

                {/* Cost */}
                <td className="px-4 py-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-ink/50">£</span>
                    <input
                      type="number"
                      value={d.cost_gbp}
                      onChange={(e) => onSetDraft(id, { cost_gbp: e.target.value })}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-20 border border-ink/15 bg-white px-2 py-1 text-sm focus:border-accent focus:outline-none"
                    />
                  </div>
                  {costUsdPreview != null ? (
                    <p className="mt-0.5 text-[10px] text-ink/40">≈ {fmt(costUsdPreview)}</p>
                  ) : null}
                </td>

                {/* Save */}
                <td className="px-4 py-4">
                  <button
                    type="button"
                    onClick={() => onSave(fi)}
                    disabled={isBusy}
                    className="rounded bg-ink/5 px-3 py-1.5 text-[11px] font-medium text-ink/70 hover:bg-ink/10 disabled:opacity-40"
                  >
                    {isBusy ? "…" : "Save"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
