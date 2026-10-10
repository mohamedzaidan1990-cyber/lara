import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSql } from "@/lib/db";
import { getCurrentAccount } from "@/lib/account";
import { getLedger, getLoyaltySettings, getPointsSummary, getRedemptions, getRewards, syncPoints } from "@/lib/loyalty";
import AccountClient, { type AccountOrder } from "./AccountClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Account — Seasons by B",
  robots: { index: false }
};

export default async function AccountPage() {
  const account = await getCurrentAccount().catch(() => null);
  if (!account) redirect("/account/login");

  await syncPoints(account.phone);
  const sql = getSql();
  const [orders, summary, ledger, rewards, redemptions, settings] = await Promise.all([
    sql`
      select o.order_number, o.status, o.created_at, o.delivered_at, o.payment_confirmed,
             coalesce(o.total_usd, o.price_usd) as total_usd, o.amount_paid_usd,
             coalesce((
               select json_agg(json_build_object(
                 'brand', oi.product_brand, 'name', oi.product_name, 'quantity', oi.quantity,
                 'price_usd', oi.price_usd, 'image_url', oi.image_url
               ) order by oi.price_usd desc)
               from order_items oi where oi.order_id = o.id
             ), '[]') as items,
             (select l.points from points_ledger l where l.order_id = o.id and l.kind in ('earn', 'backfill') limit 1) as points
      from orders o join customers c on c.id = o.customer_id
      where c.phone_norm = ${account.phone}
      order by o.created_at desc
    ` as unknown as Promise<AccountOrder[]>,
    getPointsSummary(account.phone),
    getLedger(account.phone),
    getRewards(true),
    getRedemptions(account.phone),
    getLoyaltySettings()
  ]);

  return (
    <AccountClient
      name={account.full_name}
      phone={account.phone}
      orders={orders}
      summary={summary}
      ledger={ledger}
      rewards={rewards}
      redemptions={redemptions}
      pointsPerUsd={settings.points_per_usd}
      expiryDays={settings.expiry_days}
    />
  );
}
