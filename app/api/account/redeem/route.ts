import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { getCurrentAccount } from "@/lib/account";
import { spendPoints, syncPoints } from "@/lib/loyalty";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f-]{36}$/i;

// Redeeming takes the points straight away and creates a "requested"
// redemption; the team then adds the reward to the customer's next order (or
// cancels it, which returns the points).
export async function POST(req: Request) {
  const account = await getCurrentAccount();
  if (!account) return NextResponse.json({ error: "Please log in." }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { reward_id?: string; product_id?: string };
  if (!UUID_RE.test(String(body.reward_id ?? ""))) {
    return NextResponse.json({ error: "This reward is no longer available." }, { status: 404 });
  }
  const sql = getSql();
  const rewards = (await sql`
    select id, title, points_cost from rewards where id = ${body.reward_id} and active
  `) as Array<{ id: string; title: string; points_cost: number }>;
  const reward = rewards[0];
  if (!reward) return NextResponse.json({ error: "This reward is no longer available." }, { status: 404 });

  // Rewards apply only to the specific items the team attached to them.
  const products = (await sql`
    select p.id, p.brand, p.name from reward_products rp join products p on p.id = rp.product_id
    where rp.reward_id = ${reward.id}
  `) as Array<{ id: string; brand: string; name: string }>;
  let product: { id: string; brand: string; name: string } | null = null;
  if (products.length) {
    product = products.find((p) => p.id === body.product_id) ?? (products.length === 1 ? products[0] : null);
    if (!product) return NextResponse.json({ error: "Please choose which item you'd like." }, { status: 400 });
  }

  await syncPoints(account.phone);
  const result = await spendPoints(account.phone, reward.points_cost, `Redeemed: ${reward.title}`, {
    accountId: account.id,
    rewardId: reward.id,
    rewardTitle: reward.title,
    productId: product?.id ?? null,
    productLabel: product ? `${product.brand} — ${product.name}` : null
  });
  if (!result) return NextResponse.json({ error: "You don't have enough points for this reward yet." }, { status: 400 });
  return NextResponse.json({ ok: true, redemption_id: result.redemptionId });
}
