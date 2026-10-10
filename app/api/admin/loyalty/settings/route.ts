import { NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Earning rate. Changes apply to points earned from now on; points already
// granted keep their amount. (Points never expire.)
export async function PATCH(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { points_per_usd?: number | string };
  const rate = Number(body.points_per_usd);
  if (!(rate > 0 && rate <= 100)) return NextResponse.json({ error: "Points per $1 must be between 0 and 100." }, { status: 400 });

  await ensureSchema();
  const sql = getSql();
  await sql`update loyalty_settings set points_per_usd = ${rate} where id = 1`;
  return NextResponse.json({ ok: true });
}
