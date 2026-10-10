import { NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Earning rate and expiry. Changes apply to points earned from now on; points
// already granted keep the amount and expiry they were given.
export async function PATCH(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { points_per_usd?: number | string; expiry_days?: number | string };
  const rate = Number(body.points_per_usd);
  const days = Math.trunc(Number(body.expiry_days));
  if (!(rate > 0 && rate <= 100)) return NextResponse.json({ error: "Points per $1 must be between 0 and 100." }, { status: 400 });
  if (!(days >= 1 && days <= 3650)) return NextResponse.json({ error: "Expiry must be between 1 and 3650 days." }, { status: 400 });

  await ensureSchema();
  const sql = getSql();
  await sql`update loyalty_settings set points_per_usd = ${rate}, expiry_days = ${days} where id = 1`;
  return NextResponse.json({ ok: true });
}
