# Order Costs, Stock Tracking & Partial Payments — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add partial payment tracking to orders, auto-advance order status when all items are sourced, and add an internal admin Stock tab for speculatively purchased inventory.

**Architecture:** Three independent feature areas all touching `lib/db.ts` and the admin dashboard. (1) `amount_paid_usd` column on `orders` + invoice update for partial payment display. (2) Auto-status flip on `order-items` PATCH when all items in an order are marked sourced, plus a per-item sourcing badge in the order row. (3) New `stock_items` table + Stock tab for items bought without a customer order. All DB changes are idempotent `ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS` statements appended to `SCHEMA_STATEMENTS` in `lib/db.ts`.

**Tech Stack:** Next.js 14 App Router, TypeScript, Neon Serverless Postgres (`@neondatabase/serverless`), Tailwind CSS, jsPDF + jsPDF-autotable (invoices).

## Global Constraints

- All SQL goes through `getSql()` from `lib/db.ts`. Never import `neon` directly.
- All admin API routes must call `if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })` as the first statement.
- All admin API routes must export `export const runtime = "nodejs"` and `export const dynamic = "force-dynamic"`.
- `ensureSchema()` must be called before any DB query in every API route.
- Tailwind classes only for layout/colour — only use inline `style` for dynamic hex colour values.
- GBP→USD conversion fetches live rate from `/api/exchange-rate`; never hardcode a rate.
- After the migration runs, orders that were `payment_confirmed = true` will have `amount_paid_usd` set to their `total_usd`. Any order that was marked confirmed but was actually partially paid will need to be manually corrected via the new payment UI.

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Modify | `lib/db.ts` | Add `amount_paid_usd` column, `stock_items` table, `StockItemRow` interface, update `OrderRow` |
| Create | `app/api/admin/orders/[id]/payment/route.ts` | PATCH `amount_paid_usd` on an order |
| Modify | `app/admin/page.tsx` | Include `amount_paid_usd` in SSR orders query |
| Modify | `components/AdminOrderRow.tsx` | Payment section + partial badge + sourcing badge |
| Modify | `lib/invoice.ts` | Show partial payment info in PDF |
| Modify | `app/api/admin/generate-invoice/route.ts` | Pass `amount_paid_usd` to invoice generator |
| Modify | `app/api/admin/order-items/[id]/route.ts` | Auto-advance order status when all items sourced |
| Modify | `components/AdminAwaitingOrderTab.tsx` | Handle `order_status` in PATCH response |
| Create | `app/api/admin/stock/route.ts` | GET stock items / search products + POST new stock item |
| Create | `app/api/admin/stock/[id]/route.ts` | DELETE stock item |
| Create | `components/AdminStockTab.tsx` | Stock tab UI |
| Modify | `app/admin/AdminDashboard.tsx` | Add Stock tab |

---

### Task 1: Schema — `amount_paid_usd` + `stock_items`

**Files:**
- Modify: `lib/db.ts`

**Interfaces:**
- Produces: `OrderRow.amount_paid_usd?: string | number | null`
- Produces: exported `StockItemRow` interface

- [ ] **Step 1: Append schema statements to `SCHEMA_STATEMENTS` in `lib/db.ts`**

After the closing backtick of the last statement (the `bespoke_requests` create, currently ending around line 147), add inside the array:

```typescript
  // ----- Partial payment tracking -----
  `alter table orders add column if not exists amount_paid_usd numeric default 0`,
  // Seed confirmed orders as fully paid. WHERE clause is idempotent — only matches rows still at 0.
  `update orders set amount_paid_usd = coalesce(total_usd, price_usd, 0) where payment_confirmed = true and (amount_paid_usd = 0 or amount_paid_usd is null)`,
  // ----- Speculative stock (no customer order) -----
  `create table if not exists stock_items (
    id uuid default gen_random_uuid() primary key,
    product_id uuid references products(id) on delete set null,
    product_name text not null,
    product_brand text not null,
    product_url text,
    image_url text,
    cost_gbp numeric,
    cost_usd numeric,
    quantity int not null default 1,
    notes text,
    purchased_at date,
    created_at timestamp default now()
  )`,
```

- [ ] **Step 2: Add `amount_paid_usd` to `OrderRow` interface in `lib/db.ts`**

Find the last field in `OrderRow` (`source?: string | null;`) and add after it:

```typescript
  amount_paid_usd?: string | number | null;
```

- [ ] **Step 3: Add `StockItemRow` interface at the end of `lib/db.ts`**

