import { getSql } from "@/lib/db";

// Loyalty points. Rules (decided Oct 2026):
// - Earned when an order is delivered, on the amount paid (capped at the order
//   total so delivery fees don't earn), at loyalty_settings.points_per_usd.
// - Orders delivered before loyalty_settings.launched_at earn the backfill
//   rate (1 point per $2), and those points count as earned at launch.
// - Every grant expires `expiry_days` (90) after it was earned. Spending uses
//   the soonest-expiring points first.
// - Points belong to a phone number (customers.phone_norm), not an account, so
//   they accrue for everyone and appear when the customer signs up.

export interface LoyaltySettings {
  launched_at: string;
  points_per_usd: number;
  backfill_points_per_usd: number;
  expiry_days: number;
}

export interface PointsSummary {
  balance: number;
  expiring_soon: number;
  next_expiry: string | null;
}

export interface LedgerEntry {
  id: string;
  kind: string;
  points: number;
  remaining: number;
  note: string | null;
  earned_at: string;
  expires_at: string | null;
  order_number: string | null;
}

export async function getLoyaltySettings(): Promise<LoyaltySettings> {
  const sql = getSql();
  const rows = (await sql`
    select launched_at, points_per_usd::float8 as points_per_usd,
           backfill_points_per_usd::float8 as backfill_points_per_usd, expiry_days
    from loyalty_settings where id = 1
  `) as LoyaltySettings[];
  return rows[0];
}

/**
 * Brings the ledger up to date with order statuses: grants points for
 * delivered orders that have none yet, and removes the unspent points of
 * orders that were later cancelled or refunded. Idempotent; pass a phone to
 * limit it to one customer.
 */
export async function syncPoints(phone: string | null = null): Promise<void> {
  const sql = getSql();
  await sql`
    insert into points_ledger (phone, kind, points, remaining, order_id, note, earned_at, expires_at)
    select c.phone_norm,
           case when b.is_backfill then 'backfill' else 'earn' end,
           p.pts, p.pts, o.id, 'Order ' || o.order_number,
           e.earned_at, e.earned_at + make_interval(days => s.expiry_days)
    from orders o
    join customers c on c.id = o.customer_id
    cross join loyalty_settings s
    cross join lateral (select coalesce(o.delivered_at, o.updated_at, o.created_at) < s.launched_at as is_backfill) b
    cross join lateral (
      select case when b.is_backfill then s.launched_at else coalesce(o.delivered_at, now()) end as earned_at
    ) e
    cross join lateral (
      select floor(
        greatest(least(coalesce(o.amount_paid_usd, o.total_usd, o.price_usd, 0), coalesce(o.total_usd, o.price_usd, 0)), 0)
        * case when b.is_backfill then s.backfill_points_per_usd else s.points_per_usd end
      )::int as pts
    ) p
    where o.status = 'delivered'
      and c.phone_norm is not null
      and p.pts > 0
      and (${phone}::text is null or c.phone_norm = ${phone}::text)
      and not exists (select 1 from points_ledger l where l.order_id = o.id and l.kind in ('earn', 'backfill'))
    on conflict do nothing
  `;
  await sql`
    with r as (
      select l.id, l.phone, l.order_id, l.remaining, o.order_number
      from points_ledger l join orders o on o.id = l.order_id
      where l.kind in ('earn', 'backfill')
        and o.status in ('cancelled', 'refunded')
        and (${phone}::text is null or l.phone = ${phone}::text)
        and not exists (select 1 from points_ledger x where x.order_id = l.order_id and x.kind = 'reverse')
    ),
    z as (update points_ledger set remaining = 0 where id in (select id from r) returning id)
    insert into points_ledger (phone, kind, points, remaining, order_id, note)
    select phone, 'reverse', -remaining, 0, order_id, 'Order ' || order_number || ' cancelled — unspent points removed' from r
    on conflict do nothing
  `;
}

export async function getPointsSummary(phone: string): Promise<PointsSummary> {
  const sql = getSql();
  const rows = (await sql`
    select coalesce(sum(remaining) filter (where remaining > 0 and expires_at > now()), 0)::int as balance,
           coalesce(sum(remaining) filter (where remaining > 0 and expires_at > now() and expires_at <= now() + interval '30 days'), 0)::int as expiring_soon,
           min(expires_at) filter (where remaining > 0 and expires_at > now()) as next_expiry
    from points_ledger where phone = ${phone}
  `) as PointsSummary[];
  return rows[0];
}

export async function getLedger(phone: string): Promise<LedgerEntry[]> {
  const sql = getSql();
  return (await sql`
    select l.id, l.kind, l.points, l.remaining, l.note, l.earned_at, l.expires_at, o.order_number
    from points_ledger l left join orders o on o.id = l.order_id
    where l.phone = ${phone}
    order by l.earned_at desc, l.created_at desc
  `) as LedgerEntry[];
}

/**
 * Spends `cost` points (soonest-expiring first) in one statement. When
 * `redemption` is given, also creates the redemption row. Returns null if the
 * balance is too low (nothing is changed in that case).
 */
