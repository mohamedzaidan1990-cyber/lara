"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LedgerEntry, PointsSummary, RedemptionRow, RewardRow } from "@/lib/loyalty";

export interface AccountOrder {
  order_number: string;
  status: string;
  created_at: string;
  delivered_at: string | null;
  payment_confirmed: boolean;
  total_usd: string | number;
  amount_paid_usd: string | number | null;
  items: Array<{ brand: string; name: string; quantity: number; price_usd: string | number; image_url: string | null }>;
  points: number | null;
}

interface Props {
  name: string;
  phone: string;
  orders: AccountOrder[];
  summary: PointsSummary;
  ledger: LedgerEntry[];
  rewards: RewardRow[];
  redemptions: RedemptionRow[];
  pointsPerUsd: number;
  expiryDays: number;
}

type Tab = "orders" | "points" | "rewards";

// Customer-facing wording for order statuses.
const STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "Awaiting payment", color: "#C0392B" },
  payment_confirmed: { label: "Confirmed", color: "#E08B45" },
  ordered_selfridges: { label: "Ordered", color: "#3A6EA5" },
  fulfilled_from_stock: { label: "Ordered", color: "#3A6EA5" },
  shipped: { label: "On its way", color: "#7A4FB0" },
  in_lebanon: { label: "On its way", color: "#7A4FB0" },
  ready_to_deliver: { label: "Ready for delivery", color: "#16A34A" },
  partially_delivered: { label: "Partially delivered", color: "#D97706" },
  delivered: { label: "Delivered", color: "#277C43" },
  cancelled: { label: "Cancelled", color: "#999999" },
  refunded: { label: "Refunded", color: "#999999" }
};

const KIND_LABELS: Record<string, string> = {
  earn: "Earned",
  backfill: "Welcome points",
  redeem: "Redeemed",
  refund: "Returned",
  adjust: "Adjustment",
  reverse: "Removed"
};

const REDEMPTION_STATUS: Record<string, string> = {
  requested: "Requested — we'll add it to your next order",
  fulfilled: "Added to your order",
  cancelled: "Cancelled — points returned"
};

function usd(v: number | string | null | undefined): string {
  const n = Number(v) || 0;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);
}

function date(v: string | null): string {
  if (!v) return "";
  return new Date(v).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function AccountClient(props: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("orders");
  const first = props.name.trim().split(/\s+/)[0];

  async function logout() {
    await fetch("/api/account/logout", { method: "POST" });
    router.replace("/account/login");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.32em] text-accent">My account</p>
          <h1 className="mt-2 font-serif text-4xl text-ink">Hi {first} 🌸</h1>
        </div>
        <button type="button" onClick={logout} className="text-xs font-bold uppercase tracking-[0.16em] text-ink/50 hover:text-accent">
          Log out
        </button>
      </header>

      <section className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-3xl bg-accent p-6 text-white shadow-lg shadow-accent/20 sm:col-span-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">Your points</p>
          <p className="mt-1 font-serif text-5xl">{props.summary.balance.toLocaleString()}</p>
          <p className="mt-2 text-xs text-white/85">
            You earn {props.pointsPerUsd === 1 ? "1 point" : `${props.pointsPerUsd} points`} for every $1 you pay, once your order is
            delivered. Points last {props.expiryDays} days.
          </p>
        </div>
        <div className="rounded-3xl border border-accent/20 bg-white p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink/60">Expiring soon</p>
          <p className="mt-1 font-serif text-3xl text-ink">{props.summary.expiring_soon.toLocaleString()}</p>
          <p className="mt-2 text-xs text-ink/60">
            {props.summary.expiring_soon > 0 && props.summary.next_expiry
              ? `Use them before ${date(props.summary.next_expiry)}.`
              : "Nothing expires in the next 30 days."}
          </p>
        </div>
      </section>

      <nav className="mt-8 flex flex-wrap gap-2">
        {(
          [
            ["orders", `My orders (${props.orders.length})`],
            ["points", "Points history"],
            ["rewards", "Rewards"]
          ] as const
        ).map(([key, label]) => (
          <button key={key} type="button" onClick={() => setTab(key)} className={"chip px-4 " + (tab === key ? "chip-active" : "")}>
            {label}
          </button>
        ))}
      </nav>

      <div className="mt-6">
        {tab === "orders" ? <Orders orders={props.orders} /> : null}
        {tab === "points" ? <Points ledger={props.ledger} /> : null}
        {tab === "rewards" ? <Rewards rewards={props.rewards} redemptions={props.redemptions} balance={props.summary.balance} /> : null}
      </div>
    </div>
  );
}