```typescript
export interface StockItemRow {
  id: string;
  product_id: string | null;
  product_name: string;
  product_brand: string;
  product_url: string | null;
  image_url: string | null;
  cost_gbp: string | number | null;
  cost_usd: string | number | null;
  quantity: number;
  notes: string | null;
  purchased_at: string | null;
  created_at: string;
}
```

- [ ] **Step 4: Verify schema applies cleanly**

```bash
npm run dev
```

Open `http://localhost:3000/admin` — page must load without error. Check terminal for Postgres errors. No errors = schema applied.

- [ ] **Step 5: Commit**

```bash
git add lib/db.ts
git commit -m "feat: add amount_paid_usd to orders and stock_items table"
```

---

### Task 2: Payment tracking API + order row UI

**Files:**
- Create: `app/api/admin/orders/[id]/payment/route.ts`
- Modify: `app/admin/page.tsx`
- Modify: `components/AdminOrderRow.tsx`

**Interfaces:**
- Consumes: `OrderRow.amount_paid_usd` (Task 1)
- Produces: `PATCH /api/admin/orders/[id]/payment` body `{ amount_paid_usd: number }` → `{ amount_paid_usd: number, total_usd: number, balance_due: number }`

- [ ] **Step 1: Create `app/api/admin/orders/[id]/payment/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { amount_paid_usd?: number | string };
  const amountPaid = Number(body.amount_paid_usd);
  if (!Number.isFinite(amountPaid) || amountPaid < 0) {
    return NextResponse.json({ error: "Invalid amount_paid_usd" }, { status: 400 });
  }
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`
    update orders set amount_paid_usd = ${amountPaid}, updated_at = now()
    where id = ${params.id}
    returning id, amount_paid_usd, coalesce(total_usd, price_usd, 0) as total_usd
  `) as Array<{ id: string; amount_paid_usd: string; total_usd: string }>;
  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const total = Number(rows[0].total_usd) || 0;
  const paid = Number(rows[0].amount_paid_usd) || 0;
  return NextResponse.json({ amount_paid_usd: paid, total_usd: total, balance_due: Math.max(0, total - paid) });
}
```

- [ ] **Step 2: Verify payment route**

With dev server running, open an order in the admin and note its UUID from the URL or network tab, then:

```bash
# Replace ORDER_ID with a real UUID
curl -s -X PATCH http://localhost:3000/api/admin/orders/ORDER_ID/payment \
  -H "Content-Type: application/json" \
  --cookie "admin_session=$(cat /tmp/admin_cookie 2>/dev/null)" \
  -d '{"amount_paid_usd": 50}' | jq .
```

Expected: `{ "amount_paid_usd": 50, "total_usd": <order total>, "balance_due": <remainder> }`
(If cookie is tricky, just verify in Step 6 manually via the UI.)

- [ ] **Step 3: Add `amount_paid_usd` to SSR query in `app/admin/page.tsx`**

Find:
```typescript
           o.cost_gbp, o.cost_usd, o.platform_fee_usd, o.profit_usd, o.profit_notes, o.source,
```
Replace with:
```typescript
           o.cost_gbp, o.cost_usd, o.platform_fee_usd, o.profit_usd, o.profit_notes, o.source,
           o.amount_paid_usd,
```

- [ ] **Step 4: Add payment state + helpers to `components/AdminOrderRow.tsx`**

After the existing `const [savingPnl, setSavingPnl] = useState(false);` declaration (around line 61), add:

```typescript
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
```

Also find the existing `const usdValue = Number(local.total_usd ?? local.price_usd);` line and remove it — it's now replaced by `totalUsd` above. Update any reference to `usdValue` in the component to use `totalUsd` instead.

- [ ] **Step 5: Update "Paid" column badge in the collapsed row**

Find (around line 242):
```tsx
        <td className="px-4 py-3">
          <span className={"inline-block h-2.5 w-2.5 rounded-full " + (local.payment_confirmed ? "bg-gold" : "bg-ink/20")} aria-label={local.payment_confirmed ? "Paid" : "Unpaid"} />
        </td>
```
Replace with:
```tsx
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
```

- [ ] **Step 6: Add Payment section in the expanded row**

In the expanded row's `<td colSpan={8}>` content, find the `{/* Profit & Loss */}` block. Insert the Payment section BEFORE it:

