# Product reviews — design

## Why

Google Search Console flagged "Product snippets" structured data issues on seasonsbyb.co.uk: the `Product` JSON-LD emitted by `app/product/[id]/page.tsx` is missing `aggregateRating` and `review`. There is no review or rating data anywhere in the app today (`lib/db.ts` has no reviews table), and fabricating ratings to silence the warning would risk a Google spam manual action. This spec adds a real, verified-purchase review system so those fields can be populated honestly, only once genuine reviews exist.

## Flow

1. Admin marks an order `delivered` in the admin dashboard, which already `PATCH`es `app/api/orders/[id]/route.ts` and (in the `nextStatus === "delivered"` branch, around line 117) sends a WhatsApp "your order has arrived" message via `sendWhatsAppText`.
2. That branch is extended to also fetch the order's line items and append one review link per item to the WhatsApp message: `https://www.seasonsbyb.co.uk/review/<order_item_id>`. The `order_item_id` (a `gen_random_uuid()` primary key on `order_items`) doubles as an unguessable access token — no separate token table or column needed.
3. Customer opens the link. `/review/[orderItemId]` (new route) looks up the order item (no login required), shows the product name/image, a 1–5 star picker (required), and an optional free-text comment box.
4. On submit, a new API route inserts a row into `product_reviews`. Publication is immediate — no moderation queue. A `unique(order_item_id)` constraint means the link can only be used once; revisiting it after submission shows an "already reviewed" state instead of the form.
5. The product page query layer picks up any non-hidden reviews for that product (matched by `product_url`) and, only when at least one exists, adds `aggregateRating` and `review` to the page's JSON-LD.
6. A new "Reviews" tab in the admin dashboard lists every review across all products with a hide/unhide toggle, as a post-hoc safety valve (not a pre-publish gate) in case something abusive or clearly fake slips through.

## Data model

New table, added to the `SCHEMA_STATEMENTS` array in `lib/db.ts` (the existing idempotent migration pattern — `create table if not exists` / `alter table ... add column if not exists`, run via `ensureSchema()`):

```sql
create table if not exists product_reviews (
  id uuid default gen_random_uuid() primary key,
  order_item_id uuid not null references order_items(id) on delete cascade,
  product_url text not null,
  rating int not null check (rating between 1 and 5),
  review_text text,
  reviewer_name text not null,
  hidden boolean default false,
  created_at timestamp default now(),
  unique (order_item_id)
);
create index if not exists product_reviews_product_url_idx on product_reviews (product_url);
```

Notes:
- `product_url` (not a `product_id` FK) is the join key to `products.product_url`, matching the existing denormalization pattern already used by `order_items.product_url` elsewhere in the codebase (e.g. the `promoGift` lookup in `app/product/[id]/page.tsx`). `products.product_url` is unique.
- `reviewer_name` is derived server-side at submission time from `customers.full_name` (joined via `orders.customer_id`), formatted as first name + last initial (e.g. "Sarah K.") — the same privacy-preserving pattern already used for the WhatsApp first-name greeting in `app/api/orders/[id]/route.ts`. It is not user-editable.
- If a product's `product_url` is ever null (rare — the column is nullable on `products`), that product simply cannot accumulate reviews; acceptable edge case.
- `hidden` defaults to `false` (auto-published). Setting it `true` removes the review from both the product-page display and the aggregate/JSON-LD computation, without deleting the row.

## New/changed files

- **`lib/db.ts`** — add the `product_reviews` table + index to `SCHEMA_STATEMENTS`.
- **`lib/reviews.ts`** (new) — data access layer:
  - `getOrderItemForReview(orderItemId)` — fetches product name/image/brand + whether already reviewed, for the review form page. Returns `null` if the order item doesn't exist.
  - `submitReview({ orderItemId, rating, reviewText })` — resolves `product_url` and `reviewer_name` server-side from the order/customer join, inserts the row. Returns a typed error (not a thrown exception) on duplicate submission so the route can render a friendly message.
  - `getProductReviews(productUrl)` — non-hidden reviews for a product, newest first.
  - `getProductRatingSummary(productUrl)` — `{ ratingValue: number, reviewCount: number } | null` (null when `reviewCount === 0`), computed with a `round(avg(rating)::numeric, 1)` query filtered to non-hidden rows.
  - `getAllReviewsForAdmin()` / `setReviewHidden(id, hidden)` — for the admin tab.
