# Product Reviews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let customers leave a star rating + optional written review on a delivered order's line items, and surface real `aggregateRating`/`review` structured data on product pages, fixing Search Console's "Product snippets" warning without fabricating any rating data.

**Architecture:** A new `product_reviews` table keyed by `order_items.id` (the id itself is the unguessable access token — no separate token scheme). Marking an order `delivered` appends one review link per line item to the existing WhatsApp notification. A public, no-login `/review/[orderItemId]` page collects the rating; submission is immediate/auto-published (no moderation queue). The product page reads non-hidden reviews by `product_url` to build `aggregateRating`/`review` JSON-LD (only emitted when at least one review exists) and to render a reviews section. A new admin "Reviews" tab lists every review with a hide/unhide toggle as a post-hoc safety valve.

**Tech Stack:** Next.js 14 App Router, `@neondatabase/serverless` (raw SQL via the `sql` tagged template — no ORM), TypeScript, Tailwind. No automated test framework exists in this repo; verification is `npx tsc --noEmit` per task plus a one-off diagnostic script (matching the existing `scripts/check-ct.ts` convention) and a final manual browser walkthrough.

## Global Constraints

- No fabricated ratings/reviews — `aggregateRating`/`review` must only ever be emitted from real rows in `product_reviews`.
- Reviews are auto-published on submit (no pre-publish moderation queue) — confirmed by the user.
- Star rating (1–5) is required; written text is optional.
- Reviewer display name is server-derived (first name + last initial from `customers.full_name`) — never user-editable.
- WhatsApp is the only review-request channel — do not add an email version.
- One review per `order_item_id`, enforced by a database unique constraint, not just application logic.
- `aggregateRating` and `review` belong on the `Product` object in JSON-LD, as siblings of `offers` — not nested inside `offers`.
- Follow existing repo conventions exactly: raw `sql` tagged-template queries via `getSql()`, the `SCHEMA_STATEMENTS` idempotent-migration array in `lib/db.ts`, `isAdmin()` gating on admin routes, Tailwind tokens `ink`/`accent`/`gold`/`cream` for styling, plain `<img>` tags (no `next/image`).

---

### Task 1: Database schema — `product_reviews` table

**Files:**
- Modify: `lib/db.ts` (append to `SCHEMA_STATEMENTS`, add `ProductReviewRow` type)
- Create: `scripts/check-product-reviews-schema.ts`

**Interfaces:**
- Produces: `product_reviews` table `(id, order_item_id, product_url, rating, review_text, reviewer_name, hidden, created_at)`; exported type `ProductReviewRow` from `lib/db.ts` with matching fields (`id: string`, `order_item_id: string`, `product_url: string`, `rating: number`, `review_text: string | null`, `reviewer_name: string`, `hidden: boolean`, `created_at: string`).

- [ ] **Step 1: Add the migration statements**