```tsx
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
              </div>
              {isPartialPay ? (
                <p className="mt-2 text-[11px] text-amber-700">
                  Partial — {usd(paidNum)} received, {usd(balanceDue)} due.
                </p>
              ) : paidNum >= totalUsd && totalUsd > 0 ? (
                <p className="mt-2 text-[11px] text-green-700">Fully paid ✓</p>
              ) : null}
            </div>
```

- [ ] **Step 7: Verify in browser**

1. Open `http://localhost:3000/admin`, expand any order.
2. Scroll to "Payment" section — see Amount Paid input and Balance Due.
3. Enter a partial amount, click "Save payment". Collapse and re-expand — value persists.
4. Check collapsed row "Paid" column — shows amber "Partial" badge.
5. Set amount to full order total — badge reverts to gold dot.

- [ ] **Step 8: Commit**

```bash
git add app/api/admin/orders app/admin/page.tsx components/AdminOrderRow.tsx
git commit -m "feat: add partial payment tracking to orders"
```

---

### Task 3: Invoice update for partial payments

**Files:**
- Modify: `lib/invoice.ts`
- Modify: `app/api/admin/generate-invoice/route.ts`

**Interfaces:**
- Produces: `InvoiceOrder.amount_paid_usd?: number`

- [ ] **Step 1: Update `InvoiceOrder` interface in `lib/invoice.ts`**

Find:
```typescript
export interface InvoiceOrder {
  order_number: string;
  created_at: string | Date;
  payment_confirmed: boolean;
  payment_method?: string | null;
  total_usd: number;
}
```
Replace with:
```typescript
export interface InvoiceOrder {
  order_number: string;
  created_at: string | Date;
  payment_confirmed: boolean;
  payment_method?: string | null;
  total_usd: number;
  amount_paid_usd?: number;
}
```

- [ ] **Step 2: Update the Payment section in `generateInvoice` in `lib/invoice.ts`**

Find (around line 146):
```typescript
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text("Payment", left, py);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  py += 6;
  doc.text(`Payment method: ${paymentLabel(order.payment_method)}`, left, py);
  py += 5;
  doc.text(`Payment status: ${order.payment_confirmed ? "Confirmed" : "Pending"}`, left, py);
  py += 5;
  doc.text("Confirmed by: Seasons by B team", left, py);
```
Replace with:
```typescript
  const amountPaid = order.amount_paid_usd ?? 0;
  const isPartial = amountPaid > 0 && amountPaid < order.total_usd;
  const balanceDue = Math.max(0, order.total_usd - amountPaid);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text("Payment", left, py);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  py += 6;
  doc.text(`Payment method: ${paymentLabel(order.payment_method)}`, left, py);
  py += 5;
  if (isPartial) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(180, 100, 0);
    doc.text(`Amount received: ${usd(amountPaid)}`, left, py);
    py += 5;
    doc.text(`Balance due on delivery: ${usd(balanceDue)}`, left, py);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    py += 5;
    doc.text("Confirmed by: Seasons by B team", left, py);
  } else {
    doc.text(`Payment status: ${order.payment_confirmed ? "Paid in Full" : "Pending"}`, left, py);
    py += 5;
    doc.text("Confirmed by: Seasons by B team", left, py);
  }
```

- [ ] **Step 3: Update `app/api/admin/generate-invoice/route.ts` to pass `amount_paid_usd`**

Add `amount_paid_usd: string | number | null;` to the `OrderJoin` interface.

Update the SQL to include `o.amount_paid_usd` in the select:
```typescript
    select o.id, o.order_number, o.customer_email, o.payment_method, o.total_usd, o.price_usd, o.created_at,
           o.amount_paid_usd,
           coalesce(c.full_name, '') as full_name,
```

Update the `generateInvoice` call to include `amount_paid_usd`:
```typescript
  const pdf = generateInvoice(
    {
      order_number: order.order_number,
      created_at: order.created_at,
      payment_confirmed: true,
      payment_method: order.payment_method,
      total_usd: totalUsd,
      amount_paid_usd: Number(order.amount_paid_usd) || undefined
    },
    { full_name: order.full_name, email: order.customer_email ?? "", phone: order.phone, address: order.address },
    items
  );
```

- [ ] **Step 4: Verify invoice PDF**

1. Expand an order. Set `amount_paid_usd` to a partial amount (e.g. $60 on a $100 order) and save.
2. Click "Confirm Payment & Send Invoice".
3. Click "Download Invoice" → open PDF.
4. Payment section should show "Amount received: $60.00" and "Balance due on delivery: $40.00" in amber.
5. Test with a fully-paid order (amount_paid_usd = total) → Payment section should show "Paid in Full".

