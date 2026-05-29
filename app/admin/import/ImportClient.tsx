"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BeeSvg } from "@/components/BeeMascot";

interface ImportedProduct {
  url: string;
  ok: boolean;
  error?: string;
  brand?: string;
  name?: string;
  category?: string;
  price_gbp?: number;
  price_usd?: number;
  image_url?: string;
  deliverable_lebanon?: boolean;
}

interface Row extends ImportedProduct {
  include: boolean;
}

interface Props {
  totalProducts: number;
  lastImport: string | null;
}

function formatUsd(value: number | undefined): string {
  if (typeof value !== "number") return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function formatGbp(value: number | undefined): string {
  if (typeof value !== "number") return "—";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: string | null): string {
  if (!value) return "Never";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Never";
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ImportClient({ totalProducts, lastImport }: Props) {
  const [urlText, setUrlText] = useState("");
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [catalogTotal, setCatalogTotal] = useState(totalProducts);
  const [lastImportAt, setLastImportAt] = useState<string | null>(lastImport);

  const parsedUrls = useMemo(
    () =>
      urlText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0),
    [urlText]
  );

  const deliverableCount = useMemo(() => (rows ?? []).filter((r) => r.ok && r.deliverable_lebanon).length, [rows]);
  const okCount = useMemo(() => (rows ?? []).filter((r) => r.ok).length, [rows]);
  const selectedCount = useMemo(() => (rows ?? []).filter((r) => r.include).length, [rows]);

  async function fetchProducts() {
    setError(null);
    setSavedMessage(null);
    if (parsedUrls.length === 0) {
      setError("Paste at least one Selfridges product URL.");
      return;
    }
    if (parsedUrls.length > 20) {
      setError("Please paste at most 20 URLs at a time.");
      return;
    }
    setFetching(true);
    setRows(null);
    try {
      const res = await fetch("/api/admin/import-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: parsedUrls })
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error ?? "Fetch failed");
      }
      const data = (await res.json()) as { products: ImportedProduct[] };
      const next: Row[] = (data.products ?? []).map((p) => ({
        ...p,
        // Pre-check deliverable, qualifying products.
        include: Boolean(p.ok && p.deliverable_lebanon)
      }));
      setRows(next);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setFetching(false);
    }
  }

  function toggle(index: number) {
    setRows((prev) => {
      if (!prev) return prev;
      const copy = [...prev];
      copy[index] = { ...copy[index], include: !copy[index].include };
      return copy;
    });
  }

  function selectAllDeliverable() {
    setRows((prev) => (prev ? prev.map((r) => ({ ...r, include: Boolean(r.ok && r.deliverable_lebanon) })) : prev));
  }

  async function save() {
    if (!rows) return;
    const chosen = rows.filter((r) => r.include && r.ok);
    if (chosen.length === 0) {
      setError("Select at least one product to add.");
      return;
    }
    setSaving(true);
    setError(null);
    setSavedMessage(null);
    try {
      const products = chosen.map((r) => ({
        brand: r.brand,
        name: r.name,
        category: r.category,
        price_gbp: r.price_gbp,
        price_usd: r.price_usd,
        deliverable_lebanon: r.deliverable_lebanon,
        product_url: r.url,
        image_url: r.image_url
      }));
      const res = await fetch("/api/admin/save-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products })
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error ?? "Save failed");
      }
      const data = (await res.json()) as { saved: number };
      setSavedMessage(`${data.saved} product${data.saved === 1 ? "" : "s"} added to your catalog`);
      setCatalogTotal((t) => t + data.saved);
      setLastImportAt(new Date().toISOString());
      // Drop saved rows from the preview so they aren't double-added.
      setRows((prev) => (prev ? prev.filter((r) => !(r.include && r.ok)) : prev));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-ink/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.32em] text-accent">Seasons by B — Admin</p>
          <h1 className="mt-1 font-serif text-3xl text-ink">Import Products</h1>
        </div>
        <nav className="flex items-center gap-5 text-xs uppercase tracking-[0.18em] text-ink/70">
          <Link href="/admin" className="hover:text-accent">
            ← Dashboard
          </Link>
        </nav>
      </header>

      {/* Section 3 — quick stats */}
      <section className="mt-8 grid grid-cols-2 gap-3 sm:max-w-md">
        <div className="border border-ink/10 p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink/60">Products in catalog</p>
          <p className="mt-2 font-serif text-3xl text-ink">{catalogTotal}</p>
        </div>
        <div className="border border-ink/10 p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink/60">Last import</p>
          <p className="mt-2 text-sm text-ink">{formatDate(lastImportAt)}</p>
        </div>
      </section>

      {/* Section 1 — URL input */}
      <section className="mt-10">
        <h2 className="font-serif text-xl text-ink">1. Paste product URLs</h2>
        <p className="mt-1 text-sm text-ink/60">
          Browse selfridges.com, copy product page URLs and paste them here — one per line, up to 20.
        </p>
        <textarea
          value={urlText}
          onChange={(e) => setUrlText(e.target.value)}
          placeholder={"https://www.selfridges.com/GB/en/cat/charlotte-tilbury/...\nhttps://www.selfridges.com/GB/en/cat/gucci/..."}
          className="input mt-4 min-h-[160px] font-mono text-sm"
        />
        <div className="mt-3 flex items-center gap-4">
          <button type="button" onClick={fetchProducts} disabled={fetching} className="btn-primary">
            {fetching ? (
              <span className="inline-flex items-center gap-2">
                <BeeSvg size={18} /> Fetching…
              </span>
            ) : (
              "Fetch & Check Delivery"
            )}
          </button>
          <span className="text-xs uppercase tracking-[0.18em] text-ink/50">
            {parsedUrls.length} URL{parsedUrls.length === 1 ? "" : "s"}
          </span>
        </div>
      </section>

      {error ? (
        <p className="mt-6 rounded border border-accent/40 bg-accent/5 p-4 text-sm text-accent-700">{error}</p>
      ) : null}
      {savedMessage ? (
        <p className="mt-6 rounded border border-green-500/40 bg-green-50 p-4 text-sm text-green-700">
          {savedMessage}
        </p>
      ) : null}

      {/* Section 2 — preview results */}
      {rows !== null ? (
        <section className="mt-12">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-serif text-xl text-ink">2. Preview &amp; confirm</h2>
              <p className="mt-1 text-sm text-ink/60">
                {deliverableCount} of {okCount} fetched product{okCount === 1 ? "" : "s"} deliver to Lebanon.
              </p>
            </div>
            <button
              type="button"
              onClick={selectAllDeliverable}
              className="text-xs uppercase tracking-[0.18em] text-ink hover:text-accent"
            >
              Select all deliverable
            </button>
          </div>

          {rows.length === 0 ? (
            <p className="mt-6 rounded border border-ink/10 bg-ink/[0.02] p-8 text-center text-sm text-ink/60">
              No products to preview. Paste URLs above and fetch.
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto border border-ink/10">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-ink/10 bg-ink/[0.02] text-left text-[10px] uppercase tracking-[0.18em] text-ink/60">
                    <th className="px-3 py-3">Image</th>
                    <th className="px-3 py-3">Brand</th>
                    <th className="px-3 py-3">Product</th>
                    <th className="px-3 py-3">Category</th>
                    <th className="px-3 py-3">GBP</th>
                    <th className="px-3 py-3">USD</th>
                    <th className="px-3 py-3">Lebanon</th>
                    <th className="px-3 py-3">Include</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.url + i} className="border-b border-ink/10 align-top">
                      <td className="px-3 py-3">
                        {r.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={r.image_url}
                            alt={r.name ?? "product"}
                            className="h-16 w-12 border border-ink/10 object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-16 w-12 items-center justify-center border border-ink/10 text-[8px] uppercase text-ink/40">
                            none
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-sm text-ink/70">{r.brand ?? "—"}</td>
                      <td className="max-w-xs px-3 py-3 text-sm text-ink">
                        {r.ok ? (
                          r.name
                        ) : (
                          <span className="text-accent-700">
                            {r.name ?? "Failed"}
                            <span className="mt-1 block break-all text-[11px] text-ink/50">{r.url}</span>
                            <span className="mt-1 block text-[11px] text-accent">{r.error}</span>
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-sm text-ink/70">{r.category ?? "—"}</td>
                      <td className="px-3 py-3 text-sm text-ink/70">{formatGbp(r.price_gbp)}</td>
                      <td className="px-3 py-3 text-sm font-medium text-ink">{formatUsd(r.price_usd)}</td>
                      <td className="px-3 py-3 text-sm">
                        {!r.ok ? (
                          <span className="text-ink/30">—</span>
                        ) : r.deliverable_lebanon ? (
                          <span className="font-medium text-green-600">✓</span>
                        ) : (
                          <span className="font-medium text-accent">✗</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          disabled={!r.ok}
                          checked={r.include}
                          onChange={() => toggle(i)}
                          className="h-4 w-4 accent-[#C0392B]"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {rows.some((r) => r.ok) ? (
            <div className="mt-6 flex items-center gap-4">
              <button type="button" onClick={save} disabled={saving || selectedCount === 0} className="btn-primary">
                {saving ? (
                  <span className="inline-flex items-center gap-2">
                    <BeeSvg size={18} /> Adding…
                  </span>
                ) : (
                  `Add ${selectedCount} selected product${selectedCount === 1 ? "" : "s"} to catalog`
                )}
              </button>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