In `lib/db.ts`, find the end of the `SCHEMA_STATEMENTS` array (it currently ends with the Huda Beauty / Summer's Hottest Look Set seed inserts around line 245+ — locate the literal closing `];` of the array) and insert these two entries as the new final elements before that closing `];`:

```ts
  // ----- Product reviews (verified-purchase, keyed by order_items.id) -----
  `create table if not exists product_reviews (
    id uuid default gen_random_uuid() primary key,
    order_item_id uuid not null references order_items(id) on delete cascade,
    product_url text not null,
    rating int not null check (rating between 1 and 5),
    review_text text,
    reviewer_name text not null,
    hidden boolean default false,
    created_at timestamp default now(),
    unique (order_item_id)
  )`,
  `create index if not exists product_reviews_product_url_idx on product_reviews (product_url)`,
```

- [ ] **Step 2: Add the `ProductReviewRow` type**

Directly below the `OrderItemRow` interface in `lib/db.ts` (it starts around line 472; find its closing `}`), add:

```ts
export interface ProductReviewRow {
  id: string;
  order_item_id: string;
  product_url: string;
  rating: number;
  review_text: string | null;
  reviewer_name: string;
  hidden: boolean;
  created_at: string;
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Write the diagnostic script**

Create `scripts/check-product-reviews-schema.ts`:

```ts
/**
 * Diagnostic: confirms the product_reviews table exists and reports its row count.
 * Run:  npx ts-node scripts/check-product-reviews-schema.ts   (reads DATABASE_URL from .env.local)
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadDotenv(file: string): void {
  let text: string;
  try {
    text = readFileSync(resolve(process.cwd(), file), "utf8");
  } catch {
    return;
  }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}
loadDotenv(".env.local");
loadDotenv(".env");

import { getSql, ensureSchema } from "../lib/db";

async function main(): Promise<void> {
  await ensureSchema();
  const sql = getSql();

  const cols = (await sql`
    select column_name, data_type
    from information_schema.columns
    where table_name = 'product_reviews'
    order by ordinal_position
  `) as Array<{ column_name: string; data_type: string }>;
  console.log("product_reviews columns:", cols);

  const count = (await sql`select count(*)::int as n from product_reviews`) as Array<{ n: number }>;
  console.log("product_reviews row count:", count[0]?.n ?? 0);
}

main().catch((err) => {
  console.error("check-product-reviews-schema failed:", err);
  process.exit(1);
});
```

- [ ] **Step 5: Run the diagnostic against the dev database**

Run: `npx ts-node scripts/check-product-reviews-schema.ts`
Expected: prints the 8 `product_reviews` columns (`id`, `order_item_id`, `product_url`, `rating`, `review_text`, `reviewer_name`, `hidden`, `created_at`) and `product_reviews row count: 0`. This confirms `ensureSchema()` successfully created the table.

- [ ] **Step 6: Commit**

```bash
git add lib/db.ts scripts/check-product-reviews-schema.ts
git commit -m "Add product_reviews table and diagnostic script"
```

---

### Task 2: `lib/reviews.ts` data access layer

**Files:**
- Create: `lib/reviews.ts`
- Test: `npx tsc --noEmit` (no dedicated test file — no test framework in this repo; this task is exercised end-to-end in Tasks 4–6)

**Interfaces:**
- Consumes: `getSql` from `lib/db.ts`; `ProductReviewRow` from `lib/db.ts` (Task 1).
- Produces (all exported from `lib/reviews.ts`, consumed by later tasks):
  - `interface OrderItemForReview { id: string; product_name: string; product_brand: string; image_url: string | null; product_url: string | null; already_reviewed: boolean }`
  - `interface AdminReviewRow extends ProductReviewRow { product_name: string; product_brand: string }`
  - `interface RatingSummary { ratingValue: number; reviewCount: number }`
  - `type SubmitReviewResult = { ok: true; review: ProductReviewRow } | { ok: false; error: "not_found" | "already_reviewed" }`
  - `getOrderItemForReview(orderItemId: string): Promise<OrderItemForReview | null>`
  - `submitReview(args: { orderItemId: string; rating: number; reviewText: string | null }): Promise<SubmitReviewResult>`
  - `getProductReviews(productUrl: string): Promise<ProductReviewRow[]>`
  - `getProductRatingSummary(productUrl: string): Promise<RatingSummary | null>`
  - `getAllReviewsForAdmin(): Promise<AdminReviewRow[]>`
  - `setReviewHidden(id: string, hidden: boolean): Promise<ProductReviewRow | null>`

- [ ] **Step 1: Create the file**

Create `lib/reviews.ts`:

```ts
import { getSql } from "./db";
import type { ProductReviewRow } from "./db";

export type { ProductReviewRow };

export interface OrderItemForReview {
  id: string;
  product_name: string;
  product_brand: string;
  image_url: string | null;
  product_url: string | null;
  already_reviewed: boolean;
}

export interface AdminReviewRow extends ProductReviewRow {
  product_name: string;
  product_brand: string;
}

export interface RatingSummary {
  ratingValue: number;
  reviewCount: number;
}

export type SubmitReviewResult =
  | { ok: true; review: ProductReviewRow }
  | { ok: false; error: "not_found" | "already_reviewed" };

function isUuid(value: string): boolean {
  return /^[0-9a-fA-F-]{36}$/.test(value);
}

function formatReviewerName(fullName: string | null | undefined): string {
  const trimmed = (fullName ?? "").trim();
  if (!trimmed) return "Verified buyer";
  const parts = trimmed.split(/\s+/);
  const first = parts[0];
  if (parts.length < 2) return first;
  const lastInitial = parts[parts.length - 1][0]?.toUpperCase();
  return lastInitial ? `${first} ${lastInitial}.` : first;
}

export async function getOrderItemForReview(orderItemId: string): Promise<OrderItemForReview | null> {
  if (!isUuid(orderItemId)) return null;
  const sql = getSql();
  const rows = (await sql`
    select oi.id, oi.product_name, oi.product_brand, oi.image_url, oi.product_url,
           (pr.id is not null) as already_reviewed
    from order_items oi
    left join product_reviews pr on pr.order_item_id = oi.id
    where oi.id = ${orderItemId}
    limit 1
  `) as OrderItemForReview[];
  return rows[0] ?? null;
}

export async function submitReview(args: {
  orderItemId: string;
  rating: number;
  reviewText: string | null;
}): Promise<SubmitReviewResult> {
  if (!isUuid(args.orderItemId)) return { ok: false, error: "not_found" };
  const sql = getSql();

  const joined = (await sql`
    select oi.product_url, c.full_name, pr.id as existing_review_id
    from order_items oi
    join orders o on o.id = oi.order_id
    left join customers c on c.id = o.customer_id
    left join product_reviews pr on pr.order_item_id = oi.id
    where oi.id = ${args.orderItemId}
    limit 1
  `) as Array<{ product_url: string | null; full_name: string | null; existing_review_id: string | null }>;
  const row = joined[0];

  if (!row || !row.product_url) return { ok: false, error: "not_found" };
  if (row.existing_review_id) return { ok: false, error: "already_reviewed" };

  const reviewerName = formatReviewerName(row.full_name);
  try {
    const inserted = (await sql`
      insert into product_reviews (order_item_id, product_url, rating, review_text, reviewer_name)
      values (${args.orderItemId}, ${row.product_url}, ${args.rating}, ${args.reviewText}, ${reviewerName})
      returning id, order_item_id, product_url, rating, review_text, reviewer_name, hidden, created_at
    `) as ProductReviewRow[];
    return { ok: true, review: inserted[0] };
  } catch (err) {
    // Race-condition fallback: the unique(order_item_id) constraint is the real guard,
    // the existing_review_id check above just avoids hitting it in the common case.
    if (err instanceof Error && /duplicate key/i.test(err.message)) {
      return { ok: false, error: "already_reviewed" };
    }
    throw err;
  }
}

export async function getProductReviews(productUrl: string): Promise<ProductReviewRow[]> {
  const sql = getSql();
  return (await sql`
    select id, order_item_id, product_url, rating, review_text, reviewer_name, hidden, created_at
    from product_reviews
    where product_url = ${productUrl} and hidden = false
    order by created_at desc
  `) as ProductReviewRow[];
}

export async function getProductRatingSummary(productUrl: string): Promise<RatingSummary | null> {
  const sql = getSql();
  const rows = (await sql`
    select round(avg(rating)::numeric, 1)::float8 as rating_value, count(*)::int as review_count
    from product_reviews
    where product_url = ${productUrl} and hidden = false
  `) as Array<{ rating_value: number | null; review_count: number }>;
  const row = rows[0];
  if (!row || row.review_count === 0) return null;
  return { ratingValue: row.rating_value ?? 0, reviewCount: row.review_count };
}

export async function getAllReviewsForAdmin(): Promise<AdminReviewRow[]> {
  const sql = getSql();
  return (await sql`
    select pr.id, pr.order_item_id, pr.product_url, pr.rating, pr.review_text, pr.reviewer_name,
           pr.hidden, pr.created_at, oi.product_name, oi.product_brand
    from product_reviews pr
    join order_items oi on oi.id = pr.order_item_id
    order by pr.created_at desc
  `) as AdminReviewRow[];
}

export async function setReviewHidden(id: string, hidden: boolean): Promise<ProductReviewRow | null> {
  const sql = getSql();
  const rows = (await sql`
    update product_reviews set hidden = ${hidden} where id = ${id}
    returning id, order_item_id, product_url, rating, review_text, reviewer_name, hidden, created_at
  `) as ProductReviewRow[];
  return rows[0] ?? null;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/reviews.ts
git commit -m "Add reviews data access layer"
```

---

### Task 3: Append review links to the delivered-order WhatsApp message

**Files:**
- Modify: `app/api/orders/[id]/route.ts`

**Interfaces:**
- Consumes: nothing new from earlier tasks (only reads `order_items.id`, which already exists).
- Produces: nothing consumed by later tasks — this is a leaf change.

- [ ] **Step 1: Add the `SITE_URL` constant**

In `app/api/orders/[id]/route.ts`, after the existing imports (before `export const runtime = "nodejs";`), add:

```ts
const SITE_URL = "https://www.seasonsbyb.co.uk";
```

- [ ] **Step 2: Fetch the order's line items and build review links before sending notifications**

Find this block (around line 90, right before the `try {` that sends notifications):

```ts
  const row = joined[0];
  const firstName = (row?.full_name || "there").split(" ")[0];

  try {
```

Replace it with:

```ts
  const row = joined[0];
  const firstName = (row?.full_name || "there").split(" ")[0];

  const orderItems = (await sql`select id from order_items where order_id = ${id}`) as Array<{ id: string }>;
  const reviewLinks = orderItems.map((it) => `${SITE_URL}/review/${it.id}`).join("\n");

  try {
```

- [ ] **Step 3: Append the review links to the delivered WhatsApp message**

Find:

```ts
      } else if (nextStatus === "delivered") {
        await sendWhatsAppText(
          row.phone,
          `Your Seasons by B order ${row.order_number} has arrived! 🐝 We hope you love it. Please let us know if you need anything.`
        );
      }
```

Replace with:

```ts
      } else if (nextStatus === "delivered") {
        const reviewPrompt = reviewLinks
          ? `\n\nLoved it (or didn't)? Leave a quick review:\n${reviewLinks}`
          : "";
        await sendWhatsAppText(
          row.phone,
          `Your Seasons by B order ${row.order_number} has arrived! 🐝 We hope you love it. Please let us know if you need anything.${reviewPrompt}`
        );
      }
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "app/api/orders/[id]/route.ts"
git commit -m "Append per-item review links to the delivered-order WhatsApp message"
```

---

### Task 4: Public review submission page + API route

**Files:**
- Create: `app/review/[orderItemId]/page.tsx`
- Create: `app/review/[orderItemId]/ReviewForm.tsx`
- Create: `app/api/reviews/route.ts`

**Interfaces:**
- Consumes: `getOrderItemForReview`, `submitReview` from `lib/reviews.ts` (Task 2).
- Produces: nothing consumed by later tasks — this is the customer-facing leaf.

- [ ] **Step 1: Create the review form (client component)**

Create `app/review/[orderItemId]/ReviewForm.tsx`:

```tsx
"use client";

import { useState } from "react";

export default function ReviewForm({ orderItemId }: { orderItemId: string }) {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    if (rating < 1) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderItemId, rating, reviewText: reviewText.trim() || null })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(
          data.error === "already_reviewed"
            ? "You've already reviewed this item."
            : "Something went wrong — please try again."
        );
        setSubmitting(false);
        return;
      }
      setDone(true);
    } catch {
      setError("Something went wrong — please try again.");
      setSubmitting(false);
    }
  }

  if (done) {
    return <p className="mt-8 text-sm text-ink/70">Thank you for your review!</p>;
  }

  return (
    <div className="mt-8">
      <div className="flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => setRating(n)}
            className={"text-3xl leading-none " + (n <= rating ? "text-gold" : "text-ink/20")}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={reviewText}
        onChange={(e) => setReviewText(e.target.value)}
        placeholder="Tell us what you thought (optional)"
        rows={4}
        className="mt-4 w-full border border-ink/15 bg-cream p-3 text-sm"
      />
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      <button
        type="button"
        disabled={rating < 1 || submitting}
        onClick={submit}
        className="btn-gold mt-4 w-fit disabled:opacity-40"
      >
        {submitting ? "Submitting…" : "Submit review"}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create the review page (server component)**

Create `app/review/[orderItemId]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { getOrderItemForReview } from "@/lib/reviews";
import ReviewForm from "./ReviewForm";

export const dynamic = "force-dynamic";

interface Params {
  orderItemId: string;
}

export default async function ReviewPage({ params }: { params: Params }) {
  const item = await getOrderItemForReview(params.orderItemId);
  if (!item) notFound();

  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="text-[11px] uppercase tracking-[0.32em] text-accent">Your review</p>
      <h1 className="mt-3 font-serif text-3xl text-ink">
        {item.product_brand} {item.product_name}
      </h1>
      {item.image_url ? (
        <img
          src={item.image_url}
          alt={`${item.product_brand} ${item.product_name}`}
          className="mt-6 h-48 w-48 object-cover"
        />
      ) : null}
      {item.already_reviewed ? (
        <p className="mt-8 text-sm text-ink/70">You&apos;ve already reviewed this item — thank you!</p>
      ) : (
        <ReviewForm orderItemId={item.id} />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create the submission API route**

Create `app/api/reviews/route.ts`:

```ts
import { NextResponse } from "next/server";
import { ensureSchema } from "@/lib/db";
import { submitReview } from "@/lib/reviews";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  orderItemId?: string;
  rating?: number;
  reviewText?: string | null;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const orderItemId = typeof body.orderItemId === "string" ? body.orderItemId : "";
  const rating = Number(body.rating);
  const reviewText = typeof body.reviewText === "string" && body.reviewText.trim() ? body.reviewText.trim() : null;

  if (!orderItemId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ ok: false, error: "invalid_rating" }, { status: 400 });
  }

  await ensureSchema();
  const result = await submitReview({ orderItemId, rating, reviewText });
  if (!result.ok) {
    const status = result.error === "not_found" ? 404 : 409;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification against the dev server**

Run: `npm run dev` (in background)
Find a real `order_items.id` from your dev database (e.g. via `npx ts-node scripts/check-product-reviews-schema.ts` won't show one — instead query `select id from order_items limit 1;` through your usual DB console, or use any existing order's item id).
Visit `http://localhost:3000/review/<that-id>` in a browser.
Expected: the product name/image render, star picker works, submitting with 4 stars and a comment shows "Thank you for your review!", and revisiting the same URL now shows "You've already reviewed this item — thank you!".

- [ ] **Step 6: Commit**

```bash
git add "app/review" "app/api/reviews"
git commit -m "Add public review submission page and API route"
```

---

### Task 5: Product page — surface reviews in JSON-LD and UI

**Files:**
- Modify: `app/product/[id]/page.tsx`

**Interfaces:**
- Consumes: `getProductReviews`, `getProductRatingSummary` from `lib/reviews.ts` (Task 2).

- [ ] **Step 1: Fetch reviews and rating summary**

In `app/product/[id]/page.tsx`, add to the imports:

```ts
import { getProductReviews, getProductRatingSummary } from "@/lib/reviews";
```

Find the end of the `promoGift` lookup block (existing code — the closing brace of the `if (product.product_url === SUMMER_SET_URL) { ... }` block, immediately followed by the blank line before `const jsonLd = {`):

```ts
      promoGift = rows[0] ?? null;
    } catch { /* non-fatal */ }
  }

  const jsonLd = {
```

Insert the reviews fetch between them:

```ts
      promoGift = rows[0] ?? null;
    } catch { /* non-fatal */ }
  }

  const [reviews, ratingSummary] = product.product_url
    ? await Promise.all([getProductReviews(product.product_url), getProductRatingSummary(product.product_url)])
    : [[], null];

  const jsonLd = {
```

- [ ] **Step 2: Add `aggregateRating`/`review` to the JSON-LD**

Find this line inside the `jsonLd` object literal:

```ts
    image: ogImage(product.image_url),
    offers: {
```

Replace with:

```ts
    image: ogImage(product.image_url),
    ...(ratingSummary
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: ratingSummary.ratingValue.toFixed(1),
            reviewCount: ratingSummary.reviewCount
          }
        }
      : {}),
    ...(reviews.length > 0
      ? {
          review: reviews.slice(0, 5).map((r) => ({
            "@type": "Review",
            reviewRating: { "@type": "Rating", ratingValue: r.rating },
            author: { "@type": "Person", name: r.reviewer_name },
            ...(r.review_text ? { reviewBody: r.review_text } : {}),
            datePublished: r.created_at
          }))
        }
      : {}),
    offers: {
```

- [ ] **Step 3: Render a reviews section on the page**

Find this block (existing code, right after the `ProductDetailClient` render, before the `{related.length > 0 ? (` section):

```tsx
      <div className="mt-8">
        <ProductDetailClient product={product} promoGift={promoGift} />
      </div>

      {related.length > 0 ? (
```

Replace with:

```tsx
      <div className="mt-8">
        <ProductDetailClient product={product} promoGift={promoGift} />
      </div>

      <section className="mt-16 border-t border-ink/10 pt-10">
        <h2 className="font-serif text-2xl text-ink">Reviews</h2>
        {ratingSummary ? (
          <p className="mt-2 text-sm text-ink/70">
            <span className="text-gold">{"★".repeat(Math.round(ratingSummary.ratingValue))}</span>{" "}
            {ratingSummary.ratingValue.toFixed(1)} out of 5 (
            {ratingSummary.reviewCount} review{ratingSummary.reviewCount === 1 ? "" : "s"})
          </p>
        ) : (
          <p className="mt-2 text-sm text-ink/60">No reviews yet.</p>
        )}
        {reviews.length > 0 ? (
          <div className="mt-6 space-y-6">
            {reviews.map((r) => (
              <div key={r.id} className="border-t border-ink/10 pt-6 first:border-t-0 first:pt-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-ink">{r.reviewer_name}</p>
                  <span className="text-sm text-gold">
                    {"★".repeat(r.rating)}
                    {"☆".repeat(5 - r.rating)}
                  </span>
                </div>
                {r.review_text ? <p className="mt-2 text-sm text-ink/70">{r.review_text}</p> : null}
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {related.length > 0 ? (
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification**

With `npm run dev` running, visit the product page for the item you reviewed in Task 4, Step 5.
Expected: the Reviews section shows "4.0 out of 5 (1 review)" and your comment; view-source (or the browser's "Inspect" on the `<script type="application/ld+json">` tags) shows `aggregateRating` and `review` populated on the `Product` object, as siblings of `offers`.

- [ ] **Step 6: Commit**

```bash
git add "app/product/[id]/page.tsx"
git commit -m "Surface real product reviews in JSON-LD and on the product page"
```

---

### Task 6: Admin Reviews tab

**Files:**
- Create: `components/AdminReviewsTab.tsx`
- Create: `app/api/admin/reviews/[id]/route.ts`
- Modify: `app/admin/page.tsx`
- Modify: `app/admin/AdminDashboard.tsx`

**Interfaces:**
- Consumes: `getAllReviewsForAdmin`, `setReviewHidden`, `AdminReviewRow` from `lib/reviews.ts` (Task 2).

- [ ] **Step 1: Create the hide/unhide API route**

Create `app/api/admin/reviews/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { ensureSchema } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { setReviewHidden } from "@/lib/reviews";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  hidden?: boolean;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Body;
  if (typeof body.hidden !== "boolean") {
    return NextResponse.json({ error: "Missing hidden field" }, { status: 400 });
  }
  await ensureSchema();
  const review = await setReviewHidden(params.id, body.hidden);
  if (!review) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ review });
}
```

- [ ] **Step 2: Create the admin Reviews tab component**

Create `components/AdminReviewsTab.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { AdminReviewRow } from "@/lib/reviews";

interface Props {
  reviews: AdminReviewRow[];
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminReviewsTab({ reviews: initialReviews }: Props) {
  const [reviews, setReviews] = useState(initialReviews);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function toggleHidden(id: string, hidden: boolean) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidden })
      });
      if (res.ok) {
        const data = await res.json();
        setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, hidden: data.review.hidden } : r)));
      }
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <section className="mt-8 overflow-x-auto border border-ink/10">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-ink/10 bg-ink/[0.02] text-left text-[10px] uppercase tracking-[0.18em] text-ink/60">
            <th className="px-4 py-3">Product</th>
            <th className="px-4 py-3">Rating</th>
            <th className="px-4 py-3">Review</th>
            <th className="px-4 py-3">Reviewer</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {reviews.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-12 text-center text-sm text-ink/50">
                No reviews yet.
              </td>
            </tr>
          ) : (
            reviews.map((r) => (
              <tr key={r.id} className="border-b border-ink/10 align-top">
                <td className="px-4 py-3 text-sm text-ink">
                  {r.product_brand} {r.product_name}
                </td>
                <td className="px-4 py-3 text-sm text-gold">
                  {"★".repeat(r.rating)}
                  {"☆".repeat(5 - r.rating)}
                </td>
                <td className="max-w-sm px-4 py-3 text-sm text-ink/70">{r.review_text ?? "—"}</td>
                <td className="px-4 py-3 text-sm text-ink/70">{r.reviewer_name}</td>
                <td className="px-4 py-3 text-sm text-ink/70">{fmtDate(r.created_at)}</td>
                <td className="px-4 py-3 text-sm">{r.hidden ? "Hidden" : "Published"}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={updatingId === r.id}
                    onClick={() => toggleHidden(r.id, !r.hidden)}
                    className="text-xs uppercase tracking-[0.16em] text-accent hover:underline disabled:opacity-40"
                  >
                    {r.hidden ? "Unhide" : "Hide"}
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
```

- [ ] **Step 3: Fetch reviews in the admin page**

In `app/admin/page.tsx`, add to the imports:

```ts
import { getAllReviewsForAdmin } from "@/lib/reviews";
```

Find:

```ts
  const stockItems = (await sql`
    select id, product_id, product_name, product_brand, product_url, image_url,
           cost_gbp, cost_usd, quantity, notes, purchased_at::text, created_at
    from stock_items
    order by created_at desc
  `) as StockItemRow[];

  return <AdminDashboard initialOrders={rows} initialBespoke={bespoke} initialExpenses={expenses} initialStock={stockItems} />;
```

Replace with:

```ts
  const stockItems = (await sql`
    select id, product_id, product_name, product_brand, product_url, image_url,
           cost_gbp, cost_usd, quantity, notes, purchased_at::text, created_at
    from stock_items
    order by created_at desc
  `) as StockItemRow[];

  const reviews = await getAllReviewsForAdmin();

  return (
    <AdminDashboard
      initialOrders={rows}
      initialBespoke={bespoke}
      initialExpenses={expenses}
      initialStock={stockItems}
      initialReviews={reviews}
    />
  );
```

- [ ] **Step 4: Wire the Reviews tab into `AdminDashboard`**

In `app/admin/AdminDashboard.tsx`, update the imports:

```ts
import AdminClientsTab from "@/components/AdminClientsTab";
```

Add directly after it:

```ts
import AdminReviewsTab from "@/components/AdminReviewsTab";
import type { AdminReviewRow } from "@/lib/reviews";
```

Update the `Props` interface:

```ts
interface Props {
  initialOrders: OrderWithCustomer[];
  initialBespoke?: BespokeRequestRow[];
  initialExpenses?: ExpenseRow[];
  initialStock?: StockItemRow[];
  initialReviews?: AdminReviewRow[];
}
```

Update the `Tab` union:

```ts
type Tab = "orders" | "awaiting" | "bespoke" | "accounting" | "stock" | "clients" | "reviews";
```

Update the function signature:

```ts
export default function AdminDashboard({
  initialOrders,
  initialBespoke = [],
  initialExpenses = [],
  initialStock = [],
  initialReviews = []
}: Props) {
```

Add the tab button — find:

```tsx
        <TabButton active={tab === "clients"} onClick={() => setTab("clients")} label={`Clients (${clientCount})`} />
      </div>
```

Replace with:

```tsx
        <TabButton active={tab === "clients"} onClick={() => setTab("clients")} label={`Clients (${clientCount})`} />
        <TabButton
          active={tab === "reviews"}
          onClick={() => setTab("reviews")}
          label={`Reviews (${initialReviews.length})`}
        />
      </div>
```

Add the tab panel — find:

```tsx
      {tab === "clients" ? (
        <AdminClientsTab orders={orders} />
      ) : tab === "accounting" ? (
```

Replace with:

```tsx
      {tab === "clients" ? (
        <AdminClientsTab orders={orders} />
      ) : tab === "reviews" ? (
        <AdminReviewsTab reviews={initialReviews} />
      ) : tab === "accounting" ? (
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Manual verification**

With `npm run dev` running, log in to `/admin`, click the new "Reviews" tab.
Expected: the review submitted in Task 4, Step 5 is listed with its product, star rating, comment, reviewer name, date, and "Published" status. Click "Hide" — status flips to "Hidden" and the button now reads "Unhide". Revisit the product page from Task 5 — the review and the `aggregateRating`/`review` JSON-LD should now be gone (0 reviews). Click "Unhide" and confirm it reappears.

- [ ] **Step 7: Commit**

```bash
git add components/AdminReviewsTab.tsx "app/api/admin/reviews" app/admin/page.tsx app/admin/AdminDashboard.tsx
git commit -m "Add admin Reviews tab with hide/unhide moderation"
```

---

### Task 7: End-to-end verification and deploy

**Files:** none (verification only)

- [ ] **Step 1: Full manual walkthrough on a real (test) order**

With `npm run dev` running and logged into `/admin`:
1. Open (or create via "Add Manual Order") a test order with a real phone number you control, with `payment_confirmed = true`.
2. Progress its status through to `delivered` via the admin order row controls.
3. Confirm the WhatsApp message received includes the "Loved it (or didn't)?" line with one `https://www.seasonsbyb.co.uk/review/<uuid>` link per item (note: in local dev this link will point at `www.seasonsbyb.co.uk`, not `localhost` — copy the path and test against your local server instead, e.g. `http://localhost:3000/review/<uuid>`).
4. Follow the link, submit a rating, confirm success and that revisiting shows "already reviewed".
5. Confirm the product page shows the review and correct `aggregateRating`/`review` JSON-LD (view-source).
6. Confirm the admin Reviews tab lists it, and hide/unhide both work as described in Task 6, Step 6.

- [ ] **Step 2: Push and open a PR**

```bash
git push -u origin claude/product-reviews
gh pr create --title "Add verified-purchase product reviews" --body "$(cat <<'EOF'
## Summary
- Fixes Search Console's "Product snippets" warning (missing aggregateRating/review) with real review data instead of fabricated ratings.
- Delivered orders get a per-item review link via the existing WhatsApp notification; customers rate 1-5 stars with an optional comment, auto-published immediately.
- Product pages surface aggregateRating/review in JSON-LD only once real reviews exist; a new admin Reviews tab lets you hide anything that shouldn't be public.

## Test plan
- [x] `npx tsc --noEmit` passes after every task
- [x] Manual end-to-end walkthrough (order -> delivered -> WhatsApp link -> review submission -> product page -> admin hide/unhide)
- [ ] After deploy, spot-check a reviewed product URL in Google's Rich Results Test

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: After merge, confirm the Vercel production deploy succeeds**

Follow the same pattern used for the merchant-schema-fix PR: check `mcp__plugin_vercel_vercel__list_deployments` for the new merge commit's deployment and confirm `state: "READY"` with the `seasonsbyb.co.uk` alias attached.