- [ ] **Step 5: Commit**

```bash
git add lib/invoice.ts app/api/admin/generate-invoice/route.ts
git commit -m "feat: include partial payment info in invoice PDF"
```

---

### Task 4: Auto-status on sourcing + sourcing badge

**Files:**
- Modify: `app/api/admin/order-items/[id]/route.ts`
- Modify: `components/AdminAwaitingOrderTab.tsx`
- Modify: `components/AdminOrderRow.tsx`

**Interfaces:**
- Produces: `PATCH /api/admin/order-items/[id]` response now includes `order_id: string` and `order_status: "ordered_selfridges" | null`

- [ ] **Step 1: Replace `app/api/admin/order-items/[id]/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    vendor?: string | null;
    cost_gbp?: number | string | null;
    cost_usd?: number | string | null;
    sourced?: boolean;
  };

  const costGbp = body.cost_gbp != null && body.cost_gbp !== "" ? Number(body.cost_gbp) : null;
  const costUsd = body.cost_usd != null && body.cost_usd !== "" ? Number(body.cost_usd) : null;

  await ensureSchema();
  const sql = getSql();

  await sql`
    update order_items
    set vendor   = ${body.vendor ?? null},
        cost_gbp = ${costGbp},
        cost_usd = ${costUsd},
        sourced  = ${body.sourced ?? false}
    where id = ${params.id}
  `;

  const rows = (await sql`
    select id, vendor, cost_gbp, cost_usd, sourced, order_id
    from order_items where id = ${params.id} limit 1
  `) as Array<{ id: string; vendor: string | null; cost_gbp: string | null; cost_usd: string | null; sourced: boolean; order_id: string }>;

  const row = rows[0];
  if (!row) return NextResponse.json({ ok: true });

  // When marked sourced, check if all items in this order are now done.
  // If so, auto-advance to ordered_selfridges (only from payment_confirmed status).
  let orderStatus: string | null = null;
  if (body.sourced === true) {
    const orderRows = (await sql`
      select status from orders where id = ${row.order_id} limit 1
    `) as Array<{ status: string }>;

    if (orderRows[0]?.status === "payment_confirmed") {
      const unsourced = (await sql`
        select count(*)::int as cnt from order_items
        where order_id = ${row.order_id} and sourced = false
      `) as Array<{ cnt: number }>;

      if ((unsourced[0]?.cnt ?? 1) === 0) {
        await sql`
          update orders
          set status = 'ordered_selfridges', ordered_selfridges_at = now(), updated_at = now()
          where id = ${row.order_id}
        `;
        orderStatus = "ordered_selfridges";
      }
    }
  }

  return NextResponse.json({
    id: row.id,
    vendor: row.vendor,
    cost_gbp: row.cost_gbp,
    cost_usd: row.cost_usd,
    sourced: row.sourced,
    order_id: row.order_id,
    order_status: orderStatus
  });
}
```

- [ ] **Step 2: Update import in `components/AdminAwaitingOrderTab.tsx`**

Find:
```typescript
import type { OrderWithCustomer, OrderLineItem } from "@/lib/db";
```
Replace with:
```typescript
import type { OrderWithCustomer, OrderLineItem, OrderStatus } from "@/lib/db";
```

- [ ] **Step 3: Update response type + status propagation in `save` function in `AdminAwaitingOrderTab.tsx`**

Find the response type cast in `save` (inside the `try` block):
```typescript
      const updated = await res.json() as { vendor: string | null; cost_gbp: string | null; cost_usd: string | null; sourced: boolean };
      const nextItems = (order.items ?? []).map((it) =>
        it.id === item.id
          ? { ...it, vendor: updated.vendor, cost_gbp: updated.cost_gbp, cost_usd: updated.cost_usd, sourced: updated.sourced }
          : it
      );
      onOrderUpdated({ ...order, items: nextItems });
```
Replace with:
```typescript
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
```

- [ ] **Step 4: Update response type + status propagation in `toggleSourced` function in `AdminAwaitingOrderTab.tsx`**

Find the response type cast in `toggleSourced`:
```typescript
      const updated = await res.json() as { vendor: string | null; cost_gbp: string | null; cost_usd: string | null; sourced: boolean };
      const nextItems = (fi.order.items ?? []).map((it) =>
        it.id === item.id
          ? { ...it, vendor: updated.vendor, cost_gbp: updated.cost_gbp, cost_usd: updated.cost_usd, sourced: updated.sourced }
          : it
      );
      onOrderUpdated({ ...fi.order, items: nextItems });
```
Replace with:
```typescript
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
```

