import { NextResponse } from "next/server";
import { ensureSchema, getSql, BESPOKE_STATUSES, type BespokeStatus } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { status?: string };
  if (!body.status || !BESPOKE_STATUSES.includes(body.status as BespokeStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  await ensureSchema();
  const sql = getSql();
  await sql`update bespoke_requests set status = ${body.status} where id = ${params.id}`;
  return NextResponse.json({ ok: true });
}
