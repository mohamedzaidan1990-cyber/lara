"use client";

import { useEffect, useState } from "react";
import { ORDER_STATUS_LABELS, type OrderStatus, type OrderWithCustomer, type OrderLineItem, type StockItemRow } from "@/lib/db";
import { BeeSvg } from "@/components/BeeMascot";

interface ProductSearchResult {
  id: string;
  brand: string;
  name: string;
  product_url: string | null;
  image_url: string | null;
  price_gbp: string;
  price_usd: string;
}

interface EditDraft {
  brand: string;
  name: string;
  price_gbp: string;
  price_usd: string;
  product_url: string;
  image_url: string;
}

function usd(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

interface Props {
  order: OrderWithCustomer;
  onUpdated?: (next: OrderWithCustomer) => void;
  onStockAdded?: (items: StockItemRow[]) => void;
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function whatsappLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const lebanon = digits.startsWith("961") ? digits : "961" + digits.replace(/^0/, "");
  return `https://wa.me/${lebanon}`;
}

function PnlLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-ink/80">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function selfridgesSearch(brand: string, name: string): string {
  return `https://www.selfridges.com/GB/en/cat/?term=${encodeURIComponent(`${brand} ${name}`.trim())}`;
}

export default function AdminOrderRow({ order, onUpdated, onStockAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [local, setLocal] = useState(order);

  // Profit & loss
  const [pnlOpen, setPnlOpen] = useState(false);
  const [rate, setRate] = useState(1.34);
  const [costGbp, setCostGbp] = useState(local.cost_gbp != null ? String(local.cost_gbp) : "");
  const [platformFee, setPlatformFee] = useState(local.platform_fee_usd != null ? String(local.platform_fee_usd) : "");
  const [savingPnl, setSavingPnl] = useState(false);

  // Per-item sourcing
  const [itemDrafts, setItemDrafts] = useState<Record<string, { vendor: string; cost_gbp: string; bank_rate: string; cost_usd: string; sourced: boolean }>>({});
  const [savingItem, setSavingItem] = useState<string | null>(null);

  // Per-item edit
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft>({ brand: "", name: "", price_gbp: "", price_usd: "", product_url: "", image_url: "" });
  const [editQuery, setEditQuery] = useState("");
  const [editResults, setEditResults] = useState<ProductSearchResult[]>([]);
  const [editSearching, setEditSearching] = useState(false);
  const [editShowSearch, setEditShowSearch] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);

  // Add item
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [addDraft, setAddDraft] = useState({ brand: "", name: "", price_gbp: "", price_usd: "", quantity: "1", product_url: "" });
  const [addQuery, setAddQuery] = useState("");
  const [addResults, setAddResults] = useState<ProductSearchResult[]>([]);
  const [addSearching, setAddSearching] = useState(false);
  const [addShowSearch, setAddShowSearch] = useState(false);
  const [savingAdd, setSavingAdd] = useState(false);
  // Resend invoice
  const [resending, setResending] = useState<"email" | "download" | null>(null);

  useEffect(() => {
    if (!pnlOpen && !editItemId && !addItemOpen) return;
    fetch("/api/exchange-rate")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && Number.isFinite(d.rate) && d.rate > 0) setRate(d.rate);
      })
      .catch(() => {});
  }, [pnlOpen, editItemId, addItemOpen]);

  useEffect(() => {
    if (!addShowSearch || addQuery.trim().length < 2) { setAddResults([]); return; }
    const timer = setTimeout(() => {
      setAddSearching(true);
      fetch(`/api/admin/stock?search=${encodeURIComponent(addQuery.trim())}`)
        .then((r) => r.json())
        .then((d) => { setAddResults(d.products ?? []); setAddSearching(false); })
        .catch(() => setAddSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [addQuery, addShowSearch]);

  useEffect(() => {
    if (!editShowSearch || editQuery.trim().length < 2) { setEditResults([]); return; }
    const timer = setTimeout(() => {
      setEditSearching(true);
      fetch(`/api/admin/stock?search=${encodeURIComponent(editQuery.trim())}`)
        .then((r) => r.json())
        .then((d) => { setEditResults(d.products ?? []); setEditSearching(false); })
        .catch(() => setEditSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [editQuery, editShowSearch]);

  async function savePnl() {
    const cg = Number(costGbp);
    if (!Number.isFinite(cg) || cg < 0) {
      alert("Enter a valid GBP cost.");
      return;
    }
    setSavingPnl(true);
    try {
      const res = await fetch(`/api/admin/orders/${local.id}/costs`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cost_gbp: cg, platform_fee_usd: Number(platformFee) || 0 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      apply({
        cost_gbp: data.cost_gbp,
        cost_usd: data.cost_usd,
        platform_fee_usd: data.platform_fee_usd,
        profit_usd: data.profit_usd
      });
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSavingPnl(false);
    }
  }

  function getItemDraft(item: OrderLineItem) {
    if (!item.id) return null;
    return itemDrafts[item.id] ?? {
      vendor: item.vendor ?? "selfridges",
      cost_gbp: item.cost_gbp != null ? String(item.cost_gbp) : "",
      bank_rate: "",
      cost_usd: item.cost_usd != null ? String(item.cost_usd) : "",
      sourced: item.sourced ?? false
    };
  }

  function setItemDraft(id: string, patch: Partial<{ vendor: string; cost_gbp: string; bank_rate: string; cost_usd: string; sourced: boolean }>) {
    setItemDrafts((prev) => ({
      ...prev,
      [id]: { ...( prev[id] ?? { vendor: "selfridges", cost_gbp: "", bank_rate: "", cost_usd: "", sourced: false } ), ...patch }
    }));
  }

  async function saveItem(item: OrderLineItem) {
    if (!item.id) return;
    const draft = getItemDraft(item);
    if (!draft) return;
    setSavingItem(item.id);
    try {
      const costGbpVal = draft.cost_gbp !== "" ? Number(draft.cost_gbp) : null;
      const bankRateVal = draft.bank_rate !== "" ? Number(draft.bank_rate) : null;
      const directUsd = draft.cost_usd !== "" ? Number(draft.cost_usd) : null;
      const costUsdVal = directUsd ?? (costGbpVal != null && bankRateVal != null ? Math.round(costGbpVal * bankRateVal * 100) / 100 : null);
      const res = await fetch(`/api/admin/order-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor: draft.vendor || null,
          cost_gbp: costGbpVal,
          cost_usd: costUsdVal,
          sourced: draft.sourced
        })
      });
      if (!res.ok) throw new Error("Failed to save");
      const updated = (await res.json()) as { vendor: string | null; cost_gbp: string | null; cost_usd: string | null; sourced: boolean };
      const nextItems = (local.items ?? []).map((it) =>
        it.id === item.id
          ? { ...it, vendor: updated.vendor, cost_gbp: updated.cost_gbp, cost_usd: updated.cost_usd, sourced: updated.sourced }
          : it
      );
      apply({ items: nextItems });
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSavingItem(null);
    }
  }

  function startEdit(it: OrderLineItem) {
    setEditItemId(it.id ?? null);
    setEditDraft({
      brand: it.brand,
      name: it.name,
      price_gbp: Number(it.price_gbp).toFixed(2),
      price_usd: Number(it.price_usd).toFixed(2),
      product_url: it.product_url ?? "",
      image_url: ""
    });
    setEditQuery("");
    setEditResults([]);
    setEditShowSearch(false);
  }

  function cancelEdit() {
    setEditItemId(null);
    setEditQuery("");
    setEditResults([]);
  }

  function patchEdit(key: keyof EditDraft, value: string) {
    setEditDraft((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "price_gbp") {
        const gbp = Number(value);
        next.price_usd = Number.isFinite(gbp) && gbp > 0 ? (Math.round(gbp * rate * 100) / 100).toFixed(2) : "";
      }
      return next;
    });
  }

  function fillEditFromProduct(p: ProductSearchResult) {
    setEditDraft({
      brand: p.brand,
      name: p.name,
      price_gbp: Number(p.price_gbp).toFixed(2),
      price_usd: Number(p.price_usd).toFixed(2),
      product_url: p.product_url ?? "",
      image_url: p.image_url ?? ""
    });
    setEditShowSearch(false);
    setEditQuery("");
    setEditResults([]);
  }

  async function saveEdit() {
    if (!editItemId || !editDraft.brand.trim() || !editDraft.name.trim()) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/order-items/${editItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_brand: editDraft.brand.trim(),
          product_name: editDraft.name.trim(),
          price_gbp: Number(editDraft.price_gbp) || 0,
          price_usd: Number(editDraft.price_usd) || 0,
          product_url: editDraft.product_url.trim() || null,
          image_url: editDraft.image_url.trim() || null
        })
      });
      if (!res.ok) throw new Error("Save failed");
      const data = await res.json() as {
        product_brand: string; product_name: string;
        price_gbp: string; price_usd: string; product_url: string | null;
        order_total_usd: string | null; order_total_gbp: string | null; order_items_count: number | null;
      };
      const nextItems = (local.items ?? []).map((it) =>
        it.id === editItemId
          ? { ...it, brand: data.product_brand, name: data.product_name, price_gbp: data.price_gbp, price_usd: data.price_usd, product_url: data.product_url }
          : it
      );
      apply({
        items: nextItems,
        ...(data.order_total_usd != null ? { total_usd: data.order_total_usd } : {}),
        ...(data.order_total_gbp != null ? { total_gbp: data.order_total_gbp } : {}),
        ...(data.order_items_count != null ? { items_count: data.order_items_count } : {})
      });
      cancelEdit();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSavingEdit(false);
    }
  }

  async function removeItem(itemId: string) {
    if (!window.confirm("Remove this item from the order? If it was already sourced it will move to stock.")) return;
    setRemovingItemId(itemId);
    try {
      const res = await fetch(`/api/admin/order-items/${itemId}`, { method: "DELETE" });
      if (!res.ok) { alert("Failed to remove item"); return; }
      const data = await res.json() as {
        stockItem: StockItemRow | null;
        order_total_usd: string | null; order_total_gbp: string | null; order_items_count: number;
      };
      const nextItems = (local.items ?? []).filter((it) => it.id !== itemId);
      apply({
        items: nextItems,
        ...(data.order_total_usd != null ? { total_usd: data.order_total_usd } : {}),
        ...(data.order_total_gbp != null ? { total_gbp: data.order_total_gbp } : {}),
        items_count: data.order_items_count
      });
      if (data.stockItem) onStockAdded?.([data.stockItem]);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setRemovingItemId(null);
    }
  }

  function patchAdd(key: keyof typeof addDraft, value: string) {
    setAddDraft((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "price_gbp") {
        const gbp = Number(value);
        next.price_usd = Number.isFinite(gbp) && gbp > 0 ? (Math.round(gbp * rate * 100) / 100).toFixed(2) : "";
      }
      return next;
    });
  }

  function fillAddFromProduct(p: ProductSearchResult) {
    setAddDraft({ brand: p.brand, name: p.name, price_gbp: Number(p.price_gbp).toFixed(2), price_usd: Number(p.price_usd).toFixed(2), quantity: "1", product_url: p.product_url ?? "" });
    setAddShowSearch(false);
    setAddQuery("");
    setAddResults([]);
  }

  async function addItem() {
    if (!addDraft.brand.trim() || !addDraft.name.trim()) return;
    setSavingAdd(true);
    try {
      const res = await fetch(`/api/admin/orders/${local.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: addDraft.brand.trim(),
          name: addDraft.name.trim(),
          price_gbp: Number(addDraft.price_gbp) || 0,
          price_usd: Number(addDraft.price_usd) || 0,
          quantity: Math.max(1, parseInt(addDraft.quantity) || 1),
          product_url: addDraft.product_url.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to add item");
      const data = await res.json() as {
        item: import("@/lib/db").OrderLineItem;
        order_total_usd: string | null;
        order_total_gbp: string | null;
        order_items_count: number | null;
      };
      apply({
        items: [...(local.items ?? []), data.item],
        ...(data.order_total_usd != null ? { total_usd: data.order_total_usd } : {}),
        ...(data.order_total_gbp != null ? { total_gbp: data.order_total_gbp } : {}),
        ...(data.order_items_count != null ? { items_count: data.order_items_count } : {}),
      });
      setAddItemOpen(false);
      setAddDraft({ brand: "", name: "", price_gbp: "", price_usd: "", quantity: "1", product_url: "" });
      setAddQuery("");
      setAddResults([]);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSavingAdd(false);
    }
  }

  async function regenerateInvoice(sendEmail: boolean) {
    setResending(sendEmail ? "email" : "download");
    try {
      const res = await fetch(`/api/admin/orders/${local.id}/resend-invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sendEmail }),
      });
      if (!res.ok) throw new Error("Failed to regenerate invoice");
      const data = await res.json() as { invoice_sent_at: string };
      apply({ invoice_sent_at: data.invoice_sent_at });
      if (!sendEmail) {
        window.open(`/api/admin/invoice/${local.id}`, "_blank");
      }
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setResending(null);
    }
  }

  function apply(next: Partial<OrderWithCustomer>) {
    const merged = { ...local, ...next } as OrderWithCustomer;
    setLocal(merged);
    onUpdated?.(merged);
  }

  async function generateInvoice() {
    if (!window.confirm("Confirm payment received and send the invoice to the customer?")) return;
    setBusy("invoice");
    try {
      const res = await fetch("/api/admin/generate-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: local.id })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to generate invoice");
      apply({ payment_confirmed: true, status: "payment_confirmed", invoice_sent_at: data.invoice_sent_at });
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function patch(bodyObj: { status?: OrderStatus; tracking_number?: string }, confirmMsg: string, optimistic: Partial<OrderWithCustomer>) {
    if (!window.confirm(confirmMsg)) return;
    setBusy(bodyObj.status ?? "patch");
    try {
      const res = await fetch(`/api/orders/${local.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyObj)
      });
      if (!res.ok) throw new Error("Update failed");
      apply(optimistic);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  function markOrdered() {
    void patch(
      { status: "ordered_selfridges" },
      "Mark as ordered? The customer will be notified on WhatsApp.",
      { status: "ordered_selfridges" }
    );
  }

  function markShipped() {
    const tn = window.prompt("Enter the tracking number:");
    if (tn === null || !tn.trim()) return;
    void patch(
      { status: "shipped", tracking_number: tn.trim() },
      "Mark as shipped and notify the customer with this tracking number?",
      { status: "shipped", tracking_number: tn.trim() }
    );
  }

  function markDelivered() {
    void patch({ status: "delivered" }, "Mark as delivered? The customer will be notified on WhatsApp.", {
      status: "delivered"
    });
  }

  async function cancelOrder() {
    if (!window.confirm("Cancel this order? This will mark it as cancelled and remove payment confirmation.")) return;
    setBusy("cancel");
    try {
      const res = await fetch(`/api/orders/${local.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled", payment_confirmed: false })
      });
      if (!res.ok) throw new Error("Cancel failed");
      const data = (await res.json()) as { order: unknown; movedToStock?: StockItemRow[] };
      apply({ status: "cancelled", payment_confirmed: false });
      if (data.movedToStock && data.movedToStock.length > 0) {
        onStockAdded?.(data.movedToStock);
        alert(`Order cancelled. ${data.movedToStock.length} sourced item(s) moved to your stock automatically.`);
      }
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function unconfirmPayment() {
    if (!window.confirm("Remove payment confirmation? This will mark the order as unpaid.")) return;
    setBusy("unconfirm");
    try {
      const res = await fetch(`/api/orders/${local.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_confirmed: false })
      });
      if (!res.ok) throw new Error("Failed to unconfirm payment");
      apply({ payment_confirmed: false });
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const totalUsd = Number(local.total_usd ?? local.price_usd) || 0;
  const [amountPaid, setAmountPaid] = useState(
    local.amount_paid_usd != null && local.amount_paid_usd !== "" ? String(local.amount_paid_usd) : ""
  );
  const [savingPayment, setSavingPayment] = useState(false);

  const paidNum = Number(amountPaid) || 0;
  const balanceDue = Math.max(0, totalUsd - paidNum);
  const isPartialPay = paidNum > 0 && paidNum < totalUsd;

  async function savePayment() {
    setSavingPayment(true);
    try {
      const res = await fetch(`/api/admin/orders/${local.id}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_paid_usd: Number(amountPaid) || 0 })
      });
      const data = (await res.json()) as { amount_paid_usd: number; balance_due: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      apply({ amount_paid_usd: data.amount_paid_usd });
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSavingPayment(false);
    }
  }

  const status = local.status;

  return (
    <>
      <tr className="cursor-pointer border-b border-ink/10 hover:bg-ink/[0.02]" onClick={() => setOpen((v) => !v)}>
        <td className="px-4 py-3 font-mono text-xs text-ink">
          {local.order_number}
          {local.source && local.source !== "website" ? (
            <span className="ml-1.5 inline-block rounded bg-accent/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-accent">
              {local.source === "instagram" ? "📸 IG" : local.source === "whatsapp" ? "💬 WA" : "📞"}
            </span>
          ) : null}
        </td>
        <td className="px-4 py-3 text-sm text-ink">{local.full_name}</td>
        <td className="px-4 py-3 text-sm text-ink/70">{local.phone}</td>
        <td className="px-4 py-3 text-sm text-ink">
          <span className="text-ink/60">{local.product_brand}</span>
          <span className="mx-1 text-ink/30">·</span>
          <span>{local.product_name}</span>
        </td>
        <td className="px-4 py-3 text-sm font-medium text-ink">{formatUsd(totalUsd)}</td>
        <td className="px-4 py-3 text-xs uppercase tracking-[0.12em] text-ink/70">{ORDER_STATUS_LABELS[status]}</td>
        <td className="px-4 py-3">
          {isPartialPay ? (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-amber-700">
              Partial
            </span>
          ) : (
            <span
              className={"inline-block h-2.5 w-2.5 rounded-full " + (local.payment_confirmed ? "bg-gold" : "bg-ink/20")}
              aria-label={local.payment_confirmed ? "Paid" : "Unpaid"}
            />
          )}
        </td>
        <td className="px-4 py-3 text-xs text-ink/60">{formatDate(local.created_at)}</td>
      </tr>

      {open ? (
        <tr className="border-b border-ink/10 bg-ink/[0.02]">
          <td colSpan={8} className="px-6 py-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Customer */}
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-ink/60">Delivery address</p>
                <p className="mt-2 whitespace-pre-line text-sm text-ink">{local.address}</p>
                {local.customer_email ? (
                  <>
                    <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-ink/60">Email</p>
                    <a href={`mailto:${local.customer_email}`} className="mt-2 inline-block break-all text-sm text-accent hover:underline">
                      {local.customer_email}
                    </a>
                  </>
                ) : null}
                <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-ink/60">Notes</p>
                <p className="mt-2 whitespace-pre-line text-sm text-ink">{local.notes || <span className="text-ink/40">None</span>}</p>
                <a href={whatsappLink(local.phone)} target="_blank" rel="noreferrer" className="btn-gold mt-5 inline-block text-xs">
                  WhatsApp customer
                </a>
              </div>

              {/* Items + sourcing */}
              <div>
                <div className="flex items-center gap-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-ink/60">
                    Items{local.items && local.items.length ? ` (${local.items.length})` : ""}
                  </p>
                  {(() => {
                    const total = local.items?.length ?? 0;
                    const sourced = local.items?.filter((it) => it.sourced).length ?? 0;
                    if (total === 0) return null;
                    return (
                      <span className={"text-[10px] font-medium " + (sourced === total ? "text-green-600" : "text-amber-600")}>
                        {sourced}/{total} ordered
                      </span>
                    );
                  })()}
                </div>
                {local.items && local.items.length > 0 ? (
                  <ul className="mt-2 space-y-4 text-sm text-ink">
                    {local.items.map((it, i) => {
                      const draft = getItemDraft(it);
                      return (
                        <li key={it.id ?? i} className="border border-ink/10 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <span>
                              <span className="text-ink/60">{it.brand}</span> {it.name}
                              {it.quantity > 1 ? <span className="text-ink/50"> ×{it.quantity}</span> : null}
                              <a href={selfridgesSearch(it.brand, it.name)} target="_blank" rel="noreferrer" className="ml-2 text-xs text-accent hover:underline">
                                Find on Selfridges 🔍
                              </a>
                            </span>
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              <span>{formatUsd(Number(it.price_usd) * it.quantity)}</span>
                              {it.id ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => editItemId === it.id ? cancelEdit() : startEdit(it)}
                                    className="text-xs text-ink/40 hover:text-accent"
                                  >
                                    {editItemId === it.id ? "Cancel" : "Edit"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeItem(it.id!)}
                                    disabled={removingItemId === it.id}
                                    className="text-xs text-ink/40 hover:text-red-600 disabled:opacity-40"
                                  >
                                    {removingItemId === it.id ? "…" : "Remove"}
                                  </button>
                                </>
                              ) : null}
                            </div>
                          </div>
                          {it.id && draft ? (
                            <div className="mt-3 space-y-2 border-t border-ink/10 pt-3">
                              <div className="flex items-center gap-3">
                                <label className="text-[10px] uppercase tracking-[0.14em] text-ink/60">Source</label>
                                <div className="flex gap-2">
                                  {["selfridges", "elsewhere"].map((v) => (
                                    <button
                                      key={v}
                                      type="button"
                                      onClick={() => setItemDraft(it.id!, { vendor: v })}
                                      className={
                                        "rounded px-2 py-0.5 text-[11px] font-medium transition-colors " +
                                        (draft.vendor === v
                                          ? "bg-accent text-white"
                                          : "border border-ink/15 text-ink/60 hover:border-accent/50")
                                      }
                                    >
                                      {v === "selfridges" ? "Selfridges" : "Elsewhere"}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <label className="text-[10px] uppercase tracking-[0.14em] text-ink/60 whitespace-nowrap">
                                  Cost (£)
                                </label>
                                <input
                                  type="number"
                                  value={draft.cost_gbp}
                                  onChange={(e) => setItemDraft(it.id!, { cost_gbp: e.target.value })}
                                  className="w-24 border border-ink/15 bg-white px-2 py-1 text-sm focus:border-accent focus:outline-none"
                                  placeholder="0.00"
                                  min="0"
                                  step="0.01"
                                />
                                <label className="text-[10px] uppercase tracking-[0.14em] text-ink/60 whitespace-nowrap">
                                  Rate
                                </label>
                                <input
                                  type="number"
                                  value={draft.bank_rate}
                                  onChange={(e) => setItemDraft(it.id!, { bank_rate: e.target.value })}
                                  className="w-20 border border-ink/15 bg-white px-2 py-1 text-sm focus:border-accent focus:outline-none"
                                  placeholder="1.2740"
                                  min="0"
                                  step="0.0001"
                                />
                                <label className="text-[10px] uppercase tracking-[0.14em] text-ink/60 whitespace-nowrap">
                                  Cost ($)
                                </label>
                                <input
                                  type="number"
                                  value={draft.cost_usd}
                                  onChange={(e) => setItemDraft(it.id!, { cost_usd: e.target.value })}
                                  className="w-20 border border-ink/15 bg-white px-2 py-1 text-sm focus:border-accent focus:outline-none"
                                  placeholder="0.00"
                                  min="0"
                                  step="0.01"
                                />
                                <label className="flex items-center gap-1.5 text-[11px] text-ink/60 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={draft.sourced}
                                    onChange={(e) => setItemDraft(it.id!, { sourced: e.target.checked })}
                                    className="accent-accent"
                                  />
                                  Sourced
                                </label>
                                <button
                                  type="button"
                                  onClick={() => saveItem(it)}
                                  disabled={savingItem === it.id}
                                  className="ml-auto rounded bg-ink/5 px-2.5 py-1 text-[11px] font-medium text-ink/70 hover:bg-ink/10 disabled:opacity-40"
                                >
                                  {savingItem === it.id ? "Saving…" : "Save"}
                                </button>
                              </div>
                              {it.cost_gbp != null ? (
                                <p className="text-[11px] text-ink/50">
                                  Saved: £{Number(it.cost_gbp).toFixed(2)} via {it.vendor ?? "?"}
                                  {it.sourced ? " ✓ Sourced" : ""}
                                </p>
                              ) : null}
                            </div>
                          ) : null}

                          {/* Inline edit panel */}
                          {editItemId === it.id ? (
                            <div className="mt-3 space-y-3 border-t border-ink/10 pt-3">
                              <div className="flex items-center justify-between">
                                <p className="text-[10px] uppercase tracking-[0.14em] text-ink/60">Edit item</p>
                                <button
                                  type="button"
                                  onClick={() => setEditShowSearch((v) => !v)}
                                  className="text-xs text-accent hover:underline"
                                >
                                  {editShowSearch ? "Hide search" : "Search catalogue"}
                                </button>
                              </div>

                              {editShowSearch ? (
                                <div className="space-y-2">
                                  <input
                                    autoFocus
                                    type="text"
                                    value={editQuery}
                                    onChange={(e) => setEditQuery(e.target.value)}
                                    placeholder="Search by name or brand…"
                                    className="w-full border border-ink/15 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
                                  />
                                  {editSearching ? (
                                    <p className="text-xs text-ink/50">Searching…</p>
                                  ) : editResults.length > 0 ? (
                                    <ul className="max-h-48 overflow-y-auto divide-y divide-ink/10 border border-ink/10">
                                      {editResults.map((p) => (
                                        <li key={p.id}>
                                          <button
                                            type="button"
                                            onClick={() => fillEditFromProduct(p)}
                                            className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-ink/[0.03]"
                                          >
                                            {p.image_url ? (
                                              // eslint-disable-next-line @next/next/no-img-element
                                              <img src={p.image_url} alt={p.name} className="h-8 w-8 flex-shrink-0 border border-ink/10 object-contain" />
                                            ) : (
                                              <div className="h-8 w-8 flex-shrink-0 border border-ink/10 bg-ink/5" />
                                            )}
                                            <div className="min-w-0">
                                              <p className="truncate text-sm font-medium text-ink">{p.name}</p>
                                              <p className="text-xs text-ink/50">{p.brand} · £{Number(p.price_gbp).toFixed(2)}</p>
                                            </div>
                                            <span className="ml-auto text-xs text-accent">Select →</span>
                                          </button>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : editQuery.trim().length >= 2 ? (
                                    <p className="text-xs text-ink/50">No products found.</p>
                                  ) : null}
                                </div>
                              ) : null}

                              <div className="grid gap-2 sm:grid-cols-2">
                                <div>
                                  <label className="block text-[10px] uppercase tracking-[0.14em] text-ink/60">Brand</label>
                                  <input type="text" value={editDraft.brand} onChange={(e) => patchEdit("brand", e.target.value)}
                                    className="mt-1 w-full border border-ink/15 bg-white px-2 py-1.5 text-sm focus:border-accent focus:outline-none" />
                                </div>
                                <div>
                                  <label className="block text-[10px] uppercase tracking-[0.14em] text-ink/60">Product name</label>
                                  <input type="text" value={editDraft.name} onChange={(e) => patchEdit("name", e.target.value)}
                                    className="mt-1 w-full border border-ink/15 bg-white px-2 py-1.5 text-sm focus:border-accent focus:outline-none" />
                                </div>
                                <div>
                                  <label className="block text-[10px] uppercase tracking-[0.14em] text-ink/60">Price GBP</label>
                                  <input type="number" value={editDraft.price_gbp} onChange={(e) => patchEdit("price_gbp", e.target.value)}
                                    min="0" step="0.01"
                                    className="mt-1 w-full border border-ink/15 bg-white px-2 py-1.5 text-sm focus:border-accent focus:outline-none" />
                                </div>
                                <div>
                                  <label className="block text-[10px] uppercase tracking-[0.14em] text-ink/60">Price USD</label>
                                  <input type="number" value={editDraft.price_usd} onChange={(e) => patchEdit("price_usd", e.target.value)}
                                    min="0" step="0.01"
                                    className="mt-1 w-full border border-ink/15 bg-white px-2 py-1.5 text-sm focus:border-accent focus:outline-none" />
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <button type="button" onClick={saveEdit} disabled={savingEdit}
                                  className="rounded-full bg-accent px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white shadow-md transition-opacity hover:opacity-90 disabled:opacity-50">
                                  {savingEdit ? "Saving…" : "Save changes"}
                                </button>
                                <button type="button" onClick={cancelEdit} className="text-xs text-ink/50 hover:text-ink">
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <a href={selfridgesSearch(local.product_brand ?? "", local.product_name ?? "")} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-accent hover:underline">
                    Find on Selfridges 🔍
                  </a>
                )}
                {/* Add Item */}
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setAddItemOpen((v) => !v)}
                    className="text-xs font-medium text-accent hover:underline"
                  >
                    {addItemOpen ? "Cancel" : "+ Add Item"}
                  </button>
                  {addItemOpen ? (
                    <div className="mt-3 space-y-3 border border-ink/10 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-ink/60">New item</p>
                        <button type="button" onClick={() => setAddShowSearch((v) => !v)} className="text-xs text-accent hover:underline">
                          {addShowSearch ? "Hide search" : "Search catalogue"}
                        </button>
                      </div>
                      {addShowSearch ? (
                        <div className="space-y-2">
                          <input
                            autoFocus
                            type="text"
                            value={addQuery}
                            onChange={(e) => setAddQuery(e.target.value)}
                            placeholder="Search by name or brand…"
                            className="w-full border border-ink/15 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
                          />
                          {addSearching ? (
                            <p className="text-xs text-ink/50">Searching…</p>
                          ) : addResults.length > 0 ? (
                            <ul className="max-h-48 overflow-y-auto divide-y divide-ink/10 border border-ink/10">
                              {addResults.map((p) => (
                                <li key={p.id}>
                                  <button type="button" onClick={() => fillAddFromProduct(p)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-ink/[0.03]">
                                    {p.image_url ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={p.image_url} alt={p.name} className="h-8 w-8 flex-shrink-0 border border-ink/10 object-contain" />
                                    ) : (
                                      <div className="h-8 w-8 flex-shrink-0 border border-ink/10 bg-ink/5" />
                                    )}
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium text-ink">{p.name}</p>
                                      <p className="text-xs text-ink/50">{p.brand} · £{Number(p.price_gbp).toFixed(2)}</p>
                                    </div>
                                    <span className="ml-auto text-xs text-accent">Select →</span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          ) : addQuery.trim().length >= 2 ? (
                            <p className="text-xs text-ink/50">No products found.</p>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div>
                          <label className="block text-[10px] uppercase tracking-[0.14em] text-ink/60">Brand</label>
                          <input type="text" value={addDraft.brand} onChange={(e) => patchAdd("brand", e.target.value)}
                            className="mt-1 w-full border border-ink/15 bg-white px-2 py-1.5 text-sm focus:border-accent focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-[0.14em] text-ink/60">Product name</label>
                          <input type="text" value={addDraft.name} onChange={(e) => patchAdd("name", e.target.value)}
                            className="mt-1 w-full border border-ink/15 bg-white px-2 py-1.5 text-sm focus:border-accent focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-[0.14em] text-ink/60">Price GBP</label>
                          <input type="number" value={addDraft.price_gbp} onChange={(e) => patchAdd("price_gbp", e.target.value)}
                            min="0" step="0.01"
                            className="mt-1 w-full border border-ink/15 bg-white px-2 py-1.5 text-sm focus:border-accent focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-[0.14em] text-ink/60">Price USD</label>
                          <input type="number" value={addDraft.price_usd} onChange={(e) => patchAdd("price_usd", e.target.value)}
                            min="0" step="0.01"
                            className="mt-1 w-full border border-ink/15 bg-white px-2 py-1.5 text-sm focus:border-accent focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-[0.14em] text-ink/60">Qty</label>
                          <input type="number" value={addDraft.quantity} onChange={(e) => patchAdd("quantity", e.target.value)}
                            min="1" step="1"
                            className="mt-1 w-full border border-ink/15 bg-white px-2 py-1.5 text-sm focus:border-accent focus:outline-none" />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={addItem}
                          disabled={savingAdd || !addDraft.brand.trim() || !addDraft.name.trim()}
                          className="rounded-full bg-accent px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white shadow-md transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                          {savingAdd ? "Adding…" : "Add to Order"}
                        </button>
                        <button type="button" onClick={() => { setAddItemOpen(false); setAddQuery(""); setAddResults([]); }}
                          className="text-xs text-ink/50 hover:text-ink">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

                <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-ink/60">Total</p>
                <p className="mt-1 text-sm">{formatUsd(totalUsd)}</p>
                {local.tracking_number ? (
                  <>
                    <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-ink/60">Tracking</p>
                    <p className="mt-1 font-mono text-sm text-ink">{local.tracking_number}</p>
                  </>
                ) : null}
              </div>

              {/* Workflow actions */}
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-ink/60">Workflow</p>
                <div className="mt-3 flex flex-col gap-3">
                  {!local.payment_confirmed ? (
                    <button type="button" onClick={generateInvoice} disabled={busy !== null} className="btn-primary text-xs disabled:opacity-50">
                      {busy === "invoice" ? (
                        <span className="inline-flex items-center gap-2"><span className="bee-wings inline-block"><BeeSvg size={16} /></span> Generating…</span>
                      ) : (
                        "Confirm Payment & Send Invoice"
                      )}
                    </button>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: "#277C43" }}>
                        Invoice Sent ✓
                      </span>
                      {local.invoice_sent_at ? <span className="text-[11px] text-ink/50">Invoice sent on {formatDate(local.invoice_sent_at)}</span> : null}
                      <a href={`/api/admin/invoice/${local.id}`} className="btn-outline text-xs">
                        Download Invoice
                      </a>
                      <button
                        type="button"
                        onClick={() => regenerateInvoice(false)}
                        disabled={resending !== null}
                        className="btn-outline text-xs disabled:opacity-50"
                      >
                        {resending === "download" ? "Regenerating…" : "Regenerate & Download"}
                      </button>
                      <button
                        type="button"
                        onClick={() => regenerateInvoice(true)}
                        disabled={resending !== null}
                        className="btn-outline text-xs disabled:opacity-50"
                      >
                        {resending === "email" ? "Sending…" : "Email Updated Invoice"}
                      </button>
                    </>
                  )}

                  {local.payment_confirmed && status === "payment_confirmed" ? (
                    <button type="button" onClick={markOrdered} disabled={busy !== null} className="btn-gold text-xs disabled:opacity-50">
                      Mark as Ordered
                    </button>
                  ) : null}

                  {status === "fulfilled_from_stock" ? (
                    <span className="text-sm font-medium" style={{ color: "#3A6EA5" }}>Fulfilled from Stock ✓</span>
                  ) : null}

                  {(status === "ordered_selfridges" || status === "fulfilled_from_stock") ? (
                    <button type="button" onClick={markShipped} disabled={busy !== null} className="btn-gold text-xs disabled:opacity-50">
                      Mark as Shipped
                    </button>
                  ) : null}

                  {status === "shipped" || status === "in_lebanon" ? (
                    <button type="button" onClick={markDelivered} disabled={busy !== null} className="btn-gold text-xs disabled:opacity-50">
                      Mark as Delivered
                    </button>
                  ) : null}

                  {status === "delivered" ? (
                    <span className="text-sm font-medium" style={{ color: "#277C43" }}>Delivered ✓</span>
                  ) : null}

                  {status !== "cancelled" && status !== "refunded" && status !== "delivered" ? (
                    <button
                      type="button"
                      onClick={cancelOrder}
                      disabled={busy !== null}
                      className="mt-2 text-xs text-ink/40 hover:text-red-600 disabled:opacity-40"
                    >
                      {busy === "cancel" ? "Cancelling…" : "Cancel order"}
                    </button>
                  ) : null}

                  {status === "cancelled" ? (
                    <span className="text-sm font-medium text-red-600">Cancelled</span>
                  ) : null}
                </div>

                {local.payment_screenshot ? (
                  <>
                    <p className="mt-5 text-[10px] uppercase tracking-[0.2em] text-ink/60">Payment screenshot</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={local.payment_screenshot} alt="Payment screenshot" className="mt-2 max-h-48 w-full rounded border border-ink/10 object-contain" />
                  </>
                ) : null}
              </div>
            </div>

            {/* Payment tracking */}
            <div className="mt-6 border-t border-ink/10 pt-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-ink/60">Payment</p>
              <div className="mt-3 flex flex-wrap items-end gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.18em] text-ink/60">Amount Paid (USD)</label>
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="mt-1 w-36 border border-ink/15 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-ink/60">Balance Due</p>
                  <p className="mt-1 text-sm font-medium" style={{ color: balanceDue > 0 ? "#C0392B" : "#277C43" }}>
                    {usd(balanceDue)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={savePayment}
                  disabled={savingPayment}
                  className="rounded bg-ink/5 px-3 py-2 text-xs font-medium text-ink/70 hover:bg-ink/10 disabled:opacity-40"
                >
                  {savingPayment ? "Saving…" : "Save payment"}
                </button>
                {local.payment_confirmed ? (
                  <button
                    type="button"
                    onClick={unconfirmPayment}
                    disabled={busy === "unconfirm"}
                    className="rounded border border-ink/15 px-3 py-2 text-xs font-medium text-ink/50 hover:border-red-400 hover:text-red-500 disabled:opacity-40"
                  >
                    {busy === "unconfirm" ? "…" : "Unconfirm payment"}
                  </button>
                ) : null}
              </div>
              {isPartialPay ? (
                <p className="mt-2 text-[11px] text-amber-700">
                  Partial — {usd(paidNum)} received, {usd(balanceDue)} due.
                </p>
              ) : paidNum >= totalUsd && totalUsd > 0 ? (
                <p className="mt-2 text-[11px] text-green-700">Fully paid ✓</p>
              ) : null}
            </div>

            {/* Profit & Loss */}
            <div className="mt-6 border-t border-ink/10 pt-4">
              <button
                type="button"
                onClick={() => setPnlOpen((v) => !v)}
                className="text-[10px] uppercase tracking-[0.2em] text-ink/60 hover:text-accent"
              >
                {pnlOpen ? "▾" : "▸"} Profit &amp; Loss
              </button>
              {pnlOpen ? (
                <div className="mt-3 grid gap-6 lg:grid-cols-2">
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.18em] text-ink/60">
                      What we paid on Selfridges (GBP)
                    </label>
                    <input
                      type="number"
                      value={costGbp}
                      onChange={(e) => setCostGbp(e.target.value)}
                      className="mt-1 w-full border border-ink/15 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
                      placeholder="0.00"
                    />
                    <p className="mt-1 text-xs text-ink/50">
                      ≈ {usd(Number(costGbp) * rate || 0)} (rate {rate.toFixed(4)})
                    </p>
                    <label className="mt-4 block text-[10px] uppercase tracking-[0.18em] text-ink/60">
                      Platform fees (USD)
                    </label>
                    <input
                      type="number"
                      value={platformFee}
                      onChange={(e) => setPlatformFee(e.target.value)}
                      className="mt-1 w-full border border-ink/15 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
                      placeholder="0.00"
                    />
                    <button type="button" onClick={savePnl} disabled={savingPnl} className="btn-primary mt-4 text-xs disabled:opacity-50">
                      {savingPnl ? "Saving…" : "Save P&L"}
                    </button>
                  </div>

                  <div className="border border-ink/10 bg-cream p-4 text-sm">
                    {(() => {
                      const revenue = Number(local.total_usd ?? local.price_usd) || 0;
                      const costUsd = local.cost_usd != null ? Number(local.cost_usd) : Number(costGbp) * rate || 0;
                      const fee = local.platform_fee_usd != null ? Number(local.platform_fee_usd) : Number(platformFee) || 0;
                      const profit = local.profit_usd != null ? Number(local.profit_usd) : revenue - costUsd - fee;
                      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
                      return (
                        <>
                          <PnlLine label="Revenue" value={usd(revenue)} />
                          <PnlLine label="Cost (Selfridges)" value={usd(costUsd)} />
                          <PnlLine label="Platform fees" value={usd(fee)} />
                          <div className="mt-2 flex justify-between border-t border-ink/10 pt-2 font-medium">
                            <span>Net Profit</span>
                            <span style={{ color: profit >= 0 ? "#277C43" : "#C0392B" }}>{usd(profit)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-ink/60">
                            <span>Margin</span>
                            <span>{margin.toFixed(0)}%</span>
                          </div>
                          {local.cost_usd == null ? (
                            <p className="mt-2 text-[11px] text-ink/40">Live preview — not yet saved.</p>
                          ) : null}
                        </>
                      );
                    })()}
                  </div>
                </div>
              ) : null}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