- [ ] **Step 5: Add sourcing badge to items heading in `components/AdminOrderRow.tsx`**

Find (in the expanded row, inside the Items column):
```tsx
                <p className="text-[10px] uppercase tracking-[0.2em] text-ink/60">
                  Items{local.items && local.items.length ? ` (${local.items.length})` : ""}
                </p>
```
Replace with:
```tsx
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
```

- [ ] **Step 6: Verify auto-status + badge**

1. In admin, go to "Awaiting Order" tab.
2. Find an order in `payment_confirmed` status with unsourced items.
3. Enter cost for each item and check the sourced checkbox (use the "Save" button if needed).
4. After the LAST item is checked: verify item disappears from Awaiting Order immediately.
5. Switch to "Orders" tab — the order should now be in the "Ordered" group.
6. Expand the order → "X/Y ordered" badge shows green "3/3 ordered".
7. Test partial: with a 3-item order, source only 1. Order stays in "Payment Confirmed". Badge shows amber "1/3 ordered".

- [ ] **Step 7: Commit**

```bash
git add app/api/admin/order-items components/AdminAwaitingOrderTab.tsx components/AdminOrderRow.tsx
git commit -m "feat: auto-advance order to ordered when all items sourced, add sourcing badge"
```

---

### Task 5: Stock CRUD API routes

**Files:**
- Create: `app/api/admin/stock/route.ts`
- Create: `app/api/admin/stock/[id]/route.ts`

**Interfaces:**
- Consumes: `StockItemRow` (Task 1)
- Produces:
  - `GET /api/admin/stock` → `{ items: StockItemRow[] }`
  - `GET /api/admin/stock?search=q` → `{ products: Array<{id,brand,name,price_gbp,price_usd,product_url,image_url}> }`
  - `POST /api/admin/stock` body `{ product_id?, product_name, product_brand, product_url?, image_url?, cost_gbp?, cost_usd?, quantity?, notes?, purchased_at? }` → `StockItemRow` (201)
  - `DELETE /api/admin/stock/[id]` → `{ ok: true }`

- [ ] **Step 1: Create `app/api/admin/stock/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { ensureSchema, getSql, type StockItemRow } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureSchema();
  const sql = getSql();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim();

  if (search && search.length >= 2) {
    const q = `%${search}%`;
    const products = (await sql`
      select id, brand, name, price_gbp, price_usd, product_url, image_url
      from products
      where (lower(name) like lower(${q}) or lower(brand) like lower(${q}))
        and deliverable_lebanon = true
      order by popularity asc nulls last, name asc
      limit 20
    `) as Array<{ id: string; brand: string; name: string; price_gbp: string; price_usd: string; product_url: string | null; image_url: string | null }>;
    return NextResponse.json({ products });
  }

  const rows = (await sql`
    select id, product_id, product_name, product_brand, product_url, image_url,
           cost_gbp, cost_usd, quantity, notes, purchased_at, created_at
    from stock_items
    order by created_at desc
  `) as StockItemRow[];
  return NextResponse.json({ items: rows });
}

export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as {
    product_id?: string | null;
    product_name?: string;
    product_brand?: string;
    product_url?: string | null;
    image_url?: string | null;
    cost_gbp?: number | string | null;
    cost_usd?: number | string | null;
    quantity?: number;
    notes?: string | null;
    purchased_at?: string | null;
  };
  if (!body.product_name?.trim() || !body.product_brand?.trim()) {
    return NextResponse.json({ error: "product_name and product_brand are required" }, { status: 400 });
  }
  const costGbp = body.cost_gbp != null && body.cost_gbp !== "" ? Number(body.cost_gbp) : null;
  const costUsd = body.cost_usd != null && body.cost_usd !== "" ? Number(body.cost_usd) : null;
  const qty = Math.max(1, Math.floor(Number(body.quantity) || 1));
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`
    insert into stock_items
      (product_id, product_name, product_brand, product_url, image_url, cost_gbp, cost_usd, quantity, notes, purchased_at)
    values
      (${body.product_id ?? null}, ${body.product_name.trim()}, ${body.product_brand.trim()},
       ${body.product_url ?? null}, ${body.image_url ?? null},
       ${costGbp}, ${costUsd}, ${qty}, ${body.notes ?? null}, ${body.purchased_at ?? null})
    returning id, product_id, product_name, product_brand, product_url, image_url,
              cost_gbp, cost_usd, quantity, notes, purchased_at, created_at
  `) as StockItemRow[];
  return NextResponse.json(rows[0], { status: 201 });
}
```