- **`app/review/[orderItemId]/page.tsx`** (new) — server component rendering the form or an "already reviewed" / "not found" state.
- **`app/review/[orderItemId]/ReviewForm.tsx`** (new) — client component: star picker + textarea + submit button, posts to the API route.
- **`app/api/reviews/route.ts`** (new) — `POST` handler calling `submitReview`; public (no `isAdmin()` check — this is the customer-facing endpoint), but scoped entirely by the unguessable `order_item_id` and blocked from resubmission by the unique constraint.
- **`app/api/orders/[id]/route.ts`** — extend the `nextStatus === "delivered"` branch: fetch `order_items` for the order, build one review link per item, append to the existing WhatsApp text.
- **`app/product/[id]/page.tsx`** — call `getProductReviews` + `getProductRatingSummary`; conditionally add `aggregateRating`/`review` to `jsonLd.offers`'s parent `Product` object (not inside `offers` — per schema.org, `aggregateRating` and `review` belong on `Product`, not `Offer`); render a new reviews section in the page body (stars, reviewer name, comment, date).
- **`app/admin/AdminDashboard.tsx`** — add `"reviews"` to the `Tab` union and a `TabButton`; new tab panel listing all reviews with hide/unhide.
- **`app/api/admin/reviews/[id]/route.ts`** (new) — `PATCH` to toggle `hidden`, gated by `isAdmin()`.

## JSON-LD shape

Added to the existing `Product` object in `app/product/[id]/page.tsx` (sibling to `offers`, not nested in it):

```js
...(ratingSummary ? {
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: ratingSummary.ratingValue.toFixed(1),
    reviewCount: ratingSummary.reviewCount,
  },
} : {}),
...(reviews.length > 0 ? {
  review: reviews.slice(0, 5).map((r) => ({
    "@type": "Review",
    reviewRating: { "@type": "Rating", ratingValue: r.rating },
    author: { "@type": "Person", name: r.reviewer_name },
    ...(r.review_text ? { reviewBody: r.review_text } : {}),
    datePublished: r.created_at,
  })),
} : {}),
```

Capped at 5 most-recent individual `Review` entries in the markup (a reasonable page-weight limit); `aggregateRating` always reflects the true full count, not just the capped sample.

## Error handling

- Visiting `/review/[orderItemId]` with a bogus/nonexistent id: standard 404 (`notFound()`), same as the existing product page pattern.
- Visiting a link for an item already reviewed: render an "already reviewed — thank you!" message instead of the form (checked via `getOrderItemForReview`, not by attempting the insert and catching the constraint violation).
- Race condition (two submits for the same item near-simultaneously): the `unique(order_item_id)` constraint is the actual guard; `submitReview` catches the constraint-violation error and returns the same typed "already reviewed" result.
- Rating outside 1–5 or missing: rejected client-side (disabled submit button until a star is picked) and server-side (`check` constraint + explicit validation in the route before insert).

## Testing

- Unit-style check on `lib/reviews.ts`'s rating-summary rounding (e.g. average of 4 and 5 → `4.5`, count `2`).
- Manual verification (per project convention — this app has no existing automated test suite): mark a real test order delivered in a dev/staging DB, follow the generated link, submit a review, confirm it appears on the product page and in the page's JSON-LD via view-source, confirm resubmission is blocked, confirm the admin hide toggle removes it from both the page and the JSON-LD.
- After deploy, spot-check a reviewed product URL in Google's Rich Results Test.

## Out of scope

- No email version of the review-request link (WhatsApp only, matching the existing delivered-notification channel).
- No photo uploads on reviews.
- No editing/deleting a review once submitted (customer side) — only the admin hide toggle.
- No star-rating breakdown UI (5-star: n, 4-star: n, …) on the product page — just average + list.