export async function spendPoints(
  phone: string,
  cost: number,
  note: string,
  redemption?: { accountId: string | null; rewardId: string; rewardTitle: string; productId: string | null; productLabel: string | null }
): Promise<{ redemptionId: string | null } | null> {
  const sql = getSql();
  const rows = (await sql`
    with lots as (
      select id, remaining, expires_at, created_at from points_ledger
      where phone = ${phone} and remaining > 0 and expires_at > now()
      for update
    ),
    cum as (select id, remaining, sum(remaining) over (order by expires_at, created_at, id) as c from lots),
    total as (select coalesce(sum(remaining), 0)::int as t from lots),
    ok as (select t from total where t >= ${cost}::int),
    upd as (
      update points_ledger pl
      set remaining = case when cum.c <= ${cost}::int then 0 else (cum.c - ${cost}::int)::int end
      from cum, ok
      where pl.id = cum.id and cum.c - cum.remaining < ${cost}::int
      returning pl.id
    ),
    red as (
      insert into redemptions (phone, account_id, reward_id, reward_title, points_cost, product_id, product_label)
      select ${phone}, ${redemption?.accountId ?? null}::uuid, ${redemption?.rewardId ?? null}::uuid,
             ${redemption?.rewardTitle ?? ""}::text, ${cost}::int, ${redemption?.productId ?? null}::uuid, ${redemption?.productLabel ?? null}::text
      from ok where ${Boolean(redemption)}::boolean
      returning id
    ),
    led as (
      insert into points_ledger (phone, kind, points, remaining, redemption_id, note)
      select ${phone}, ${redemption ? "redeem" : "adjust"}::text, -${cost}::int, 0, (select id from red), ${note}::text
      from ok
      returning id
    )
    select (select count(*) from ok)::int as ok, (select id from red) as redemption_id, (select count(*) from upd)::int as lots
  `) as Array<{ ok: number; redemption_id: string | null }>;
  if (!rows[0]?.ok) return null;
  return { redemptionId: rows[0].redemption_id };
}

/** Grants fresh points (admin adjustment or a returned redemption). */
export async function grantPoints(phone: string, points: number, kind: "adjust" | "refund", note: string, redemptionId: string | null = null): Promise<void> {
  const sql = getSql();
  await sql`
    insert into points_ledger (phone, kind, points, remaining, redemption_id, note, earned_at, expires_at)
    select ${phone}, ${kind}::text, ${points}::int, ${points}::int, ${redemptionId}::uuid, ${note}::text, now(),
           now() + make_interval(days => expiry_days)
    from loyalty_settings where id = 1
  `;
}

// ----- Admin views -----

export interface LoyaltyCustomer {
  phone: string;
  name: string;
  orders: number;
  balance: number;
  has_account: boolean;
  created_by: string | null;
  last_login_at: string | null;
}

export interface RewardRow {
  id: string;
  title: string;
  description: string | null;
  points_cost: number;
  reward_type: "free_item" | "discount";
  discount_usd: string | number | null;
  active: boolean;
  sort_order: number;
  products: Array<{ id: string; brand: string; name: string; image_url: string | null; price_usd: string | number }>;
}

export interface RedemptionRow {
  id: string;
  phone: string;
  customer_name: string | null;
  reward_title: string;
  points_cost: number;
  product_label: string | null;
  status: "requested" | "fulfilled" | "cancelled";
  order_number: string | null;
  note: string | null;
  created_at: string;
  resolved_at: string | null;
}

export async function getLoyaltyCustomers(): Promise<LoyaltyCustomer[]> {
  const sql = getSql();
  return (await sql`
    with people as (
      select c.phone_norm as phone,
             (array_agg(c.full_name order by c.created_at desc))[1] as name,
             count(o.id)::int as orders
      from customers c left join orders o on o.customer_id = c.id
      where c.phone_norm is not null
      group by c.phone_norm
    ),
    pts as (
      select phone, coalesce(sum(remaining) filter (where remaining > 0 and expires_at > now()), 0)::int as balance
      from points_ledger group by phone
    )
    select coalesce(p.phone, a.phone) as phone,
           coalesce(a.full_name, p.name) as name,
           coalesce(p.orders, 0) as orders,
           coalesce(pts.balance, 0) as balance,
           a.id is not null as has_account,
           a.created_by,
           a.last_login_at
    from people p
    full join accounts a on a.phone = p.phone
    left join pts on pts.phone = coalesce(p.phone, a.phone)
    order by coalesce(pts.balance, 0) desc, name
  `) as LoyaltyCustomer[];
}

export async function getRewards(activeOnly = false): Promise<RewardRow[]> {
  const sql = getSql();
  return (await sql`
    select r.id, r.title, r.description, r.points_cost, r.reward_type, r.discount_usd, r.active, r.sort_order,
           coalesce((
             select json_agg(json_build_object('id', p.id, 'brand', p.brand, 'name', p.name, 'image_url', p.image_url, 'price_usd', p.price_usd) order by p.brand, p.name)
             from reward_products rp join products p on p.id = rp.product_id where rp.reward_id = r.id
           ), '[]') as products
    from rewards r
    where (not ${activeOnly}::boolean or r.active)
    order by r.sort_order, r.points_cost
  `) as RewardRow[];
}

export async function getRedemptions(phone: string | null = null): Promise<RedemptionRow[]> {
  const sql = getSql();
  return (await sql`
    select r.id, r.phone, coalesce(a.full_name, (select c.full_name from customers c where c.phone_norm = r.phone order by c.created_at desc limit 1)) as customer_name,
           r.reward_title, r.points_cost, r.product_label, r.status, o.order_number, r.note, r.created_at, r.resolved_at
    from redemptions r
    left join accounts a on a.id = r.account_id
    left join orders o on o.id = r.order_id
    where (${phone}::text is null or r.phone = ${phone}::text)
    order by (r.status = 'requested') desc, r.created_at desc
  `) as RedemptionRow[];
}
