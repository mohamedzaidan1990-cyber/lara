"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { LoyaltyCustomer, LoyaltySettings, RedemptionRow, RewardRow } from "@/lib/loyalty";

export interface LoyaltyData {
  customers: LoyaltyCustomer[];
  rewards: RewardRow[];
  redemptions: RedemptionRow[];
  settings: LoyaltySettings;
}

async function call(url: string, method: string, body: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(String(data.error ?? "Request failed"));
  return data;
}

function date(v: string | null): string {
  return v ? new Date(v).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
}

const SECTION = "mt-8 border border-ink/10 p-5";
const H2 = "text-xs font-bold uppercase tracking-[0.18em] text-ink/70";
const SMALL_BTN = "rounded-full border border-accent/30 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-accent hover:bg-accent hover:text-white disabled:opacity-40";

export default function AdminLoyaltyTab({ data }: { data: LoyaltyData }) {
  const totalPoints = data.customers.reduce((s, c) => s + c.balance, 0);
  const accounts = data.customers.filter((c) => c.has_account).length;
  return (
    <div>
      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Accounts" value={`${accounts} / ${data.customers.length}`} />
        <Stat label="Points outstanding" value={totalPoints.toLocaleString()} />
        <Stat label="Active rewards" value={String(data.rewards.filter((r) => r.active).length)} />
        <Stat label="To fulfil" value={String(data.redemptions.filter((r) => r.status === "requested").length)} />
      </section>
      <Redemptions redemptions={data.redemptions} />
      <Clients customers={data.customers} />
      <Rewards rewards={data.rewards} />
      <Settings settings={data.settings} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-ink/10 bg-gold/10 p-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-ink/60">{label}</p>
      <p className="mt-2 font-serif text-2xl text-ink">{value}</p>
    </div>
  );
}

// ---------- Redemptions ----------

