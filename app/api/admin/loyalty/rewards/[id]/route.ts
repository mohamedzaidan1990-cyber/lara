import { NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { parseReward, type RewardInput } from "@/lib/reward-input";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Full update of a reward (rewards are never deleted — switch them off with
// active=false so past redemptions keep their reference).
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = parseReward((await req.json().catch(() => ({}))) as RewardInput);
  if ("error" in parsed) return NextResponse.json(parsed, { status: 400 });

  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`
    update rewards set title = ${parsed.title}, description = ${parsed.description}, points_cost = ${parsed.points_cost},
           reward_type = ${parsed.reward_type}, discount_usd = ${parsed.discount_usd}, active = ${parsed.active},
           sort_order = ${parsed.sort_order}
    where id = ${params.id}
    returning id
  `) as Array<{ id: string }>;
  if (!rows.length) return NextResponse.json({ error: "Reward not found" }, { status: 404 });
  await sql`delete from reward_products where reward_id = ${params.id} and not (product_id = any(${parsed.product_ids}::uuid[]))`;
  await sql`
    insert into reward_products (reward_id, product_id)
    select ${params.id}::uuid, id from products where id = any(${parsed.product_ids}::uuid[])
    on conflict do nothing
  `;
  return NextResponse.json({ ok: true });
}
