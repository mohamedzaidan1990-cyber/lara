# Design: Order Costs, Stock Tracking & Partial Payments

**Date:** 2026-06-19
**Project:** LARA / Seasons by B (`C:\Users\User\LARA`)

---

## Overview

Three related features added to the admin dashboard:

1. **Cost entry → auto-status** — enter costs per item in Awaiting Order tab; sourced items auto-advance order status.
2. **Internal stock tab** — track products bought speculatively (no customer order) as admin-only inventory.
3. **Partial payments** — record how much a client paid upfront, show balance due, include in invoices.

---

## 1. Database Changes

### 1a. `orders` table — new column

```sql
ALTER TABLE orders ADD COLUMN amount_paid_usd numeric DEFAULT 0;
```

- `amount_paid_usd` stores what the client has actually paid.
- Balance due = `total_usd - amount_paid_usd` (computed in app, not stored).
- Payment is **partial** when `amount_paid_usd > 0 AND amount_paid_usd < total_usd`.
- Payment is **full** when `amount_paid_usd >= total_usd`.
- **Migration:** existing orders with `payment_confirmed = true` get `amount_paid_usd = total_usd`. Orders with `payment_confirmed = false` get `amount_paid_usd = 0`.

### 1b. New `stock_items` table

```sql
CREATE TABLE stock_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  product_brand text NOT NULL,
  product_url text,
  image_url text,
  cost_gbp numeric,
  cost_usd numeric,
  quantity int NOT NULL DEFAULT 1,
  notes text,
  purchased_at date,
  created_at timestamp DEFAULT now()
);
```

- `product_id` is nullable — set when item matches a catalogue product, null for manual entries.
- No changes to `order_items` table; `sourced`, `cost_gbp`, `cost_usd`, `vendor` already exist.

---

## 2. Partial Payments

### UI changes (order row in Orders tab)

Each expandable order row gains a **Payment** section:

| Field | Detail |
|---|---|
| Amount Paid (USD) | Editable number input |
| Balance Due | Auto-calculated: `total_usd - amount_paid_usd`, read-only |
| Status badge | "Partial Payment" (amber) / "Paid" (green) |

- Saving updates `amount_paid_usd` via `PATCH /api/admin/orders/[id]`.
- Existing orders previously marked paid via notes: admin opens the row, sets the real `amount_paid_usd`, saves. Notes field stays intact.

### Invoice changes

`/api/admin/invoice/[orderId]/route.ts` updated to include a payment summary section:

- **Amount Received:** $X
- **Balance Due:** $Y
- Footer label: "Partial Payment — Balance Due on Delivery" (partial) or "Paid in Full" (settled).
- The existing "Send Invoice" button sends this updated PDF at any payment stage.

---

## 3. Awaiting Order Tab — Cost Entry & Auto-Status

### Behaviour

- Tab shows only items where `order_items.sourced = false`. Sourced items are hidden immediately.
- When admin enters `cost_gbp`/`cost_usd` and checks an item as sourced:
  - Item is saved (`sourced = true`) and disappears from this tab instantly.
  - API checks: are **all** `order_items` for that order now `sourced = true`?
    - **Yes** → set `orders.status = 'ordered_selfridges'` automatically.
    - **No** → order stays in current status.

### Order row in Orders tab

Each expandable order row shows a per-item sourcing summary:

- Badge: **"X/Y ordered"** (e.g., "2/3 ordered").
- Individual item rows list sourcing status per product.
- When all items sourced, badge reads "3/3 ordered" and order status moves to Ordered group.

### API change

`PATCH /api/admin/order-items/[id]` — after saving `sourced = true`, runs a check:

```sql
SELECT COUNT(*) FROM order_items WHERE order_id = $1 AND sourced = false;
-- If 0 → UPDATE orders SET status = 'ordered_selfridges' WHERE id = $1
```

---

## 4. Stock Tab (Admin-Only)

New **"Stock"** tab in admin dashboard alongside Orders, Awaiting Order, Bespoke, Accounting.

### Adding stock items

**Flow A — Search catalogue:**
1. Search box queries `products` table by name/brand.
2. Select a product → pre-fills name, brand, image_url, product_url, product_id.
3. Admin enters: cost GBP, cost USD, quantity, date purchased, notes.
4. Save → inserts into `stock_items`.

**Flow B — Manual entry:**
1. "Add Manually" button opens a form.
2. Admin enters: brand, product name, cost GBP, cost USD, quantity, date purchased, notes.
3. Save → inserts into `stock_items` with `product_id = null`.

### Stock list view

Table of all `stock_items` rows:

| Column | Detail |
|---|---|
| Product | Brand + name (+ thumbnail if image_url set) |
| Cost | GBP / USD |
| Qty | Quantity |
| Date | Purchased at |
| Notes | Free text |
| Actions | Delete button |

- Delete removes the row (no soft-delete needed; this is an internal ledger).
- No customer-facing changes.

### API routes needed

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/admin/stock` | List all stock items |
| POST | `/api/admin/stock` | Add new stock item |
| DELETE | `/api/admin/stock/[id]` | Remove stock item |

---

## 5. Architecture Summary

| Layer | Changes |
|---|---|
| **DB** | `orders.amount_paid_usd` column; new `stock_items` table; migration script |
| **API** | Update `PATCH /api/admin/orders/[id]` for payment; update `PATCH /api/admin/order-items/[id]` for auto-status; new `/api/admin/stock` CRUD routes |
| **Admin UI** | Payment section in order rows; per-item sourcing badge; new Stock tab with search + manual entry + list |
| **Invoice** | Updated PDF layout with partial payment summary |

---

## 6. Out of Scope

- Customer-facing stock visibility (items are internal only).
- Multi-payment history / instalment log (one `amount_paid_usd` field only).
- Stock depletion when a stock item is used to fulfil an order (manual tracking for now).
