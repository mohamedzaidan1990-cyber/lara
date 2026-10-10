import { NextResponse } from "next/server";
import { ensureSchema } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { normalizePhone } from "@/lib/account";
import { getPointsSummary, grantPoints, spendPoints, syncPoints } from "@/lib/loyalty";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Manual +/− points (gestures, corrections, golden-ticket wins). Added points
// expire like any other points; removals take the soonest-expiring first.
export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { phone?: string; points?: number | string; note?: string };
  const points = Math.trunc(Number(body.points));
  const note = String(body.note ?? "").trim();
  if (!Number.isFinite(points) || points === 0) return NextResponse.json({ error: "Enter a non-zero whole number of points." }, { status: 400 });
  if (!note) return NextResponse.json({ error: "Add a short reason (the client sees it)." }, { status: 400 });

  await ensureSchema();
  const phone = await normalizePhone(String(body.phone ?? ""));
  if (!phone) return NextResponse.json({ error: "Not a valid phone number." }, { status: 400 });

  await syncPoints(phone);
  if (points > 0) {
    await grantPoints(phone, points, "adjust", note);
  } else {
    const done = await spendPoints(phone, -points, note);
    if (!done) {
      const { balance } = await getPointsSummary(phone);
      return NextResponse.json({ error: `Only ${balance} points available to remove.` }, { status: 400 });
    }
  }
  return NextResponse.json(await getPointsSummary(phone));
}