function Redemptions({ redemptions }: { redemptions: RedemptionRow[] }) {
  const router = useRouter();
  const [orderNo, setOrderNo] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);
  const open = redemptions.filter((r) => r.status === "requested");
  const past = redemptions.filter((r) => r.status !== "requested");

  async function act(r: RedemptionRow, action: "fulfil" | "cancel") {
    setBusy(r.id);
    setError(null);
    try {
      await call(`/api/admin/loyalty/redemptions/${r.id}`, "PATCH", { action, order_number: orderNo[r.id] ?? "" });
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className={SECTION}>
      <h2 className={H2}>Redemptions to fulfil ({open.length})</h2>
      <p className="mt-1 text-xs text-ink/60">
        Points are taken when the client redeems. Enter one of their order numbers to add the reward to that order automatically
        (free item at $0, or a negative discount line), or leave it blank to just mark it done. Cancel returns the points.
      </p>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      {open.length === 0 ? (
        <p className="mt-4 text-sm text-ink/50">Nothing waiting.</p>
      ) : (
        <ul className="mt-4 divide-y divide-ink/10">
          {open.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-ink">
                  {r.customer_name ?? "—"} <span className="font-normal text-ink/50">· {r.phone} · {date(r.created_at)}</span>
                </p>
                <p className="text-sm text-ink/80">
                  {r.reward_title} ({r.points_cost} pts){r.product_label ? ` — ${r.product_label}` : ""}
                </p>
              </div>
              <input
                className="w-36 border border-ink/15 px-3 py-1.5 text-sm uppercase"
                placeholder="SBB-… (optional)"
                value={orderNo[r.id] ?? ""}
                onChange={(e) => setOrderNo((m) => ({ ...m, [r.id]: e.target.value }))}
              />
              <button type="button" className={SMALL_BTN} disabled={busy === r.id} onClick={() => act(r, "fulfil")}>Fulfil</button>
              <button type="button" className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink/50 hover:text-red-700" disabled={busy === r.id} onClick={() => act(r, "cancel")}>
                Cancel
              </button>
            </li>
          ))}
        </ul>
      )}
      {past.length ? (
        <div className="mt-4">
          <button type="button" className="text-xs text-accent hover:underline" onClick={() => setShowPast((v) => !v)}>
            {showPast ? "Hide" : "Show"} past redemptions ({past.length})
          </button>
          {showPast ? (
            <ul className="mt-2 space-y-1 text-xs text-ink/70">
              {past.map((r) => (
                <li key={r.id}>
                  {date(r.created_at)} · {r.customer_name} ({r.phone}) · {r.reward_title}
                  {r.product_label ? ` — ${r.product_label}` : ""} · {r.points_cost} pts · <strong>{r.status}</strong>
                  {r.order_number ? ` → ${r.order_number}` : ""}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

// ---------- Clients: accounts, PINs, points ----------

function Clients({ customers }: { customers: LoyaltyCustomer[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [pinResult, setPinResult] = useState<{ full_name: string; phone: string; pin: string; whatsapp_url: string; reset: boolean } | null>(null);
  const [adjust, setAdjust] = useState<{ phone: string; points: string; note: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newPhone, setNewPhone] = useState("");

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    const digits = term.replace(/\D/g, "");
    const list = term
      ? customers.filter((c) => c.name?.toLowerCase().includes(term) || (digits && c.phone.includes(digits)))
      : customers;
    return list.slice(0, 60);
  }, [customers, q]);

  async function issuePin(phone: string, existing: boolean) {
    if (existing && !window.confirm("Reset this client's PIN? Their old PIN stops working and they're logged out.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await call("/api/admin/loyalty/pin", "POST", { phone });
      setPinResult(res as unknown as NonNullable<typeof pinResult>);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveAdjust() {
    if (!adjust) return;
    setBusy(true);
    setError(null);
    try {
      await call("/api/admin/loyalty/adjust", "POST", adjust);
      setAdjust(null);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={SECTION}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className={H2}>Clients &amp; points</h2>
          <p className="mt-1 text-xs text-ink/60">One row per phone number — duplicate customer records are combined. Showing up to 60; search to find others.</p>
        </div>
        <input className="w-64 border border-ink/15 px-3 py-2 text-sm" placeholder="Search name or phone" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

      {pinResult ? (
        <div className="mt-4 border-2 border-accent bg-accent/5 p-4">
          <p className="text-sm text-ink">
            {pinResult.reset ? "New PIN" : "Account created"} for <strong>{pinResult.full_name}</strong> ({pinResult.phone}):
          </p>
          <p className="mt-2 font-mono text-3xl tracking-[0.3em] text-ink">{pinResult.pin}</p>
          <p className="mt-1 text-xs text-ink/60">Shown once only — send it now.</p>
          <div className="mt-3 flex gap-3">
            <a href={pinResult.whatsapp_url} target="_blank" rel="noreferrer" className={SMALL_BTN}>Send on WhatsApp</a>
            <button type="button" className="text-xs text-ink/50 hover:text-ink" onClick={() => setPinResult(null)}>Close</button>
          </div>
        </div>
      ) : null}

      {adjust ? (
        <div className="mt-4 flex flex-wrap items-end gap-3 border border-ink/15 p-4">
          <p className="w-full text-sm text-ink">Adjust points for <strong>{adjust.phone}</strong></p>
          <label className="text-xs text-ink/60">
            Points (+/−)
            <input className="mt-1 block w-28 border border-ink/15 px-3 py-1.5 text-sm" value={adjust.points} onChange={(e) => setAdjust({ ...adjust, points: e.target.value })} placeholder="e.g. 50 or -20" />
          </label>
          <label className="flex-1 text-xs text-ink/60">
            Reason (the client sees it)
            <input className="mt-1 block w-full border border-ink/15 px-3 py-1.5 text-sm" value={adjust.note} onChange={(e) => setAdjust({ ...adjust, note: e.target.value })} placeholder="e.g. Golden ticket prize" />
          </label>
          <button type="button" className={SMALL_BTN} disabled={busy} onClick={saveAdjust}>Save</button>
          <button type="button" className="text-xs text-ink/50" onClick={() => setAdjust(null)}>Cancel</button>
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-left text-[10px] uppercase tracking-[0.18em] text-ink/60">
              <th className="py-2 pr-4">Client</th>
              <th className="py-2 pr-4">Phone</th>
              <th className="py-2 pr-4">Orders</th>
              <th className="py-2 pr-4">Points</th>
              <th className="py-2 pr-4">Account</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {shown.map((c) => (
              <tr key={c.phone} className="border-b border-ink/5">
                <td className="py-2 pr-4 text-ink">{c.name}</td>
                <td className="py-2 pr-4 text-ink/70">{c.phone}</td>
                <td className="py-2 pr-4 text-ink/70">{c.orders}</td>
                <td className="py-2 pr-4 font-bold text-ink">{c.balance.toLocaleString()}</td>
                <td className="py-2 pr-4 text-xs text-ink/60">
                  {c.has_account ? `Yes${c.created_by === "admin" ? " (PIN sent by us)" : ""}${c.last_login_at ? ` · last login ${date(c.last_login_at)}` : ""}` : "—"}
                </td>
                <td className="whitespace-nowrap py-2 text-right">
                  <button type="button" className={SMALL_BTN} disabled={busy} onClick={() => issuePin(c.phone, c.has_account)}>
                    {c.has_account ? "Reset PIN" : "Create + PIN"}
                  </button>{" "}
                  <button type="button" className={SMALL_BTN} onClick={() => setAdjust({ phone: c.phone, points: "", note: "" })}>±</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <span className="text-xs text-ink/60">New client not in the list?</span>
        <input className="w-40 border border-ink/15 px-3 py-1.5" placeholder="Phone number" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
        <button type="button" className={SMALL_BTN} disabled={busy || !newPhone.trim()} onClick={() => issuePin(newPhone, false)}>Create + PIN</button>
      </div>
    </section>
  );
}

// ---------- Rewards ----------

interface Draft {
  id: string | null;
  title: string;
  description: string;
  points_cost: string;
  reward_type: "free_item" | "discount";
  discount_usd: string;
  active: boolean;
  sort_order: string;
  products: Array<{ id: string; brand: string; name: string }>;
}

const EMPTY: Draft = { id: null, title: "", description: "", points_cost: "", reward_type: "free_item", discount_usd: "", active: true, sort_order: "0", products: [] };

function Rewards({ rewards }: { rewards: RewardRow[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function edit(r: RewardRow) {
    setDraft({
      id: r.id,
      title: r.title,
      description: r.description ?? "",
      points_cost: String(r.points_cost),
      reward_type: r.reward_type,
      discount_usd: r.discount_usd == null ? "" : String(r.discount_usd),
      active: r.active,
      sort_order: String(r.sort_order),
      products: r.products.map((p) => ({ id: p.id, brand: p.brand, name: p.name }))
    });
    setError(null);
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      const body = { ...draft, product_ids: draft.products.map((p) => p.id) };
      await call(draft.id ? `/api/admin/loyalty/rewards/${draft.id}` : "/api/admin/loyalty/rewards", draft.id ? "PATCH" : "POST", body);
      setDraft(null);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={SECTION}>
      <div className="flex items-center justify-between">
        <h2 className={H2}>Rewards ({rewards.length})</h2>
        {!draft ? (
          <button type="button" className={SMALL_BTN} onClick={() => { setDraft(EMPTY); setError(null); }}>+ New reward</button>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-ink/60">
        Each reward applies only to the items you attach. Switch a reward off instead of deleting it so past redemptions keep their history.
      </p>

      {draft ? <RewardForm draft={draft} setDraft={setDraft} onSave={save} busy={busy} error={error} /> : null}

      {rewards.length === 0 && !draft ? (
        <p className="mt-4 text-sm text-ink/50">No rewards yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-ink/10">
          {rewards.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-ink">
                  {r.title} <span className="font-normal text-ink/60">· {r.points_cost} pts</span>
                  {r.reward_type === "discount" ? <span className="font-normal text-ink/60"> · ${Number(r.discount_usd)} off</span> : <span className="font-normal text-ink/60"> · free item</span>}
                  {!r.active ? <span className="ml-2 rounded-full bg-ink/10 px-2 py-0.5 text-[10px] uppercase text-ink/60">off</span> : null}
                </p>
                <p className="truncate text-xs text-ink/60">{r.products.map((p) => `${p.brand} ${p.name}`).join(" · ")}</p>
              </div>
              <button type="button" className={SMALL_BTN} onClick={() => edit(r)}>Edit</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RewardForm({ draft, setDraft, onSave, busy, error }: { draft: Draft; setDraft: (d: Draft | null) => void; onSave: () => void; busy: boolean; error: string | null }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Array<{ id: string; brand: string; name: string }>>([]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search-suggestions?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d: { products?: Array<{ id: string; brand: string; name: string }> }) => setResults(d.products ?? []))
        .catch(() => {});
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const input = "mt-1 block w-full border border-ink/15 px-3 py-1.5 text-sm";
  return (
    <div className="mt-4 grid gap-3 border border-accent/30 bg-accent/[0.03] p-4 sm:grid-cols-2">
      <label className="text-xs text-ink/60 sm:col-span-2">
        Title (the client sees it)
        <input className={input} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="e.g. Free mini lip gloss" />
      </label>
      <label className="text-xs text-ink/60 sm:col-span-2">
        Description (optional)
        <input className={input} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
      </label>
      <label className="text-xs text-ink/60">
        Points cost
        <input className={input} inputMode="numeric" value={draft.points_cost} onChange={(e) => setDraft({ ...draft, points_cost: e.target.value })} />
      </label>
      <label className="text-xs text-ink/60">
        Type
        <select className={input} value={draft.reward_type} onChange={(e) => setDraft({ ...draft, reward_type: e.target.value as Draft["reward_type"] })}>
          <option value="free_item">Free item (client picks one of the items below)</option>
          <option value="discount">$ discount on one of the items below</option>
        </select>
      </label>
      {draft.reward_type === "discount" ? (
        <label className="text-xs text-ink/60">
          Discount ($)
          <input className={input} inputMode="decimal" value={draft.discount_usd} onChange={(e) => setDraft({ ...draft, discount_usd: e.target.value })} />
        </label>
      ) : null}
      <label className="text-xs text-ink/60">
        Order on page (lower first)
        <input className={input} inputMode="numeric" value={draft.sort_order} onChange={(e) => setDraft({ ...draft, sort_order: e.target.value })} />
      </label>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Active (shown to clients)
      </label>

      <div className="sm:col-span-2">
        <p className="text-xs text-ink/60">Items this reward applies to</p>
        <ul className="mt-1 flex flex-wrap gap-2">
          {draft.products.map((p) => (
            <li key={p.id} className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs text-ink shadow-sm">
              {p.brand} — {p.name}
              <button type="button" aria-label="Remove" className="ml-1 text-ink/40 hover:text-red-700" onClick={() => setDraft({ ...draft, products: draft.products.filter((x) => x.id !== p.id) })}>
                ✕
              </button>
            </li>
          ))}
        </ul>
        <input className={input} placeholder="Search products to add…" value={q} onChange={(e) => setQ(e.target.value)} />
        {results.length ? (
          <ul className="mt-1 max-h-48 overflow-y-auto border border-ink/10 bg-white">
            {results.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="block w-full px-3 py-1.5 text-left text-sm hover:bg-accent/10"
                  onClick={() => {
                    if (!draft.products.some((x) => x.id === p.id)) setDraft({ ...draft, products: [...draft.products, p] });
                    setQ("");
                  }}
                >
                  {p.brand} — {p.name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-700 sm:col-span-2">{error}</p> : null}
      <div className="flex gap-3 sm:col-span-2">
        <button type="button" className={SMALL_BTN} disabled={busy} onClick={onSave}>{busy ? "Saving…" : "Save reward"}</button>
        <button type="button" className="text-xs text-ink/50" onClick={() => setDraft(null)}>Cancel</button>
      </div>
    </div>
  );
}

// ---------- Settings ----------

function Settings({ settings }: { settings: LoyaltySettings }) {
  const router = useRouter();
  const [rate, setRate] = useState(String(settings.points_per_usd));
  const [days, setDays] = useState(String(settings.expiry_days));
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setMsg(null);
    try {
      await call("/api/admin/loyalty/settings", "PATCH", { points_per_usd: rate, expiry_days: days });
      setMsg("Saved — applies to points earned from now on.");
      router.refresh();
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  return (
    <section className={SECTION}>
      <h2 className={H2}>Programme settings</h2>
      <p className="mt-1 text-xs text-ink/60">
        Launched {date(settings.launched_at)}. Orders delivered before launch earned {settings.backfill_points_per_usd} points per $1
        (1 point per $2). Points are earned on the amount paid, capped at the order total, once the order is delivered.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-xs text-ink/60">
          Points per $1
          <input className="mt-1 block w-24 border border-ink/15 px-3 py-1.5 text-sm" value={rate} onChange={(e) => setRate(e.target.value)} />
        </label>
        <label className="text-xs text-ink/60">
          Points expire after (days)
          <input className="mt-1 block w-24 border border-ink/15 px-3 py-1.5 text-sm" value={days} onChange={(e) => setDays(e.target.value)} />
        </label>
        <button type="button" className={SMALL_BTN} onClick={save}>Save</button>
        {msg ? <span className="text-xs text-ink/60">{msg}</span> : null}
      </div>
    </section>
  );
}
