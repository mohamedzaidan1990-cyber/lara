import { NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { grantPoints } from "@/lib/loyalty";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GBP_PER_USD = 1 / 1.35;

// action "fulfil": marks the redemption done. With an order number, the reward
//   is also added to that order as a line — the free item at $0, or a negative
//   "Reward" discount line (same pattern as "Loyalty Discount") — and the
//   order totals are recomputed.
// action "cancel": returns the points to the client (as fresh points).
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { action?: string; order_number?: string; note?: string };

  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`
    select r.id, r.phone, r.status, r.reward_title, r.points_cost, r.product_id,
           w.reward_type, w.discount_usd,
           p.brand, p.name, p.product_url, p.image_url, p.price_usd as product_price_usd
    from redemptions r
    left join rewards w on w.id = r.reward_id
    left join products p on p.id = r.product_id
    where r.id = ${params.id}
  `) as Array<{
    id: string; phone: string; status: string; reward_title: string; points_cost: number; product_id: string | null;
    reward_type: string | null; discount_usd: string | null;
    brand: string | null; name: string | null; product_url: string | null; image_url: string | null; product_price_usd: string | null;
  }>;
  const r = rows[0];
  if (!r) return NextResponse.json({ error: "Redemption not found" }, { status: 404 });
  if (r.status !== "requested") return NextResponse.json({ error: `Already ${r.status}.` }, { status: 409 });
  const note = String(body.note ?? "").trim() || null;

  if (body.action === "cancel") {
    const updated = (await sql`
      update redemptions set status = 'cancelled', resolved_at = now(), note = coalesce(${note}::text, note)
      where id = ${r.id} and status = 'requested' returning id
    `) as unknown[];
    if (updated.length) await grantPoints(r.phone, r.points_cost, "refund", `Returned: ${r.reward_title}`, r.id);
    return NextResponse.json({ ok: true });
  }

  if (body.action !== "fulfil") return NextResponse.json({ error: "Unknown action" }, { status: 400 });

  let orderId: string | null = null;
  const orderNumber = String(body.order_number ?? "").trim().toUpperCase();
  if (orderNumber) {
    const orders = (await sql`
      select o.id from orders o join customers c on c.id = o.customer_id
      where upper(o.order_number) = ${orderNumber} and c.phone_norm = ${r.phone}
    `) as Array<{ id: string }>;
    if (!orders.length) {
      return NextResponse.json({ error: `${orderNumber} isn't an order for this client's phone number.` }, { status: 400 });
    }
    orderId = orders[0].id;
    const label = `Reward — ${r.reward_title} (${r.points_cost} pts)`;
    if (r.reward_type === "discount") {
      const usd = -Math.abs(Number(r.discount_usd) || 0);
      await sql`
        insert into order_items (order_id, product_name, product_brand, price_usd, price_gbp, quantity, cost_usd, cost_gbp, sourced, in_lebanon)
        values (${orderId}, ${r.name ? `${label} — on ${r.brand} ${r.name}` : label}, 'Seasons by B', ${usd},
                ${Math.round(usd * GBP_PER_USD * 100) / 100}, 1, 0, 0, true, true)
      `;
    } else {
      // Free item: $0 line; cost is filled in when it's bought, like any item.
      await sql`
        insert into order_items (order_id, product_name, product_brand, product_url, image_url, price_usd, price_gbp, quantity)
        values (${orderId}, ${`${r.name ?? r.reward_title} — ${label}`}, ${r.brand ?? "Seasons by B"}, ${r.product_url}, ${r.image_url}, 0, 0, 1)
      `;
    }
    await sql`
      update orders
      set total_usd   = (select coalesce(sum(price_usd * quantity), 0) from order_items where order_id = ${orderId}),
          total_gbp   = (select coalesce(sum(price_gbp * quantity), 0) from order_items where order_id = ${orderId}),
          items_count = (select count(*)::int from order_items where order_id = ${orderId}),
          updated_at  = now()
      where id = ${orderId}
    `;
  }

  await sql`
    update redemptions set status = 'fulfilled', resolved_at = now(), order_id = ${orderId}, note = coalesce(${note}::text, note)
    where id = ${r.id}
  `;
  return NextResponse.json({ ok: true });
}
