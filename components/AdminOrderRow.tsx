"use client";

import { useState } from "react";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderStatus, type OrderWithCustomer } from "@/lib/db";

interface Props {
  order: OrderWithCustomer;
  onUpdated?: (next: OrderWithCustomer) => void;
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

function formatDate(value: string): string {
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

export default function AdminOrderRow({ order, onUpdated }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [local, setLocal] = useState(order);

  async function patch(body: { status?: OrderStatus; payment_confirmed?: boolean }) {
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error("Update failed");
      const next: OrderWithCustomer = { ...local, ...body } as OrderWithCustomer;
      setLocal(next);
      onUpdated?.(next);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <tr
        className="cursor-pointer border-b border-ink/10 hover:bg-ink/[0.02]"
        onClick={() => setOpen((v) => !v)}
      >
        <td className="px-4 py-3 font-mono text-xs text-ink">{local.order_number}</td>
        <td className="px-4 py-3 text-sm text-ink">{local.full_name}</td>
        <td className="px-4 py-3 text-sm text-ink/70">{local.phone}</td>
        <td className="px-4 py-3 text-sm text-ink">
          <span className="text-ink/60">{local.product_brand}</span>
          <span className="mx-1 text-ink/30">·</span>
          <span>{local.product_name}</span>
        </td>
        <td className="px-4 py-3 text-sm font-medium text-ink">{formatUsd(Number(local.price_usd))}</td>
        <td className="px-4 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
          <select
            disabled={busy}
            value={local.status}
            onChange={(e) => patch({ status: e.target.value as OrderStatus })}
            className="border border-ink/15 bg-white px-2 py-1 text-xs uppercase tracking-[0.12em] focus:border-accent focus:outline-none"
          >
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </td>
        <td className="px-4 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            disabled={busy}
            onClick={() => patch({ payment_confirmed: !local.payment_confirmed })}
            className={
              "inline-flex h-6 w-11 items-center rounded-full transition-colors " +
              (local.payment_confirmed ? "bg-gold" : "bg-ink/20")
            }
            aria-label="Toggle payment confirmed"
          >
            <span
              className={
                "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform " +
                (local.payment_confirmed ? "translate-x-5" : "translate-x-1")
              }
            />
          </button>
        </td>
        <td className="px-4 py-3 text-xs text-ink/60">{formatDate(local.created_at)}</td>
      </tr>

      {open ? (
        <tr className="border-b border-ink/10 bg-ink/[0.02]">
          <td colSpan={8} className="px-6 py-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-ink/60">Delivery address</p>
                <p className="mt-2 whitespace-pre-line text-sm text-ink">{local.address}</p>
                {local.customer_email ? (
                  <>
                    <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-ink/60">Email</p>
                    <a
                      href={`mailto:${local.customer_email}`}
                      className="mt-2 inline-block break-all text-sm text-accent hover:underline"
                    >
                      {local.customer_email}
                    </a>
                  </>
                ) : null}
                <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-ink/60">Notes</p>
                <p className="mt-2 whitespace-pre-line text-sm text-ink">
                  {local.notes ? local.notes : <span className="text-ink/40">None</span>}
                </p>
              </div>
              <div>
                {local.items && local.items.length > 0 ? (
                  <>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-ink/60">Items ({local.items.length})</p>
                    <ul className="mt-2 space-y-1 text-sm text-ink">
                      {local.items.map((it, i) => (
                        <li key={i} className="flex justify-between gap-3">
                          <span>
                            <span className="text-ink/60">{it.brand}</span> {it.name}
                            {it.quantity > 1 ? <span className="text-ink/50"> ×{it.quantity}</span> : null}
                          </span>
                          <span className="whitespace-nowrap">{formatUsd(Number(it.price_usd) * it.quantity)}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-ink/60">Product link</p>
                  </>
                ) : (
                  <p className="text-[10px] uppercase tracking-[0.2em] text-ink/60">Product link</p>
                )}
                {local.product_url ? (
                  <a
                    href={local.product_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block break-all text-sm text-accent hover:underline"
                  >
                    {local.product_url}
                  </a>
                ) : (
                  <p className="mt-2 text-sm text-ink/40">No URL captured</p>
                )}
                <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-ink/60">Pricing</p>
                <p className="mt-2 text-sm">
                  £{Number(local.price_gbp).toLocaleString()} GBP
                  <span className="mx-2 text-ink/30">·</span>
                  {formatUsd(Number(local.price_usd))}
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <a
                    href={whatsappLink(local.phone)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-gold text-xs"
                  >
                    WhatsApp customer
                  </a>
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-ink/60">Payment screenshot</p>
                {local.payment_screenshot ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={local.payment_screenshot}
                    alt="Payment screenshot"
                    className="mt-2 max-h-64 w-full rounded border border-ink/10 object-contain"
                  />
                ) : (
                  <p className="mt-2 text-sm text-ink/40">Not uploaded</p>
                )}
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
