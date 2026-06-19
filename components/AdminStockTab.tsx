"use client";

import { useEffect, useState } from "react";
import type { StockItemRow } from "@/lib/db";

interface ProductSearchResult {
  id: string;
  brand: string;
  name: string;
  product_url: string | null;
  image_url: string | null;
  price_gbp: string;
  price_usd: string;
}

interface StockDraft {
  product_id: string | null;
  product_name: string;
  product_brand: string;
  product_url: string;
  image_url: string;
  cost_gbp: string;
  cost_usd: string;
  quantity: string;
  notes: string;
  purchased_at: string;
}

const emptyDraft: StockDraft = {
  product_id: null, product_name: "", product_brand: "",
  product_url: "", image_url: "", cost_gbp: "", cost_usd: "",
  quantity: "1", notes: "", purchased_at: ""
};

type Mode = "list" | "search" | "manual";

function fmt(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(v);
}
function fmtGbp(v: number) { return `£${v.toFixed(2)}`; }
function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminStockTab() {
  const [items, setItems] = useState<StockItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>("list");
  const [draft, setDraft] = useState<StockDraft>(emptyDraft);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [rate, setRate] = useState(1.34);

  useEffect(() => {
    fetch("/api/admin/stock")
      .then((r) => r.json())
      .then((d) => { setItems(d.items ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/exchange-rate")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && Number.isFinite(d.rate) && d.rate > 0) setRate(d.rate); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(() => {
      setSearching(true);
      fetch(`/api/admin/stock?search=${encodeURIComponent(query.trim())}`)
        .then((r) => r.json())
        .then((d) => { setSearchResults(d.products ?? []); setSearching(false); })
        .catch(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  function selectProduct(p: ProductSearchResult) {
    setDraft({ ...emptyDraft, product_id: p.id, product_name: p.name, product_brand: p.brand, product_url: p.product_url ?? "", image_url: p.image_url ?? "" });
    setMode("manual");
    setQuery("");
    setSearchResults([]);
  }

  function patch(key: keyof StockDraft, value: string) {
    setDraft((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "cost_gbp") {
        const gbp = Number(value);
        next.cost_usd = Number.isFinite(gbp) && gbp > 0 ? (Math.round(gbp * rate * 100) / 100).toString() : "";
      }
      return next;
    });
  }

  async function saveItem() {
    if (!draft.product_name.trim() || !draft.product_brand.trim()) {
      alert("Product name and brand are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: draft.product_id || null,
          product_name: draft.product_name.trim(),
          product_brand: draft.product_brand.trim(),
          product_url: draft.product_url.trim() || null,
          image_url: draft.image_url.trim() || null,
          cost_gbp: draft.cost_gbp !== "" ? Number(draft.cost_gbp) : null,
          cost_usd: draft.cost_usd !== "" ? Number(draft.cost_usd) : null,
          quantity: Number(draft.quantity) || 1,
          notes: draft.notes.trim() || null,
          purchased_at: draft.purchased_at || null
        })
      });
      if (!res.ok) throw new Error("Save failed");
      const newItem = (await res.json()) as StockItemRow;
      setItems((prev) => [newItem, ...prev]);
      setDraft(emptyDraft);
      setMode("list");
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(id: string) {
    if (!window.confirm("Remove this stock item?")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/admin/stock/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((it) => it.id !== id));
    } catch {
      alert("Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return <div className="mt-16 text-center text-sm text-ink/50">Loading stock…</div>;
  }

  return (
    <div className="mt-8 space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2 text-sm">
          <span className="font-medium text-ink">{items.length}</span>
          <span className="text-ink/50">{items.length === 1 ? "item" : "items"} in stock</span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setMode(mode === "search" ? "list" : "search"); setDraft(emptyDraft); }}
            className="rounded-full border border-accent px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-accent transition-colors hover:bg-accent hover:text-white"
          >
            + Search catalogue
          </button>
          <button
            type="button"
            onClick={() => { setMode(mode === "manual" ? "list" : "manual"); setDraft(emptyDraft); }}
            className="rounded-full bg-accent px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white shadow-md transition-opacity hover:opacity-90"
          >
            + Add manually
          </button>
        </div>
      </div>

      {/* Search catalogue */}
      {mode === "search" ? (
        <div className="space-y-3 border border-ink/10 p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink/60">Search product catalogue</p>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type product name or brand…"
            className="w-full border border-ink/15 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
          {searching ? (
            <p className="text-xs text-ink/50">Searching…</p>
          ) : searchResults.length > 0 ? (
            <ul className="divide-y divide-ink/10 border border-ink/10">
              {searchResults.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => selectProduct(p)}
                    className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-ink/[0.03]"
                  >
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image_url} alt={p.name} className="h-10 w-10 flex-shrink-0 rounded border border-ink/10 object-contain" />
                    ) : (
                      <div className="h-10 w-10 flex-shrink-0 rounded border border-ink/10 bg-ink/5" />
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
          ) : query.trim().length >= 2 ? (
            <p className="text-xs text-ink/50">
              No products found.{" "}
              <button type="button" onClick={() => { setMode("manual"); setDraft(emptyDraft); }} className="text-accent hover:underline">
                Add manually instead.
              </button>
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Add / manual form */}
      {mode === "manual" ? (
        <div className="space-y-4 border border-ink/10 p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink/60">
            {draft.product_id ? "Add from catalogue" : "Add manually"}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.16em] text-ink/60">Brand *</label>
              <input type="text" value={draft.product_brand} onChange={(e) => patch("product_brand", e.target.value)}
                placeholder="e.g. Charlotte Tilbury"
                className="mt-1 w-full border border-ink/15 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.16em] text-ink/60">Product name *</label>
              <input type="text" value={draft.product_name} onChange={(e) => patch("product_name", e.target.value)}
                placeholder="e.g. Pillow Talk Lipstick"
                className="mt-1 w-full border border-ink/15 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.16em] text-ink/60">Cost Paid (£)</label>
              <input type="number" value={draft.cost_gbp} onChange={(e) => patch("cost_gbp", e.target.value)}
                placeholder="0.00" min="0" step="0.01"
                className="mt-1 w-full border border-ink/15 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.16em] text-ink/60">Cost Paid (USD)</label>
              <input type="number" value={draft.cost_usd} onChange={(e) => patch("cost_usd", e.target.value)}
                placeholder={`auto from £ × ${rate.toFixed(2)}`} min="0" step="0.01"
                className="mt-1 w-full border border-ink/15 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.16em] text-ink/60">Quantity</label>
              <input type="number" value={draft.quantity} onChange={(e) => patch("quantity", e.target.value)}
                min="1" step="1"
                className="mt-1 w-full border border-ink/15 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.16em] text-ink/60">Date Purchased</label>
              <input type="date" value={draft.purchased_at} onChange={(e) => patch("purchased_at", e.target.value)}
                className="mt-1 w-full border border-ink/15 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-[0.16em] text-ink/60">Notes</label>
            <input type="text" value={draft.notes} onChange={(e) => patch("notes", e.target.value)}
              placeholder="Optional notes"
              className="mt-1 w-full border border-ink/15 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none" />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button type="button" onClick={saveItem} disabled={saving}
              className="rounded-full bg-accent px-5 py-2 text-xs font-bold uppercase tracking-[0.14em] text-white shadow-md transition-opacity hover:opacity-90 disabled:opacity-50">
              {saving ? "Saving…" : "Save to stock"}
            </button>
            <button type="button" onClick={() => { setMode("list"); setDraft(emptyDraft); }}
              className="text-xs text-ink/50 transition-colors hover:text-ink">
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {/* Stock list */}
      {items.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-3xl">📦</p>
          <p className="mt-3 text-sm text-ink/50">No stock items yet.</p>
          <p className="mt-1 text-xs text-ink/40">Add products bought speculatively — not tied to a specific order.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-ink/10">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-ink/10 bg-ink/[0.02] text-left text-[10px] uppercase tracking-[0.18em] text-ink/60">
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Cost GBP</th>
                <th className="px-4 py-3">Cost USD</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-b border-ink/10 hover:bg-ink/[0.015]">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      {it.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.image_url} alt={it.product_name} className="h-10 w-10 flex-shrink-0 rounded border border-ink/10 object-contain" />
                      ) : null}
                      <div>
                        <p className="text-sm font-medium text-ink">{it.product_name}</p>
                        <p className="text-xs text-ink/50">{it.product_brand}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-ink">
                    {it.cost_gbp != null ? fmtGbp(Number(it.cost_gbp)) : "—"}
                  </td>
                  <td className="px-4 py-4 text-sm text-ink">
                    {it.cost_usd != null ? fmt(Number(it.cost_usd)) : "—"}
                  </td>
                  <td className="px-4 py-4 text-sm text-ink">{it.quantity}</td>
                  <td className="px-4 py-4 text-sm text-ink/70">{fmtDate(it.purchased_at)}</td>
                  <td className="px-4 py-4 text-sm text-ink/60">{it.notes ?? "—"}</td>
                  <td className="px-4 py-4">
                    <button
                      type="button"
                      onClick={() => deleteItem(it.id)}
                      disabled={deletingId === it.id}
                      className="text-xs text-ink/40 transition-colors hover:text-red-600 disabled:opacity-40"
                    >
                      {deletingId === it.id ? "…" : "Remove"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
