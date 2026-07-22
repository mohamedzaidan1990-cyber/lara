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