- [ ] **Step 2: Create `app/api/admin/stock/[id]/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureSchema();
  const sql = getSql();
  await sql`delete from stock_items where id = ${params.id}`;
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Verify stock API**

```bash
# List (empty initially)
curl -s http://localhost:3000/api/admin/stock | jq .
# Expected: { "items": [] }

# Product search
curl -s "http://localhost:3000/api/admin/stock?search=chanel" | jq '.products | length'
# Expected: a number > 0 (if Chanel products exist in your catalogue)

# Add item manually
ITEM=$(curl -s -X POST http://localhost:3000/api/admin/stock \
  -H "Content-Type: application/json" \
  -d '{"product_name":"Test Serum","product_brand":"La Mer","cost_gbp":95,"cost_usd":120,"quantity":1,"purchased_at":"2026-06-19"}')
echo $ITEM | jq .
ITEM_ID=$(echo $ITEM | jq -r '.id')

# Delete it
curl -s -X DELETE "http://localhost:3000/api/admin/stock/$ITEM_ID" | jq .
# Expected: { "ok": true }
```

(Note: admin cookie required on a deployed/auth-protected instance. In dev mode `isAdmin()` may return true from the session cookie set after login.)

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/stock
git commit -m "feat: add stock CRUD API routes"
```

---

### Task 6: Stock tab UI + dashboard integration

**Files:**
- Create: `components/AdminStockTab.tsx`
- Modify: `app/admin/AdminDashboard.tsx`

**Interfaces:**
- Consumes: All routes from Task 5, `StockItemRow` from Task 1

- [ ] **Step 1: Create `components/AdminStockTab.tsx`**

```typescript
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
```

- [ ] **Step 2: Update `app/admin/AdminDashboard.tsx`**

Add import (with the other component imports at the top):
```typescript
import AdminStockTab from "@/components/AdminStockTab";
```

Update the `Tab` type:
```typescript
type Tab = "orders" | "awaiting" | "bespoke" | "accounting" | "stock";
```

Add Stock tab button after the Accounting button:
```tsx
        <TabButton active={tab === "accounting"} onClick={() => setTab("accounting")} label="Accounting" />
        <TabButton active={tab === "stock"} onClick={() => setTab("stock")} label="Stock" />
```

Add Stock tab render — find the existing conditional chain starting with `{tab === "accounting" ? (` and add `"stock"` before `"awaiting"`:
```tsx
      {tab === "accounting" ? (
        <AdminAccountingTab orders={orders} expenses={expenses} onExpensesChange={setExpenses} />
      ) : tab === "stock" ? (
        <AdminStockTab />
      ) : tab === "awaiting" ? (
```

- [ ] **Step 3: Verify Stock tab end-to-end**

1. Open `http://localhost:3000/admin` → click "Stock" tab.
2. See empty state "No stock items yet."
3. Click "+ Search catalogue" → type a brand name → product list appears.
4. Click a product → form opens with brand/name pre-filled.
5. Enter cost £80 → USD field auto-populates (e.g. £80 × 1.27 = $101.60).
6. Enter quantity 2, date, click "Save to stock" → item appears in the stock table.
7. Click "+ Add manually" → fill in all fields from scratch → save → appears in table.
8. Click "Remove" on an item → confirm → removed from table.

- [ ] **Step 4: Commit**

```bash
git add components/AdminStockTab.tsx app/admin/AdminDashboard.tsx
git commit -m "feat: add Stock tab to admin dashboard"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** All 4 spec sections covered — payment tracking (Tasks 2-3), auto-status (Task 4), stock tab (Tasks 5-6), partial payment invoice (Task 3).
- [x] **Placeholder scan:** No TBDs, no "similar to Task N" references. All code blocks are complete.
- [x] **Type consistency:** `StockItemRow` defined in Task 1, consumed in Tasks 5-6. `OrderRow.amount_paid_usd` defined in Task 1, consumed in Tasks 2-3. `order_status` field returned from order-items PATCH defined in Task 4 and consumed in the same task's component updates.
- [x] **Note for admin:** After deploying, manually review orders that were `payment_confirmed = true` but only partially paid — the migration sets their `amount_paid_usd = total_usd`. Use the new Payment section in each order row to correct any that were actually partial.