function Orders({ orders }: { orders: AccountOrder[] }) {
  if (!orders.length) {
    return (
      <Empty>
        No orders yet. <Link href="/" className="font-bold text-accent hover:underline">Start shopping</Link>
      </Empty>
    );
  }
  return (
    <ul className="space-y-4">
      {orders.map((o) => {
        const st = STATUS[o.status] ?? { label: o.status, color: "#999" };
        const total = Number(o.total_usd) || 0;
        const paid = Number(o.amount_paid_usd) || 0;
        const open = !["delivered", "cancelled", "refunded"].includes(o.status);
        return (
          <li key={o.order_number} className="rounded-3xl border border-ink/10 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-bold text-ink">{o.order_number}</p>
                <p className="text-xs text-ink/50">
                  {date(o.created_at)}
                  {o.delivered_at && o.status === "delivered" ? ` · delivered ${date(o.delivered_at)}` : ""}
                </p>
              </div>
              <span className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white" style={{ backgroundColor: st.color }}>
                {st.label}
              </span>
            </div>
            <ul className="mt-4 space-y-2">
              {o.items.map((it, i) => (
                <li key={i} className="flex items-center gap-3">
                  {it.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.image_url} alt="" className="h-12 w-12 shrink-0 rounded-xl bg-ink/[0.03] object-contain" loading="lazy" />
                  ) : (
                    <span className="h-12 w-12 shrink-0 rounded-xl bg-ink/[0.04]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-ink/50">{it.brand}</p>
                    <p className="truncate text-sm text-ink">
                      {it.name}
                      {it.quantity > 1 ? ` × ${it.quantity}` : ""}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm text-ink/80">{usd(Number(it.price_usd) * (it.quantity || 1))}</p>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-ink/10 pt-3 text-sm">
              <span className="text-ink/60">
                {o.points ? (
                  <span className="font-bold text-accent">+{o.points} points</span>
                ) : open ? (
                  "Points are added once delivered"
                ) : null}
              </span>
              <span className="text-ink">
                Total <strong>{usd(total)}</strong>
                {open && paid > 0 && paid < total ? <span className="text-ink/60"> · paid {usd(paid)}, {usd(total - paid)} due</span> : null}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Points({ ledger: all }: { ledger: LedgerEntry[] }) {
  // A cancelled order whose points were already spent leaves a 0-point marker.
  const ledger = all.filter((l) => l.points !== 0);
  if (!ledger.length) return <Empty>No points yet — they&apos;re added when your orders are delivered.</Empty>;
  const now = Date.now();
  return (
    <ul className="divide-y divide-ink/10 rounded-3xl border border-ink/10 bg-white">
      {ledger.map((l) => {
        const expired = l.points > 0 && l.remaining > 0 && l.expires_at && new Date(l.expires_at).getTime() <= now;
        return (
          <li key={l.id} className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="min-w-0">
              <p className="text-sm font-bold text-ink">
                {KIND_LABELS[l.kind] ?? l.kind}
                {l.order_number ? <span className="font-normal text-ink/60"> · {l.order_number}</span> : null}
              </p>
              <p className="text-xs text-ink/50">
                {date(l.earned_at)}
                {l.note && !l.order_number ? ` · ${l.note}` : ""}
                {l.points > 0 && l.expires_at ? (expired ? ` · ${l.remaining} expired ${date(l.expires_at)}` : ` · expires ${date(l.expires_at)}`) : ""}
              </p>
            </div>
            <p className={"shrink-0 font-bold " + (l.points > 0 ? "text-accent" : "text-ink/60")}>
              {l.points > 0 ? "+" : ""}
              {l.points.toLocaleString()}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

function Rewards({ rewards, redemptions, balance }: { rewards: RewardRow[]; redemptions: RedemptionRow[]; balance: number }) {
  const router = useRouter();
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function redeem(r: RewardRow) {
    const productId = r.products.length === 1 ? r.products[0].id : choice[r.id];
    if (r.products.length > 1 && !productId) {
      setMessage({ ok: false, text: "Please choose which item you'd like first." });
      return;
    }
    setBusy(r.id);
    setMessage(null);
    try {
      const res = await fetch("/api/account/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reward_id: r.id, product_id: productId })
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Couldn't redeem. Please try again.");
      setMessage({ ok: true, text: `Done! We'll add "${r.title}" to your next order.` });
      router.refresh();
    } catch (err) {
      setMessage({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      {message ? (
        <p className={"rounded-2xl px-4 py-3 text-sm " + (message.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700")}>{message.text}</p>
      ) : null}

      {rewards.length === 0 ? (
        <Empty>Rewards are coming soon — keep collecting points! 🎁</Empty>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {rewards.map((r) => {
            const affordable = balance >= r.points_cost;
            return (
              <li key={r.id} className="flex flex-col rounded-3xl border border-ink/10 bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-serif text-xl text-ink">{r.title}</h3>
                  <span className="shrink-0 rounded-full bg-accent/10 px-3 py-1 text-xs font-bold text-accent">{r.points_cost.toLocaleString()} pts</span>
                </div>
                {r.description ? <p className="mt-2 text-sm text-ink/70">{r.description}</p> : null}
                {r.reward_type === "discount" ? <p className="mt-2 text-sm font-bold text-ink">{usd(r.discount_usd)} off</p> : null}
                <ul className="mt-3 space-y-2">
                  {r.products.map((p) => (
                    <li key={p.id}>
                      <label className="flex cursor-pointer items-center gap-3">
                        {r.products.length > 1 ? (
                          <input
                            type="radio"
                            name={`reward-${r.id}`}
                            checked={choice[r.id] === p.id}
                            onChange={() => setChoice((c) => ({ ...c, [r.id]: p.id }))}
                            className="accent-accent"
                          />
                        ) : null}
                        {p.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image_url} alt="" className="h-10 w-10 shrink-0 rounded-lg object-contain" loading="lazy" />
                        ) : null}
                        <span className="min-w-0 text-sm">
                          <span className="block text-[10px] uppercase tracking-[0.14em] text-ink/50">{p.brand}</span>
                          <Link href={`/product/${p.id}`} className="text-ink hover:text-accent">{p.name}</Link>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-4">
                  <button
                    type="button"
                    disabled={!affordable || busy === r.id}
                    onClick={() => redeem(r)}
                    className="btn-primary w-full px-4 py-2.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {busy === r.id ? "Redeeming…" : affordable ? "Redeem" : `${(r.points_cost - balance).toLocaleString()} more points needed`}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {redemptions.length ? (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-ink/60">My redemptions</h2>
          <ul className="mt-3 divide-y divide-ink/10 rounded-3xl border border-ink/10 bg-white">
            {redemptions.map((r) => (
              <li key={r.id} className="px-5 py-4">
                <p className="text-sm font-bold text-ink">
                  {r.reward_title} <span className="font-normal text-ink/50">· {r.points_cost} pts</span>
                </p>
                <p className="text-xs text-ink/60">
                  {r.product_label ? `${r.product_label} · ` : ""}
                  {date(r.created_at)} · {REDEMPTION_STATUS[r.status] ?? r.status}
                  {r.order_number ? ` (${r.order_number})` : ""}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-3xl border border-dashed border-ink/15 px-6 py-12 text-center text-sm text-ink/60">{children}</p>;
}
