import { NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { parseReward, type RewardInput } from "@/lib/reward-input";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = parseReward((await req.json().catch(() => ({}))) as RewardInput);
  if ("error" in parsed) return NextResponse.json(parsed, { status: 400 });

  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`
    insert into rewards (title, description, points_cost, reward_type, discount_usd, active, sort_order)
    values (${parsed.title}, ${parsed.description}, ${parsed.points_cost}, ${parsed.reward_type}, ${parsed.discount_usd}, ${parsed.active}, ${parsed.sort_order})
    returning id
  `) as Array<{ id: string }>;
  await sql`
    insert into reward_products (reward_id, product_id)
    select ${rows[0].id}::uuid, id from products where id = any(${parsed.product_ids}::uuid[])
    on conflict do nothing
  `;
  return NextResponse.json({ id: rows[0].id });
}
